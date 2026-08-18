// src/domain/entities/Payment.js

class Payment {
    constructor({
        id,
        businessId,
        type, // IN, OUT
        amount,
        referenceType, // DEBTOR, CREDITOR, SALE, PURCHASE, INCOME, EXPENSE
        referenceId = null,
        date = new Date(),
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.type = type;
        this.amount = amount;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.date = date;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isCashIn() {
        return this.type === 'IN';
    }

    isCashOut() {
        return this.type === 'OUT';
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            type: this.type,
            amount: this.amount,
            referenceType: this.referenceType,
            referenceId: this.referenceId,
            date: this.date,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Payment;