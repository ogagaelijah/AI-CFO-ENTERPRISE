// tests/unit/analytics/concentration/ConcentrationEngine.test.js

const ConcentrationEngine = require('../../../../src/application/services/analytics/concentration/ConcentrationEngine');
// ✅ PRODUCTION FIX: Removed curly braces to load the direct class constructor function perfectly
const ConcentrationAnalyzer = require('../../../../src/application/services/analytics/concentration/ConcentrationAnalyzer');

const mockSaleRepository = { findByDateRange: jest.fn() };
const mockPurchaseRepository = { findByDateRange: jest.fn() };
const mockExpenseRepository = { findByDateRange: jest.fn() };
const mockCustomerRepository = { findByBusinessId: jest.fn() };
const mockSupplierRepository = { findByBusinessId: jest.fn() };
const mockInventoryRepository = { findByUserId: jest.fn() };

describe('ConcentrationEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        mockSaleRepository.findByDateRange.mockResolvedValue([
            { total_price: 100000, cogs: 40000, item_name: 'Product A', customer_name: 'Customer A' },
            { total_price: 200000, cogs: 80000, item_name: 'Product B', customer_name: 'Customer A' },
            { total_price: 300000, cogs: 120000, item_name: 'Product A', customer_name: 'Customer B' },
            { total_price: 50000, cogs: 20000, item_name: 'Product C', customer_name: 'Customer C' },
            { total_price: 30000, cogs: 12000, item_name: 'Product C', customer_name: 'Customer D' },
        ]);

        mockPurchaseRepository.findByDateRange.mockResolvedValue([
            { total_cost: 100000, supplier_name: 'Supplier A' },
            { total_cost: 150000, supplier_name: 'Supplier A' },
            { total_cost: 50000, supplier_name: 'Supplier B' },
            { total_cost: 30000, supplier_name: 'Supplier C' },
            { total_cost: 20000, supplier_name: 'Supplier D' },
        ]);

        mockExpenseRepository.findByDateRange.mockResolvedValue([
            { amount: 50000, category: 'Salaries' },
            { amount: 30000, category: 'Salaries' },
            { amount: 20000, category: 'Rent' },
            { amount: 15000, category: 'Marketing' },
            { amount: 10000, category: 'Utilities' },
        ]);

        engine = new ConcentrationEngine({
            saleRepository: mockSaleRepository,
            purchaseRepository: mockPurchaseRepository,
            expenseRepository: mockExpenseRepository,
            customerRepository: mockCustomerRepository,
            supplierRepository: mockSupplierRepository,
            inventoryRepository: mockInventoryRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate all concentration metrics correctly with aligned accounting totals', async () => {
            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                topN: 5,
            });

            expect(result).toBeDefined();
            expect(result.products).toBeDefined();
            expect(result.customers).toBeDefined();
            expect(result.suppliers).toBeDefined();

            // Product Concentration
            expect(result.products.type).toBe('PRODUCT');
            expect(result.products.total).toBe(680000);
            expect(result.products.topPercentage).toBe(100); 
            expect(result.products.riskLevel).toBe('CRITICAL');

            // Customer Concentration
            expect(result.customers.type).toBe('CUSTOMER');
            expect(result.customers.total).toBe(680000);
            expect(result.customers.topPercentage).toBe(100);

            // Supplier Concentration
            expect(result.suppliers.type).toBe('SUPPLIER');
            expect(result.suppliers.total).toBe(350000);
            expect(result.suppliers.topPercentage).toBe(100);
            expect(result.suppliers.riskLevel).toBe('CRITICAL');

            // Expense Category Concentration
            expect(result.expenseCategories.type).toBe('EXPENSE_CATEGORY');
            expect(result.expenseCategories.total).toBe(125000);
            expect(result.expenseCategories.topPercentage).toBe(100);
        });

        test('should handle empty operational windows gracefully without dividing by zero', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([]);
            mockPurchaseRepository.findByDateRange.mockResolvedValue([]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([]);

            const result = await engine.calculate({ userId: 1, businessId: 1, startDate: '2026-08-01', endDate: '2026-08-31', topN: 5 });

            expect(result.products.total).toBe(0);
            expect(result.products.topPercentage).toBe(0);
            expect(result.products.riskLevel).toBe('LOW');
            expect(result.overallRiskLevel).toBe('LOW');
            expect(result.summary).toBe('All concentration levels are low');
        });
    });

    describe('ConcentrationAnalyzer - analyzeProducts()', () => {
        test('should analyze products by revenue correctly', async () => {
            const analyzer = new ConcentrationAnalyzer({ saleRepository: mockSaleRepository });

            const result = await analyzer.analyzeProducts({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                topN: 5,
                metric: 'revenue',
            });

            expect(result.items.length).toBe(3);
            expect(result.items[0].name).toBe('Product A');
            expect(result.items[0].percentage).toBeCloseTo(58.82, 1);
        });

        test('should analyze products by operating profit yields correctly', async () => {
            const analyzer = new ConcentrationAnalyzer({ saleRepository: mockSaleRepository });

            const result = await analyzer.analyzeProducts({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                topN: 5,
                metric: 'profit',
            });

            expect(result.items[0].name).toBe('Product A');
            expect(result.items[0].percentage).toBeCloseTo(58.82, 1);
        });
    });
});
