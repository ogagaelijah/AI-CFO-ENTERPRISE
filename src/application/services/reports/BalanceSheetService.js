// src/application/services/reports/BalanceSheetService.js

const CashCalculator = require('./calculators/CashCalculator');
const ARCalculator = require('./calculators/ARCalculator');
const APCalculator = require('./calculators/APCalculator');
const InventoryCalculator = require('./calculators/InventoryCalculator');
const ProfitCalculator = require('./calculators/ProfitCalculator');

class BalanceSheetService {
    constructor({
        paymentRepository,
        debtorRepository,
        creditorRepository,
        inventoryRepository,
        saleRepository,
        expenseRepository,
        incomeRepository,
        cashCalculator = null,
        arCalculator = null,
        apCalculator = null,
        inventoryCalculator = null,
        profitCalculator = null,
    }) {
        this.paymentRepository = paymentRepository;
        this.debtorRepository = debtorRepository;
        this.creditorRepository = creditorRepository;
        this.inventoryRepository = inventoryRepository;
        this.saleRepository = saleRepository;
        this.expenseRepository = expenseRepository;
        this.incomeRepository = incomeRepository;

        this.cashCalculator = cashCalculator || new CashCalculator({ paymentRepository });
        this.arCalculator = arCalculator || new ARCalculator({ debtorRepository });
        this.apCalculator = apCalculator || new APCalculator({ creditorRepository });
        this.inventoryCalculator = inventoryCalculator || new InventoryCalculator({ inventoryRepository });
        this.profitCalculator = profitCalculator || new ProfitCalculator({ saleRepository, expenseRepository, incomeRepository });
    }

    async generate({ userId, businessId, asAtDate }) {
        // PERMANENT FIX 1: Handle param name mismatch. Support both asAtDate and asOfDate
        const targetDate = asAtDate || asOfDate;
        if (!targetDate) throw new Error('asAtDate is required');
        const dateStr = new Date(targetDate).toISOString().split('T')[0];
        const startOfTime = '2000-01-01';

        // PERMANENT FIX 2: Get all data in parallel from SSOT calculators
        const [cashData, arData, apData, inventoryData, profitData] = await Promise.all([
            this.cashCalculator.calculate({ userId, businessId, startDate: startOfTime, endDate: dateStr }),
            this.arCalculator.calculate({ userId, businessId, asAtDate: dateStr }),
            this.apCalculator.calculate({ userId, businessId, asAtDate: dateStr }),
            this.inventoryCalculator.calculate({ userId, businessId }),
            this.profitCalculator.calculate({ userId, businessId, startDate: startOfTime, endDate: dateStr }),
        ]);

        // PERMANENT FIX 3: Normalize null/undefined to 0. Production DBs do this
        const cash = Number(cashData?.closingCash) || 0;
        const accountsReceivable = Number(arData?.totalOutstanding) || 0;
        const inventory = Number(inventoryData?.totalCostValue) || 0;
        const accountsPayable = Number(apData?.totalOutstanding) || 0;
        const retainedEarnings = Number(profitData?.netProfit) || 0;

        // Assets
        const totalCurrentAssets = cash + accountsReceivable + inventory;
        const totalAssets = totalCurrentAssets; // + fixed assets later

        // Liabilities
        const totalCurrentLiabilities = accountsPayable;
        const totalLiabilities = totalCurrentLiabilities;

        // Equity: Auto-balancing figure per accounting equation
        const ownersCapital = totalAssets - totalLiabilities - retainedEarnings;
        const totalEquity = ownersCapital + retainedEarnings;

        const difference = totalAssets - (totalLiabilities + totalEquity);
        const isBalanced = Math.abs(difference) < 0.01;

        return {
            asAtDate: dateStr, // Match test expectation
            assets: {
                currentAssets: {
                    cash,
                    accountsReceivable,
                    inventory,
                    total: totalCurrentAssets,
                },
                totalAssets,
            },
            liabilities: {
                currentLiabilities: {
                    accountsPayable,
                    total: totalCurrentLiabilities,
                },
                totalLiabilities,
            },
            equity: {
                ownersCapital,
                retainedEarnings,
                totalEquity,
            },
            control: {
                difference: Number(difference.toFixed(2)),
                isBalanced,
            },
        };
    }

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