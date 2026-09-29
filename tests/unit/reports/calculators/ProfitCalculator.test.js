// tests/unit/reports/calculators/ProfitCalculator.test.js

const ProfitCalculator = require('../../../../src/application/services/reports/calculators/ProfitCalculator');

const mockSaleRepository = {
    findByDateRange: jest.fn(),
};

const mockExpenseRepository = {
    findByDateRange: jest.fn(),
};

const mockIncomeRepository = {
    findByDateRange: jest.fn(),
};

describe('ProfitCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new ProfitCalculator({
            saleRepository: mockSaleRepository,
            expenseRepository: mockExpenseRepository,
            incomeRepository: mockIncomeRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate profit correctly with full data', async () => {
            // Mock sales for revenue and COGS
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: 100000, cogs: 40000, quantity: 2 },
                { total_price: 200000, cogs: 80000, quantity: 5 },
            ]);

            // Mock expenses
            mockExpenseRepository.findByDateRange.mockResolvedValue([
                { amount: 30000, category: 'Salaries' },
                { amount: 20000, category: 'Rent' },
            ]);

            // Mock income
            mockIncomeRepository.findByDateRange.mockResolvedValue([
                { amount: 10000, source: 'Interest' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.revenue).toBe(300000);
            expect(result.cogs).toBe(120000);
            expect(result.grossProfit).toBe(180000);
            expect(result.grossMargin).toBe(60);
            expect(result.expenses).toBe(50000);
            expect(result.operatingProfit).toBe(130000);
            expect(result.otherIncome).toBe(10000);
            expect(result.netProfit).toBe(140000);
            expect(result.netMargin).toBeCloseTo(46.67, 1);
        });

        test('should handle zero revenue gracefully', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.grossMargin).toBe(0);
            expect(result.netMargin).toBe(0);
            expect(result.netProfit).toBe(0);
        });

        test('should use pre-calculated data when provided', async () => {
            const mockRevenueData = { totalRevenue: 500000 };
            const mockCogsData = { totalCogs: 200000 };
            const mockExpenseData = { total: 100000 };
            const mockIncomeData = { total: 20000 };

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                revenueData: mockRevenueData,
                cogsData: mockCogsData,
                expenseData: mockExpenseData,
                incomeData: mockIncomeData,
            });

            expect(result.revenue).toBe(500000);
            expect(result.cogs).toBe(200000);
            expect(result.grossProfit).toBe(300000);
            expect(result.netProfit).toBe(220000);
            expect(mockSaleRepository.findByDateRange).not.toHaveBeenCalled();
        });
    });
});