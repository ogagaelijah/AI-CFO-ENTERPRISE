// src/infrastructure/database/sqlite/repositories/DonationRepository.js
// v1.0.0-prod — Postgres async. Multi-tenant. Explicit columns only.
//
// LEFT JOIN customers (donor) and pledges for display fields.

'use strict';

const BaseRepository = require('./BaseRepository');
const Donation = require('../../../../domain/entities/Donation');

class DonationRepository extends BaseRepository {
    constructor() {
        super('donations');
    }

    static SELECT_WITH_RELATIONS =
        `SELECT d.*,
                c.name         AS joined_donor_name,
                p.amount       AS joined_pledge_amount,
                p.status       AS joined_pledge_status
         FROM donations d
         LEFT JOIN customers c
           ON c.id = d.donor_id
          AND c.business_id = d.business_id
         LEFT JOIN pledges p
           ON p.id = d.pledge_id
          AND p.business_id = d.business_id`;

    _hydrate(row) {
        if (!row) return null;
        return new Donation({
            id: row.id,
            businessId: row.business_id,
            donorId: row.donor_id,
            pledgeId: row.pledge_id,
            amount: row.amount,
            currency: row.currency,
            category: row.category,
            method: row.method,
            donationDate: row.donation_date,
            referenceNumber: row.reference_number,
            notes: row.notes || '',
            metadata: typeof row.metadata === 'string'
                ? safeParse(row.metadata)
                : (row.metadata || {}),
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date(),
            donorName: row.joined_donor_name || null,
            pledgeAmount: row.joined_pledge_amount != null
                ? Number(row.joined_pledge_amount)
                : null,
            pledgeStatus: row.joined_pledge_status || null,
        });
    }

