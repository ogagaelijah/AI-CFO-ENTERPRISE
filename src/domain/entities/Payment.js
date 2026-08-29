// src/domain/entities/Payment.js

class Payment {
  constructor({
    id,
    businessId,
    userId,
    type, // 'IN' or 'OUT'
    amount,
    referenceType, // 'SALE', 'PURCHASE', 'INCOME', 'DEBTOR', 'CREDITOR', 'EXPENSE', 'MANUAL'
    referenceId,
    paymentDate = new Date(),
    paymentMethod = 'CASH', // 'CASH', 'BANK', 'TRANSFER', 'POS', 'MOBILE_MONEY', 'CHEQUE'
    referenceNumber = null,
    notes = '',
    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id || null;
    this.businessId = businessId;
    this.userId = userId;
    this.type = type;
    this.amount = parseFloat(amount);
    this.referenceType = referenceType;
    this.referenceId = referenceId;
    this.paymentDate = paymentDate;
    this.paymentMethod = paymentMethod;
    this.referenceNumber = referenceNumber;
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

  getFormattedAmount() {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(this.amount);
  }

  toJSON() {
    return {
      id: this.id,
      businessId: this.businessId,
      userId: this.userId,
      type: this.type,
      amount: this.amount,
      referenceType: this.referenceType,
      referenceId: this.referenceId,
      paymentDate: this.paymentDate,
      paymentMethod: this.paymentMethod,
      referenceNumber: this.referenceNumber,
      notes: this.notes,
      metadata: this.metadata,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Payment;