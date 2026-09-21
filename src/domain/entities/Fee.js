// src/domain/entities/Fee.js
// v1.1.0-prod — toJSON now includes relation display fields
//               (studentName, admissionNumber, termName, termSession,
//                className) that FeeRepository attaches via JOIN.

'use strict';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

const ALLOWED_TRANSITIONS = {
    DRAFT:     ['SENT', 'CANCELLED'],
    SENT:      ['PAID', 'OVERDUE', 'CANCELLED'],
    OVERDUE:   ['PAID', 'CANCELLED'],
    PAID:      [],
    CANCELLED: [],
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
        // Relation display fields (populated by FeeRepository via JOIN).
        // These are NOT stored on the fee row itself.
        studentName = null,
        admissionNumber = null,
        termName = null,
        termSession = null,
        className = null,
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

        // Display-only fields (may be null if no JOIN data available).
        this.studentName = studentName;
        this.admissionNumber = admissionNumber;
        this.termName = termName;
        this.termSession = termSession;
        this.className = className;
    }

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
        if (this.status === 'DRAFT') return false;
        const today = new Date().toISOString().slice(0, 10);
        return this.dueDate < today;
    }

    updateStatus(next) {
        if (!VALID_STATUSES.includes(next)) {
            throw new Error(
                `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
            );
        }
        if (next === this.status) {
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
            // Relation display fields (from JOIN in FeeRepository).
            studentName: this.studentName,
            admissionNumber: this.admissionNumber,
            termName: this.termName,
            termSession: this.termSession,
            className: this.className,
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

Fee.VALID_STATUSES = VALID_STATUSES;
Fee.ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

module.exports = Fee;