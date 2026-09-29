// tests/unit/analytics/snapshots/AnalyticsSnapshotService.test.js

// ✅ PRODUCTION FIX: Adjusted relative paths to feature 4 folder hops to jump to root cleanly
const AnalyticsSnapshotService = require('../../../../src/application/services/analytics/snapshots/AnalyticsSnapshotService');

// Mock dependencies
const mockKpiEngine = { calculate: jest.fn() };
const mockRatioEngine = { calculate: jest.fn() };
const mockComparisonEngine = { calculate: jest.fn() };
const mockTrendEngine = { calculate: jest.fn() };
const mockConcentrationEngine = { calculate: jest.fn() };
const mockPerformanceEngine = { calculate: jest.fn() };
const mockHealthScoreEngine = { calculate: jest.fn() };

const mockPeriod = {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026',
    type: 'monthly',
};

describe('AnalyticsSnapshotService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();

        mockKpiEngine.calculate.mockResolvedValue({
            kpis: {
                revenue: { value: 300000, displayName: 'Revenue' },
                revenueGrowth: { value: 25, displayName: 'Revenue Growth' },
                grossProfit: { value: 180000, displayName: 'Gross Profit' },
                grossMargin: { value: 60, displayName: 'Gross Margin' },
                netMargin: { value: 43.33, displayName: 'Net Margin' },
                netCashFlow: { value: 50000, displayName: 'Net Cash Flow' }
            }
        });

        mockRatioEngine.calculate.mockResolvedValue({ grossMargin: { value: 60 }, netMargin: { value: 43.33 } });
        mockComparisonEngine.calculate.mockResolvedValue({ revenue: { percentageChange: 25 } });
        mockTrendEngine.calculate.mockResolvedValue({ trends: { revenue: { direction: 'UP', percentageChange: 25 } } });
        mockConcentrationEngine.calculate.mockResolvedValue({ customers: { riskLevel: 'MODERATE' } });
        mockPerformanceEngine.calculate.mockResolvedValue({ scores: { overall: { score: 72, status: 'GOOD' } }, signals: [] });
        
        mockHealthScoreEngine.calculate.mockResolvedValue({
            overallScore: 78,
            overallStatus: 'GOOD',
            signals: { positives: [], warnings: [], criticals: [] },
        });

        service = new AnalyticsSnapshotService({
            kpiEngine: mockKpiEngine,
            ratioEngine: mockRatioEngine,
            comparisonEngine: mockComparisonEngine,
            trendEngine: mockTrendEngine,
            concentrationEngine: mockConcentrationEngine,
            performanceEngine: mockPerformanceEngine,
            healthScoreEngine: mockHealthScoreEngine,
        });
    });

    describe('generate()', () => {
        test('should generate a complete analytics snapshot payload cleanly', async () => {
            const result = await service.generate({ userId: 1, businessId: 1, period: mockPeriod, snapshotType: 'FULL' });

            expect(result).toBeDefined();
            expect(result.businessId).toBe(1);
            expect(result.period.start).toBe('2026-08-01');
            expect(result.period.end).toBe('2026-08-31');

            // Sections Existence Checks
            expect(result.kpis).toBeDefined();
            expect(result.ratios).toBeDefined();
            expect(result.trends).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.snapshotType).toBe('FULL');

            // Top-Line Summary Valuation Alignments
            expect(result.summary.revenue).toBe(300000);
            expect(result.summary.revenueGrowth).toBe(25);
            expect(result.summary.grossMargin).toBe(60);
            expect(result.summary.healthScore).toBe(78);
            expect(result.summary.healthStatus).toBe('GOOD');
        });

        test('should generate streamlined executive snapshots', async () => {
            const result = await service.generateExecutive({ userId: 1, businessId: 1, period: mockPeriod });

            expect(result.snapshotType).toBe('EXECUTIVE');
            expect(result.kpis).toBeDefined();
            expect(result.kpis.revenue).toBeDefined();
            expect(result.summary).toBeDefined();
        });

        test('should include trends when requested explicitly by context params', async () => {
            const result = await service.generate({ userId: 1, businessId: 1, period: mockPeriod, includeTrends: true });
            expect(result.trends).toBeDefined();
            expect(mockTrendEngine.calculate).toHaveBeenCalled();
        });

        test('should handle missing explicit period objects using raw date inputs', async () => {
            const result = await service.generate({ userId: 1, businessId: 1, startDate: '2026-08-01', endDate: '2026-08-31', periodType: 'custom' });

            expect(result.period.start).toBe('2026-08-01');
            expect(result.period.end).toBe('2026-08-31');
            expect(result.period.type).toBe('custom');
        });

        test('should handle missing data gracefully and bypass exceptions via fallbacks', async () => {
            mockKpiEngine.calculate.mockResolvedValue({});
            mockRatioEngine.calculate.mockResolvedValue({});
            mockPerformanceEngine.calculate.mockResolvedValue({});
            mockHealthScoreEngine.calculate.mockResolvedValue({});

            const result = await service.generate({ userId: 1, businessId: 1, period: mockPeriod });
            
            // ✅ PRODUCTION FIX: Completed cut-off verification metrics loops securely
            expect(result).toBeDefined();
            expect(result.summary.revenue).toBe(0);
            expect(result.summary.healthScore).toBe(0);
        });
    });
});
