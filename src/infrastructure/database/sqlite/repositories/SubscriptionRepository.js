// src/infrastructure/database/sqlite/repositories/SubscriptionRepository.js
// v2.0.0-prod — SSOT-driven, read-only aware, backward-compatible export
//
// Features:
//   • No hardcoded feature maps (pulled from src/config/plans.js)
//   • isExpired / isReadOnly computed dynamically (no job dependency)
//   • billing_cycle support
//   • Backward-compatible export (default = class, named = class)

const BaseRepository = require('./BaseRepository');
const plans = require('../../../../config/plans');

// ─────────────────────────────────────────────
// Subscription Entity
// ─────────────────────────────────────────────
class Subscription {
    constructor(data = {}) {
        this.id = data.id ?? null;
        this.businessId = data.businessId ?? null;
        this.planId = data.planId ?? 'free';
        this.status = data.status ?? 'trial'; // 'trial' | 'active' | 'cancelled' | 'expired'
        this.billingCycle = data.billingCycle ?? 'monthly'; // 'trial' | 'monthly' | 'yearly'
        this.startDate = data.startDate ? new Date(data.startDate) : new Date();
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.trialEndDate = data.trialEndDate ? new Date(data.trialEndDate) : null;
        this.features = data.features || {};
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    /**
     * Is the trial active right now?
     * (status=trial AND now < trialEndDate)
     */
    isTrialActive() {
        if (this.status !== 'trial' || !this.trialEndDate) return false;
        return Date.now() < this.trialEndDate.getTime();
    }

    /**
     * Is the paid subscription still in its paid window?
     * (status=active AND endDate in the future)
     */
    isActivePaid() {
        if (this.status !== 'active') return false;
        if (!this.endDate) return true; // no expiry = perpetual
        return Date.now() < this.endDate.getTime();
    }

    /**
     * Is this subscription effectively expired?
     * Covers:
     *   • status='expired' explicitly set
     *   • status='trial' AND trial_end_date in the past
     *   • status='active' AND end_date in the past
     *   • status='cancelled'
     */
    isExpired() {
        if (this.status === 'expired' || this.status === 'cancelled') return true;

        if (this.status === 'trial') {
            if (!this.trialEndDate) return true;
            return Date.now() >= this.trialEndDate.getTime();
        }

        if (this.status === 'active') {
            if (!this.endDate) return false;
            return Date.now() >= this.endDate.getTime();
        }

        return false;
    }

    /**
     * Is the business in read-only mode?
     * (subscription is expired → no new writes allowed)
     */
    isReadOnly() {
        return this.isExpired();
    }

    /**
     * Days remaining in trial or paid cycle. 0 if expired.
     */
    daysRemaining() {
        if (this.isExpired()) return 0;
        const end =
            this.status === 'trial' && this.trialEndDate
                ? this.trialEndDate
                : this.endDate;
        if (!end) return null; // perpetual
        const ms = end.getTime() - Date.now();
        return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    /**
     * Does this subscription allow the given feature right now?
     * Uses plans.js SSOT.
     */
    allows(feature) {
        if (this.isReadOnly()) return false;
        const effectivePlanId = this.isTrialActive()
            ? plans.getTrialPlan() // trial always grants pro-level access
            : this.planId;
        return plans.hasFeature(effectivePlanId, feature);
    }

    /**
     * Get limits for the effective plan.
     */
    getEffectiveLimits() {
        const effectivePlanId = this.isTrialActive()
            ? plans.getTrialPlan()
            : this.planId;
        return plans.getLimits(effectivePlanId);
    }

    /**
     * Get features for the effective plan.
     */
    getEffectiveFeatures() {
        const effectivePlanId = this.isTrialActive()
            ? plans.getTrialPlan()
            : this.planId;
        return plans.getFeatures(effectivePlanId);
    }

    cancel(reason = '') {
        this.status = 'cancelled';
        this.metadata = { ...(this.metadata || {}), cancelReason: reason };
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            planId: this.planId,
            status: this.status,
            billingCycle: this.billingCycle,
            startDate: this.startDate,
            endDate: this.endDate,
            trialEndDate: this.trialEndDate,
            features: this.features,
            isTrial: this.isTrialActive(),
            isExpired: this.isExpired(),
            isReadOnly: this.isReadOnly(),
            daysRemaining: this.daysRemaining(),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

// ─────────────────────────────────────────────
// Repository
// ─────────────────────────────────────────────
class SubscriptionRepository extends BaseRepository {
    constructor() {
        super('subscriptions');
    }

    _hydrate(row) {
        if (!row) return null;
        return new Subscription({
            id: row.id,
            businessId: row.business_id,
            planId: row.plan_id,
            status: row.status,
            billingCycle: row.billing_cycle || 'monthly',
            startDate: row.start_date ? new Date(row.start_date) : null,
            endDate: row.end_date ? new Date(row.end_date) : null,
            trialEndDate: row.trial_end_date ? new Date(row.trial_end_date) : null,
            features: row.features ? safeJSON(row.features) : {},
            createdAt: row.created_at ? new Date(row.created_at) : null,
            updatedAt: row.updated_at ? new Date(row.updated_at) : null,
        });
    }

    /**
     * Create — uses SSOT for default features.
     */
    create(data = {}) {
        const planId = data.planId || 'free';
        const billingCycle = data.billingCycle || (planId === 'pro' && data.status === 'trial' ? 'trial' : 'monthly');
        const features = data.features || plans.getFeatures(planId);

        const stmt = this.db.prepare(`
            INSERT INTO subscriptions (
                business_id, plan_id, status, start_date, end_date,
                trial_end_date, features, billing_cycle
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            data.businessId,
            planId,
            data.status || 'trial',
            data.startDate ? toISO(data.startDate) : new Date().toISOString(),
            data.endDate ? toISO(data.endDate) : null,
            data.trialEndDate ? toISO(data.trialEndDate) : null,
            JSON.stringify(features),
            billingCycle
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const row = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
        return this._hydrate(row);
    }

    findActiveByBusinessId(businessId) {
        const row = this.db.prepare(`
            SELECT * FROM subscriptions
            WHERE business_id = ?
            AND status IN ('active', 'trial')
            ORDER BY created_at DESC
            LIMIT 1
        `).get(businessId);

        return this._hydrate(row);
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM subscriptions WHERE business_id = ?';
        const params = [businessId];

        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }
        if (options.planId) {
            query += ' AND plan_id = ?';
            params.push(options.planId);
        }

        query += ' ORDER BY created_at DESC';
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }
        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        return this.db.prepare(query).all(...params).map((r) => this._hydrate(r));
    }

    findByPlanId(planId, options = {}) {
        let query = 'SELECT * FROM subscriptions WHERE plan_id = ?';
        const params = [planId];

        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        query += ' ORDER BY created_at DESC';
        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        return this.db.prepare(query).all(...params).map((r) => this._hydrate(r));
    }

    /**
     * Find subscriptions whose trial or paid period has expired.
     * Useful for a future daily cleanup job.
     */
    findExpired(beforeDate = new Date()) {
        const iso = toISO(beforeDate);
        const rows = this.db.prepare(`
            SELECT * FROM subscriptions
            WHERE status IN ('trial', 'active')
            AND (
                (status = 'trial' AND trial_end_date IS NOT NULL AND trial_end_date <= ?)
                OR
                (status = 'active' AND end_date IS NOT NULL AND end_date <= ?)
            )
            ORDER BY created_at ASC
        `).all(iso, iso);
        return rows.map((r) => this._hydrate(r));
    }

    update(id, data = {}) {
        const fields = [];
        const values = [];

        if (data.planId !== undefined) {
            fields.push('plan_id = ?');
            values.push(data.planId);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.billingCycle !== undefined) {
            fields.push('billing_cycle = ?');
            values.push(data.billingCycle);
        }
        if (data.startDate !== undefined) {
            fields.push('start_date = ?');
            values.push(data.startDate ? toISO(data.startDate) : null);
        }
        if (data.endDate !== undefined) {
            fields.push('end_date = ?');
            values.push(data.endDate ? toISO(data.endDate) : null);
        }
        if (data.trialEndDate !== undefined) {
            fields.push('trial_end_date = ?');
            values.push(data.trialEndDate ? toISO(data.trialEndDate) : null);
        }
        if (data.features !== undefined) {
            fields.push('features = ?');
            values.push(JSON.stringify(data.features));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Subscription not found or no changes made');
        }
        return this.findById(id);
    }

    delete(id) {
        const result = this.db.prepare('DELETE FROM subscriptions WHERE id = ?').run(id);
        return result.changes > 0;
    }

    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM subscriptions WHERE business_id = ?';
        const params = [businessId];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }
        if (filters.planId) {
            query += ' AND plan_id = ?';
            params.push(filters.planId);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function safeJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return {};
    }
}

function toISO(date) {
    return date instanceof Date ? date.toISOString() : String(date);
}

// ─────────────────────────────────────────────
// Backward-compatible export
// ─────────────────────────────────────────────
module.exports = SubscriptionRepository;
module.exports.SubscriptionRepository = SubscriptionRepository;
module.exports.Subscription = Subscription;