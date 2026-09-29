// tests/unit/analytics/comparisons/ComparisonEngine.test.js

// ✅ PRODUCTION FIX: Restructured import path using 4 directory steps to escape deep test folder levels
const ComparisonEngine = require('../../../../src/application/services/analytics/comparisons/ComparisonEngine');
const { AnalyticsContracts } = require('../../../../src/application/services/analytics/contracts');

// Mock structural dependencies
const mockReportService = { generate: jest.fn() };
const mockPeriodResolver = {
    resolve: jest.fn(),
    _getPeriodLabel: jest.fn(),
};

const mockPeriod = {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026',
    type: 'monthly',
};

describe('ComparisonEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReportService.generate
            .mockResolvedValueOnce({
                revenue: { totalRevenue: 300000 },
                grossProfit: { amount: 180000, margin: 60 },
                netProfit: { amount: 130000, margin: 43.33 },
                operatingExpenses: { total: 50000 },
                cashFlow: { netChange: 15000 },
                salesCount: 10,
                summary: { totalRevenue: 300000 }
            })
            .mockResolvedValueOnce({
                revenue: { totalRevenue: 250000 },
                grossProfit: { amount: 150000, margin: 60 },
                netProfit: { amount: 100000, margin: 40 },
                operatingExpenses: { total: 40000 },
                cashFlow: { netChange: 10000 },
                salesCount: 8,
                summary: { totalRevenue: 250000 }
            });

        mockPeriodResolver._getPeriodLabel.mockReturnValue('July 2026');

        engine = new ComparisonEngine({
            reportService: mockReportService,
            periodResolver: mockPeriodResolver,
            periodComparisonCalculator: { 
                calculate: jest.fn().mockResolvedValue({ 
                    type: 'PREVIOUS_PERIOD', 
                    comparisons: { 
                        revenue: { current: 300000, previous: 250000, absoluteChange: 50000, percentageChange: 20, direction: 'INCREASE' } 
                    } 
                }) 
            },
            growthCalculator: { 
                calculate: jest.fn().mockResolvedValue({ 
                    revenueGrowth: { percentageChange: 20, direction: 'UP' }, 
                    profitGrowth: { percentageChange: 30, direction: 'UP' }, 
                    // ✅ PRODUCTION FIX: Added missing grossProfitGrowth to match executive summary
                    grossProfitGrowth: { percentageChange: 20, direction: 'UP' },
                    expenseGrowth: { percentageChange: 25, direction: 'UP' }, 
                    cashFlowGrowth: { percentageChange: 50, direction: 'UP' } 
                }) 
            }
        });
    });

    describe('calculate()', () => {
        test('should calculate all comparisons correctly with investor audit safety traits', async () => {
            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            // Previous Period Tracking Assertion Checks
            expect(result.previousPeriod).toBeDefined();
            expect(result.previousPeriod.type).toBe('PREVIOUS_PERIOD');
            expect(result.previousPeriod.comparisons.revenue.current).toBe(300000);
            expect(result.previousPeriod.comparisons.revenue.previous).toBe(250000);
            expect(result.previousPeriod.comparisons.revenue.absoluteChange).toBe(50000);
            expect(result.previousPeriod.comparisons.revenue.percentageChange).toBe(20);
            expect(result.previousPeriod.comparisons.revenue.direction).toBe('INCREASE');

            // Granular Growth Verification Elements
            expect(result.growth).toBeDefined();
            expect(result.growth.revenueGrowth.percentageChange).toBe(20);
            expect(result.growth.grossProfitGrowth.percentageChange).toBe(20); // Added assertion
            expect(result.growth.profitGrowth.percentageChange).toBeCloseTo(30, 1);
            expect(result.growth.expenseGrowth.percentageChange).toBe(25);
            expect(result.growth.cashFlowGrowth.percentageChange).toBe(50);

            // Executive Summary String Parsing Verification
            const executive = await engine.calculateExecutive({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            // ✅ PRODUCTION FIX: Cleaned broken Windows-1252 decoder output to utilize strict UTF-8 bullet markers
            expect(executive.summary).toBe('revenue increased • grossProfit increased • netProfit increased');
        });
    });

    describe('PeriodComparisonCalculator', () => {
        test('should handle same period last year', async () => {
            engine.periodComparisonCalculator.calculate.mockResolvedValue({
                type: 'SAME_PERIOD_LAST_YEAR',
                comparisons: { revenue: { absoluteChange: 100000, direction: 'INCREASE' } }
            });

            const result = await engine.periodComparisonCalculator.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
                comparisonType: 'SAME_PERIOD_LAST_YEAR',
            });

            expect(result.type).toBe('SAME_PERIOD_LAST_YEAR');
            expect(result.comparisons.revenue.absoluteChange).toBe(100000);
            expect(result.comparisons.revenue.direction).toBe('INCREASE');
        });

        test('should handle YTD comparison workflows', async () => {
            engine.periodComparisonCalculator.calculate.mockResolvedValue({
                type: 'YTD',
                comparisons: { revenue: { absoluteChange: 200000 } }
            });

            const result = await engine.periodComparisonCalculator.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
                comparisonType: 'YTD',
            });

            expect(result.type).toBe('YTD');
            expect(result.comparisons.revenue.absoluteChange).toBe(200000);
        });
    });

    describe('GrowthCalculator', () => {
        test('should handle negative growth rates correctly', async () => {
            engine.growthCalculator.calculate.mockResolvedValue({
                revenueGrowth: { direction: 'DOWN', percentageChange: -33.33 },
                profitGrowth: { direction: 'DOWN', percentageChange: -50 },
                expenseGrowth: { direction: 'UP', percentageChange: 50 }
            });

            const result = await engine.growthCalculator.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            expect(result.revenueGrowth.direction).toBe('DOWN');
            expect(result.revenueGrowth.percentageChange).toBe(-33.33);
            expect(result.profitGrowth.direction).toBe('DOWN');
            expect(result.profitGrowth.percentageChange).toBe(-50);
            expect(result.expenseGrowth.direction).toBe('UP');
            expect(result.expenseGrowth.percentageChange).toBe(50);
        });

        test('should provide clean data statuses for zero previous reference cycles', async () => {
            engine.growthCalculator.calculate.mockResolvedValue({
                revenueGrowth: { dataStatus: 'INSUFFICIENT_DATA', percentageChange: null, direction: 'NO_DATA' }
            });

            const result = await engine.growthCalculator.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            expect(result.revenueGrowth.dataStatus).toBe('INSUFFICIENT_DATA');
            expect(result.revenueGrowth.percentageChange).toBe(null);
        });
    });
});