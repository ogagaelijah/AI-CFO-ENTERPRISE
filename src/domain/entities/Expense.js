// src/domain/entities/Expense.js

class Expense {
    constructor({
        id,
        businessId,
        expenseType, // SALARY, RENT, TRANSPORT, UTILITIES, MARKETING, INSURANCE, OTHER
        amount,
        description = '',
        paymentStatus = 'PAID', // PAID, PARTIAL, UNPAID
        transactionId = null,
        supplierId = null,
        date = new Date(),
        dueDate = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.expenseType = expenseType;
        this.amount = amount;
        this.description = description;
        this.paymentStatus = paymentStatus;
        this.transactionId = transactionId;
        this.supplierId = supplierId;
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
            expenseType: this.expenseType,
            amount: this.amount,
            description: this.description,
            paymentStatus: this.paymentStatus,
            transactionId: this.transactionId,
            supplierId: this.supplierId,
            date: this.date,
            dueDate: this.dueDate,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Expense;