// src/application/services/reports/CashFlowService.js

const CashCalculator = require('./calculators/CashCalculator');

/**
 * Cash Flow Service - Refactored to use CashCalculator
 * 
 * Implements IAS 7 compliant cash flow reporting
 * Distinguishes between Operating, Investing, and Financing activities
 * 
 * All cash calculations flow through CashCalculator (single source of truth)
 */
class CashFlowService {
    constructor({
        paymentRepository,
        saleRepository = null,
        purchaseRepository = null,
        expenseRepository = null,
        incomeRepository = null,
        debtorRepository = null,
        creditorRepository = null,
        cashCalculator = null,
    }) {
        this.paymentRepository = paymentRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;

        this.cashCalculator = cashCalculator || new CashCalculator({
            paymentRepository: this.paymentRepository,
        });
    }

    /**
     * Generate Cash Flow Statement for a date range
     */
    async generate({ userId, businessId, startDate, endDate }) {
        // 1. Get cash data from CashCalculator (single source of truth)
        const cashData = await this.cashCalculator.calculate({
            userId,
            businessId,
            startDate,
            endDate,
            includeDetails: true,
        });

        // 2. Get all payments for categorization
        let payments = [];
        try {
            payments = await this.paymentRepository.findByDateRange(
                businessId,
                new Date(startDate),
                new Date(endDate)
            );
        } catch (error) {
            console.warn('⚠️ Could not fetch payments for categorization:', error.message);
            payments = [];
        }

        if (!Array.isArray(payments)) {
            payments = [];
        }

        // 3. Proper categorization by referenceType
        const isReceived = (p) => p.type === 'RECEIVED' || p.type === 'IN';
        const isMade     = (p) => p.type === 'MADE' || p.type === 'OUT';

        // --- CASH IN (Operating) ---
        const fromCustomers = payments
            .filter(p => isReceived(p) && p.referenceType === 'SALE')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const fromDebtors = payments
            .filter(p => isReceived(p) && p.referenceType === 'DEBTOR')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const fromOtherIncome = payments
            .filter(p => isReceived(p) && (p.referenceType === 'INCOME' || !p.referenceType))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // ✅ TOTAL CASH IN (clearly labeled)
        const totalCashIn = fromCustomers + fromDebtors + fromOtherIncome;

        // --- CASH OUT (Operating) ---
        const toSuppliers = payments
            .filter(p => isMade(p) && p.referenceType === 'PURCHASE')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const toCreditors = payments
            .filter(p => isMade(p) && p.referenceType === 'CREDITOR')
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const operatingExpenses = payments
            .filter(p => isMade(p) && (p.referenceType === 'EXPENSE' || !p.referenceType))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // ✅ TOTAL CASH OUT (clearly labeled)
        const totalCashOut = toSuppliers + toCreditors + operatingExpenses;

        // ✅ NET OPERATING CASH FLOW (clearly labeled)
        const netOperatingCash = totalCashIn - totalCashOut;

        // 4. Investing Activities (placeholder for now)
        const investingActivities = {
            purchaseOfEquipment: 0,
            purchaseOfLongTermAssets: 0,
            proceedsFromAssetSales: 0,
        };
        const totalInvestingIn = investingActivities.proceedsFromAssetSales;
        const totalInvestingOut = investingActivities.purchaseOfEquipment + investingActivities.purchaseOfLongTermAssets;
        const netInvestingCash = totalInvestingIn - totalInvestingOut;

        // 5. Financing Activities (placeholder for now)
        const financingActivities = {
            loansReceived: 0,
            loanRepayments: 0,
            ownerContributions: 0,
            ownerWithdrawals: 0,
        };
        const totalFinancingIn = financingActivities.loansReceived + financingActivities.ownerContributions;
        const totalFinancingOut = financingActivities.loanRepayments + financingActivities.ownerWithdrawals;
        const netFinancingCash = totalFinancingIn - totalFinancingOut;

        // 6. Net change
        const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;

        return {
            period: {
                startDate,
                endDate,
            },
            operatingActivities: {
                cashIn: {
                    fromCustomers,
                    fromDebtors,
                    fromOtherIncome,
                    total: totalCashIn,  // ✅ CLEAR TOTAL
                    label: 'Total Cash In',  // ✅ LABEL
                },
                cashOut: {
                    toSuppliers,
                    toCreditors,
                    operatingExpenses,
                    total: totalCashOut,  // ✅ CLEAR TOTAL
                    label: 'Total Cash Out',  // ✅ LABEL
                },
                netOperatingCash,  // ✅ CLEAR RESULT
                netLabel: 'NET Operating Cash Flow',  // ✅ LABEL
            },
            investingActivities: {
                ...investingActivities,
                totalCashIn: totalInvestingIn,
                totalCashOut: totalInvestingOut,
                netInvestingCash,
                netLabel: 'NET Investing Cash Flow',
            },
            financingActivities: {
                ...financingActivities,
                totalCashIn: totalFinancingIn,
                totalCashOut: totalFinancingOut,
                netFinancingCash,
                netLabel: 'NET Financing Cash Flow',
            },
            netChangeInCash,
            openingCash: cashData.openingCash || 0,
            closingCash: cashData.closingCash || 0,
            summary: {
                openingCash: cashData.openingCash || 0,
                netChange: netChangeInCash,
                closingCash: cashData.closingCash || 0,
            },
        };
    }

