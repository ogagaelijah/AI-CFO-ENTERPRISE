// src/domain/entities/Project.js

class Project {
    constructor({
        id,
        businessId,
        name,
        description = '',
        status = 'ACTIVE', // ACTIVE, COMPLETED, ON_HOLD, CANCELLED
        budget = 0,
        startDate = new Date(),
        endDate = null,
        customerId = null,
        customerType = null,
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.name = name;
        this.description = description;
        this.status = status;
        this.budget = budget;
        this.startDate = startDate;
        this.endDate = endDate;
        this.customerId = customerId;
        this.customerType = customerType;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isActive() {
        return this.status === 'ACTIVE';
    }

    isCompleted() {
        return this.status === 'COMPLETED';
    }

    isOnHold() {
        return this.status === 'ON_HOLD';
    }

    isOverdue() {
        if (!this.endDate) return false;
        return new Date() > new Date(this.endDate) && !this.isCompleted();
    }

    completeProject() {
        this.status = 'COMPLETED';
        this.endDate = new Date();
        this.updatedAt = new Date();
        return this;
    }

    updateStatus(status) {
        const validStatuses = ['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
        }
        this.status = status;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            name: this.name,
            description: this.description,
            status: this.status,
            budget: this.budget,
            startDate: this.startDate,
            endDate: this.endDate,
            customerId: this.customerId,
            customerType: this.customerType,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Project;