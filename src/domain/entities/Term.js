// src/domain/entities/Term.js
'use strict';

const VALID_STATUSES = ['ACTIVE', 'COMPLETED'];

class Term {
    constructor({
        id = null,
        businessId,
        name,
        session,
        startDate,
        endDate,
        status = 'ACTIVE',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Term requires businessId');
        }

        const trimmedName = String(name || '').trim();
        if (!trimmedName) {
            throw new Error('Term name is required');
        }

        const trimmedSession = String(session || '').trim();
        if (!trimmedSession) {
            throw new Error('Term session is required');
        }

        if (!startDate) {
            throw new Error('Term start date is required');
        }
        if (!endDate) {
            throw new Error('Term end date is required');
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime())) {
            throw new Error('Invalid start date');
        }
        if (isNaN(end.getTime())) {
            throw new Error('Invalid end date');
        }
        if (end < start) {
            throw new Error('End date cannot be before start date');
        }

        const normStatus = String(status).toUpperCase();
        if (!VALID_STATUSES.includes(normStatus)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        this.id = id;
        this.businessId = businessId;
        this.name = trimmedName;
        this.session = trimmedSession;
        this.startDate = start;
        this.endDate = end;
        this.status = normStatus;
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    isCompleted() {
        return this.status === 'COMPLETED';
    }

    /** True if the given date falls within [startDate, endDate]. */
    containsDate(date) {
        if (!date) return false;
        const d = new Date(date);
        if (isNaN(d.getTime())) return false;
        return d >= this.startDate && d <= this.endDate;
    }

    complete() {
        this.status = 'COMPLETED';
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            name: this.name,
            session: this.session,
            startDate: this.startDate,
            endDate: this.endDate,
            status: this.status,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

Term.VALID_STATUSES = VALID_STATUSES;

module.exports = Term;