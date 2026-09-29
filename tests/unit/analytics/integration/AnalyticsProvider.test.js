// tests/unit/analytics/integration/AnalyticsProvider.test.js

// ✅ PRODUCTION FIX: Updated path configuration with 4 directory steps to escape deep test folder nesting
const AnalyticsProvider = require('../../../../src/application/services/analytics/integration/AnalyticsProvider');

const mockReportEngineAdapter = { generate: jest.fn(), getPreviousPeriod: jest.fn() };
const mockKpiEngine = { calculate: jest.fn() };
const mockRatioEngine = { calculate: jest.fn() };
const mockComparisonEngine = { calculate: jest.fn() };
const mockTrendEngine = { calculate: jest.fn() };
const mockConcentrationEngine = { calculate: jest.fn() };
const mockPerformanceEngine = { calculate: jest.fn() };
const mockHealthScoreEngine = { calculate: jest.fn() };
const mockSnapshotService = { generate: jest.fn() };
const mockExecutiveAnalyticsService = { generate: jest.fn() };

const mockPeriod = {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026',
    type: 'monthly',
};

describe('AnalyticsProvider', () => {
    let provider;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReportEngineAdapter.generate.mockResolvedValue({
            period: mockPeriod,
            periodType: 'monthly',
            report: {
                profitLoss: { revenue: 300000, grossProfit: 180000, grossMargin: 60, netProfit: 130000, netMargin: 43.33, operatingExpenses: 50000 },
                cashFlow: { closingCash: 150000, netChange: 50000 },
                balanceSheet: { totalAssets: 500000, totalLiabilities: 200000, totalEquity: 300000, receivables: 40000, payables: 30000, inventory: 100000 }
            },
            metrics: { revenue: 300000, grossProfit: 180000, grossMargin: 60, netProfit: 130000 }
        });

        mockKpiEngine.calculate.mockResolvedValue({ revenue: { value: 300000 }, revenueGrowth: { value: 20 } });
        mockRatioEngine.calculate.mockResolvedValue({ grossMargin: { value: 60 } });
        mockComparisonEngine.calculate.mockResolvedValue({ revenue: { percentageChange: 20 } });
        mockTrendEngine.calculate.mockResolvedValue({ revenue: { direction: 'UP' } });
        mockConcentrationEngine.calculate.mockResolvedValue({ customers: { riskLevel: 'MODERATE' } });
        mockPerformanceEngine.calculate.mockResolvedValue({ scores: { overall: { score: 72, status: 'GOOD' } } });
        mockHealthScoreEngine.calculate.mockResolvedValue({ overallScore: 78, overallStatus: 'GOOD' });
        
        mockSnapshotService.generate.mockResolvedValue({
            businessId: 1, generatedAt: '2026-08-31T23:59:59.000Z', period: mockPeriod,
            summary: { healthScore: 78, healthStatus: 'GOOD' }
        });

        mockExecutiveAnalyticsService.generate.mockResolvedValue({
            period: mockPeriod,
            executiveSummary: { revenue: 300000, healthScore: 78, healthStatus: 'GOOD' }
        });

        provider = new AnalyticsProvider({
            reportEngineAdapter: mockReportEngineAdapter,
            kpiEngine: mockKpiEngine,
            ratioEngine: mockRatioEngine,
            comparisonEngine: mockComparisonEngine,
            trendEngine: mockTrendEngine,
            concentrationEngine: mockConcentrationEngine,
            performanceEngine: mockPerformanceEngine,
            healthScoreEngine: mockHealthScoreEngine,
            snapshotService: mockSnapshotService,
            executiveAnalyticsService: mockExecutiveAnalyticsService,
        });
    });

    describe('generateAnalytics()', () => {
        test('should generate complete analytics payloads cleanly and pass audits', async () => {
            const result = await provider.generateAnalytics({
                userId: 1, businessId: 1, startDate: '2026-08-01', endDate: '2026-08-31', periodType: 'monthly'
            });

            // Verify structure
            expect(result).toBeDefined();
            expect(result.period).toBeDefined();
            expect(result.reportData).toBeDefined();
            expect(result.analytics).toBeDefined();
            expect(result.snapshot).toBeDefined();
            expect(result.executive).toBeDefined();

            // Verify content matching
            expect(result.reportData.period.startDate).toBe('2026-08-01');
            expect(result.reportData.report.profitLoss.revenue).toBe(300000);

            // ✅ PRODUCTION FIX: Completed cut-off verification metrics loop assertions cleanly
            expect(result.analytics.kpis).toBeDefined();
            expect(result.analytics.ratios).toBeDefined();
            expect(result.analytics.trends).toBeDefined();
        });
    });
});
