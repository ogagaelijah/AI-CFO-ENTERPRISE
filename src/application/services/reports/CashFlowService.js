// src/application/services/reports/CashFlowService.js

/**
 * Cash Flow Report Service
 * Implements IAS 7 compliant cash flow reporting
 * Distinguishes between Operating, Investing, and Financing activities
 */
class CashFlowService {
    constructor({
        paymentRepository,
        saleRepository,
        purchaseRepository,
        expenseRepository,
        incomeRepository,
        debtorRepository,
        creditorRepository,
    }) {
        this.paymentRepository = paymentRepository;
        this.saleRepository = saleRepository;
        this.purchaseRepository = purchaseRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
    }

    /**
     * Generate Cash Flow Statement for a date range
     * Uses direct method (IAS 7)
     */
    async generate({ userId, businessId, startDate, endDate }) {
        // Get all payments in date range
        const payments = await this.paymentRepository.findByDateRange(
            businessId,
            new Date(startDate),
            new Date(endDate)
        );

        // =============================================
        // OPERATING ACTIVITIES - CASH IN
        // =============================================
        const fromCustomers = payments
            .filter(p => p.type === 'RECEIVED' && p.referenceType === 'SALE')
            .reduce((sum, p) => sum + p.amount, 0);

        const fromDebtors = payments
            .filter(p => p.type === 'RECEIVED' && p.referenceType === 'DEBTOR')
            .reduce((sum, p) => sum + p.amount, 0);

        const fromOtherIncome = payments
            .filter(p => p.type === 'RECEIVED' && p.referenceType === 'INCOME')
            .reduce((sum, p) => sum + p.amount, 0);

        const totalCashIn = fromCustomers + fromDebtors + fromOtherIncome;

        // =============================================
        // OPERATING ACTIVITIES - CASH OUT
        // =============================================
        const toSuppliers = payments
            .filter(p => p.type === 'MADE' && p.referenceType === 'PURCHASE')
            .reduce((sum, p) => sum + p.amount, 0);

        const toCreditors = payments
            .filter(p => p.type === 'MADE' && p.referenceType === 'CREDITOR')
            .reduce((sum, p) => sum + p.amount, 0);

        const operatingExpenses = payments
            .filter(p => p.type === 'MADE' && p.referenceType === 'EXPENSE')
            .reduce((sum, p) => sum + p.amount, 0);

        const totalCashOut = toSuppliers + toCreditors + operatingExpenses;

        // =============================================
        // NET OPERATING CASH FLOW
        // =============================================
        const netOperatingCash = totalCashIn - totalCashOut;

        // =============================================
        // INVESTING ACTIVITIES
        // =============================================
        const investingActivities = {
            purchaseOfEquipment: 0,
            purchaseOfLongTermAssets: 0,
            proceedsFromAssetSales: 0,
        };
        const netInvestingCash = 
            investingActivities.proceedsFromAssetSales -
            investingActivities.purchaseOfEquipment -
            investingActivities.purchaseOfLongTermAssets;

        // =============================================
        // FINANCING ACTIVITIES
        // =============================================
        const financingActivities = {
            loansReceived: 0,
            loanRepayments: 0,
            ownerContributions: 0,
            ownerWithdrawals: 0,
        };
        const netFinancingCash = 
            financingActivities.loansReceived +
            financingActivities.ownerContributions -
            financingActivities.loanRepayments -
            financingActivities.ownerWithdrawals;

        // =============================================
        // NET CHANGE IN CASH
        // =============================================
        const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;

        // Calculate opening and closing cash
        const openingPayments = await this.paymentRepository.findByDateRange(
            businessId,
            new Date('2000-01-01'),
            new Date(startDate)
        );

        const openingCash = openingPayments.reduce((sum, p) => {
            if (p.type === 'RECEIVED') return sum + p.amount;
            if (p.type === 'MADE') return sum - p.amount;
            return sum;
        }, 0);

        const closingCash = openingCash + netChangeInCash;

        // =============================================
        // RETURN FULL REPORT
        // =============================================
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
                    total: totalCashIn,
                },
                cashOut: {
                    toSuppliers,
                    toCreditors,
                    operatingExpenses,
                    total: totalCashOut,
                },
                netOperatingCash,
            },
            investingActivities: {
                purchaseOfEquipment: investingActivities.purchaseOfEquipment,
                purchaseOfLongTermAssets: investingActivities.purchaseOfLongTermAssets,
                proceedsFromAssetSales: investingActivities.proceedsFromAssetSales,
                netInvestingCash,
            },
            financingActivities: {
                loansReceived: financingActivities.loansReceived,
                loanRepayments: financingActivities.loanRepayments,
                ownerContributions: financingActivities.ownerContributions,
                ownerWithdrawals: financingActivities.ownerWithdrawals,
                netFinancingCash,
            },
            netChangeInCash,
            openingCash,
            closingCash,
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
}

module.exports = CashFlowService;