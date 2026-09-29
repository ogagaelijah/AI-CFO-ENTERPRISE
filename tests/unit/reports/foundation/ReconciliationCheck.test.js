// tests/unit/reports/foundation/ReconciliationCheck.test.js

const ReconciliationCheck = require('../../../../src/application/services/reports/foundation/ReconciliationCheck');

describe('ReconciliationCheck', () => {
    let reconciler;

    beforeEach(() => {
        reconciler = new ReconciliationCheck();
    });

    describe('checkBalanceSheet()', () => {
        test('should return balanced when Assets = Liabilities + Equity', () => {
            const result = reconciler.checkBalanceSheet({
                totalAssets: 1000000,
                totalLiabilities: 400000,
                totalEquity: 600000,
            });

            expect(result.isBalanced).toBe(true);
            expect(result.difference).toBe(0);
            expect(result.message).toContain('✅');
        });

        test('should detect imbalance', () => {
            const result = reconciler.checkBalanceSheet({
                totalAssets: 1000000,
                totalLiabilities: 400000,
                totalEquity: 500000,
            });

            expect(result.isBalanced).toBe(false);
            expect(result.difference).toBe(100000);
            expect(result.message).toContain('⚠️');
        });
    });

    describe('checkCashFlow()', () => {
        test('should return reconciled when Closing = Opening + Net', () => {
            const result = reconciler.checkCashFlow({
                openingCash: 100000,
                netCashFlow: 250000,
                closingCash: 350000,
            });

            expect(result.isReconciled).toBe(true);
        });

        test('should detect non-reconciliation', () => {
            const result = reconciler.checkCashFlow({
                openingCash: 100000,
                netCashFlow: 250000,
                closingCash: 400000,
            });

            expect(result.isReconciled).toBe(false);
            expect(result.difference).toBe(50000);
        });
    });

    describe('checkProfit()', () => {
        test('should return reconciled when Profit = Revenue - COGS - Expenses + OtherIncome', () => {
            const result = reconciler.checkProfit({
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                otherIncome: 50000,
                netProfit: 450000,
            });

            expect(result.isReconciled).toBe(true);
        });

        test('should detect non-reconciliation', () => {
            const result = reconciler.checkProfit({
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                otherIncome: 50000,
                netProfit: 500000,
            });

            expect(result.isReconciled).toBe(false);
            expect(result.difference).toBe(50000);
        });
    });

    describe('runAll()', () => {
        test('should pass all checks when data is correct', () => {
            const result = reconciler.runAll({
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
            expect(result.summary).toContain('✅');
        });

        test('should detect failing checks', () => {
            const result = reconciler.runAll({
                balanceSheet: {
                    totalAssets: 1000000,
                    totalLiabilities: 400000,
                    totalEquity: 500000,
                },
                cashFlow: {
                    openingCash: 100000,
                    netCashFlow: 250000,
                    closingCash: 350000,
                },
            });

            expect(result.allPassed).toBe(false);
            expect(result.failedChecks).not.toBeNull();
            expect(result.failedChecks.length).toBe(1);
            expect(result.summary).toContain('⚠️');
        });
    });
});