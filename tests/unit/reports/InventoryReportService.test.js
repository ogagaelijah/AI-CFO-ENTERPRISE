// tests/unit/reports/InventoryReportService.test.js

const InventoryReportService = require('../../../src/application/services/reports/InventoryReportService');

// Mock repositories
const mockInventoryRepository = {
    findByUserId: jest.fn(),
};

describe('InventoryReportService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new InventoryReportService({
            inventoryRepository: mockInventoryRepository,
        });
    });

    describe('generate()', () => {
        test('should generate inventory report correctly', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 3, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
                { item_name: 'Item C', quantity: 0, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.reportType).toBe('inventory');
            expect(result.data.summary.totalItems).toBe(3);
            expect(result.data.summary.totalQuantity).toBe(13);
            expect(result.data.summary.totalCostValue).toBe(16000);
            expect(result.data.summary.totalSellingValue).toBe(22500);
            expect(result.data.summary.totalPotentialProfit).toBe(6500);
            // Both low stock and out of stock are counted separately
            // lowStockCount = items with quantity > 0 AND quantity <= reorder_level (Item B)
            // outOfStockCount = items with quantity = 0 (Item C)
            expect(result.data.summary.lowStockCount).toBe(1);
            expect(result.data.summary.outOfStockCount).toBe(1);
            expect(result.data.items).toBeDefined();
            expect(result.data.items.length).toBe(3);
        });

        test('should handle empty inventory', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.summary.totalItems).toBe(0);
            expect(result.data.summary.totalQuantity).toBe(0);
            expect(result.data.summary.totalCostValue).toBe(0);
            expect(result.data.items).toBeNull();
        });

        test('should filter by status', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 3, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
                { item_name: 'Item C', quantity: 0, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
                filterStatus: 'LOW_STOCK',
            });

            expect(result.data.items.length).toBe(1);
            expect(result.data.items[0].name).toBe('Item B');
            expect(result.data.filteredBy).toBe('LOW_STOCK');
        });

        test('should sort by value with deterministic secondary sort', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 5, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
                { item_name: 'Item C', quantity: 20, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
                sortBy: 'value',
            });

            // All three items have value = 10000
            // Sort is deterministic by name after value comparison
            expect(result.data.items[0].value).toBe(10000);
            expect(result.data.items[1].value).toBe(10000);
            expect(result.data.items[2].value).toBe(10000);
            // Names are sorted alphabetically when values are equal
            expect(result.data.items.map(i => i.name)).toEqual(['Item A', 'Item B', 'Item C']);
        });

        test('should return error for invalid inputs', async () => {
            const result = await service.generate({
                userId: null,
                businessId: 1,
            });

            expect(result.status).toBe('ERROR');
            expect(result.errors).toBeDefined();
        });
    });

    describe('generateLowStock()', () => {
        test('should generate low stock report', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 3, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
                { item_name: 'Item C', quantity: 0, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await service.generateLowStock({
                userId: 1,
                businessId: 1,
                threshold: 5,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.items.length).toBe(1);
            expect(result.data.items[0].name).toBe('Item B');
        });
    });

    describe('generateOutOfStock()', () => {
        test('should generate out of stock report', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 3, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
                { item_name: 'Item C', quantity: 0, cost_price: 500, selling_price: 800, reorder_level: 2 },
            ]);

            const result = await service.generateOutOfStock({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.items.length).toBe(1);
            expect(result.data.items[0].name).toBe('Item C');
        });
    });

    describe('generateProfitability()', () => {
        test('should generate profitability report', async () => {
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { item_name: 'Item A', quantity: 10, cost_price: 1000, selling_price: 1500, reorder_level: 5 },
                { item_name: 'Item B', quantity: 3, cost_price: 2000, selling_price: 2500, reorder_level: 5 },
            ]);

            const result = await service.generateProfitability({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.items[0].profitPerUnit).toBeDefined();
            expect(result.data.items[0].margin).toBeDefined();
            expect(result.data.items[0].profitPerUnit).toBe(500);
        });
    });
});