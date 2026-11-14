class Partner {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.businessId = data.business_id;
    this.partnerCode = data.partner_code;
    this.walletBalance = Number(data.wallet_balance) || 0;
    this.status = data.status || 'ACTIVE';
    this.createdAt = data.created_at;
  }

  isActive() {
    return this.status === 'ACTIVE';
  }

  canWithdraw() {
    // Must be active and have at least 10,000
    return this.isActive() && this.walletBalance >= 10000;
  }
}

module.exports = Partner;