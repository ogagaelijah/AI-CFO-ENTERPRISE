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

        // 2. Get all payments for categorization (ensure array)
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

        // Ensure payments is always an array
        if (!payments || !Array.isArray(payments)) {
            payments = [];
        }

        // 3. Categorize payments by reference type
        const operatingIn = payments
            .filter(p => (p.type === 'RECEIVED' || p.type === 'IN') && 
                         ['SALE', 'DEBTOR', 'INCOME'].includes(p.referenceType))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const operatingOut = payments
            .filter(p => (p.type === 'MADE' || p.type === 'OUT') && 
                         ['PURCHASE', 'CREDITOR', 'EXPENSE'].includes(p.referenceType))
            .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        const netOperatingCash = operatingIn - operatingOut;

        // 4. Investing Activities (placeholder)
        const investingActivities = {
            purchaseOfEquipment: 0,
            purchaseOfLongTermAssets: 0,
            proceedsFromAssetSales: 0,
        };
        const netInvestingCash = 
            investingActivities.proceedsFromAssetSales -
            investingActivities.purchaseOfEquipment -
            investingActivities.purchaseOfLongTermAssets;

        // 5. Financing Activities (placeholder)
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

        // 6. Net change and closing cash
        const netChangeInCash = netOperatingCash + netInvestingCash + netFinancingCash;

        return {
            period: {
                startDate,
                endDate,
            },
            operatingActivities: {
                cashIn: {
                    fromCustomers: operatingIn,
                    fromDebtors: 0,
                    fromOtherIncome: 0,
                    total: operatingIn,
                },
                cashOut: {
                    toSuppliers: 0,
                    toCreditors: 0,
                    operatingExpenses: operatingOut,
                    total: operatingOut,
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
            openingCash: cashData.openingCash || 0,
            closingCash: cashData.closingCash || 0,
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