// src/domain/entities/Purchase.js

class Purchase {
    constructor({
        id,
        businessId,
        invoiceNumber,
        supplierId = null,
        totalAmount,
        paymentStatus = 'UNPAID', // PAID, PARTIAL, UNPAID
        transactionId = null,
        items = [],
        notes = '',
        purchaseDate = new Date(),
        dueDate = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.invoiceNumber = invoiceNumber;
        this.supplierId = supplierId;
        this.totalAmount = totalAmount;
        this.paymentStatus = paymentStatus;
        this.transactionId = transactionId;
        this.items = items;
        this.notes = notes;
        this.purchaseDate = purchaseDate;
        this.dueDate = dueDate;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
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
            supplierId: this.supplierId,
            totalAmount: this.totalAmount,
            paymentStatus: this.paymentStatus,
            transactionId: this.transactionId,
            items: this.items,
            notes: this.notes,
            purchaseDate: this.purchaseDate,
            dueDate: this.dueDate,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Purchase;