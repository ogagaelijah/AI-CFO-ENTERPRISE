// src/application/services/reports/foundation/ReconciliationCheck.js

/**
 * ReconciliationCheck - Performs integrity checks on reports
 *
 * Ensures:
 * - Balance Sheet balances (Assets = Liabilities + Equity)
 * - Cash Flow reconciles (Closing Cash = Opening Cash + Net Cash Flow)
 * - Profit reconciles (Gross Profit = Revenue - COGS)
 * - Inventory reconciles (Opening + Additions - COGS = Closing)
 * - AR reconciles (Opening + Credit Sales - Collections = Closing)
 * - AP reconciles (Opening + Credit Purchases - Payments = Closing)
 */
class ReconciliationCheck {
    /**
     * Check if Balance Sheet balances
     */
    checkBalanceSheet({ totalAssets, totalLiabilities, totalEquity }) {
        const liabilitiesAndEquity = totalLiabilities + totalEquity;
        const difference = totalAssets - liabilitiesAndEquity;
        const isBalanced = Math.abs(difference) < 0.01;

        return {
            check: 'balance_sheet',
            totalAssets,
            totalLiabilities,
            totalEquity,
            liabilitiesAndEquity,
            difference: Math.round(difference * 100) / 100,
            isBalanced,
            isReconciled: isBalanced, // ADD THIS: unify property name for runAll
            message: isBalanced 
                ? '✅ Balance Sheet balances' 
                : `⚠️ Balance Sheet is out of balance by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Check if Cash Flow reconciles
     */
    checkCashFlow({ openingCash, netCashFlow, closingCash }) {
        const calculatedClosing = openingCash + netCashFlow;
        const difference = closingCash - calculatedClosing;
        const isReconciled = Math.abs(difference) < 0.01;

        return {
            check: 'cash_flow',
            openingCash,
            netCashFlow,
            closingCash,
            calculatedClosing,
            difference: Math.round(difference * 100) / 100,
            isReconciled,
            message: isReconciled
                ? '✅ Cash Flow reconciles'
                : `⚠️ Cash Flow does not reconcile by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Check if Profit reconciles
     */
    checkProfit({ revenue, cogs, expenses, otherIncome, netProfit }) {
        const calculatedProfit = revenue - cogs - expenses + (otherIncome || 0);
        const difference = netProfit - calculatedProfit;
        const isReconciled = Math.abs(difference) < 0.01;

        return {
            check: 'profit',
            revenue,
            cogs,
            expenses,
            otherIncome: otherIncome || 0,
            netProfit,
            calculatedProfit,
            difference: Math.round(difference * 100) / 100,
            isReconciled,
            message: isReconciled
                ? '✅ Profit reconciles'
                : `⚠️ Profit does not reconcile by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Check if Inventory reconciles
     */
    checkInventory({ openingInventory, additions, cogs, closingInventory }) {
        const calculatedClosing = openingInventory + additions - cogs;
        const difference = closingInventory - calculatedClosing;
        const isReconciled = Math.abs(difference) < 0.01;

        return {
            check: 'inventory',
            openingInventory,
            additions,
            cogs,
            closingInventory,
            calculatedClosing,
            difference: Math.round(difference * 100) / 100,
            isReconciled,
            message: isReconciled
                ? '✅ Inventory reconciles'
                : `⚠️ Inventory does not reconcile by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Check if AR reconciles
     */
    checkAR({ openingAR, creditSales, collections, closingAR }) {
        const calculatedClosing = openingAR + creditSales - collections;
        const difference = closingAR - calculatedClosing;
        const isReconciled = Math.abs(difference) < 0.01;

        return {
            check: 'accounts_receivable',
            openingAR,
            creditSales,
            collections,
            closingAR,
            calculatedClosing,
            difference: Math.round(difference * 100) / 100,
            isReconciled,
            message: isReconciled
                ? '✅ Accounts Receivable reconciles'
                : `⚠️ Accounts Receivable does not reconcile by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Check if AP reconciles
     */
    checkAP({ openingAP, creditPurchases, payments, closingAP }) {
        const calculatedClosing = openingAP + creditPurchases - payments;
        const difference = closingAP - calculatedClosing;
        const isReconciled = Math.abs(difference) < 0.01;

        return {
            check: 'accounts_payable',
            openingAP,
            creditPurchases,
            payments,
            closingAP,
            calculatedClosing,
            difference: Math.round(difference * 100) / 100,
            isReconciled,
            message: isReconciled
                ? '✅ Accounts Payable reconciles'
                : `⚠️ Accounts Payable does not reconcile by ₦${Math.abs(Math.round(difference)).toLocaleString()}`,
        };
    }

    /**
     * Run all reconciliation checks
     */
    runAll({ balanceSheet, cashFlow, profit, inventory, ar, ap }) {
        const results = [];

        if (balanceSheet) {
            results.push(this.checkBalanceSheet(balanceSheet));
        }
        if (cashFlow) {
            results.push(this.checkCashFlow(cashFlow));
        }
        if (profit) {
            results.push(this.checkProfit(profit));
        }
        if (inventory) {
            results.push(this.checkInventory(inventory));
        }
        if (ar) {
            results.push(this.checkAR(ar));
        }
        if (ap) {
            results.push(this.checkAP(ap));
        }

        const allPassed = results.every(r => r.isReconciled); // Now works for all
        const failedChecks = results.filter(r => !r.isReconciled);

        return {
            results,
            allPassed,
            failedChecks: failedChecks.length > 0 ? failedChecks : null,
            summary: allPassed
                ? '✅ All reconciliation checks passed'
                : `⚠️ ${failedChecks.length} reconciliation check(s) failed`,
        };
    }
}

module.exports = ReconciliationCheck;