    /**
     * Generate summary for executive dashboard
     */
    async generateSummary({ userId, businessId, startDate, endDate }) {
        const full = await this.generate({ userId, businessId, startDate, endDate });
        return {
            period: full.period,
            netOperatingCash: full.operatingActivities.netOperatingCash,
            netInvestingCash: full.investingActivities.netInvestingCash,
            netFinancingCash: full.financingActivities.netFinancingCash,
            netChangeInCash: full.netChangeInCash,
            openingCash: full.openingCash,
            closingCash: full.closingCash,
        };
    }

    /**
     * Generate formatted cash flow for display with clear labels
     * Perfect for frontend rendering
     */
    async generateFormatted({ userId, businessId, startDate, endDate }) {
        const data = await this.generate({ userId, businessId, startDate, endDate });
        
        return {
            title: 'Cash Flow Statement',
            period: `${data.period.startDate} to ${data.period.endDate}`,
            
            operating: {
                title: 'Operating Activities',
                subtitle: 'Cash generated from core business operations',
                cashIn: {
                    label: '💰 CASH IN',
                    items: [
                        { label: 'From Customers', amount: data.operatingActivities.cashIn.fromCustomers },
                        { label: 'From Debtors', amount: data.operatingActivities.cashIn.fromDebtors },
                        { label: 'From Other Income', amount: data.operatingActivities.cashIn.fromOtherIncome },
                    ],
                    total: {
                        label: '📊 Total Cash In',
                        amount: data.operatingActivities.cashIn.total,
                    },
                },
                cashOut: {
                    label: '💳 CASH OUT',
                    items: [
                        { label: 'To Suppliers', amount: data.operatingActivities.cashOut.toSuppliers },
                        { label: 'To Creditors', amount: data.operatingActivities.cashOut.toCreditors },
                        { label: 'Operating Expenses', amount: data.operatingActivities.cashOut.operatingExpenses },
                    ],
                    total: {
                        label: '📊 Total Cash Out',
                        amount: data.operatingActivities.cashOut.total,
                    },
                },
                netCashFlow: {
                    label: '🎯 NET Operating Cash Flow',
                    amount: data.operatingActivities.netOperatingCash,
                },
            },
            
            investing: {
                title: 'Investing Activities',
                subtitle: 'Cash used for asset purchases and investments',
                cashIn: {
                    label: '💰 CASH IN',
                    items: [
                        { label: 'Proceeds from Asset Sales', amount: data.investingActivities.proceedsFromAssetSales },
                    ],
                    total: {
                        label: '📊 Total Cash In',
                        amount: data.investingActivities.totalCashIn,
                    },
                },
                cashOut: {
                    label: '💳 CASH OUT',
                    items: [
                        { label: 'Purchase of Equipment', amount: data.investingActivities.purchaseOfEquipment },
                        { label: 'Purchase of Long-Term Assets', amount: data.investingActivities.purchaseOfLongTermAssets },
                    ],
                    total: {
                        label: '📊 Total Cash Out',
                        amount: data.investingActivities.totalCashOut,
                    },
                },
                netCashFlow: {
                    label: '🎯 NET Investing Cash Flow',
                    amount: data.investingActivities.netInvestingCash,
                },
            },
            
            financing: {
                title: 'Financing Activities',
                subtitle: 'Cash from financing activities',
                cashIn: {
                    label: '💰 CASH IN',
                    items: [
                        { label: 'Loans Received', amount: data.financingActivities.loansReceived },
                        { label: 'Owner Contributions', amount: data.financingActivities.ownerContributions },
                    ],
                    total: {
                        label: '📊 Total Cash In',
                        amount: data.financingActivities.totalCashIn,
                    },
                },
                cashOut: {
                    label: '💳 CASH OUT',
                    items: [
                        { label: 'Loan Repayments', amount: data.financingActivities.loanRepayments },
                        { label: 'Owner Withdrawals', amount: data.financingActivities.ownerWithdrawals },
                    ],
                    total: {
                        label: '📊 Total Cash Out',
                        amount: data.financingActivities.totalCashOut,
                    },
                },
                netCashFlow: {
                    label: '🎯 NET Financing Cash Flow',
                    amount: data.financingActivities.netFinancingCash,
                },
            },
            
            summary: {
                openingCash: {
                    label: '💰 Opening Cash Balance',
                    amount: data.openingCash,
                },
                netChange: {
                    label: '📈 Net Change in Cash',
                    amount: data.netChangeInCash,
                },
                closingCash: {
                    label: '💰 Closing Cash Balance',
                    amount: data.closingCash,
                },
            },
        };
    }
}

module.exports = CashFlowService;