class Payment {
  constructor({
    id,
    businessId,
    userId,
    amount,
    paymentDate,
    paymentMethod,
    referenceType, // 'SALE', 'PURCHASE', 'INCOME', 'DEBTOR', 'CREDITOR', 'EXPENSE'
    referenceId,
    notes,
    createdAt
  }) {
    this.id = id;
    this.businessId = businessId;
    this.userId = userId;
    this.amount = parseFloat(amount);
    this.paymentDate = paymentDate;
    this.paymentMethod = paymentMethod; // 'CASH', 'BANK', 'TRANSFER', 'POS'
    this.referenceType = referenceType;
    this.referenceId = referenceId;
    this.notes = notes;
    this.createdAt = createdAt;
  }

  isCashIn() {
    return ['SALE', 'INCOME', 'DEBTOR'].includes(this.referenceType);
  }

  isCashOut() {
    return ['PURCHASE', 'CREDITOR', 'EXPENSE'].includes(this.referenceType);
  }
}

module.exports = Payment;