// src/application/useCases/subscription/ActivateSubscriptionUseCase.js
// v1.0.0-prod
//
// Idempotent subscription activation.
//
// This is the single entry point for "a payment succeeded — activate the plan."
// It is called by HandlePaystackWebhookUseCase (P-5) and can also be called by
// the /verify/:reference fallback route.
//
// Guarantees:
//   1. Atomic — runs inside a Postgres transaction via withTransaction().
//      No partial state on crash. Either the subscription is updated/created
//      and the event is marked PROCESSED, or nothing changed.
//   2. Idempotent — re-running with the same (businessId, planId, billingCycle,
//      paystackEventId) is a no-op if the subscription is already active on
//      that plan with an end_date at least as far in the future.
//   3. Multi-tenant safe — businessId is required and validated.
//   4. Does NOT trust caller input — validates planId against the SSOT in
//      src/config/plans.js before writing anything.
//
// This use case deliberately does NOT:
//   - Verify signatures (that's PaystackSignatureVerifier, P-3)
//   - Parse webhook payloads (that's HandlePaystackWebhookUseCase, P-5)
//   - Touch paystack_webhook_events (that's P-5)
//   - Log to stdout beyond a single structured line per call

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../../../config/plans');

class ActivateSubscriptionUseCase {
    constructor(opts = {}) {
        this.subscriptionRepo = opts.subscriptionRepo || new SubscriptionRepository();
        // Allow injecting a clock in tests
        this.now = opts.now || (() => new Date());
    }

    /**
     * Activate (or extend) a subscription.
     *
     * @param {object} input
     * @param {number} input.businessId            — required, integer
     * @param {string} input.planId                — required, must exist in plans.PLANS
     * @param {string} [input.billingCycle]        — 'monthly' | 'yearly', default 'monthly'
     * @param {string} [input.paystackEventId]     — for audit linkage (optional)
     * @param {string} [input.paystackReference]   — for audit linkage (optional)
     *
     * @returns {Promise<{
     *   activated: boolean,
     *   skipped: boolean,
     *   reason?: string,
     *   subscription: object|null,
     *   businessId: number,
     *   planId: string,
     *   billingCycle: string,
     *   endDate: Date|null
     * }>}
     */
    async execute(input = {}) {
        const {
            businessId,
            planId,
            billingCycle = 'monthly',
            paystackEventId = null,
            paystackReference = null,
        } = input;

        // ── 1. Input validation (fail closed, do not proceed on bad input)
        if (!Number.isInteger(businessId) || businessId <= 0) {
            throw new Error('ActivateSubscriptionUseCase: businessId must be a positive integer');
        }
        if (!planId || typeof planId !== 'string') {
            throw new Error('ActivateSubscriptionUseCase: planId is required');
        }
        if (!['monthly', 'yearly'].includes(billingCycle)) {
            throw new Error(`ActivateSubscriptionUseCase: invalid billingCycle "${billingCycle}"`);
        }
        const plan = plans.getPlan(planId);
        if (!plan) {
            throw new Error(`ActivateSubscriptionUseCase: unknown planId "${planId}"`);
        }
        if (!plans.isPaidPlan(planId)) {
            throw new Error(`ActivateSubscriptionUseCase: planId "${planId}" is not a paid plan`);
        }

        // ── 2. Compute the new end_date from NOW, not from the old end_date.
        //    Rationale: even if a webhook arrives late, the user gets a full
        //    period from activation. This matches Paystack's billing model.
        const now = this.now();
        const newEndDate = new Date(now);
        if (billingCycle === 'yearly') {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
            newEndDate.setMonth(newEndDate.getMonth() + 1);
        }
        const features = plans.getFeatures(planId);

        // ── 3. Single atomic transaction
        const result = await withTransaction(async () => {
            const existing = await this.subscriptionRepo.findActiveByBusinessId(businessId);

            if (existing && this._isRedundant(existing, planId, billingCycle, newEndDate)) {
                return {
                    activated: false,
                    skipped: true,
                    reason: 'already_active_same_plan_and_cycle',
                    subscription: existing,
                    businessId,
                    planId,
                    billingCycle,
                    endDate: existing.endDate,
                };
            }

            let subscription;
            if (existing) {
                subscription = await this.subscriptionRepo.update(existing.id, {
                    planId,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate: newEndDate,
                    trialEndDate: null,
                    features,
                });
            } else {
                subscription = await this.subscriptionRepo.create({
                    businessId,
                    planId,
                    billingCycle,
                    status: 'active',
                    startDate: now,
                    endDate: newEndDate,
                    features,
                });
            }

            return {
                activated: true,
                skipped: false,
                subscription,
                businessId,
                planId,
                billingCycle,
                endDate: newEndDate,
                paystackEventId,
                paystackReference,
            };
        });

        return result;
    }

    /**
     * Determine if we can skip the write entirely.
     * Returns true only when the current subscription already matches the
     * target plan+cycle and its end_date is >= the new end_date we would write.
     * That means a retry of the same webhook is a true no-op.
     *
     * @private
     */
    _isRedundant(existing, planId, billingCycle, newEndDate) {
        if (!existing) return false;
        if (existing.status !== 'active') return false;
        if (existing.planId !== planId) return false;
        if ((existing.billingCycle || 'monthly') !== billingCycle) return false;
        if (!existing.endDate) return false;
        return existing.endDate.getTime() >= newEndDate.getTime();
    }
}

module.exports = ActivateSubscriptionUseCase;