// tests/integration/reports/reportIntegrity.test.js

const PeriodResolver = require('../../../src/application/services/reports/foundation/PeriodResolver');
const ReconciliationCheck = require('../../../src/application/services/reports/foundation/ReconciliationCheck');

describe('Report Integrity', () => {
    let periodResolver;
    let reconciliationCheck;

    beforeEach(() => {
        periodResolver = new PeriodResolver();
        reconciliationCheck = new ReconciliationCheck();
    });

    test('Balance Sheet should balance', () => {
        const balanceSheet = {
            totalAssets: 1000000,
            totalLiabilities: 400000,
            totalEquity: 600000,
        };

        const result = reconciliationCheck.checkBalanceSheet(balanceSheet);
        expect(result.isBalanced).toBe(true);
        expect(result.difference).toBe(0);
    });

    test('Balance Sheet should detect imbalance', () => {
        const balanceSheet = {
            totalAssets: 1000000,
            totalLiabilities: 400000,
            totalEquity: 500000,
        };

        const result = reconciliationCheck.checkBalanceSheet(balanceSheet);
        expect(result.isBalanced).toBe(false);
        expect(result.difference).toBe(100000);
    });

    test('Cash Flow should reconcile', () => {
        const cashFlow = {
            openingCash: 100000,
            netCashFlow: 250000,
            closingCash: 350000,
        };

        const result = reconciliationCheck.checkCashFlow(cashFlow);
        expect(result.isReconciled).toBe(true);
    });

    test('Profit should reconcile', () => {
        const profit = {
            revenue: 1000000,
            cogs: 400000,
            expenses: 200000,
            otherIncome: 50000,
            netProfit: 450000,
        };

        const result = reconciliationCheck.checkProfit(profit);
        expect(result.isReconciled).toBe(true);
    });

    test('All checks should pass', () => {
        const result = reconciliationCheck.runAll({
            balanceSheet: {
                totalAssets: 1000000,
                totalLiabilities: 400000,
                totalEquity: 600000,
            },
            cashFlow: {
                openingCash: 100000,
                netCashFlow: 250000,
                closingCash: 350000,
            },
            profit: {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                otherIncome: 50000,
                netProfit: 450000,
            },
        });

        expect(result.allPassed).toBe(true);
        expect(result.failedChecks).toBeNull();
    });
});