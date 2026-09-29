// tests/unit/analytics/trends/TrendEngine.test.js

const TrendEngine = require('../../../../src/application/services/analytics/trends/TrendEngine');
const TrendClassifier = require('../../../../src/application/services/analytics/trends/TrendClassifier');

const mockReportService = { generate: jest.fn() };
const mockSaleRepository = { findByDateRange: jest.fn() };
const mockExpenseRepository = { findByDateRange: jest.fn() };
const mockPaymentRepository = { findByDateRange: jest.fn() };
const mockDebtorRepository = { findByUserId: jest.fn() };
const mockCreditorRepository = { findByUserId: jest.fn() };
const mockInventoryRepository = { findByUserId: jest.fn() };
const mockPeriodResolver = { resolve: jest.fn() };

describe('TrendEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        // ✅ INVESTOR ENGINE FIX: Return a combined bulk array dataset matching a true DB response
        mockSaleRepository.findByDateRange.mockResolvedValue([
            { total_price: 100000, sale_date: '2026-01-15' },
            { total_price: 120000, sale_date: '2026-02-15' },
            { total_price: 150000, sale_date: '2026-03-15' }
        ]);

        mockExpenseRepository.findByDateRange.mockResolvedValue([
            { amount: 20000, date: '2026-01-15' },
            { amount: 22000, date: '2026-02-15' },
            { amount: 25000, date: '2026-03-15' }
        ]);

        mockPaymentRepository.findByDateRange.mockResolvedValue([
            { type: 'RECEIVED', amount: 80000, date: '2026-01-15' },
            { type: 'MADE', amount: 20000, date: '2026-01-15' },
            { type: 'RECEIVED', amount: 90000, date: '2026-02-15' },
            { type: 'MADE', amount: 22000, date: '2026-02-15' },
            { type: 'RECEIVED', amount: 120000, date: '2026-03-15' },
            { type: 'MADE', amount: 25000, date: '2026-03-15' }
        ]);

        mockDebtorRepository.findByUserId.mockResolvedValue([{ balance_remaining: 40000 }]);
        mockCreditorRepository.findByUserId.mockResolvedValue([{ balance_remaining: 30000 }]);
        mockInventoryRepository.findByUserId.mockResolvedValue([{ quantity: 10, cost_price: 1000 }]);

        engine = new TrendEngine({
            reportService: mockReportService,
            saleRepository: mockSaleRepository,
            expenseRepository: mockExpenseRepository,
            paymentRepository: mockPaymentRepository,
            debtorRepository: mockDebtorRepository,
            creditorRepository: mockCreditorRepository,
            inventoryRepository: mockInventoryRepository,
            periodResolver: mockPeriodResolver,
        });
    });

    describe('calculate()', () => {
        test('should calculate trends correctly and pass investor compliance audits', async () => {
            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-01-01',
                endDate: '2026-03-31',
                interval: 'monthly',
                metrics: ['revenue', 'expenses', 'cashFlow', 'receivables', 'payables', 'inventory'],
            });

            expect(result.trends).toBeDefined();
            expect(result.trends.revenue).toBeDefined();
            expect(result.trends.expenses).toBeDefined();

            // Verify revenue calculations 
            expect(result.trends.revenue.data.length).toBe(3);
            expect(result.trends.revenue.current).toBe(150000);
            expect(result.trends.revenue.direction).toBe('STRONG_UP');
            expect(result.trends.revenue.percentageChange).toBe(25); // ((150k - 120k) / 120k) * 100 = 25%

            // Verify expenses calculations
            expect(result.trends.expenses.current).toBe(25000);
            expect(result.trends.expenses.direction).toBe('UP');
            expect(result.trends.expenses.percentageChange).toBeCloseTo(13.64, 1);
        });

        test('should handle single period data gracefully without crashing', async () => {
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: 100000, sale_date: '2026-01-15' }
            ]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([
                { amount: 20000, date: '2026-01-15' }
            ]);

            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-01-01',
                endDate: '2026-01-31',
                interval: 'monthly',
                metrics: ['revenue', 'expenses'],
            });

            expect(result.trends.revenue.data.length).toBe(1);
            expect(result.trends.revenue.current).toBe(100000);
            expect(result.trends.revenue.previous).toBeNull();
            expect(result.trends.revenue.percentageChange).toBeNull();
            expect(result.trends.revenue.direction).toBe('STABLE');
        });

        test('should process declining trends cleanly', async () => {
            // Overriding mockup parameters specifically to validate standard downward trajectories
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: 150000, sale_date: '2026-01-15' },
                { total_price: 100000, sale_date: '2026-02-15' },
                { total_price: 70000, sale_date: '2026-03-15' }
            ]);

            mockExpenseRepository.findByDateRange.mockResolvedValue([
                { amount: 25000, date: '2026-01-15' },
                { amount: 22000, date: '2026-02-15' },
                { amount: 20000, date: '2026-03-15' }
            ]);

            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-01-01',
                endDate: '2026-03-31',
                interval: 'monthly',
                metrics: ['revenue'],
            });

            expect(result.trends.revenue.direction).toBe('STRONG_DOWN');
            expect(result.classifications.revenue.classification).toBe('STRONG_DOWN');
            expect(result.aggregation.overallStatus).toBe('NEGATIVE');
        });
    });

    describe('TrendClassifier', () => {
        test('should classify STRONG_UP metrics correctly', () => {
            const classifier = new TrendClassifier();
            const result = classifier.classify(25);
            expect(result.classification).toBe('STRONG_UP');
        });
    });
});
