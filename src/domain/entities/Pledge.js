// src/domain/entities/Pledge.js
// v1.0.0-prod — Pledge domain entity. Pure data + rules.
//
// A Pledge is a donor's commitment to give a specific amount, possibly
// by a certain date. It is NOT a receivable. It becomes income only
// when an actual donation is recorded (and optionally linked to this pledge).
//
// Design:
//   - amount_fulfilled grows as linked donations arrive.
//   - status auto-flips to FULFILLED when amount_fulfilled >= amount.
//   - isOverdue is computed: due_date < today AND status === 'ACTIVE'
//     AND amount_fulfilled < amount.

'use strict';

const VALID_STATUSES = ['ACTIVE', 'FULFILLED', 'CANCELLED', 'OVERDUE'];

const ALLOWED_TRANSITIONS = {
    ACTIVE:    ['FULFILLED', 'CANCELLED', 'OVERDUE'],
    OVERDUE:   ['FULFILLED', 'CANCELLED'],
    FULFILLED: [],
    CANCELLED: [],
};

const VALID_CATEGORIES = [
    'TITHE', 'OFFERING', 'ZAKAT', 'SADAQAH', 'SEED',
    'BUILDING_FUND', 'MISSIONS', 'WELFARE', 'PLEDGE_PAYMENT',
    'GENERAL', 'OTHER',
];

class Pledge {
    constructor({
        id = null,
        businessId,
        donorId = null,
        amount = 0,
        amountFulfilled = 0,
        currency = 'NGN',
        category = 'GENERAL',
        status = 'ACTIVE',
        pledgeDate = null,
        dueDate = null,
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
        // Relation display fields (from JOIN in PledgeRepository)
        donorName = null,
    }) {
        if (!businessId) throw new Error('Pledge requires businessId');
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        if (!VALID_CATEGORIES.includes(category)) {
            throw new Error(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
        }

        const amt = Number(amount) || 0;
        const fulfilled = Number(amountFulfilled) || 0;
        if (amt <= 0) throw new Error('Pledge amount must be positive');
        if (fulfilled < 0) throw new Error('amountFulfilled cannot be negative');
        if (fulfilled > amt) throw new Error('amountFulfilled cannot exceed amount');

        this.id = id;
        this.businessId = businessId;
        this.donorId = donorId;
        this.amount = round2(amt);
        this.amountFulfilled = round2(fulfilled);
        this.currency = currency || 'NGN';
        this.category = category;
        this.status = status;
        this.pledgeDate = normalizeDate(pledgeDate);
        this.dueDate = normalizeDate(dueDate);
        this.notes = notes || '';
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.donorName = donorName;
    }

    // ── Computed ──

    get balance() {
        const b = this.amount - this.amountFulfilled;
        return b > 0 ? round2(b) : 0;
    }

    get isFullyFulfilled() {
        return this.amountFulfilled >= this.amount;
    }

    get progressPercent() {
        if (this.amount === 0) return 0;
        return Math.min(100, Math.round((this.amountFulfilled / this.amount) * 100));
    }

    get isOverdue() {
        if (!this.dueDate) return false;
        if (this.status === 'CANCELLED') return false;
        if (this.status === 'FULFILLED') return false;
        if (this.isFullyFulfilled) return false;
        const today = new Date().toISOString().slice(0, 10);
        return this.dueDate < today;
    }

    // ── Behavior ──

    updateStatus(next) {
        if (!VALID_STATUSES.includes(next)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        if (next === this.status) {
            this.updatedAt = new Date();
            return this;
        }
        const allowed = ALLOWED_TRANSITIONS[this.status] || [];
        if (!allowed.includes(next)) {
            throw new Error(
                `Cannot transition pledge from ${this.status} to ${next}. Allowed: ${allowed.join(', ') || '(terminal state)'}`
            );
        }
        this.status = next;
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Apply a donation toward this pledge.
     * Increments amountFulfilled; flips to FULFILLED when settled.
     * Throws if this would exceed the pledge amount, or if the pledge
     * is in a terminal state (CANCELLED).
     */
    applyDonation(amount) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Donation amount must be a positive number');
        }
        if (this.status === 'CANCELLED') {
            throw new Error('Cannot apply donation to a cancelled pledge');
        }
        if (this.status === 'FULFILLED') {
            throw new Error('Pledge is already fully fulfilled');
        }
        if (amt > this.balance) {
            throw new Error(
                `Donation exceeds remaining pledge balance (${this.currency} ${this.balance})`
            );
        }
        this.amountFulfilled = round2(this.amountFulfilled + amt);
        if (this.isFullyFulfilled) {
            this.status = 'FULFILLED';
        }
        this.updatedAt = new Date();
        return this;
    }

    /**
     * Reverse a donation (used when a donation is deleted or edited down).
     * Decrements amountFulfilled; flips back from FULFILLED to ACTIVE if needed.
     */
    reverseDonation(amount) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Reversal amount must be a positive number');
        }
        const newFulfilled = Math.max(0, this.amountFulfilled - amt);
        this.amountFulfilled = round2(newFulfilled);
        if (this.status === 'FULFILLED' && this.amountFulfilled < this.amount) {
            this.status = 'ACTIVE';
        }
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            donorId: this.donorId,
            amount: this.amount,
            amountFulfilled: this.amountFulfilled,
            balance: this.balance,
            progressPercent: this.progressPercent,
            currency: this.currency,
            category: this.category,
            status: this.status,
            pledgeDate: this.pledgeDate,
            dueDate: this.dueDate,
            notes: this.notes,
            metadata: this.metadata,
            isFullyFulfilled: this.isFullyFulfilled,
            isOverdue: this.isOverdue,
            donorName: this.donorName,
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

Pledge.VALID_STATUSES = VALID_STATUSES;
Pledge.VALID_CATEGORIES = VALID_CATEGORIES;
Pledge.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

module.exports = Pledge;