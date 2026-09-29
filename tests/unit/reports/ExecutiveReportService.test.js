// tests/unit/reports/ExecutiveReportService.test.js

const ExecutiveReportService = require('../../../src/application/services/reports/ExecutiveReportService');

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

describe('ExecutiveReportService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ExecutiveReportService({
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
        test('should generate executive report correctly', async () => {
            const salesData = [
                { total_price: 100000, cogs: 40000, item_name: 'Product A', customer_name: 'Customer 1', sale_date: '2026-08-01' },
                { total_price: 200000, cogs: 80000, item_name: 'Product B', customer_name: 'Customer 2', sale_date: '2026-08-15' },
            ];

            // Sales: 2 calls (Revenue, COGS)
            mockSaleRepository.findByDateRange
               .mockResolvedValueOnce(salesData) // Revenue
               .mockResolvedValueOnce(salesData); // COGS

            // ✅ Expenses: ProfitCalculator needs this
            mockExpenseRepository.findByDateRange
               .mockResolvedValueOnce([
                    { amount: 20000, category: 'Salaries', created_at: '2026-08-01' },
                    { amount: 10000, category: 'Rent', created_at: '2026-08-15' },
                ]);

            // ✅ Income: ProfitCalculator needs this
            mockIncomeRepository.findByDateRange
               .mockResolvedValueOnce([
                    { amount: 5000, source: 'Interest', created_at: '2026-08-15' },
                ]);

            // ✅ Cash: 2 calls (opening + period)
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

            // Purchases: 1 call (optional)
            mockPurchaseRepository.findByDateRange
               .mockResolvedValueOnce([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            // Verify structure
            expect(result.period).toBeDefined();
            expect(result.period.start).toBe('2026-08-01');
            expect(result.period.end).toBe('2026-08-31');

            // Executive Summary - UPDATED FOR SSOT
            expect(result.executiveSummary.revenue).toBe(305000); // 300000 + 5000
            expect(result.executiveSummary.grossProfit).toBe(180000); // 300000 - 120000
            expect(result.executiveSummary.grossMargin).toBe(60); // 180000 / 300000 * 100
            expect(result.executiveSummary.netProfit).toBe(155000); // 180000 - 30000 + 5000
            expect(result.executiveSummary.netMargin).toBeCloseTo(50.82, 1); // 155000 / 305000 * 100
            expect(result.executiveSummary.expenses).toBe(30000);
            expect(result.executiveSummary.cash).toBe(0);
            expect(result.executiveSummary.receivables).toBe(40000);
            expect(result.executiveSummary.payables).toBe(20000);
            expect(result.executiveSummary.inventory).toBe(10000);

            // KPI Dashboard - UPDATED FOR SSOT
            expect(result.kpiDashboard.revenue).toBe(305000);
            expect(result.kpiDashboard.grossProfit).toBe(180000);
            expect(result.kpiDashboard.netProfit).toBe(155000);
            expect(result.kpiDashboard.totalSales).toBe(2);
            expect(result.kpiDashboard.uniqueCustomers).toBe(2);

            // Top Products
            expect(result.revenuePerformance.topProducts).toBeDefined();
            expect(result.revenuePerformance.topProducts.length).toBe(2);
            expect(result.revenuePerformance.topProducts[0].name).toBe('Product B');
            expect(result.revenuePerformance.topProducts[0].amount).toBe(200000);

            // Top Customers
            expect(result.revenuePerformance.topCustomers).toBeDefined();
            expect(result.revenuePerformance.topCustomers.length).toBe(2);

            // Expense Analysis
            expect(result.expenseAnalysis.total).toBe(30000);
            expect(result.expenseAnalysis.topExpenses).toBeDefined();

            // Cash Flow
            expect(result.cashFlow.opening).toBe(0);
            expect(result.cashFlow.closing).toBe(0);

            // Receivables
            expect(result.receivables.totalOutstanding).toBe(40000);

            // Payables
            expect(result.payables.totalOutstanding).toBe(20000);

            // Inventory
            expect(result.inventory.totalItems).toBe(1);
            expect(result.inventory.totalValue).toBe(10000);

            // Financial Ratios - UPDATED FOR SSOT
            expect(result.financialRatios.grossMargin).toBe(60);
            expect(result.financialRatios.netMargin).toBeCloseTo(50.82, 1);

            // Risks, Insights, Recommendations
            expect(result.risks).toBeDefined();
            expect(result.insights).toBeDefined();
            expect(result.recommendations).toBeDefined();
            expect(result.managementActionPlan).toBeDefined();
        });

        test('should handle empty data', async () => {
            mockSaleRepository.findByDateRange
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            mockPurchaseRepository.findByDateRange.mockResolvedValueOnce([]);
            mockExpenseRepository.findByDateRange.mockResolvedValueOnce([]);
            mockIncomeRepository.findByDateRange.mockResolvedValueOnce([]);

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
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.executiveSummary.revenue).toBe(0);
            expect(result.executiveSummary.netProfit).toBe(0);
            expect(result.kpiDashboard.totalSales).toBe(0);
            expect(result.kpiDashboard.uniqueCustomers).toBe(0);
            expect(result.revenuePerformance.topProducts.length).toBe(0);
            expect(result.revenuePerformance.topCustomers.length).toBe(0);
            expect(result.expenseAnalysis.topExpenses.length).toBe(0);
            expect(result.receivables.totalOutstanding).toBe(0);
            expect(result.payables.totalOutstanding).toBe(0);
            expect(result.inventory.totalItems).toBe(0);
            expect(result.risks.length).toBe(0);
        });
    });
});