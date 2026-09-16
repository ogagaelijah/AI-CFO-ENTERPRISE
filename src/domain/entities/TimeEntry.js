// src/domain/entities/TimeEntry.js
'use strict';

class TimeEntry {
    constructor({
        id = null,
        businessId,
        projectId = null,
        customerId = null,
        entryDate = new Date(),
        hours,
        rate = 0,
        description = '',
        billable = true,
        invoiced = false,
        invoiceId = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('TimeEntry requires businessId');
        }

        const h = Number(hours);
        if (!Number.isFinite(h) || h <= 0) {
            throw new Error('TimeEntry hours must be a positive number');
        }
        if (h > 24) {
            throw new Error('TimeEntry hours cannot exceed 24 in a single entry');
        }

        const r = Number(rate);
        if (!Number.isFinite(r) || r < 0) {
            throw new Error('TimeEntry rate cannot be negative');
        }

        this.id = id;
        this.businessId = businessId;
        this.projectId = projectId;
        this.customerId = customerId;
        this.entryDate = entryDate;
        this.hours = Math.round(h * 100) / 100;
        this.rate = Math.round(r * 100) / 100;
        this.description = description;
        this.billable = Boolean(billable);
        this.invoiced = Boolean(invoiced);
        this.invoiceId = invoiceId;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    get amount() {
        if (!this.billable) return 0;
        return Math.round(this.hours * this.rate * 100) / 100;
    }

    canBeInvoiced() {
        return this.billable && !this.invoiced;
    }

    markInvoiced(invoiceId) {
        if (!invoiceId) {
            throw new Error('invoiceId is required to mark as invoiced');
        }
        if (this.invoiced) {
            throw new Error('TimeEntry is already invoiced');
        }
        if (!this.billable) {
            throw new Error('Non-billable time cannot be invoiced');
        }
        this.invoiced = true;
        this.invoiceId = invoiceId;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            projectId: this.projectId,
            customerId: this.customerId,
            entryDate: this.entryDate,
            hours: this.hours,
            rate: this.rate,
            amount: this.amount,
            description: this.description,
            billable: this.billable,
            invoiced: this.invoiced,
            invoiceId: this.invoiceId,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = TimeEntry;