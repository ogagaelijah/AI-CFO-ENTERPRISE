// tests/unit/reports/MonthlyReportService.test.js

const MonthlyReportService = require('../../../src/application/services/reports/MonthlyReportService');

// Mock repositories
const mockSaleRepository = {
    findByDateRange: jest.fn(),
};

const mockPurchaseRepository = {
    findByDateRange: jest.fn(),
};

const mockExpenseRepository = {
    findByDateRange: jest.fn(),
};

const mockIncomeRepository = {
    findByDateRange: jest.fn(),
};

const mockDebtorRepository = {
    findByUserId: jest.fn(),
};

const mockCreditorRepository = {
    findByUserId: jest.fn(),
};

const mockInventoryRepository = {
    findByUserId: jest.fn(),
};

const mockPaymentRepository = {
    findByDateRange: jest.fn(),
};

describe('MonthlyReportService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new MonthlyReportService({
            saleRepository: mockSaleRepository,
            purchaseRepository: mockPurchaseRepository,
            expenseRepository: mockExpenseRepository,
            incomeRepository: mockIncomeRepository,
            debtorRepository: mockDebtorRepository,
            creditorRepository: mockCreditorRepository,
            inventoryRepository: mockInventoryRepository,
            paymentRepository: mockPaymentRepository,
        });
    });

    describe('generate()', () => {
        test('should generate monthly report correctly', async () => {
            const currentMonthSales = [
                { total_price: 100000, cogs: 40000, item_name: 'Product A', sale_date: '2026-08-01' },
                { total_price: 200000, cogs: 80000, item_name: 'Product B', sale_date: '2026-08-15' },
            ];

            const prevMonthSales = [
                { total_price: 150000, cogs: 60000, item_name: 'Product A', sale_date: '2026-07-15' },
            ];

            // Sales: 6 calls total
            // Calls 1-2: Current month (Revenue, COGS)
            // Calls 3-4: Previous month (Revenue, COGS)
            // Calls 5-6: YTD (Revenue, COGS)
            mockSaleRepository.findByDateRange
                .mockResolvedValueOnce(currentMonthSales)   // 1: Current Revenue
                .mockResolvedValueOnce(currentMonthSales)   // 2: Current COGS
                .mockResolvedValueOnce(prevMonthSales)      // 3: Previous Revenue
                .mockResolvedValueOnce(prevMonthSales)      // 4: Previous COGS
                .mockResolvedValueOnce(currentMonthSales)   // 5: YTD Revenue
                .mockResolvedValueOnce(currentMonthSales);  // 6: YTD COGS

            // Expenses: 3 calls total
            // Call 1: Current month expenses (ProfitCalculator #1)
            // Call 2: Previous month expenses (ProfitCalculator #2)
            // Call 3: YTD expenses (ProfitCalculator #3)
            mockExpenseRepository.findByDateRange
                .mockResolvedValueOnce([
                    { amount: 20000, category: 'Salaries', created_at: '2026-08-01' },
                    { amount: 10000, category: 'Rent', created_at: '2026-08-15' },
                ])   // Current month expenses
                .mockResolvedValueOnce([
                    { amount: 15000, category: 'Salaries', created_at: '2026-07-15' },
                ])   // Previous month expenses
                .mockResolvedValueOnce([
                    { amount: 20000, category: 'Salaries', created_at: '2026-08-01' },
                    { amount: 10000, category: 'Rent', created_at: '2026-08-15' },
                ]);  // ✅ YTD expenses (same as current month)

            // Income: 3 calls total
            // Call 1: Current month income (ProfitCalculator #1)
            // Call 2: Previous month income (ProfitCalculator #2)
            // Call 3: YTD income (ProfitCalculator #3)
            mockIncomeRepository.findByDateRange
                .mockResolvedValueOnce([
                    { amount: 5000, source: 'Interest', created_at: '2026-08-15' },
                ])   // Current month income
                .mockResolvedValueOnce([])   // Previous month income
                .mockResolvedValueOnce([
                    { amount: 5000, source: 'Interest', created_at: '2026-08-15' },
                ]);  // ✅ YTD income (same as current month)

            // Purchases: 1 call (only for transactions)
            mockPurchaseRepository.findByDateRange
                .mockResolvedValueOnce([
                    { total_cost: 30000, item_name: 'Stock A', purchase_date: '2026-08-10' },
                ]);

            // Cash: 2 calls
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            // AR: 1 call
            mockDebtorRepository.findByUserId
                .mockResolvedValueOnce([{ balance_remaining: 40000 }]);

            // AP: 1 call
            mockCreditorRepository.findByUserId
                .mockResolvedValueOnce([{ balance_remaining: 20000 }]);

            // Inventory: 1 call
            mockInventoryRepository.findByUserId
                .mockResolvedValueOnce([{ quantity: 10, cost_price: 1000 }]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            // Verify structure
            expect(result.month).toBe('August');
            expect(result.year).toBe(2026);
            expect(result.period.start).toBe('2026-08-01');
            expect(result.period.end).toBe('2026-08-31');

            // Revenue
            expect(result.kpiDashboard.revenue).toBe(300000);
            expect(result.kpiDashboard.cogs).toBe(120000);
            expect(result.kpiDashboard.grossProfit).toBe(180000);
            expect(result.kpiDashboard.grossMargin).toBe(60);
            expect(result.kpiDashboard.expenses).toBe(30000);
            expect(result.kpiDashboard.netProfit).toBe(155000);
            // netMargin = 155000 / 300000 * 100 = 51.67
            expect(result.kpiDashboard.netMargin).toBeCloseTo(51.67, 1);

            // Verify comparisons
            expect(result.monthOverMonth.revenueChange).toBe(100);
            expect(result.monthOverMonth.previousMonth.revenue).toBe(150000);

            // ✅ YTD now correctly returns 155000 instead of 180000
            expect(result.yearToDate.revenue).toBe(300000);
            expect(result.yearToDate.netProfit).toBe(155000);

            // Verify other sections
            expect(result.inventory.totalItems).toBe(1);
            expect(result.inventory.totalValue).toBe(10000);
            expect(result.accountsReceivable.totalOutstanding).toBe(40000);
            expect(result.accountsPayable.totalOutstanding).toBe(20000);
            expect(result.topProducts.length).toBe(2);
        });

        test('should handle empty data', async () => {
            mockSaleRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockPurchaseRepository.findByDateRange.mockResolvedValueOnce([]);

            mockExpenseRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockIncomeRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockDebtorRepository.findByUserId
                .mockResolvedValueOnce([]);
            mockCreditorRepository.findByUserId
                .mockResolvedValueOnce([]);
            mockInventoryRepository.findByUserId
                .mockResolvedValueOnce([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            expect(result.kpiDashboard.revenue).toBe(0);
            expect(result.kpiDashboard.netProfit).toBe(0);
            expect(result.topProducts.length).toBe(0);
            expect(result.topCustomers.length).toBe(0);
            expect(result.topExpenses.length).toBe(0);
        });
    });
});