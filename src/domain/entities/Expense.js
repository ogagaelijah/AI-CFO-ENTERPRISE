// src/domain/entities/Expense.js

class Expense {
    constructor({
        id,
        businessId,
        category, // SALARY, RENT, TRANSPORT, UTILITIES, MARKETING, INSURANCE, OTHER
        amount,
        description = '',
        date = new Date(),
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.category = category;
        this.amount = amount;
        this.description = description;
        this.date = date;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            category: this.category,
            amount: this.amount,
            description: this.description,
            date: this.date,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Expense;