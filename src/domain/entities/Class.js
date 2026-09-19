// src/domain/entities/Class.js
'use strict';

const VALID_STATUSES = ['ACTIVE', 'ARCHIVED'];

class Class {
    constructor({
        id = null,
        businessId,
        name,
        level = null,
        termFee = 0,
        description = '',
        status = 'ACTIVE',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Class requires businessId');
        }

        const trimmedName = String(name || '').trim();
        if (!trimmedName) {
            throw new Error('Class name is required');
        }

        const fee = Number(termFee);
        if (!Number.isFinite(fee) || fee < 0) {
            throw new Error('termFee must be a non-negative number');
        }

        const normStatus = String(status).toUpperCase();
        if (!VALID_STATUSES.includes(normStatus)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        this.id = id;
        this.businessId = businessId;
        this.name = trimmedName;
        this.level = level ? String(level).trim() : null;
        this.termFee = Math.round(fee * 100) / 100;
        this.description = String(description || '').trim();
        this.status = normStatus;
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    isArchived() {
        return this.status === 'ARCHIVED';
    }

    archive() {
        this.status = 'ARCHIVED';
        this.updatedAt = new Date();
        return this;
    }

    reactivate() {
        this.status = 'ACTIVE';
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            name: this.name,
            level: this.level,
            termFee: this.termFee,
            description: this.description,
            status: this.status,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

Class.VALID_STATUSES = VALID_STATUSES;

module.exports = Class;