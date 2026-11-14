// src/infrastructure/database/sqlite/repositories/ReferralRepository.js
// v1.0.0 — Handles Referral tracking and 6-month logic.

const BaseRepository = require('./BaseRepository');

class Referral {
    constructor(data) {
        this.id = data.id || null;
        this.partnerId = data.partner_id || null;
        this.referredBusinessId = data.referred_business_id || null;
        this.monthsPaid = Number(data.months_paid) || 0;
        this.status = data.status || 'ACTIVE';
        this.startDate = data.start_date || null;
        this.createdAt = data.created_at || null;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    toJSON() {
        return {
            id: this.id,
            partnerId: this.partnerId,
            referredBusinessId: this.referredBusinessId,
            monthsPaid: this.monthsPaid,
            status: this.status,
            startDate: this.startDate,
        };
    }
}

class ReferralRepository extends BaseRepository {
    constructor() {
        super('referrals');
    }

    toEntity(row) {
        if (!row) return null;
        return new Referral(row);
    }

    async create({ partnerId, referredBusinessId }) {
        const result = await this._query(
            `INSERT INTO referrals (partner_id, referred_business_id)
             VALUES ($1, $2)
             RETURNING id`,
            [partnerId, referredBusinessId]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM referrals WHERE id = $1', [id]);
        return this.toEntity(result.rows[0]);
    }

    async findByBusinessId(businessId) {
        const result = await this._query(
            'SELECT * FROM referrals WHERE referred_business_id = $1',
            [businessId]
        );
        return this.toEntity(result.rows[0]);
    }

    async incrementMonthsPaid(referralId) {
        // Increments month, and if it hits 6, changes status to EXPIRED
        const result = await this._query(
            `UPDATE referrals 
             SET months_paid = months_paid + 1,
                 status = CASE WHEN months_paid + 1 >= 6 THEN 'EXPIRED' ELSE 'ACTIVE' END
             WHERE id = $1
             RETURNING id`,
            [referralId]
        );
        return this.findById(result.rows[0].id);
    }
}

module.exports = ReferralRepository;
module.exports.ReferralRepository = ReferralRepository;
module.exports.Referral = Referral;