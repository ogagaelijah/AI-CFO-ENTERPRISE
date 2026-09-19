// src/domain/entities/Enrollment.js
'use strict';

const VALID_STATUSES = ['ACTIVE', 'COMPLETED', 'WITHDRAWN'];

class Enrollment {
    constructor({
        id = null,
        businessId,
        studentId,
        classId,
        term,
        session,
        status = 'ACTIVE',
        enrolledOn = new Date(),
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Enrollment requires businessId');
        }
        if (!studentId) {
            throw new Error('Enrollment requires studentId');
        }
        if (!classId) {
            throw new Error('Enrollment requires classId');
        }

        const trimmedTerm = String(term || '').trim();
        if (!trimmedTerm) {
            throw new Error('Enrollment term is required');
        }

        const trimmedSession = String(session || '').trim();
        if (!trimmedSession) {
            throw new Error('Enrollment session is required');
        }

        const normStatus = String(status).toUpperCase();
        if (!VALID_STATUSES.includes(normStatus)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        this.id = id;
        this.businessId = businessId;
        this.studentId = studentId;
        this.classId = classId;
        this.term = trimmedTerm;
        this.session = trimmedSession;
        this.status = normStatus;
        this.enrolledOn = enrolledOn ? new Date(enrolledOn) : new Date();
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

    isWithdrawn() {
        return this.status === 'WITHDRAWN';
    }

    complete() {
        this.status = 'COMPLETED';
        this.updatedAt = new Date();
        return this;
    }

    withdraw() {
        this.status = 'WITHDRAWN';
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            studentId: this.studentId,
            classId: this.classId,
            term: this.term,
            session: this.session,
            status: this.status,
            enrolledOn: this.enrolledOn,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

Enrollment.VALID_STATUSES = VALID_STATUSES;

module.exports = Enrollment;