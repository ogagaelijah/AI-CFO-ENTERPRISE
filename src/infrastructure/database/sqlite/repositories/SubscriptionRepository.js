// src/infrastructure/database/sqlite/repositories/SubscriptionRepository.js
// v3.0.0-prod — Postgres async. Same logic as SQLite v2.0.0.

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
        this.status = data.status ?? 'trial';
        this.billingCycle = data.billingCycle ?? 'monthly';
        this.startDate = data.startDate ? new Date(data.startDate) : new Date();
        this.endDate = data.endDate ? new Date(data.endDate) : null;
        this.trialEndDate = data.trialEndDate ? new Date(data.trialEndDate) : null;
        this.features = data.features || {};
        this.createdAt = data.createdAt ? new Date(data.createdAt) : null;
        this.updatedAt = data.updatedAt ? new Date(data.updatedAt) : null;
    }

    isTrialActive() {
        if (this.status !== 'trial' || !this.trialEndDate) return false;
        return Date.now() < this.trialEndDate.getTime();
    }

    isActivePaid() {
        if (this.status !== 'active') return false;
        if (!this.endDate) return true;
        return Date.now() < this.endDate.getTime();
    }

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

    isReadOnly() {
        return this.isExpired();
    }

    daysRemaining() {
        if (this.isExpired()) return 0;
        const end =
            this.status === 'trial' && this.trialEndDate
                ? this.trialEndDate
                : this.endDate;
        if (!end) return null;
        const ms = end.getTime() - Date.now();
        return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    allows(feature) {
        if (this.isReadOnly()) return false;
        const effectivePlanId = this.isTrialActive()
            ? plans.getTrialPlan()
            : this.planId;
        return plans.hasFeature(effectivePlanId, feature);
    }

    getEffectiveLimits() {
        const effectivePlanId = this.isTrialActive()
            ? plans.getTrialPlan()
            : this.planId;
        return plans.getLimits(effectivePlanId);
    }

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

    async create(data = {}) {
        const planId = data.planId || 'free';
        const billingCycle = data.billingCycle || (planId === 'pro' && data.status === 'trial' ? 'trial' : 'monthly');
        const features = data.features || plans.getFeatures(planId);

        const result = await this._query(
            `INSERT INTO subscriptions (
                business_id, plan_id, status, start_date, end_date,
                trial_end_date, features, billing_cycle
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
                data.businessId,
                planId,
                data.status || 'trial',
                data.startDate ? toISO(data.startDate) : new Date().toISOString(),
                data.endDate ? toISO(data.endDate) : null,
                data.trialEndDate ? toISO(data.trialEndDate) : null,
                JSON.stringify(features),
                billingCycle,
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM subscriptions WHERE id = $1', [id]);
        return this._hydrate(result.rows[0] || null);
    }

    async findActiveByBusinessId(businessId) {
        const result = await this._query(
            `SELECT * FROM subscriptions
             WHERE business_id = $1
             AND status IN ('active', 'trial')
             ORDER BY created_at DESC
             LIMIT 1`,
            [businessId]
        );
        return this._hydrate(result.rows[0] || null);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM subscriptions WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            query += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.planId) {
            query += ` AND plan_id = $${i++}`;
            params.push(options.planId);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByPlanId(planId, options = {}) {
        let query = 'SELECT * FROM subscriptions WHERE plan_id = $1';
        const params = [planId];
        let i = 2;

        if (options.status) {
            query += ` AND status = $${i++}`;
            params.push(options.status);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findExpired(beforeDate = new Date()) {
        const iso = toISO(beforeDate);
        const result = await this._query(
            `SELECT * FROM subscriptions
             WHERE status IN ('trial', 'active')
             AND (
                 (status = 'trial' AND trial_end_date IS NOT NULL AND trial_end_date <= $1)
                 OR
                 (status = 'active' AND end_date IS NOT NULL AND end_date <= $1)
             )
             ORDER BY created_at ASC`,
            [iso]
        );
        return result.rows.map(r => this._hydrate(r));
    }

    async update(id, data = {}) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.planId !== undefined) {
            fields.push(`plan_id = $${i++}`);
            values.push(data.planId);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.billingCycle !== undefined) {
            fields.push(`billing_cycle = $${i++}`);
            values.push(data.billingCycle);
        }
        if (data.startDate !== undefined) {
            fields.push(`start_date = $${i++}`);
            values.push(data.startDate ? toISO(data.startDate) : null);
        }
        if (data.endDate !== undefined) {
            fields.push(`end_date = $${i++}`);
            values.push(data.endDate ? toISO(data.endDate) : null);
        }
        if (data.trialEndDate !== undefined) {
            fields.push(`trial_end_date = $${i++}`);
            values.push(data.trialEndDate ? toISO(data.trialEndDate) : null);
        }
        if (data.features !== undefined) {
            fields.push(`features = $${i++}`);
            values.push(JSON.stringify(data.features));
        }

        fields.push('updated_at = NOW()');
        values.push(id);

        const result = await this._query(
            `UPDATE subscriptions SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Subscription not found or no changes made');
        }
        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM subscriptions WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM subscriptions WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            query += ` AND status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.planId) {
            query += ` AND plan_id = $${i++}`;
            params.push(filters.planId);
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }
}

// ─────────────────────────────────────────────
// Utils
// ─────────────────────────────────────────────
function safeJSON(str) {
    try {
        return typeof str === 'string' ? JSON.parse(str) : str;
    } catch {
        return {};
    }
}

function toISO(date) {
    return date instanceof Date ? date.toISOString() : String(date);
}

module.exports = SubscriptionRepository;
module.exports.SubscriptionRepository = SubscriptionRepository;
module.exports.Subscription = Subscription;