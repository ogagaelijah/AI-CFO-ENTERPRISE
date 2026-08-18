// src/infrastructure/database/sqlite/repositories/SubscriptionRepository.js

const BaseRepository = require('./BaseRepository');

class SubscriptionRepository extends BaseRepository {
    constructor() {
        super('subscriptions');
    }

    create(subscriptionData) {
        const stmt = this.db.prepare(`
            INSERT INTO subscriptions (
                business_id, plan_id, status, start_date, end_date,
                trial_end_date, features, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            subscriptionData.businessId,
            subscriptionData.planId || 'free',
            subscriptionData.status || 'trial',
            subscriptionData.startDate ? subscriptionData.startDate.toISOString() : new Date().toISOString(),
            subscriptionData.endDate ? subscriptionData.endDate.toISOString() : null,
            subscriptionData.trialEndDate ? subscriptionData.trialEndDate.toISOString() : null,
            JSON.stringify(subscriptionData.features || {}),
            JSON.stringify(subscriptionData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const result = this.db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    findActiveByBusinessId(businessId) {
        const now = new Date().toISOString();
        const result = this.db.prepare(`
            SELECT * FROM subscriptions
            WHERE business_id = ?
            AND status IN ('active', 'trial')
            AND (end_date IS NULL OR end_date > ?)
            ORDER BY created_at DESC
            LIMIT 1
        `).get(businessId, now);

        if (!result) return null;
        return this._hydrate(result);
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

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
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

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    findExpired(beforeDate, options = {}) {
        const dateStr = beforeDate.toISOString();
        let query = `
            SELECT * FROM subscriptions
            WHERE status IN ('active', 'trial')
            AND end_date IS NOT NULL
            AND end_date <= ?
        `;
        const params = [dateStr];

        query += ' ORDER BY end_date ASC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    update(id, data) {
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
        if (data.startDate !== undefined) {
            fields.push('start_date = ?');
            values.push(data.startDate.toISOString());
        }
        if (data.endDate !== undefined) {
            fields.push('end_date = ?');
            values.push(data.endDate ? data.endDate.toISOString() : null);
        }
        if (data.trialEndDate !== undefined) {
            fields.push('trial_end_date = ?');
            values.push(data.trialEndDate ? data.trialEndDate.toISOString() : null);
        }
        if (data.features !== undefined) {
            fields.push('features = ?');
            values.push(JSON.stringify(data.features));
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

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
        const stmt = this.db.prepare('DELETE FROM subscriptions WHERE id = ?');
        const result = stmt.run(id);
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

    _hydrate(row) {
        const Subscription = require('../../../domain/entities/Subscription');
        return new Subscription({
            id: row.id,
            businessId: row.business_id,
            planId: row.plan_id,
            status: row.status,
            startDate: new Date(row.start_date),
            endDate: row.end_date ? new Date(row.end_date) : null,
            trialEndDate: row.trial_end_date ? new Date(row.trial_end_date) : null,
            features: row.features ? JSON.parse(row.features) : {},
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = SubscriptionRepository;