// src/application/useCases/subscription/ActivateSubscriptionUseCase.js
// v1.1.0-prod
//
// Idempotent subscription activation.
//
// This is the single entry point for "a payment succeeded — activate the plan."
// It is called by HandlePaystackWebhookUseCase (P-5) and by the /verify
// fallback route.
//
// Guarantees:
//   1. Atomic — runs inside a Postgres transaction via withTransaction().
//   2. Idempotent — re-running with the same (businessId, planId, billingCycle)
//      within a short window is a no-op. See _isRedundant below for the exact
//      window and rationale.
//   3. Multi-tenant safe — businessId is required and validated.
//   4. Does NOT trust caller input — validates planId against the SSOT.
//
// v1.1.0 change — fixes an idempotency bug found in P-9.2 testing:
//   _isRedundant previously required existing.endDate >= newEndDate. Since
//   newEndDate is computed from NOW on every call, and NOW advances between
//   retries, the condition could never be true for a real retry. Result:
//   every duplicate webhook re-activated the subscription and slid start_date
//   and end_date forward. Fixed by comparing existing.endDate against
//   newEndDate with a 24-hour tolerance, which correctly distinguishes a
//   duplicate (arrives within seconds) from a renewal (arrives days/weeks
//   later, outside the window, and should extend the subscription).

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const plans = require('../../../config/plans');

// 24 hours — comfortably larger than the seconds-apart window in which a
// duplicate webhook arrives, and comfortably smaller than the days/weeks
// interval of a real renewal.
const IDEMPOTENCY_TOLERANCE_MS = 24 * 60 * 60 * 1000;

class ActivateSubscriptionUseCase {
    constructor(opts = {}) {
        this.subscriptionRepo = opts.subscriptionRepo || new SubscriptionRepository();
        this.now = opts.now || (() => new Date());
        this.toleranceMs = opts.toleranceMs ?? IDEMPOTENCY_TOLERANCE_MS;
    }

    /**
     * Activate (or extend) a subscription.
     *
     * @param {object} input
     * @param {number} input.businessId
     * @param {string} input.planId
     * @param {string} [input.billingCycle]      'monthly' | 'yearly'
     * @param {string} [input.paystackEventId]
     * @param {string} [input.paystackReference]
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

        const now = this.now();
        const newEndDate = new Date(now);
        if (billingCycle === 'yearly') {
            newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        } else {
            newEndDate.setMonth(newEndDate.getMonth() + 1);
        }
        const features = plans.getFeatures(planId);

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
     * Returns true if the current subscription already matches the target
     * state closely enough that we can skip the write.
     *
     * Match requires:
     *   - status === 'active'
     *   - planId === target planId
     *   - billingCycle === target billingCycle
     *   - endDate exists and is within tolerance of newEndDate
     *
     * Rationale for tolerance: newEndDate is computed from NOW on every call.
     * A real duplicate webhook arrives seconds after the first, so its
     * newEndDate is within seconds of existing.endDate. A real renewal arrives
     * days or weeks later, outside any small tolerance, and should extend.
     *
     * @private
     */
    _isRedundant(existing, planId, billingCycle, newEndDate) {
        if (!existing) return false;
        if (existing.status !== 'active') return false;
        if (existing.planId !== planId) return false;
        if ((existing.billingCycle || 'monthly') !== billingCycle) return false;
        if (!existing.endDate) return false;

        const delta = Math.abs(newEndDate.getTime() - existing.endDate.getTime());
        return delta <= this.toleranceMs;
    }
}

module.exports = ActivateSubscriptionUseCase;