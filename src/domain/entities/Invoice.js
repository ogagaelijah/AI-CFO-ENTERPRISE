// src/domain/entities/Invoice.js
// v1.1.0-prod — Added customerName so the API response carries the
//               resolved customer name (from InvoiceRepository JOIN).
'use strict';

const VALID_STATUSES = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'];

class Invoice {
    constructor({
        id = null,
        businessId,
        customerId = null,
        customerName = null,          // NEW — resolved via JOIN in repository
        projectId = null,
        invoiceNumber = null,
        issueDate = new Date(),
        dueDate = null,
        status = 'DRAFT',
        subtotal = 0,
        tax = 0,
        total = 0,
        amountPaid = 0,
        currency = 'NGN',
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Invoice requires businessId');
        }

        this.id = id;
        this.businessId = businessId;
        this.customerId = customerId;
        this.customerName = customerName;     // NEW
        this.projectId = projectId;
        this.invoiceNumber = invoiceNumber;
        this.issueDate = issueDate;
        this.dueDate = dueDate;
        this.status = status;
        this.subtotal = Number(subtotal) || 0;
        this.tax = Number(tax) || 0;
        this.total = Number(total) || 0;
        this.amountPaid = Number(amountPaid) || 0;
        this.currency = currency;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    get balance() {
        const b = this.total - this.amountPaid;
        return b > 0 ? Math.round(b * 100) / 100 : 0;
    }

    get isPaid() {
        return this.total > 0 && this.amountPaid >= this.total;
    }

    get isOverdue() {
        if (!this.dueDate) return false;
        if (this.isPaid || this.status === 'CANCELLED') return false;
        return new Date() > new Date(this.dueDate);
    }

    updateStatus(status) {
        if (!VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        this.status = status;
        this.updatedAt = new Date();
        return this;
    }

    recordPayment(amount) {
        const amt = Number(amount);
        if (!Number.isFinite(amt) || amt <= 0) {
            throw new Error('Payment amount must be a positive number');
        }
        if (amt > this.balance) {
            throw new Error('Payment exceeds outstanding balance');
        }
        this.amountPaid = Math.round((this.amountPaid + amt) * 100) / 100;
        if (this.isPaid) this.status = 'PAID';
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            customerId: this.customerId,
            customerName: this.customerName,   // NEW
            projectId: this.projectId,
            invoiceNumber: this.invoiceNumber,
            issueDate: this.issueDate,
            dueDate: this.dueDate,
            status: this.status,
            subtotal: this.subtotal,
            tax: this.tax,
            total: this.total,
            amountPaid: this.amountPaid,
            balance: this.balance,
            currency: this.currency,
            isPaid: this.isPaid,
            isOverdue: this.isOverdue,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

Invoice.VALID_STATUSES = VALID_STATUSES;

module.exports = Invoice;