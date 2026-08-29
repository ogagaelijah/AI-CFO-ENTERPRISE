// src/domain/entities/Income.js

class Income {
    constructor({
        id,
        businessId,
        source, // COMMISSION, INTEREST, RENT, GRANT, GIFT, DIVIDEND, OTHER
        amount,
        description = '',
        date = new Date(),
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.source = source;
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
            source: this.source,
            amount: this.amount,
            description: this.description,
            date: this.date,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Income;