// src/domain/entities/Debtor.js

class Debtor {
    constructor({
        id,
        businessId,
        referenceType, // SALE, INCOME
        referenceId,
        customerId,
        customerType = 'CUSTOMER', // CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
        originalAmount,
        amountPaid = 0,
        balanceRemaining,
        status = 'ACTIVE', // ACTIVE, PAID, OVERDUE
        dueDate = null,
        lastPaymentDate = null,
        notes = '',
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.customerId = customerId;
        this.customerType = customerType;
        this.originalAmount = originalAmount;
        this.amountPaid = amountPaid;
        this.balanceRemaining = balanceRemaining !== undefined ? balanceRemaining : originalAmount - amountPaid;
        this.status = status;
        this.dueDate = dueDate;
        this.lastPaymentDate = lastPaymentDate;
        this.notes = notes;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getBalance() {
        return this.balanceRemaining;
    }

    isFullyPaid() {
        return this.status === 'PAID' || this.balanceRemaining <= 0;
    }

    isOverdue() {
        if (this.isFullyPaid()) return false;
        if (!this.dueDate) return false;
        return new Date() > new Date(this.dueDate);
    }

    receivePayment(amount) {
        if (amount <= 0) throw new Error('Payment amount must be positive');
        if (amount > this.balanceRemaining) throw new Error('Payment exceeds balance');

        this.amountPaid += amount;
        this.balanceRemaining -= amount;
        this.lastPaymentDate = new Date();
        this.updatedAt = new Date();

        if (this.balanceRemaining <= 0) {
            this.status = 'PAID';
        } else if (this.isOverdue()) {
            this.status = 'OVERDUE';
        } else {
            this.status = 'ACTIVE';
        }

        return this;
    }

    markAsOverdue() {
        if (!this.isFullyPaid()) {
            this.status = 'OVERDUE';
            this.updatedAt = new Date();
        }
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            referenceType: this.referenceType,
            referenceId: this.referenceId,
            customerId: this.customerId,
            customerType: this.customerType,
            originalAmount: this.originalAmount,
            amountPaid: this.amountPaid,
            balanceRemaining: this.balanceRemaining,
            status: this.status,
            dueDate: this.dueDate,
            lastPaymentDate: this.lastPaymentDate,
            notes: this.notes,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Debtor;