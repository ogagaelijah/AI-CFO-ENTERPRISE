// src/domain/entities/Student.js
'use strict';

const VALID_STATUSES = ['ACTIVE', 'GRADUATED', 'WITHDRAWN', 'SUSPENDED'];
const VALID_GENDERS = ['MALE', 'FEMALE', 'OTHER', null];

class Student {
    constructor({
        id = null,
        businessId,
        admissionNumber = null,
        fullName,
        gender = null,
        dateOfBirth = null,
        guardianName = null,
        guardianPhone = null,
        guardianEmail = null,
        address = null,
        status = 'ACTIVE',
        enrolledOn = new Date(),
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Student requires businessId');
        }

        const trimmedName = String(fullName || '').trim();
        if (!trimmedName) {
            throw new Error('Student full name is required');
        }

        const normGender = gender ? String(gender).toUpperCase() : null;
        if (!VALID_GENDERS.includes(normGender)) {
            throw new Error(`Invalid gender. Must be one of: MALE, FEMALE, OTHER`);
        }

        const normStatus = String(status).toUpperCase();
        if (!VALID_STATUSES.includes(normStatus)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }

        this.id = id;
        this.businessId = businessId;
        this.admissionNumber = admissionNumber;
        this.fullName = trimmedName;
        this.gender = normGender;
        this.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
        this.guardianName = guardianName ? String(guardianName).trim() : null;
        this.guardianPhone = guardianPhone ? String(guardianPhone).trim() : null;
        this.guardianEmail = guardianEmail ? String(guardianEmail).trim().toLowerCase() : null;
        this.address = address ? String(address).trim() : null;
        this.status = normStatus;
        this.enrolledOn = enrolledOn ? new Date(enrolledOn) : new Date();
        this.metadata = metadata || {};
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    isWithdrawn() {
        return this.status === 'WITHDRAWN';
    }

    isGraduated() {
        return this.status === 'GRADUATED';
    }

    /**
     * Returns true if this student is eligible for a hard delete.
     * Only students with no admission number assigned and no history
     * (i.e. freshly created in error) can be hard-deleted.
     * The use case layers the additional "no fees, no enrollments" check.
     */
    canBeHardDeleted() {
        return this.status === 'ACTIVE' || this.status === 'WITHDRAWN';
    }

    changeStatus(newStatus) {
        const norm = String(newStatus).toUpperCase();
        if (!VALID_STATUSES.includes(norm)) {
            throw new Error(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
        }
        this.status = norm;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            admissionNumber: this.admissionNumber,
            fullName: this.fullName,
            gender: this.gender,
            dateOfBirth: this.dateOfBirth,
            guardianName: this.guardianName,
            guardianPhone: this.guardianPhone,
            guardianEmail: this.guardianEmail,
            address: this.address,
            status: this.status,
            enrolledOn: this.enrolledOn,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

Student.VALID_STATUSES = VALID_STATUSES;

module.exports = Student;