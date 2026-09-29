// tests/unit/reports/calculators/InventoryCalculator.test.js

const InventoryCalculator = require('../../../../src/application/services/reports/calculators/InventoryCalculator');

const mockInventoryRepository = {
    findByUserId: jest.fn(),
};

describe('InventoryCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new InventoryCalculator({
            inventoryRepository: mockInventoryRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate inventory correctly with items', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 5, cost_price: 2000, selling_price: 2500, reorder_level: 3 },
                { item_name: 'Item C', quantity: 0, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            // Total cost: (10*1000) + (5*2000) + (0*500) = 20000
            expect(result.totalCostValue).toBe(20000);
            // Total selling: (10*1500) + (5*2500) + (0*800) = 27500
            expect(result.totalSellingValue).toBe(27500);
            // Profit: 27500 - 20000 = 7500
            expect(result.totalPotentialProfit).toBe(7500);
            expect(result.totalItems).toBe(3);
            expect(result.totalQuantity).toBe(15);
            // Low stock: Item A (10 > 5 = ok), Item B (5 > 3 = ok), Item C (0 = out of stock)
            expect(result.lowStockCount).toBe(0);
            expect(result.outOfStockCount).toBe(1);
        });

        test('should include details when requested', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.details).toBeDefined();
            expect(result.details.length).toBe(1);
            expect(result.details[0].name).toBe('Item A');
            expect(result.details[0].value).toBe(10000);
            expect(result.details[0].status).toBe('IN_STOCK');
        });

        test('should handle empty inventory', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.totalItems).toBe(0);
            expect(result.totalQuantity).toBe(0);
            expect(result.totalCostValue).toBe(0);
            expect(result.totalSellingValue).toBe(0);
            expect(result.totalPotentialProfit).toBe(0);
            expect(result.lowStockCount).toBe(0);
        });
    });
});