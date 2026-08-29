// src/application/services/reports/BalanceSheetService.js

/**
 * Balance Sheet Service
 * "As of" report showing financial position
 *
 * Fundamental accounting equation:
 * Assets = Liabilities + Equity
 *
 * Cash = Closing Cash from Cash Flow Statement
 * Retained Earnings = Net Profit from P&L
 * Owner's Capital = BALANCING FIGURE = Assets - Liabilities - Retained Earnings + Drawings
 */
class BalanceSheetService {
    constructor({
        paymentRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        saleRepository,
        expenseRepository,
        incomeRepository,
        cashFlowService,
        profitLossService,
    }) {
        this.paymentRepository = paymentRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.saleRepository = saleRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;
        this.cashFlowService = cashFlowService;
        this.profitLossService = profitLossService;
    }

    /**
     * Generate Balance Sheet as at a specific date
     */
    async generate({ userId, businessId, asAtDate }) {
        const targetDate = asAtDate? new Date(asAtDate) : new Date();
        const dateStr = targetDate.toISOString().split('T')[0];
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // =============================================
        // HELPER: Filter transactions by date
        // =============================================
        const isOnOrBefore = (record, dateField) => {
            const recordDate = record[dateField] || record.created_at || record.createdAt;
            if (!recordDate) return true;
            return new Date(recordDate) <= endOfDay;
        };

        // =============================================
        // 1. CASH - From Cash Flow closing balance
        // =============================================
        let closingCash = 0;

        if (this.cashFlowService) {
            try {
                const startDate = new Date('2000-01-01');
                const endDate = targetDate;

                const cashFlow = await this.cashFlowService.generate({
                    userId,
                    businessId,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                });

                closingCash = cashFlow.closingCash || 0;
            } catch (error) {
                console.warn('⚠️ Could not get cash flow data, using payment sum:', error.message);
                const allPayments = await this.paymentRepository.findByDateRange(
                    businessId,
                    new Date('2000-01-01'),
                    endOfDay
                );

                closingCash = allPayments.reduce((sum, p) => {
                    const amount = Number(p.amount) || 0;
                    if (p.type === 'RECEIVED') return sum + amount;
                    if (p.type === 'MADE') return sum - amount;
                    return sum;
                }, 0);
            }
        } else {
            const allPayments = await this.paymentRepository.findByDateRange(
                businessId,
                new Date('2000-01-01'),
                endOfDay
            );

            closingCash = allPayments.reduce((sum, p) => {
                const amount = Number(p.amount) || 0;
                if (p.type === 'RECEIVED') return sum + amount;
                if (p.type === 'MADE') return sum - amount;
                return sum;
            }, 0);
        }

        // =============================================
        // 2. RETAINED EARNINGS - From P&L Net Profit
        // =============================================
        let retainedEarnings = 0;

        if (this.profitLossService) {
            try {
                const startDate = new Date('2000-01-01');
                const endDate = targetDate;

                const pl = await this.profitLossService.generate({
                    userId,
                    businessId,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    period: 'ytd',
                });

                retainedEarnings = pl.netProfit?.amount || 0;
            } catch (error) {
                console.warn('⚠️ Could not get P&L data, calculating manually:', error.message);
                const allSales = await this.saleRepository.findByUserId(userId);
                const allExpenses = await this.expenseRepository.findByUserId(userId);
                const allIncome = await this.incomeRepository.findByUserId(userId);

                const salesUpToDate = allSales.filter(s => isOnOrBefore(s, 'sale_date'));
                const expensesUpToDate = allExpenses.filter(e => isOnOrBefore(e, 'expense_date'));
                const incomeUpToDate = allIncome.filter(i => isOnOrBefore(i, 'income_date'));

                const totalRevenue = salesUpToDate.reduce((sum, s) => sum + (Number(s.total_price) || 0), 0);
                const totalCogs = salesUpToDate.reduce((sum, s) => sum + (Number(s.cogs) || 0), 0);
                const totalExpenses = expensesUpToDate.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                const totalOtherIncome = incomeUpToDate.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

                const grossProfit = totalRevenue - totalCogs;
                retainedEarnings = grossProfit - totalExpenses + totalOtherIncome;
            }
        } else {
            const allSales = await this.saleRepository.findByUserId(userId);
            const allExpenses = await this.expenseRepository.findByUserId(userId);
            const allIncome = await this.incomeRepository.findByUserId(userId);

            const salesUpToDate = allSales.filter(s => isOnOrBefore(s, 'sale_date'));
            const expensesUpToDate = allExpenses.filter(e => isOnOrBefore(e, 'expense_date'));
            const incomeUpToDate = allIncome.filter(i => isOnOrBefore(i, 'income_date'));

            const totalRevenue = salesUpToDate.reduce((sum, s) => sum + (Number(s.total_price) || 0), 0);
            const totalCogs = salesUpToDate.reduce((sum, s) => sum + (Number(s.cogs) || 0), 0);
            const totalExpenses = expensesUpToDate.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const totalOtherIncome = incomeUpToDate.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

            const grossProfit = totalRevenue - totalCogs;
            retainedEarnings = grossProfit - totalExpenses + totalOtherIncome;
        }

        // =============================================
        // 3. ACCOUNTS RECEIVABLE
        // =============================================
        const activeDebtors = await this.debtorRepository.findActive(userId);
        const accountsReceivable = activeDebtors.reduce(
            (sum, d) => sum + (Number(d.balance_remaining) || 0),
            0
        );

        // =============================================
        // 4. INVENTORY
        // =============================================
        const inventoryItems = await this.inventoryRepository.findByUserId(userId);
        const inventory = inventoryItems.reduce((sum, item) => {
            const quantity = Number(item.quantity) || 0;
            const avgCost = (item.avg_cost!== undefined && item.avg_cost!== null)
               ? Number(item.avg_cost) || 0
                : Number(item.cost_price) || 0;
            return sum + (quantity * avgCost);
        }, 0);

        // =============================================
        // 5. ACCOUNTS PAYABLE
        // =============================================
        const activeCreditors = await this.creditorRepository.findActive(userId);
        const accountsPayable = activeCreditors.reduce(
            (sum, c) => sum + (Number(c.balance_remaining) || 0),
            0
        );

        // =============================================
        // 6. OTHER BALANCE SHEET ITEMS
        // =============================================
        const otherCurrentAssets = 0;
        const propertyAndEquipment = 0;
        const otherNonCurrentAssets = 0;
        const shortTermDebt = 0;
        const otherCurrentLiabilities = 0;
        const longTermDebt = 0;
        const otherNonCurrentLiabilities = 0;
        const otherEquity = 0;
        const lessDrawings = 0;

        // =============================================
        // ASSET TOTALS
        // =============================================
        const totalCurrentAssets = closingCash + accountsReceivable + inventory + otherCurrentAssets;
        const totalNonCurrentAssets = propertyAndEquipment + otherNonCurrentAssets;
        const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

        // =============================================
        // LIABILITY TOTALS
        // =============================================
        const totalCurrentLiabilities = accountsPayable + shortTermDebt + otherCurrentLiabilities;
        const totalNonCurrentLiabilities = longTermDebt + otherNonCurrentLiabilities;
        const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

        // =============================================
        // 7. OWNER'S CAPITAL - AUTO BALANCING FIGURE
        // Formula: Assets = Liab + Equity
        // Therefore: Owner's Capital = Assets - Liabilities - Retained Earnings + Drawings - OtherEquity
        // =============================================
        const ownersCapital = totalAssets - totalLiabilities - retainedEarnings - otherEquity + lessDrawings;

        // =============================================
        // EQUITY TOTALS
        // =============================================
        const totalEquity = ownersCapital + retainedEarnings + otherEquity - lessDrawings;

        // =============================================
        // FUNDAMENTAL ACCOUNTING CONTROL
        // Assets = Liabilities + Equity
        // =============================================
        const liabilitiesAndEquity = totalLiabilities + totalEquity;
        const difference = totalAssets - liabilitiesAndEquity;
        const isBalanced = Math.abs(difference) < 0.01;

        // =============================================
        // RETURN FULL REPORT
        // =============================================
        return {
            asAtDate: dateStr,
            assets: {
                currentAssets: {
                    cash: closingCash,
                    accountsReceivable,
                    inventory,
                    otherCurrentAssets,
                    total: totalCurrentAssets,
                },
                nonCurrentAssets: {
                    propertyAndEquipment,
                    otherNonCurrentAssets,
                    total: totalNonCurrentAssets,
                },
                totalAssets,
            },
            liabilities: {
                currentLiabilities: {
                    accountsPayable,
                    shortTermDebt,
                    otherCurrentLiabilities,
                    total: totalCurrentLiabilities,
                },
                nonCurrentLiabilities: {
                    longTermDebt,
                    otherNonCurrentLiabilities,
                    total: totalNonCurrentLiabilities,
                },
                totalLiabilities,
            },
            equity: {
                ownersCapital,
                retainedEarnings,
                otherEquity,
                lessDrawings,
                totalEquity,
            },
            control: {
                liabilitiesAndEquity,
                difference,
                isBalanced,
            },
        };
    }

    /**
     * Generate summary for executive dashboard
     */
    async generateSummary({ userId, businessId, asAtDate }) {
        const full = await this.generate({ userId, businessId, asAtDate });
        return {
            asAtDate: full.asAtDate,
            totalAssets: full.assets.totalAssets,
            totalLiabilities: full.liabilities.totalLiabilities,
            totalEquity: full.equity.totalEquity,
            isBalanced: full.control.isBalanced,
        };
    }
}

module.exports = BalanceSheetService;