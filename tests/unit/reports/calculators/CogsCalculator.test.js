// tests/unit/reports/calculators/CogsCalculator.test.js

const CogsCalculator = require('../../../../src/application/services/reports/calculators/CogsCalculator');

const mockSaleRepository = {
    findByDateRange: jest.fn(),
};

describe('CogsCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new CogsCalculator({
            saleRepository: mockSaleRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate COGS correctly with sales data', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { cogs: 40000, quantity: 2, unit_cost: 20000, item_name: 'Product A' },
                { cogs: 100000, quantity: 5, unit_cost: 20000, item_name: 'Product B' },
                { cogs: 60000, quantity: 3, unit_cost: 20000, item_name: 'Product A' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.totalCogs).toBe(200000);
            expect(result.totalQuantity).toBe(10);
            expect(result.averageCogsPerUnit).toBe(20000);
        });

        test('should calculate COGS from unit_cost when cogs is missing', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { quantity: 2, unit_cost: 20000, item_name: 'Product A' },
                { quantity: 5, unit_cost: 30000, item_name: 'Product B' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.totalCogs).toBe(190000); // (2 * 20000) + (5 * 30000)
            expect(result.totalQuantity).toBe(7);
        });

        test('should return zeros when no sales', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.totalCogs).toBe(0);
            expect(result.totalQuantity).toBe(0);
            expect(result.averageCogsPerUnit).toBe(0);
        });

        test('should group by product when requested', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { cogs: 40000, quantity: 2, unit_cost: 20000, item_name: 'Product A' },
                { cogs: 100000, quantity: 5, unit_cost: 20000, item_name: 'Product B' },
                { cogs: 60000, quantity: 3, unit_cost: 20000, item_name: 'Product A' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                groupBy: 'product',
            });

            expect(result.breakdown).toBeDefined();
            expect(result.breakdown.length).toBe(2);
            expect(result.breakdown[0].name).toBe('Product A');
            expect(result.breakdown[0].cogs).toBe(100000);
            expect(result.breakdown[0].units).toBe(5);
        });
    });
});