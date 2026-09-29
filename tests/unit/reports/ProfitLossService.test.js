const ProfitLossService = require('../../../src/application/services/reports/ProfitLossService');

describe('ProfitLossService', () => {
    let service;
    let mockSaleRepo, mockExpenseRepo, mockIncomeRepo;

    beforeEach(() => {
        mockSaleRepo = {
            findByDateRange: jest.fn().mockResolvedValue([
                { total_price: 300000, item_name: 'Widget' }
            ])
        };
        mockExpenseRepo = {
            findByDateRange: jest.fn().mockResolvedValue([
                { category: 'Rent', amount: 50000 }
            ])
        };
        mockIncomeRepo = {
            findByDateRange: jest.fn().mockResolvedValue([
                { amount: 10000 }
            ])
        };

        // Stub calculators to mimic baseline return fields
        const mockRevenueCalculator = { calculate: jest.fn().mockResolvedValue({ totalRevenue: 300000 }) };
        const mockCogsCalculator = { calculate: jest.fn().mockResolvedValue({ totalCogs: 120000 }) };

        service = new ProfitLossService({
            saleRepository: mockSaleRepo,
            expenseRepository: mockExpenseRepo,
            incomeRepository: mockIncomeRepo,
            revenueCalculator: mockRevenueCalculator,
            cogsCalculator: mockCogsCalculator
        });
    });

    describe('generate()', () => {
        test('should generate P&L report correctly with full data', async () => {
            const result = await service.generate({
                userId: 'user123',
                businessId: 'biz123',
                startDate: '2023-01-01',
                endDate: '2023-01-31'
            });

            expect(result.revenue.productSales).toBe(300000);
            expect(result.revenue.otherRevenue).toBe(10000);
            expect(result.revenue.totalRevenue).toBe(310000);
            expect(result.cogs.total).toBe(120000);
            expect(result.grossProfit.amount).toBe(180000);
            expect(result.grossProfit.margin).toBe(60); 
            expect(result.operatingExpenses.total).toBe(50000);
            expect(result.operatingProfit.amount).toBe(130000);
            expect(result.netProfit.amount).toBe(140000);
            expect(result.netProfit.margin).toBeCloseTo(45.16, 1);
        });

        test('should handle zero revenue', async () => {
            service.revenueCalculator.calculate.mockResolvedValue({ totalRevenue: 0 });
            service.cogsCalculator.calculate.mockResolvedValue({ totalCogs: 0 });
            mockIncomeRepo.findByDateRange.mockResolvedValue([]);

            const result = await service.generate({ userId: 'u', businessId: 'b' });
            expect(result.grossProfit.amount).toBe(0);
            expect(result.grossProfit.margin).toBe(0);
        });

        test('should handle negative profit', async () => {
            service.revenueCalculator.calculate.mockResolvedValue({ totalRevenue: 10000 });
            service.cogsCalculator.calculate.mockResolvedValue({ totalCogs: 20000 });

            const result = await service.generate({ userId: 'u', businessId: 'b' });
            expect(result.grossProfit.amount).toBe(-10000);
        });
    });

    describe('generateWithComparison()', () => {
        test('should generate P&L with comparison', async () => {
            // Setup sequential call tracking to safely mock historical data frames
            service.revenueCalculator.calculate
                .mockResolvedValueOnce({ totalRevenue: 300000 })  // Current
                .mockResolvedValueOnce({ totalRevenue: 250000 }); // Previous

            service.cogsCalculator.calculate
                .mockResolvedValueOnce({ totalCogs: 120000 })
                .mockResolvedValueOnce({ totalCogs: 100000 });

            mockIncomeRepo.findByDateRange
                .mockResolvedValueOnce([{ amount: 0 }])  // Current alternative income
                .mockResolvedValueOnce([{ amount: 0 }]); // Previous alternative income

            const result = await service.generateWithComparison({
                userId: 'user123',
                businessId: 'biz123',
                startDate: '2023-02-01',
                endDate: '2023-02-28'
            });

            expect(result.comparison).toBeDefined();
            expect(result.comparison.revenueChange).toBe(20); // ((300k - 250k) / 250k) * 100 = 20%
            expect(result.comparison.previousPeriod.revenue).toBe(250000);
        });

        test('should handle previous period with zero revenue', async () => {
            service.revenueCalculator.calculate
                .mockResolvedValueOnce({ totalRevenue: 300000 })
                .mockResolvedValueOnce({ totalRevenue: 0 });

            mockIncomeRepo.findByDateRange
                .mockResolvedValueOnce([{ amount: 0 }])
                .mockResolvedValueOnce([{ amount: 0 }]);

            const result = await service.generateWithComparison({ userId: 'u', businessId: 'b', startDate: '2023-01-01', endDate: '2023-01-31' });
            expect(result.comparison.revenueChange).toBe(0);
        });
    });

    describe('generateSummary()', () => {
        test('should generate summary', async () => {
            const result = await service.generateSummary({ userId: 'u', businessId: 'b' });
            expect(result.revenue).toBeDefined();
            expect(result.netProfit).toBeDefined();
        });
    });
});
