// tests/unit/reports/YearlyReportService.test.js

const YearlyReportService = require('../../../src/application/services/reports/YearlyReportService');

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

describe('YearlyReportService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new YearlyReportService({
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
        test('should generate yearly report correctly', async () => {
            const currentYearSales = [
                { total_price: 1200000, cogs: 480000, item_name: 'Product A', sale_date: '2026-06-15' },
                { total_price: 800000, cogs: 320000, item_name: 'Product B', sale_date: '2026-09-20' },
            ];

            const prevYearSales = [
                { total_price: 1000000, cogs: 400000, item_name: 'Product A', sale_date: '2025-06-15' },
            ];

            // Sales: 4 calls total
            mockSaleRepository.findByDateRange
                .mockResolvedValueOnce(currentYearSales)   // Current Revenue
                .mockResolvedValueOnce(currentYearSales)   // Current COGS
                .mockResolvedValueOnce(prevYearSales)      // Previous Revenue
                .mockResolvedValueOnce(prevYearSales);     // Previous COGS

            // Expenses: 2 calls (current year, previous year)
            mockExpenseRepository.findByDateRange
                .mockResolvedValueOnce([
                    { amount: 200000, category: 'Salaries', created_at: '2026-01-15' },
                    { amount: 100000, category: 'Rent', created_at: '2026-06-15' },
                ])
                .mockResolvedValueOnce([
                    { amount: 150000, category: 'Salaries', created_at: '2025-01-15' },
                ]);

            // Income: 2 calls (current year, previous year)
            mockIncomeRepository.findByDateRange
                .mockResolvedValueOnce([
                    { amount: 50000, source: 'Interest', created_at: '2026-08-15' },
                ])
                .mockResolvedValueOnce([]);

            // Purchases: 1 call
            mockPurchaseRepository.findByDateRange
                .mockResolvedValueOnce([
                    { total_cost: 300000, item_name: 'Stock A', purchase_date: '2026-03-10' },
                ]);

            // Cash: 2 calls
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            // AR: 1 call
            mockDebtorRepository.findByUserId
                .mockResolvedValueOnce([{ balance_remaining: 400000 }]);

            // AP: 1 call
            mockCreditorRepository.findByUserId
                .mockResolvedValueOnce([{ balance_remaining: 200000 }]);

            // Inventory: 1 call
            mockInventoryRepository.findByUserId
                .mockResolvedValueOnce([{ quantity: 10, cost_price: 1000 }]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-12-31',
            });

            expect(result.year).toBe(2026);
            expect(result.period.start).toBe('2026-01-01');
            expect(result.period.end).toBe('2026-12-31');

            // Revenue
            expect(result.annualKpiDashboard.revenue).toBe(2000000);
            expect(result.annualKpiDashboard.cogs).toBe(800000);
            expect(result.annualKpiDashboard.grossProfit).toBe(1200000);
            expect(result.annualKpiDashboard.grossMargin).toBe(60);
            expect(result.annualKpiDashboard.expenses).toBe(300000);
            expect(result.annualKpiDashboard.netProfit).toBe(950000);
            expect(result.annualKpiDashboard.netMargin).toBeCloseTo(47.5, 1);

            // Verify comparisons
            expect(result.yearOverYear.revenueChange).toBe(100);
            expect(result.yearOverYear.previousYear.revenue).toBe(1000000);

            // Verify inventory
            expect(result.inventory.totalItems).toBe(1);
            expect(result.inventory.totalValue).toBe(10000);

            // Verify receivables
            expect(result.receivables.totalOutstanding).toBe(400000);

            // Verify payables
            expect(result.payables.totalOutstanding).toBe(200000);

            // Verify top products
            expect(result.topProducts).toBeDefined();
            expect(result.topProducts.length).toBe(2);
        });

        test('should handle empty data', async () => {
            mockSaleRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockPurchaseRepository.findByDateRange.mockResolvedValueOnce([]);

            mockExpenseRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockIncomeRepository.findByDateRange
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
                date: '2026-12-31',
            });

            expect(result.annualKpiDashboard.revenue).toBe(0);
            expect(result.annualKpiDashboard.netProfit).toBe(0);
            expect(result.topProducts.length).toBe(0);
            expect(result.topCustomers.length).toBe(0);
            expect(result.topExpenses.length).toBe(0);
        });
    });
});