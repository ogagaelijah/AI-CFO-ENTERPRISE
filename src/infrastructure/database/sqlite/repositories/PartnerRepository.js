// src/infrastructure/database/sqlite/repositories/PartnerRepository.js
// v1.0.0 — Handles Partner profile and Wallet math.

const BaseRepository = require('./BaseRepository');

class Partner {
    constructor(data) {
        this.id = data.id || null;
        this.userId = data.user_id || null;
        this.businessId = data.business_id || null;
        this.partnerCode = data.partner_code || null;
        this.walletBalance = Number(data.wallet_balance) || 0;
        this.status = data.status || 'ACTIVE';
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    canWithdraw() {
        return this.isActive() && this.walletBalance >= 10000;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            businessId: this.businessId,
            partnerCode: this.partnerCode,
            walletBalance: this.walletBalance,
            status: this.status,
            createdAt: this.createdAt,
        };
    }
}

class PartnerRepository extends BaseRepository {
    constructor() {
        super('partners');
    }

    toEntity(row) {
        if (!row) return null;
        return new Partner(row);
    }

    async create({ userId, businessId, partnerCode }) {
        const result = await this._query(
            `INSERT INTO partners (user_id, business_id, partner_code)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [userId, businessId, partnerCode]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM partners WHERE id = $1', [id]);
        return this.toEntity(result.rows[0]);
    }

    async findByUserId(userId) {
        const result = await this._query('SELECT * FROM partners WHERE user_id = $1', [userId]);
        return this.toEntity(result.rows[0]);
    }

    async findByCode(partnerCode) {
        const result = await this._query('SELECT * FROM partners WHERE partner_code = $1', [partnerCode]);
        return this.toEntity(result.rows[0]);
    }

    async addToWallet(partnerId, amount) {
        const result = await this._query(
            `UPDATE partners 
             SET wallet_balance = wallet_balance + $1, updated_at = NOW()
             WHERE id = $2
             RETURNING wallet_balance`,
            [amount, partnerId]
        );
        return result.rows[0] ? Number(result.rows[0].wallet_balance) : null;
    }
    
    async deductFromWallet(partnerId, amount) {
        // Only deducts if they have enough balance
        const result = await this._query(
            `UPDATE partners 
             SET wallet_balance = wallet_balance - $1, updated_at = NOW()
             WHERE id = $2 AND wallet_balance >= $1
             RETURNING wallet_balance`,
            [amount, partnerId]
        );
        return result.rows[0] ? Number(result.rows[0].wallet_balance) : null;
    }
}

module.exports = PartnerRepository;
module.exports.PartnerRepository = PartnerRepository;
module.exports.Partner = Partner;