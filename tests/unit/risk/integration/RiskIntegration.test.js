// tests/unit/risk/integration/RiskIntegration.test.js

const RiskOrchestrator = require('../../../../src/application/services/risk/RiskOrchestrator');

/**
 * Phase 6.9: End-to-End Integration Tests
 *
 * These tests validate that the Risk Engine works as a complete system
 * with all modules integrating correctly.
 */
describe('Risk Engine Integration', () => {
    let orchestrator;

    /**
     * Comprehensive mock data for integration testing
     */
    const mockData = {
        cash: {
            current: 350000,
            history: [
                { value: 500000, inflow: 200000, outflow: 150000, date: '2026-06-01' },
                { value: 450000, inflow: 180000, outflow: 160000, date: '2026-06-15' },
                { value: 400000, inflow: 160000, outflow: 170000, date: '2026-07-01' },
                { value: 380000, inflow: 150000, outflow: 180000, date: '2026-07-15' },
                { value: 350000, inflow: 140000, outflow: 190000, date: '2026-08-01' },
            ],
        },
        revenue: {
            growth: -8,
            history: [
                { value: 1000000, date: '2026-06-01' },
                { value: 980000, date: '2026-06-15' },
                { value: 950000, date: '2026-07-01' },
                { value: 920000, date: '2026-07-15' },
                { value: 900000, date: '2026-08-01' },
                { value: 880000, date: '2026-08-15' },
            ],
        },
        profitability: {
            type: 'gross',
            history: [
                { value: 45, date: '2026-06-01' },
                { value: 44, date: '2026-06-15' },
                { value: 42, date: '2026-07-01' },
                { value: 40, date: '2026-07-15' },
                { value: 38, date: '2026-08-01' },
                { value: 35, date: '2026-08-15' },
            ],
        },
        expenses: {
            history: [
                { value: 100000, revenue: 500000, date: '2026-06-01' },
                { value: 110000, revenue: 510000, date: '2026-06-15' },
                { value: 120000, revenue: 520000, date: '2026-07-01' },
                { value: 130000, revenue: 530000, date: '2026-07-15' },
                { value: 140000, revenue: 540000, date: '2026-08-01' },
                { value: 150000, revenue: 550000, date: '2026-08-15' },
            ],
            categories: {
                salaries: 80000,
                rent: 30000,
                marketing: 25000,
                utilities: 15000,
            },
        },
        receivables: {
            history: [
                { value: 200000, date: '2026-06-01' },
                { value: 250000, date: '2026-06-15' },
                { value: 300000, date: '2026-07-01' },
                { value: 350000, date: '2026-07-15' },
                { value: 400000, date: '2026-08-01' },
                { value: 450000, date: '2026-08-15' },
            ],
            aging: {
                current: 150000,
                days1to30: 120000,
                days31to60: 100000,
                days61to90: 60000,
                daysOver90: 20000,
            },
        },
        payables: {
            history: [
                { value: 100000, date: '2026-06-01' },
                { value: 120000, date: '2026-06-15' },
                { value: 140000, date: '2026-07-01' },
                { value: 160000, date: '2026-07-15' },
                { value: 180000, date: '2026-08-01' },
                { value: 200000, date: '2026-08-15' },
            ],
            aging: {
                current: 80000,
                days1to30: 50000,
                days31to60: 40000,
                days61to90: 20000,
                daysOver90: 10000,
            },
        },
        inventory: {
            lowStockItems: 4,
            history: [
                { value: 100000, revenue: 500000, date: '2026-06-01' },
                { value: 120000, revenue: 520000, date: '2026-06-15' },
                { value: 140000, revenue: 540000, date: '2026-07-01' },
                { value: 160000, revenue: 560000, date: '2026-07-15' },
                { value: 180000, revenue: 580000, date: '2026-08-01' },
                { value: 200000, revenue: 600000, date: '2026-08-15' },
            ],
            details: [
                { value: 80000, daysSinceLastSale: 5 },
                { value: 40000, daysSinceLastSale: 12 },
                { value: 30000, daysSinceLastSale: 25 },
                { value: 25000, daysSinceLastSale: 40 },
                { value: 25000, daysSinceLastSale: 60 },
            ],
        },
        sales: {
            history: [
                { value: 100, date: '2026-06-01' },
                { value: 105, date: '2026-06-15' },
                { value: 98, date: '2026-07-01' },
                { value: 95, date: '2026-07-15' },
                { value: 90, date: '2026-08-01' },
                { value: 85, date: '2026-08-15' },
            ],
        },
        forecast: {
            impact: 15,
        },
    };

    /**
     * Previous risk snapshots for trend analysis
     */
    const previousRisks = {
        cash: { score: 40 },
        revenue: { score: 35 },
        profitability: { score: 30 },
        expenses: { score: 25 },
        receivables: { score: 45 },
        payables: { score: 20 },
        inventory: { score: 30 },
    };

    beforeEach(() => {
        orchestrator = new RiskOrchestrator();
    });

    describe('End-to-End Risk Assessment', () => {
        test('should generate complete risk assessment with all modules integrated', async () => {
            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: mockData,
                previousRisks,
            });

            // =============================================
            // 1. All 7 risk calculators produced results
            // =============================================
            expect(result.risks.cash).toBeDefined();
            expect(result.risks.revenue).toBeDefined();
            expect(result.risks.profitability).toBeDefined();
            expect(result.risks.expenses).toBeDefined();
            expect(result.risks.receivables).toBeDefined();
            expect(result.risks.payables).toBeDefined();
            expect(result.risks.inventory).toBeDefined();
            expect(result.risks.all.length).toBe(7);

            // =============================================
            // 2. Each risk has required fields
            // =============================================
            const risk = result.risks.cash;
            expect(risk.id).toBeDefined();
            expect(risk.type).toBeDefined();
            expect(risk.severity).toBeDefined();
            expect(risk.score).toBeDefined();
            expect(risk.metrics).toBeDefined();
            expect(risk.warnings).toBeDefined();
            expect(risk.confidence).toBeDefined();

            // =============================================
            // 3. Scoring produced results
            // =============================================
            expect(result.scoring).toBeDefined();
            expect(result.scoring.overallScore).toBeGreaterThan(0);
            expect(result.scoring.severity).toBeDefined();
            expect(result.scoring.riskCounts).toBeDefined();
            expect(result.scoring.breakdown.length).toBe(7);

            // =============================================
            // 4. Trends analyzed
            // =============================================
            expect(result.trends).toBeDefined();
            expect(result.trends.results).toBeDefined();
            expect(result.trends.summary).toBeDefined();
            expect(result.trends.summary.overallDirection).toBeDefined();

            // =============================================
            // 5. Persistence analyzed
            // =============================================
            expect(result.persistence).toBeDefined();
            expect(result.persistence.results).toBeDefined();
            expect(result.persistence.summary).toBeDefined();
            expect(result.persistence.summary.persistent).toBeDefined();

            // =============================================
            // 6. Anomalies detected
            // =============================================
            expect(result.anomalies).toBeDefined();
            expect(result.anomalies.revenue).toBeDefined();
            expect(result.anomalies.expenses).toBeDefined();
            expect(result.anomalies.sales).toBeDefined();

            // =============================================
            // 7. Executive summary complete
            // =============================================
            expect(result.executiveSummary).toBeDefined();
            expect(result.executiveSummary.overallRisk).toBeDefined();
            expect(result.executiveSummary.overallRisk.score).toBeGreaterThan(0);
            expect(result.executiveSummary.riskDistribution).toBeDefined();
            expect(result.executiveSummary.topRisk).toBeDefined();
            expect(result.executiveSummary.summary).toBeDefined();

            // =============================================
            // 8. Recommendations generated
            // =============================================
            expect(result.recommendations).toBeDefined();
            expect(result.recommendations.length).toBeGreaterThan(0);
            expect(result.recommendations[0].priority).toBeDefined();
            expect(result.recommendations[0].recommendation).toBeDefined();

            // =============================================
            // 9. Rules snapshot included
            // =============================================
            expect(result.rules).toBeDefined();
            expect(result.rules.thresholds).toBeDefined();
            expect(result.rules.enabled).toBeDefined();

            // =============================================
            // 10. Metadata included
            // =============================================
            expect(result.metadata).toBeDefined();
            expect(result.metadata.userId).toBe(1);
            expect(result.metadata.businessId).toBe(1);
            expect(result.metadata.generatedAt).toBeDefined();
        });

        test('should produce mathematically consistent results', async () => {
            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: mockData,
                previousRisks,
            });

            // All risk scores should be in 0-100 range
            for (const risk of result.risks.all) {
                expect(risk.score).toBeGreaterThanOrEqual(0);
                expect(risk.score).toBeLessThanOrEqual(100);
            }

            // Overall score should be weighted, not simple average
            expect(result.scoring.overallScore).toBeGreaterThanOrEqual(0);
            expect(result.scoring.overallScore).toBeLessThanOrEqual(100);

            // Risk counts should sum to total
            const totalCounts =
                result.scoring.riskCounts.low +
                result.scoring.riskCounts.medium +
                result.scoring.riskCounts.high +
                result.scoring.riskCounts.critical;
            expect(totalCounts).toBe(result.risks.all.length);
        });

        test('should handle what-if analysis with different scenarios', async () => {
            // Scenario 1: Healthy business
            const healthyResult = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: {
                  ...mockData,
                    cash: { current: 1000000, history: [{ value: 1000000, inflow: 200000, outflow: 100000 }] },
                    revenue: { growth: 15, history: [{ value: 1000000 }, { value: 1150000 }] },
                    profitability: { type: 'gross', history: [{ value: 45 }, { value: 48 }] },
                },
            });

            // Scenario 2: Stressed business
            const stressedResult = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: {
                  ...mockData,
                    cash: { current: 50000, history: [{ value: 50000, inflow: 50000, outflow: 150000 }] },
                    revenue: { growth: -35, history: [{ value: 1000000 }, { value: 650000 }] },
                    profitability: { type: 'gross', history: [{ value: 45 }, { value: 28 }] },
                },
            });

            // Healthy should have lower risk score
            expect(healthyResult.scoring.overallScore).toBeLessThan(stressedResult.scoring.overallScore);
            expect(healthyResult.summary.criticalRisks).toBeLessThanOrEqual(stressedResult.summary.criticalRisks);
        });

        test('should handle multiple concurrent assessments', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    orchestrator.assess({
                        userId: i + 1,
                        businessId: i + 1,
                        data: mockData,
                        previousRisks,
                    })
                );
            }

            const results = await Promise.all(promises);

            expect(results.length).toBe(5);
            results.forEach(result => {
                expect(result.generatedAt).toBeDefined();
                expect(result.scoring.overallScore).toBeDefined();
                expect(result.recommendations.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Handling & Resilience', () => {
        test('should handle missing data gracefully', async () => {
            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: {},
                previousRisks: {},
            });

            expect(result).toBeDefined();
            expect(result.risks.all.length).toBe(7);
            expect(result.scoring.overallScore).toBeDefined();
            expect(result.executiveSummary.summary).toBeDefined();
        });

        test('should handle partially missing data', async () => {
            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: {
                    cash: mockData.cash,
                    revenue: mockData.revenue,
                    // Missing other data
                },
                previousRisks: {},
            });

            expect(result).toBeDefined();
            expect(result.risks.cash).toBeDefined();
            expect(result.risks.revenue).toBeDefined();
            // Other risks should still be created with default values
            expect(result.risks.profitability).toBeDefined();
            expect(result.risks.expenses).toBeDefined();
            expect(result.risks.receivables).toBeDefined();
            expect(result.risks.payables).toBeDefined();
            expect(result.risks.inventory).toBeDefined();
        });

        test('should handle invalid data types gracefully', async () => {
            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: {
                    cash: { current: 'not-a-number', history: null },
                    revenue: { growth: 'not-a-number', history: undefined },
                    profitability: { type: null, history: [null, undefined, 'string'] },
                    expenses: { history: [null, undefined, { value: 'not-a-number' }] },
                },
                previousRisks: {},
            });

            expect(result).toBeDefined();
            expect(result.risks.all.length).toBe(7);
            // Should not crash
        });
    });

    describe('Performance & Scale', () => {
        test('should complete assessment within reasonable time', async () => {
            const start = Date.now();

            await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: mockData,
                previousRisks,
            });

            const duration = Date.now() - start;
            expect(duration).toBeLessThan(5000);
        });

        test('should handle large datasets', async () => {
            const largeData = {
              ...mockData,
                revenue: {
                    growth: 5,
                    history: Array.from({ length: 50 }, (_, i) => ({
                        value: 1000000 + i * 10000,
                        date: new Date(2026, 0, i + 1).toISOString().split('T')[0],
                    })),
                },
                expenses: {
                    history: Array.from({ length: 50 }, (_, i) => ({
                        value: 100000 + i * 2000,
                        revenue: 500000 + i * 5000,
                        date: new Date(2026, 0, i + 1).toISOString().split('T')[0],
                    })),
                },
            };

            const result = await orchestrator.assess({
                userId: 1,
                businessId: 1,
                data: largeData,
                previousRisks,
            });

            expect(result).toBeDefined();
            expect(result.scoring.overallScore).toBeDefined();
        });
    });
});