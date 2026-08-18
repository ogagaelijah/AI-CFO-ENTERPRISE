// src/domain/entities/Transaction.js

class Transaction {
    constructor({
        id,
        businessId,
        type, // SALE, INCOME, PURCHASE, EXPENSE, PAYMENT_IN, PAYMENT_OUT
        category,
        amount,
        description = '',
        paymentStatus = 'N/A', // PAID, PARTIAL, UNPAID, N/A
        referenceId = null,
        referenceType = null, // SALE, INCOME, PURCHASE, EXPENSE
        date = new Date(),
        dueDate = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.type = type;
        this.category = category;
        this.amount = amount;
        this.description = description;
        this.paymentStatus = paymentStatus;
        this.referenceId = referenceId;
        this.referenceType = referenceType;
        this.date = date;
        this.dueDate = dueDate;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isIncome() {
        return this.type === 'SALE' || this.type === 'INCOME' || this.type === 'PAYMENT_IN';
    }

    isExpense() {
        return this.type === 'PURCHASE' || this.type === 'EXPENSE' || this.type === 'PAYMENT_OUT';
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

    markAsPartial(amountPaid) {
        this.paymentStatus = 'PARTIAL';
        this.metadata = { ...this.metadata, amountPaid };
        this.updatedAt = new Date();
        return this;
    }

    isOverdue() {
        if (!this.dueDate) return false;
        return new Date() > new Date(this.dueDate) && this.isUnpaid();
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            type: this.type,
            category: this.category,
            amount: this.amount,
            description: this.description,
            paymentStatus: this.paymentStatus,
            referenceId: this.referenceId,
            referenceType: this.referenceType,
            date: this.date,
            dueDate: this.dueDate,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Transaction;