    async create(data) {
        const result = await this._query(
            `INSERT INTO donations (
                business_id, donor_id, pledge_id,
                amount, currency, category, method,
                donation_date, reference_number, notes, metadata
            ) VALUES (
                $1, $2, $3,
                $4, $5, $6, $7,
                $8, $9, $10, $11
            ) RETURNING id`,
            [
                data.businessId,
                data.donorId || null,
                data.pledgeId || null,
                round2(data.amount),
                data.currency || 'NGN',
                data.category || 'GENERAL',
                data.method || 'CASH',
                toDateOnly(data.donationDate) || toDateOnly(new Date()),
                data.referenceNumber || null,
                data.notes || '',
                JSON.stringify(data.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id, businessId = null) {
        let sql = `${DonationRepository.SELECT_WITH_RELATIONS} WHERE d.id = $1`;
        const params = [id];
        if (businessId !== null) {
            sql += ' AND d.business_id = $2';
            params.push(businessId);
        }
        const result = await this._query(sql, params);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let sql = `${DonationRepository.SELECT_WITH_RELATIONS} WHERE d.business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (options.category) {
            sql += ` AND d.category = $${i++}`;
            params.push(options.category);
        }
        if (options.method) {
            sql += ` AND d.method = $${i++}`;
            params.push(options.method);
        }
        if (options.donorId) {
            sql += ` AND d.donor_id = $${i++}`;
            params.push(options.donorId);
        }
        if (options.pledgeId) {
            sql += ` AND d.pledge_id = $${i++}`;
            params.push(options.pledgeId);
        }
        if (options.fromDate) {
            sql += ` AND d.donation_date >= $${i++}`;
            params.push(toDateOnly(options.fromDate));
        }
        if (options.toDate) {
            sql += ` AND d.donation_date <= $${i++}`;
            params.push(toDateOnly(options.toDate));
        }
        if (options.search) {
            sql += ` AND (c.name ILIKE $${i} OR d.notes ILIKE $${i} OR d.reference_number ILIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        sql += ' ORDER BY d.donation_date DESC, d.id DESC';

        if (options.limit) {
            sql += ` LIMIT $${i++}`;
            params.push(options.limit);
        }
        if (options.offset) {
            sql += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(sql, params);
        return result.rows.map((r) => this._hydrate(r));
    }

    async findByDonor(businessId, donorId, options = {}) {
        return this.findByBusinessId(businessId, { ...options, donorId });
    }

    async findByPledge(businessId, pledgeId) {
        return this.findByBusinessId(businessId, { pledgeId });
    }

    async findByCategory(businessId, category, options = {}) {
        return this.findByBusinessId(businessId, { ...options, category });
    }

    async update(id, businessId, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.donorId !== undefined) {
            fields.push(`donor_id = $${i++}`);
            values.push(data.donorId);
        }
        if (data.pledgeId !== undefined) {
            fields.push(`pledge_id = $${i++}`);
            values.push(data.pledgeId);
        }
        if (data.amount !== undefined) {
            fields.push(`amount = $${i++}`);
            values.push(round2(data.amount));
        }
        if (data.currency !== undefined) {
            fields.push(`currency = $${i++}`);
            values.push(data.currency);
        }
        if (data.category !== undefined) {
            fields.push(`category = $${i++}`);
            values.push(data.category);
        }
        if (data.method !== undefined) {
            fields.push(`method = $${i++}`);
            values.push(data.method);
        }
        if (data.donationDate !== undefined) {
            fields.push(`donation_date = $${i++}`);
            values.push(toDateOnly(data.donationDate));
        }
        if (data.referenceNumber !== undefined) {
            fields.push(`reference_number = $${i++}`);
            values.push(data.referenceNumber);
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${i++}`);
            values.push(data.notes);
        }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${i++}`);
            values.push(JSON.stringify(data.metadata));
        }

        if (fields.length === 0) throw new Error('No fields to update');

        fields.push('updated_at = NOW()');
        values.push(id, businessId);

        const result = await this._query(
            `UPDATE donations SET ${fields.join(', ')}
             WHERE id = $${i++} AND business_id = $${i}`,
            values
        );

        if (result.rowCount === 0) return null;
        return this.findById(id, businessId);
    }

    async delete(id, businessId) {
        const result = await this._query(
            'DELETE FROM donations WHERE id = $1 AND business_id = $2',
            [id, businessId]
        );
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let sql = 'SELECT COUNT(*)::int AS count FROM donations d WHERE d.business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.category) {
            sql += ` AND d.category = $${i++}`;
            params.push(filters.category);
        }
        if (filters.method) {
            sql += ` AND d.method = $${i++}`;
            params.push(filters.method);
        }
        if (filters.donorId) {
            sql += ` AND d.donor_id = $${i++}`;
            params.push(filters.donorId);
        }
        if (filters.pledgeId) {
            sql += ` AND d.pledge_id = $${i++}`;
            params.push(filters.pledgeId);
        }
        if (filters.fromDate) {
            sql += ` AND d.donation_date >= $${i++}`;
            params.push(toDateOnly(filters.fromDate));
        }
        if (filters.toDate) {
            sql += ` AND d.donation_date <= $${i++}`;
            params.push(toDateOnly(filters.toDate));
        }

        const result = await this._query(sql, params);
        return result.rows[0]?.count || 0;
    }

    async getSummary(businessId, filters = {}) {
        let sql = `
            SELECT
                COUNT(*)::int                                    AS total_count,
                COALESCE(SUM(amount), 0)::numeric                AS total_amount,
                COUNT(*) FILTER (WHERE donor_id IS NULL)::int    AS anonymous_count,
                COUNT(*) FILTER (WHERE pledge_id IS NOT NULL)::int AS pledge_payment_count,
                COALESCE(SUM(amount) FILTER (WHERE donation_date >= CURRENT_DATE - INTERVAL '30 days'), 0)::numeric
                                                                 AS last_30_days
            FROM donations
            WHERE business_id = $1`;
        const params = [businessId];
        let i = 2;

        if (filters.fromDate) {
            sql += ` AND donation_date >= $${i++}`;
            params.push(toDateOnly(filters.fromDate));
        }
        if (filters.toDate) {
            sql += ` AND donation_date <= $${i++}`;
            params.push(toDateOnly(filters.toDate));
        }
        if (filters.category) {
            sql += ` AND category = $${i++}`;
            params.push(filters.category);
        }

        const result = await this._query(sql, params);
        const r = result.rows[0] || {};
        return {
            totalCount: Number(r.total_count) || 0,
            totalAmount: Number(r.total_amount) || 0,
            anonymousCount: Number(r.anonymous_count) || 0,
            pledgePaymentCount: Number(r.pledge_payment_count) || 0,
            last30Days: Number(r.last_30_days) || 0,
        };
    }

    async getTodayTotal(businessId) {
        const result = await this._query(
            `SELECT COALESCE(SUM(amount), 0)::numeric AS total
             FROM donations
             WHERE business_id = $1 AND donation_date = CURRENT_DATE`,
            [businessId]
        );
        return Number(result.rows[0]?.total) || 0;
    }

    async countDonors(businessId) {
        const result = await this._query(
            `SELECT COUNT(DISTINCT donor_id)::int AS count
             FROM donations
             WHERE business_id = $1 AND donor_id IS NOT NULL`,
            [businessId]
        );
        return Number(result.rows[0]?.count) || 0;
    }
}

function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

function toDateOnly(d) {
    if (d === null || d === undefined) return null;
    if (typeof d === 'string') return d.slice(0, 10);
    if (d instanceof Date) {
        if (Number.isNaN(d.getTime())) return null;
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }
    return String(d).slice(0, 10);
}

function safeParse(s) {
    try {
        return JSON.parse(s);
    } catch {
        return {};
    }
}

module.exports = DonationRepository;