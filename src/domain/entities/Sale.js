// src/domain/entities/Sale.js

class Sale {
    constructor({
        id,
        businessId,
        invoiceNumber,
        customerId = null,
        customerType = 'CUSTOMER', // CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
        totalAmount,
        discount = 0,
        tax = 0,
        paymentStatus = 'UNPAID', // PAID, PARTIAL, UNPAID
        transactionId = null,
        items = [],
        notes = '',
        saleDate = new Date(),
        dueDate = null,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.invoiceNumber = invoiceNumber;
        this.customerId = customerId;
        this.customerType = customerType;
        this.totalAmount = totalAmount;
        this.discount = discount;
        this.tax = tax;
        this.paymentStatus = paymentStatus;
        this.transactionId = transactionId;
        this.items = items;
        this.notes = notes;
        this.saleDate = saleDate;
        this.dueDate = dueDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getSubtotal() {
        return this.totalAmount - this.discount + this.tax;
    }

    getAmountPaid() {
        return this.metadata?.amountPaid || 0;
    }

    getBalanceRemaining() {
        return this.totalAmount - this.getAmountPaid();
    }

    isFullyPaid() {
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

    addItem(item) {
        this.items.push(item);
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            invoiceNumber: this.invoiceNumber,
            customerId: this.customerId,
            customerType: this.customerType,
            totalAmount: this.totalAmount,
            discount: this.discount,
            tax: this.tax,
            paymentStatus: this.paymentStatus,
            transactionId: this.transactionId,
            items: this.items,
            notes: this.notes,
            saleDate: this.saleDate,
            dueDate: this.dueDate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Sale;