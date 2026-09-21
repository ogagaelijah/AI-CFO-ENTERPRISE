// src/domain/entities/Fee.js
// v1.0.0-prod — Fee domain entity. Pure data + rules. No DB or HTTP.
//
// A Fee is a charge issued to a student for a term. It has its own
// lifecycle (DRAFT → SENT → PAID / OVERDUE / CANCELLED) and its own
// numbering (FEE-NNNN, per business).
//
// Design decisions baked in:
//   - One fee per (business, student, term) — enforced at DB level,
//     not in the entity (the entity has no visibility into the table).
//   - `amount` is the total charge; `amountPaid` accumulates.
//   - `balance` is a getter — never stored.
//   - Status transitions have explicit valid paths; illegal jumps throw.
//   - `classId` is optional (which class the fee originated from).

'use strict';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

// Legal status transitions. Key = current, value = array of allowed next states.
// Rules mirror the invoice pattern so users get consistent UX.
const ALLOWED_TRANSITIONS = {
    DRAFT:     ['SENT', 'CANCELLED'],
    SENT:      ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE:   ['PAID', 'CANCELLED'],
    PAID:      [], // terminal
    CANCELLED: [], // terminal
};

class Fee {
    constructor({
        id = null,
        businessId,
        studentId,
        termId,
        classId = null,
        feeNumber = null,
        description = '',
        amount = 0,
        amountPaid = 0,
        currency = 'NGN',
        status = 'DRAFT',
        issueDate = null,
        dueDate = null,
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Fee requires businessId');
        }
        if (!studentId) {
            throw new Error('Fee requires studentId');
        }
        if (!termId) {
            throw new Error('Fee requires termId');
        }
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(
                `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            );
        }

        const amt = Number(amount) || 0;
        const paid = Number(amountPaid) || 0;
        if (amt < 0) throw new Error('Fee amount cannot be negative');
        if (paid < 0) throw new Error('Fee amountPaid cannot be negative');

        this.id = id;
        this.businessId = businessId;
        this.studentId = studentId;
        this.termId = termId;
        this.classId = classId;
        this.feeNumber = feeNumber;
        this.description = description || '';
        this.amount = round2(amt);
        this.amountPaid = round2(paid);
        this.currency = currency || 'NGN';
        this.status = status;
        this.issueDate = normalizeDate(issueDate);
        this.dueDate = normalizeDate(dueDate);
        this.notes = notes || '';
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // ── Computed properties (never stored) ──

    get balance() {
        const b = this.amount - this.amountPaid;
        return b > 0 ? round2(b) : 0;
    }

    get isPaid() {
        return this.amount > 0 && this.amountPaid >= this.amount;
    }

    get isOverdue() {
        if (!this.dueDate) return false;
        if (this.isPaid) return false;
        if (this.status === 'CANCELLED') return false;
        if (this.status === 'DRAFT') return false; // DRAFT fees aren't overdue
        // Compare calendar dates — both are 'YYYY-MM-DD' strings.
        const today = new Date().toISOString().slice(0, 10);
        return this.dueDate < today;
    }

    // ── Behavior ──

    updateStatus(next) {
        if (!VALID_STATUSES.includes(next)) {
            throw new Error(
                `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            );
        }
        if (next === this.status) {
            // No-op; still refresh updatedAt for auditing.
            this.updatedAt = new Date();
            return this;
        }
        const allowed = ALLOWED_TRANSITIONS[this.status] || [];
        if (!allowed.includes(next)) {
            throw new Error(
                `Cannot transition fee from ${this.status} to ${next}. Allowed: ${allowed.join(', ') || '(terminal state)'}`
            );
        }
        this.status = next;
        this.updatedAt = new Date();
        return this;
    }

    recordPayment(amount) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Payment amount must be a positive number');
        }
        if (this.status === 'CANCELLED') {
            throw new Error('Cannot record payment on a cancelled fee');
        }
        if (this.status === 'DRAFT') {
            throw new Error('Cannot record payment on a DRAFT fee. Send it first.');
        }
        if (amt > this.balance) {
            throw new Error(
                `Payment exceeds outstanding balance (${this.currency} ${this.balance})`
            );
        }
        this.amountPaid = round2(this.amountPaid + amt);
        if (this.isPaid) {
            this.status = 'PAID';
        }
        this.updatedAt = new Date();
        return this;
    }

    setNumber(feeNumber) {
        if (!feeNumber || !String(feeNumber).trim()) {
            throw new Error('Fee number cannot be empty');
        }
        this.feeNumber = String(feeNumber).trim();
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            studentId: this.studentId,
            termId: this.termId,
            classId: this.classId,
            feeNumber: this.feeNumber,
            description: this.description,
            amount: this.amount,
            amountPaid: this.amountPaid,
            balance: this.balance,
            currency: this.currency,
            status: this.status,
            issueDate: this.issueDate,
            dueDate: this.dueDate,
            notes: this.notes,
            metadata: this.metadata,
            isPaid: this.isPaid,
            isOverdue: this.isOverdue,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

// ── helpers ──

function round2(n) {
    const v = Number(n) || 0;
    return Math.round(v * 100) / 100;
}

// Date columns are DATE (not TIMESTAMPTZ). Return 'YYYY-MM-DD' strings
// so no timezone drift can occur anywhere downstream.
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

Fee.VALID_STATUSES = VALID_STATUSES;
Fee.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

module.exports = Fee;