// tests/unit/reports/calculators/RevenueCalculator.test.js

const RevenueCalculator = require('../../../../src/application/services/reports/calculators/RevenueCalculator');

// Mock repositories
const mockSaleRepository = {
    findByDateRange: jest.fn(),
};

describe('RevenueCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new RevenueCalculator({
            saleRepository: mockSaleRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate revenue correctly with sales data', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: 100000, quantity: 2, item_name: 'Product A', customer_name: 'Customer 1' },
                { total_price: 200000, quantity: 5, item_name: 'Product B', customer_name: 'Customer 2' },
                { total_price: 150000, quantity: 3, item_name: 'Product A', customer_name: 'Customer 1' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.totalRevenue).toBe(450000);
            expect(result.salesCount).toBe(3);
            expect(result.totalUnits).toBe(10);
            expect(result.averageSaleValue).toBe(150000);
        });

        test('should return zeros when no sales', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.totalRevenue).toBe(0);
            expect(result.salesCount).toBe(0);
            expect(result.totalUnits).toBe(0);
            expect(result.averageSaleValue).toBe(0);
        });

        test('should handle invalid data gracefully', async () => {
            // First sale has null total_price (invalid), second has undefined (invalid)
            // Third has valid total_price
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: null, quantity: 0, item_name: 'Invalid Product' },
                { total_price: undefined, quantity: 2, item_name: 'Also Invalid' },
                { total_price: 100000, quantity: 3, item_name: 'Valid Product' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            // Only the valid sale should count
            expect(result.totalRevenue).toBe(100000);
            expect(result.salesCount).toBe(3); // All sales counted
            expect(result.validSalesCount).toBe(1); // Only valid sales
            expect(result.totalUnits).toBe(5); // All units counted
            expect(result.averageSaleValue).toBe(100000);
        });
    });
});