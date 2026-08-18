// src/domain/entities/Income.js

class Income {
    constructor({
        id,
        businessId,
        sourceType, // COMMISSION, GIFT, INTEREST, RENT, GRANT, OTHER
        amount,
        description = '',
        paymentStatus = 'PAID', // PAID, PARTIAL, UNPAID
        transactionId = null,
        customerId = null,
        customerType = null,
        date = new Date(),
        dueDate = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.sourceType = sourceType;
        this.amount = amount;
        this.description = description;
        this.paymentStatus = paymentStatus;
        this.transactionId = transactionId;
        this.customerId = customerId;
        this.customerType = customerType;
        this.date = date;
        this.dueDate = dueDate;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isPaid() {
        return this.paymentStatus === 'PAID';
    }

    isUnpaid() {
        return this.paymentStatus === 'UNPAID' || this.paymentStatus === 'PARTIAL';
    }

    markAsPaid() {
        this.paymentStatus = 'PAID';
        this.updatedAt = new Date();
        return this;
    }

    getBalanceRemaining() {
        if (this.paymentStatus === 'PAID') return 0;
        return this.amount - (this.metadata?.amountPaid || 0);
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            sourceType: this.sourceType,
            amount: this.amount,
            description: this.description,
            paymentStatus: this.paymentStatus,
            transactionId: this.transactionId,
            customerId: this.customerId,
            customerType: this.customerType,
            date: this.date,
            dueDate: this.dueDate,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Income;