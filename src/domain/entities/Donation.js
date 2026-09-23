// src/domain/entities/Donation.js
// v1.0.0-prod — Donation domain entity. Pure data + rules.
//
// A Donation is money received. It's immutable in its core fields
// (amount, category, method, donationDate) once recorded — updating
// means editing the ledger via a corrective entry, not mutating history.
// We allow metadata/notes edits for now.
//
// Optional links:
//   - donorId  → customers(id)  (null = anonymous)
//   - pledgeId → pledges(id)    (null = no pledge; when set, the donation
//                                increments pledge.amountFulfilled atomically
//                                inside RecordDonationUseCase)

'use strict';

const VALID_CATEGORIES = [
    'TITHE', 'OFFERING', 'ZAKAT', 'SADAQAH', 'SEED',
    'BUILDING_FUND', 'MISSIONS', 'WELFARE', 'PLEDGE_PAYMENT',
    'GENERAL', 'OTHER',
];

const VALID_METHODS = [
    'CASH', 'BANK_TRANSFER', 'POS', 'CHEQUE', 'MOBILE_MONEY', 'OTHER',
];

class Donation {
    constructor({
        id = null,
        businessId,
        donorId = null,
        pledgeId = null,
        amount = 0,
        currency = 'NGN',
        category = 'GENERAL',
        method = 'CASH',
        donationDate = null,
        referenceNumber = null,
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
        // Relation display fields (from JOIN in DonationRepository)
        donorName = null,
        pledgeAmount = null,
        pledgeStatus = null,
    }) {
        if (!businessId) throw new Error('Donation requires businessId');

        const amt = Number(amount) || 0;
        if (amt <= 0) throw new Error('Donation amount must be positive');

        if (!VALID_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        if (!VALID_METHODS.includes(method)) {
            throw new Error(`Invalid method. Must be one of: ${VALID_METHODS.join(', ')}`);
        }

        this.id = id;
        this.businessId = businessId;
        this.donorId = donorId;
        this.pledgeId = pledgeId;
        this.amount = round2(amt);
        this.currency = currency || 'NGN';
        this.category = category;
        this.method = method;
        this.donationDate = normalizeDate(donationDate);
        this.referenceNumber = referenceNumber || null;
        this.notes = notes || '';
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.donorName = donorName;
        this.pledgeAmount = pledgeAmount;
        this.pledgeStatus = pledgeStatus;
    }

    // ── Computed ──

    get isAnonymous() {
        return this.donorId === null;
    }

    get isPledgePayment() {
        return this.pledgeId !== null;
    }

    // ── Behavior ──

    /**
     * Change the category. Allowed post-recording — categories are
     * classification, not amount. Useful when a donation was filed wrong.
     */
    setCategory(category) {
        if (!VALID_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }
        this.category = category;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            donorId: this.donorId,
            pledgeId: this.pledgeId,
            amount: this.amount,
            currency: this.currency,
            category: this.category,
            method: this.method,
            donationDate: this.donationDate,
            referenceNumber: this.referenceNumber,
            notes: this.notes,
            metadata: this.metadata,
            isAnonymous: this.isAnonymous,
            isPledgePayment: this.isPledgePayment,
            donorName: this.donorName,
            pledgeAmount: this.pledgeAmount,
            pledgeStatus: this.pledgeStatus,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

function normalizeDate(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) {
        if (Number.isNaN(value.getTime())) return null;
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }
    return String(value).slice(0, 10);
}

Donation.VALID_CATEGORIES = VALID_CATEGORIES;
Donation.VALID_METHODS = VALID_METHODS;

module.exports = Donation;