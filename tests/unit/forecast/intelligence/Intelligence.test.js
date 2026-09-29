// tests/unit/forecast/intelligence/ForecastIntelligence.test.js
// SSOT v5.4.4-prod | Confidence + Accuracy + Risk

const ConfidenceEngine = require('../../../../src/application/services/forecast/intelligence/ConfidenceEngine');
const ForecastAccuracyEngine = require('../../../../src/application/services/forecast/intelligence/ForecastAccuracyEngine');
const ForecastRiskDetector = require('../../../../src/application/services/forecast/intelligence/ForecastRiskDetector');

describe('Forecast Intelligence v5.4.4', () => {
    describe('ConfidenceEngine', () => {
        let engine;

        beforeEach(() => {
            engine = new ConfidenceEngine();
        });

        test('should calculate high confidence with sufficient data', () => {
            const historicalData = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
            const historicalRecords = historicalData.map((v, i) => ({
                value: v,
                date: `2026-${String((i % 12) + 1).padStart(2, '0')}-01`,
                period: `Period ${i + 1}`,
            }));

            const result = engine.calculate({
                historicalData,
                historicalRecords,
                forecast: { forecast: 160, method: 'linear' },
                priorAccuracy: 85,
            });

            expect(result.score).toBeGreaterThan(55);
            expect(['MODERATE', 'GOOD', 'STRONG']).toContain(result.level);
            expect(result.factors.historicalDataPoints).toBe(30);
            expect(result.factors.breakdown).toBeDefined();
            expect(result.metadata.confidenceVersion).toBe('5.4.4-prod');
            expect(result.metadata.traceId).toMatch(/^conf_/);
            expect(Object.isFrozen(result)).toBe(true);
            expect(result.summary).toMatch(/confidence/i);
        });

        test('should calculate low confidence with insufficient data', () => {
            const historicalData = [100, 102, 104];
            const result = engine.calculate({
                historicalData,
                forecast: { forecast: 106 },
            });

            expect(result.score).toBeLessThan(55);
            expect(['LOW', 'MODERATE']).toContain(result.level);
            expect(result.factors.historicalDataPoints).toBe(3);
            expect(result.summary).toMatch(/confidence/i);
        });

        test('should handle empty data', () => {
            const result = engine.calculate({
                historicalData: [],
                forecast: { forecast: 100 },
            });

            expect(result.score).toBe(10);
            expect(result.level).toBe('VERY_LOW');
            expect(result.factors.historicalDataPoints).toBe(0);
            expect(result.metadata.error).toBe('INSUFFICIENT_DATA');
            expect(result.summary).toContain('Insufficient historical data');
        });

        test('should handle high volatility data', () => {
            const historicalData = [100, 200, 50, 300, 80, 400, 60, 350, 90, 250];
            const result = engine.calculate({
                historicalData,
                forecast: { forecast: 150 },
            });

            expect(result.score).toBeLessThan(55);
            expect(['LOW', 'VERY_LOW', 'MODERATE']).toContain(result.level);
            expect(result.factors.volatility).toBeGreaterThan(40);
        });

        test('should truncate large inputs', () => {
            const historicalData = Array(3000).fill(100);
            const result = engine.calculate({ historicalData });

            expect(result.metadata.dataPointsUsed).toBe(2000);
        });

        test('should compare multiple forecasts', () => {
            const forecasts = {
                revenue: {
                    historicalData: [100, 102, 104, 106, 108, 110],
                    forecast: { forecast: 112 },
                },
                profit: {
                    historicalData: [50, 45, 40, 35, 30, 25],
                    forecast: { forecast: 20 },
                },
            };

            const result = engine.compare(forecasts);

            expect(result.results).toBeDefined();
            expect(result.results.revenue).toBeDefined();
            expect(result.results.profit).toBeDefined();
            expect(result.bestMetric).toBeDefined();
            expect(result.maxScore).toBeGreaterThanOrEqual(0);
            expect(result.metadata.metricsCompared).toBe(2);
            expect(result.summary).toContain('Highest confidence');
            expect(Object.isFrozen(result)).toBe(true);
        });

        test('should treat priorAccuracy 0 as real zero not default', () => {
            const historicalData = Array.from({ length: 30 }, (_, i) => 100 + i);
            const withZero = engine.calculate({
                historicalData,
                priorAccuracy: 0,
            });
            const withDefault = engine.calculate({
                historicalData,
                priorAccuracy: null,
            });

            expect(withZero.factors.priorAccuracy).toBe(0);
            expect(withDefault.factors.priorAccuracy).toBe(50);
            expect(withZero.score).toBeLessThan(withDefault.score);
        });
    });

    describe('ForecastAccuracyEngine', () => {
        let engine;

        beforeEach(() => {
            engine = new ForecastAccuracyEngine();
        });

        test('should record and track accuracy', () => {
            const result1 = engine.record({
                metric: 'revenue',
                forecast: 1000,
                actual: 950,
                period: '2026-01',
            });

            expect(result1.metric).toBe('revenue');
            expect(result1.absoluteError).toBe(50);
            expect(result1.percentageError).toBe(5);
            expect(result1.direction).toBe('OVER');
            expect(result1.accuracy).toBe('B');

            const result2 = engine.record({
                metric: 'revenue',
                forecast: 1000,
                actual: 1050,
                period: '2026-02',
            });

            expect(result2.direction).toBe('UNDER');

            const metrics = engine.getMetrics('revenue');
            expect(metrics.records).toBe(2);
            expect(metrics.averageError).toBe(50);
            expect(metrics.averagePercentageError).toBe(5);
            expect(metrics.bias).toBe(0);
            expect(metrics.accuracy).toBe('B');
            expect(Object.isFrozen(metrics)).toBe(true);
        });

        test('should get history', () => {
            engine.record({ metric: 'revenue', forecast: 1000, actual: 950, period: '2026-01' });
            engine.record({ metric: 'revenue', forecast: 1000, actual: 1050, period: '2026-02' });
            engine.record({ metric: 'profit', forecast: 200, actual: 180, period: '2026-01' });

            expect(engine.getHistory().length).toBe(3);
            expect(engine.getHistory('revenue').length).toBe(2);
            expect(engine.getHistory('profit').length).toBe(1);
        });

        test('should get summary', () => {
            engine.record({ metric: 'revenue', forecast: 1000, actual: 950, period: '2026-01' });
            engine.record({ metric: 'revenue', forecast: 1000, actual: 1050, period: '2026-02' });
            engine.record({ metric: 'profit', forecast: 200, actual: 180, period: '2026-01' });

            const summary = engine.getSummary();
            expect(summary.totalRecords).toBe(3);
            expect(summary.metricCount).toBe(2);
            expect(summary.metrics.revenue).toBeDefined();
            expect(summary.metrics.profit).toBeDefined();
            expect(summary.bestMetric).toBeDefined();
            expect(summary.worstMetric).toBeDefined();
            expect(summary.engineVersion).toBe('5.4.4-prod');
            expect(summary.summary).toContain('records across');
        });

        test('should handle empty history', () => {
            const summary = engine.getSummary();
            expect(summary.totalRecords).toBe(0);
            expect(summary.metrics).toEqual({});
            expect(summary.summary).toContain('0 records');
        });

        test('should clear history', () => {
            engine.record({ metric: 'revenue', forecast: 1000, actual: 950, period: '2026-01' });
            expect(engine.getHistory().length).toBe(1);

            engine.clear();

            expect(engine.getHistory().length).toBe(0);
            expect(engine.getMetrics('revenue').records).toBe(0);
        });

        test('should export and import state', () => {
            engine.record({ metric: 'revenue', forecast: 1000, actual: 950, period: '2026-01' });
            const state = engine.exportState();

            const newEngine = new ForecastAccuracyEngine();
            expect(newEngine.importState(state)).toBe(true);

            const metrics = newEngine.getMetrics('revenue');
            expect(metrics.records).toBe(1);
            expect(metrics.averageError).toBe(50);
        });

        test('should detect improvement trend', () => {
            const actuals = [800, 850, 900, 950, 980];
            for (let i = 0; i < actuals.length; i++) {
                engine.record({
                    metric: 'revenue',
                    forecast: 1000,
                    actual: actuals[i],
                    period: `2026-${String(i + 1).padStart(2, '0')}`,
                });
            }
            expect(engine.getMetrics('revenue').trend).toBe('IMPROVING');
        });

        test('should detect declining trend', () => {
            const actuals = [980, 950, 900, 850, 800];
            for (let i = 0; i < actuals.length; i++) {
                engine.record({
                    metric: 'revenue',
                    forecast: 1000,
                    actual: actuals[i],
                    period: `2026-${String(i + 1).padStart(2, '0')}`,
                });
            }
            expect(engine.getMetrics('revenue').trend).toBe('DECLINING');
        });

        test('should respect ring buffer cap per metric', () => {
            const small = new ForecastAccuracyEngine({ maxHistoryPerMetric: 50 });
            for (let i = 0; i < 60; i++) {
                small.record({
                    metric: 'revenue',
                    forecast: 1000,
                    actual: 1000 + (i % 3),
                    period: `p${i}`,
                });
            }
            expect(small.getMetrics('revenue').records).toBe(50);
            expect(small.getHistory('revenue').length).toBe(50);
        });
    });

    describe('ForecastRiskDetector', () => {
        let detector;

        beforeEach(() => {
            detector = new ForecastRiskDetector();
        });

        test('should detect revenue decline risk', () => {
            const result = detector.detect({
                forecasts: { revenue: { forecast: 800 } },
                historicalData: { revenue: 1000 },
            });

            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.risks[0].type).toBe('REVENUE_DECLINE');
            expect(result.risks[0].severity).toBe('MEDIUM');
            expect(result.overallSeverity).toBe('MEDIUM');
            expect(result.metadata.riskDetectorVersion).toBe('5.4.4-prod');
            expect(result.metadata.traceId).toMatch(/^risk_/);
            expect(Object.isFrozen(result)).toBe(true);
        });

        test('should detect critical revenue decline', () => {
            const result = detector.detect({
                forecasts: { revenue: { forecast: 500 } },
                historicalData: { revenue: 1000 },
            });

            expect(result.risks[0].severity).toBe('CRITICAL');
            expect(result.overallSeverity).toBe('CRITICAL');
        });

        test('should detect margin compression risk', () => {
            const result = detector.detect({
                forecasts: { grossMargin: { forecast: 15 } },
                historicalData: { grossMargin: 25 },
            });

            expect(result.risks[0].type).toBe('MARGIN_COMPRESSION');
        });

        test('should detect cash pressure risk', () => {
            const result = detector.detect({
                forecasts: { cashFlow: { forecast: -1000 } },
                historicalData: { cash: 5000 },
            });

            expect(result.risks[0].type).toBe('CASH_PRESSURE');
            expect(result.risks[0].severity).toBe('CRITICAL');
        });

        test('should detect inventory shortage risk', () => {
            const result = detector.detect({
                forecasts: { inventory: { forecast: 5, reorderLevel: 20, safetyStock: 10 } },
                historicalData: {},
            });

            expect(result.risks[0].type).toBe('INVENTORY_SHORTAGE');
            expect(result.risks[0].severity).toBe('HIGH');
        });

        test('should detect receivable pressure risk', () => {
            const result = detector.detect({
                forecasts: { receivables: { forecast: 14000 } },
                historicalData: { receivables: 10000 },
            });

            expect(result.risks[0].type).toBe('RECEIVABLE_PRESSURE');
            expect(result.risks[0].severity).toBe('MEDIUM');
        });

        test('should detect expense acceleration risk', () => {
            const result = detector.detect({
                forecasts: { expenses: { forecast: 12000 } },
                historicalData: { expenses: 10000, revenueTrend: 0.05 },
            });

            expect(result.risks[0].type).toBe('EXPENSE_ACCELERATION');
        });

        test('should handle no risks', () => {
            const result = detector.detect({
                forecasts: {
                    revenue: { forecast: 1000 },
                    grossMargin: { forecast: 30 },
                    cashFlow: { forecast: 5000 }, // aligned with cash — no false CASH_PRESSURE
                },
                historicalData: {
                    revenue: 1000,
                    grossMargin: 30,
                    cash: 5000,
                },
            });

            expect(result.risks.length).toBe(0);
            expect(result.overallSeverity).toBe('LOW');
            expect(result.counts.total).toBe(0);
            expect(result.summary).toContain('No significant risks detected');
        });

        test('should generate summary with multiple risks', () => {
            const result = detector.detect({
                forecasts: {
                    revenue: { forecast: 800 },
                    cashFlow: { forecast: -1000 },
                    expenses: { forecast: 12000 },
                },
                historicalData: {
                    revenue: 1000,
                    cash: 5000,
                    expenses: 10000,
                    revenueTrend: 0.05,
                },
            });

            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.summary).toContain('Overall risk');
            expect(result.counts.critical).toBeGreaterThan(0);
        });

        test('should handle custom thresholds', () => {
            const result = detector.detect({
                forecasts: { revenue: { forecast: 900 } },
                historicalData: { revenue: 1000 },
                thresholds: { revenueDecline: 0.25 },
            });

            expect(result.risks.length).toBe(0);
            expect(result.overallSeverity).toBe('LOW');
        });

        test('should handle invalid forecasts input', () => {
            const result = detector.detect({
                forecasts: null,
                historicalData: { revenue: 1000 },
            });

            expect(result.risks.length).toBe(0);
            expect(result.overallSeverity).toBe('LOW');
            expect(result.metadata.error).toBe('INVALID_FORECASTS');
        });

        test('should treat empty forecasts object as no risks not error', () => {
            const result = detector.detect({
                forecasts: {},
                historicalData: { revenue: 1000 },
            });

            expect(result.risks.length).toBe(0);
            expect(result.overallSeverity).toBe('LOW');
            expect(result.metadata.error).toBeUndefined();
        });
    });
});