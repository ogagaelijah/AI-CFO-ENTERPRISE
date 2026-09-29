// tests/unit/reports/DailyReportService.test.js

const DailyReportService = require('../../../src/application/services/reports/DailyReportService');

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

describe('DailyReportService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new DailyReportService({
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
        test('should generate daily report correctly', async () => {
            // Sales: 4 calls. RevenueToday, CogsToday, RevenueYesterday, CogsYesterday
            mockSaleRepository.findByDateRange
               .mockResolvedValueOnce([
                    { total_price: 100000, cogs: 40000, item_name: 'Product A', sale_date: '2026-08-30' },
                    { total_price: 200000, cogs: 80000, item_name: 'Product B', sale_date: '2026-08-30' },
                ])
               .mockResolvedValueOnce([
                    { total_price: 100000, cogs: 40000, item_name: 'Product A', sale_date: '2026-08-30' },
                    { total_price: 200000, cogs: 80000, item_name: 'Product B', sale_date: '2026-08-30' },
                ])
               .mockResolvedValueOnce([
                    { total_price: 150000, cogs: 60000, item_name: 'Product A', sale_date: '2026-08-29' },
                ])
               .mockResolvedValueOnce([
                    { total_price: 150000, cogs: 60000, item_name: 'Product A', sale_date: '2026-08-29' },
                ]);

            // Purchases: 1 call
            mockPurchaseRepository.findByDateRange
               .mockResolvedValueOnce([
                    { total_cost: 50000, item_name: 'Stock A', purchase_date: '2026-08-30' },
                ]);

            // Expenses: 2 calls. DailyReport + ProfitCalculator today
            mockExpenseRepository.findByDateRange
               .mockResolvedValueOnce([
                    { amount: 20000, category: 'Salaries', created_at: '2026-08-30' },
                ])
               .mockResolvedValueOnce([
                    { amount: 20000, category: 'Salaries', created_at: '2026-08-30' },
                ]);

            // Income: 3 calls. DailyReport + ProfitCalculator today + ProfitCalculator yesterday
            mockIncomeRepository.findByDateRange
               .mockResolvedValueOnce([
                    { amount: 5000, source: 'Interest', created_at: '2026-08-30' },
                ])
               .mockResolvedValueOnce([
                    { amount: 5000, source: 'Interest', created_at: '2026-08-30' },
                ])
               .mockResolvedValueOnce([]);

            // Cash: 4 calls
            mockPaymentRepository.findByDateRange
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            // AR: 2 calls
            mockDebtorRepository.findByUserId
               .mockResolvedValueOnce([{ balance_remaining: 50000 }])
               .mockResolvedValueOnce([{ balance_remaining: 50000 }]);

            // AP: 2 calls
            mockCreditorRepository.findByUserId
               .mockResolvedValueOnce([{ balance_remaining: 30000 }])
               .mockResolvedValueOnce([{ balance_remaining: 30000 }]);

            // Inventory: 2 calls
            mockInventoryRepository.findByUserId
               .mockResolvedValueOnce([{ quantity: 10, cost_price: 1000 }])
               .mockResolvedValueOnce([{ quantity: 10, cost_price: 1000 }]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            expect(result.date).toBe('2026-08-30');
            expect(result.today).toBeDefined();
            expect(result.comparison).toBeDefined();
            expect(result.transactions).toBeDefined();
            expect(result.alerts).toBeDefined();

            // Today's revenue = 100000 + 200000 = 300000
            expect(result.today.revenue).toBe(300000);
            // Today's cogs = 40000 + 80000 = 120000
            expect(result.today.cogs).toBe(120000);
            // Today's gross profit = 300000 - 120000 = 180000
            expect(result.today.grossProfit).toBe(180000);
            // Today's net profit = 180000 - 20000 + 5000 = 165000
            expect(result.today.netProfit).toBe(165000);
            // Today's purchases = 50000
            expect(result.today.purchases).toBe(50000);
            // Today's income = 5000
            expect(result.today.income).toBe(5000);
        });

        test('should handle empty data', async () => {
            mockSaleRepository.findByDateRange
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            mockPurchaseRepository.findByDateRange.mockResolvedValueOnce([]);
            mockExpenseRepository.findByDateRange.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
            mockIncomeRepository.findByDateRange.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);

            mockPaymentRepository.findByDateRange
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            mockDebtorRepository.findByUserId
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            mockCreditorRepository.findByUserId
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            mockInventoryRepository.findByUserId
               .mockResolvedValueOnce([])
               .mockResolvedValueOnce([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            expect(result.today.revenue).toBe(0);
            expect(result.today.netProfit).toBe(0);
            expect(result.today.cash.closing).toBe(0);
            expect(result.transactions.length).toBe(0);
        });
    });
});