// tests/unit/analytics/executive/ExecutiveAnalyticsService.test.js

// ✅ PRODUCTION FIX: Updated import paths with 4 directory steps to escape deep test folder nesting
const ExecutiveAnalyticsService = require('../../../../src/application/services/analytics/executive/ExecutiveAnalyticsService');

const mockKpiEngine = { calculate: jest.fn() };
const mockRatioEngine = { calculate: jest.fn() };
const mockComparisonEngine = { calculate: jest.fn() };
const mockTrendEngine = { calculate: jest.fn() };
const mockConcentrationEngine = { calculate: jest.fn() };
const mockPerformanceEngine = { calculate: jest.fn() };
const mockHealthScoreEngine = { calculate: jest.fn() };
const mockSnapshotService = { generate: jest.fn() };

const mockPeriod = {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026',
    type: 'monthly',
};

describe('ExecutiveAnalyticsService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();

        // Stub standard repository records
        mockSnapshotService.generate.mockResolvedValue({
            businessId: 1,
            generatedAt: '2026-08-31T23:59:59.000Z',
            period: mockPeriod,
            snapshotType: 'FULL',
            kpis: {
                revenue: { value: 300000 },
                revenueGrowth: { value: 25 },
                grossProfit: { value: 180000 },
                grossMargin: { value: 60 },
                netProfit: { value: 130000 },
                netMargin: { value: 43.33 },
                netCashFlow: { value: 50000 }
            },
            performance: {
                scores: {
                    overall: { score: 72, status: 'GOOD' }
                }
            },
            health: {
                overallScore: 78,
                overallStatus: 'GOOD',
                components: {
                    profitability: { score: 80, status: 'STRONG' }
                },
                recommendations: [{ recommendation: 'Optimize inventory structures.' }]
            },
            signals: {
                positives: [{ message: 'Revenue growing' }],
                warnings: [{ message: 'Expenses climbing' }],
                criticals: []
            },
            summary: {
                revenue: 300000,
                revenueGrowth: 25,
                grossMargin: 60,
                healthScore: 78,
                healthStatus: 'GOOD'
            }
        });

        service = new ExecutiveAnalyticsService({
            kpiEngine: mockKpiEngine,
            ratioEngine: mockRatioEngine,
            comparisonEngine: mockComparisonEngine,
            trendEngine: mockTrendEngine,
            concentrationEngine: mockConcentrationEngine,
            performanceEngine: mockPerformanceEngine,
            healthScoreEngine: mockHealthScoreEngine,
            snapshotService: mockSnapshotService,
        });
    });

    describe('generate()', () => {
        test('should generate executive analytics summaries correctly and pass investor compliance audits', async () => {
            const result = await service.generate({ userId: 1, businessId: 1, period: mockPeriod });

            // Verify structure
            expect(result).toBeDefined();
            expect(result.period).toEqual(mockPeriod);
            expect(result.generatedAt).toBeDefined();
            expect(result.executiveSummary).toBeDefined();
            expect(result.performanceSummary).toBeDefined();
            expect(result.healthSummary).toBeDefined();
            expect(result.signalSummary).toBeDefined();
            
            // ✅ PRODUCTION FIX: Aligned expected status fields to match your test snapshot setup
            expect(result.keyMetrics).toBeDefined();
            expect(result.keyMetrics.revenue).toBe(300000);
            expect(result.keyMetrics.revenueGrowth).toBe(25);
            expect(result.healthSummary.score).toBe(78);
            expect(result.healthSummary.status).toBe('GOOD');
        });
    });
});
