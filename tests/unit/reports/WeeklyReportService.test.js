const WeeklyReportService = require('../../../src/application/services/reports/WeeklyReportService');

// Mock core data repositories
const mockSaleRepository = { findByDateRange: jest.fn() };
const mockPurchaseRepository = { findByDateRange: jest.fn() };
const mockExpenseRepository = { findByDateRange: jest.fn() };
const mockIncomeRepository = { findByDateRange: jest.fn() };
const mockDebtorRepository = { findByUserId: jest.fn() };
const mockCreditorRepository = { findByUserId: jest.fn() };
const mockInventoryRepository = { findByUserId: jest.fn() };
const mockPaymentRepository = { findByDateRange: jest.fn() };

describe('WeeklyReportService', () => {
    let service;
    let mockRevenueCalculator, mockCogsCalculator, mockProfitCalculator;
    let mockCashCalculator, mockArCalculator, mockApCalculator, mockInventoryCalculator;

    beforeEach(() => {
        jest.clearAllMocks();

        // ✅ PRODUCTION FIX: Use flexible mock definitions instead of rigid chains
        mockRevenueCalculator = { calculate: jest.fn() };
        mockCogsCalculator = { calculate: jest.fn() };
        mockProfitCalculator = { calculate: jest.fn() };
        mockCashCalculator = { calculate: jest.fn().mockResolvedValue({ closingCash: 0 }) };
        mockArCalculator = { calculate: jest.fn().mockResolvedValue({ totalOutstanding: 40000 }) };
        mockApCalculator = { calculate: jest.fn().mockResolvedValue({ totalOutstanding: 20000 }) };
        mockInventoryCalculator = { calculate: jest.fn().mockResolvedValue({ totalItems: 1, totalCostValue: 10000 }) };

        service = new WeeklyReportService({
            saleRepository: mockSaleRepository,
            purchaseRepository: mockPurchaseRepository,
            expenseRepository: mockExpenseRepository,
            incomeRepository: mockIncomeRepository,
            debtorRepository: mockDebtorRepository,
            creditorRepository: mockCreditorRepository,
            inventoryRepository: mockInventoryRepository,
            paymentRepository: mockPaymentRepository,
            revenueCalculator: mockRevenueCalculator,
            cogsCalculator: mockCogsCalculator,
            profitCalculator: mockProfitCalculator,
            cashCalculator: mockCashCalculator,
            arCalculator: mockArCalculator,
            apCalculator: mockApCalculator,
            inventoryCalculator: mockInventoryCalculator
        });
    });

    describe('generate()', () => {
        test('should generate weekly report correctly with compliant business logic', async () => {
            // ✅ Configure scenario specific calculator results dynamically
            mockRevenueCalculator.calculate
                .mockResolvedValueOnce({
                    totalRevenue: 300000,
                    sales: [
                        { total_price: 100000, item_name: 'Product A', customer_name: 'Customer 1' },
                        { total_price: 200000, item_name: 'Product B', customer_name: 'Customer 2' }
                    ]
                }) // Current Week sales
                .mockResolvedValueOnce({
                    totalRevenue: 150000,
                    sales: [{ total_price: 150000, item_name: 'Product A', customer_name: 'Customer 1' }]
                }); // Previous Week sales

            mockCogsCalculator.calculate
                .mockResolvedValueOnce({ totalCogs: 120000 })  // Current Week COGS
                .mockResolvedValueOnce({ totalCogs: 60000 });   // Previous Week COGS

            mockProfitCalculator.calculate.mockResolvedValue({
                grossProfit: 180000,
                totalExpenses: 30000,
                netProfit: 155000
            });

            // Set up repository returns
            mockExpenseRepository.findByDateRange
                .mockResolvedValueOnce([{ amount: 20000, category: 'Salaries' }, { amount: 10000, category: 'Rent' }])
                .mockResolvedValueOnce([{ amount: 15000, category: 'Salaries' }]);

            mockIncomeRepository.findByDateRange
                .mockResolvedValueOnce([{ amount: 5000, source: 'Interest' }])
                .mockResolvedValueOnce([]);

            mockPurchaseRepository.findByDateRange.mockResolvedValueOnce([{ total_cost: 30000, item_name: 'Stock A' }]);
            mockPaymentRepository.findByDateRange.mockResolvedValue([[]]);
            
            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            // Structural Validation
            expect(result.period).toBeDefined();
            expect(result.period.start).toBe('2026-08-24');
            expect(result.period.end).toBe('2026-08-30');

            // Profit & Loss Accounting Base Checks
            expect(result.revenue).toBe(305000); 
            expect(result.otherRevenue).toBe(5000); 
            expect(result.cogs).toBe(120000);
            expect(result.grossProfit).toBe(180000); 
            expect(result.grossMargin).toBe(60);      

            // Overhead Expenses and Bottom Line Profits
            expect(result.expenses).toBe(30000);
            expect(result.netProfit).toBe(155000);
            expect(result.netMargin).toBeCloseTo(50.82, 1); 

            // Growth Calculations
            expect(result.weekOverWeek).toBeDefined();
            expect(result.weekOverWeek.revenueChange).toBeCloseTo(103.33, 1);
            expect(result.weekOverWeek.previousWeek.revenue).toBe(150000);

            // Lists and Arrays Verification
            expect(result.topProducts).toBeDefined();
            expect(result.topProducts.length).toBe(2);
            expect(result.topProducts[0].name).toBe('Product B');
            expect(result.topProducts[0].amount).toBe(200000);

            expect(result.topExpenses).toBeDefined();
            expect(result.topExpenses.length).toBe(2);
            expect(result.topExpenses[0].category).toBe('Salaries');
            expect(result.topExpenses[0].amount).toBe(20000);
        });

        test('should handle empty data periods gracefully', async () => {
            // ✅ Override calculators specifically for a zeroed-out state
            mockRevenueCalculator.calculate.mockResolvedValue({ totalRevenue: 0, sales: [] });
            mockCogsCalculator.calculate.mockResolvedValue({ totalCogs: 0 });
            mockProfitCalculator.calculate.mockResolvedValue({ grossProfit: 0, totalExpenses: 0, netProfit: 0 });
            
            mockCashCalculator.calculate.mockResolvedValue({ closingCash: 0 });
            mockArCalculator.calculate.mockResolvedValue({ totalOutstanding: 0 });
            mockApCalculator.calculate.mockResolvedValue({ totalOutstanding: 0 });
            mockInventoryCalculator.calculate.mockResolvedValue({ totalItems: 0, totalCostValue: 0 });

            mockExpenseRepository.findByDateRange.mockResolvedValue([]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([]);
            mockPurchaseRepository.findByDateRange.mockResolvedValue([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                date: '2026-08-30',
            });

            expect(result.revenue).toBe(0);
            expect(result.netProfit).toBe(0);
            expect(result.netMargin).toBe(0);
            expect(result.topProducts.length).toBe(0);
            expect(result.topExpenses.length).toBe(0);
            expect(result.keyRisks).toContain('No revenue recorded this week');
        });
    });
});
