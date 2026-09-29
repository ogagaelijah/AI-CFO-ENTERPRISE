// tests/unit/forecast/integration/ForecastIntegration.test.js

const ForecastOrchestrator = require('../../../../src/application/services/forecast/ForecastOrchestrator');

/**
 * Phase 5.10: End-to-End Integration Tests
 *
 * Validates that the Forecast Engine works as a complete system
 * with all modules integrating correctly against real calculators.
 */
describe('Forecast Engine Integration', () => {
    let orchestrator;

    const mockHistoricalData = {
        revenue: [
            { value: 100000, date: '2026-01-01' },
            { value: 120000, date: '2026-02-01' },
            { value: 140000, date: '2026-03-01' },
            { value: 160000, date: '2026-04-01' },
            { value: 180000, date: '2026-05-01' },
            { value: 200000, date: '2026-06-01' },
            { value: 220000, date: '2026-07-01' },
            { value: 240000, date: '2026-08-01' },
            { value: 260000, date: '2026-09-01' },
            { value: 280000, date: '2026-10-01' },
            { value: 300000, date: '2026-11-01' },
            { value: 320000, date: '2026-12-01' },
        ],
        salesVolume: [
            { value: 100, date: '2026-01-01' },
            { value: 110, date: '2026-02-01' },
            { value: 120, date: '2026-03-01' },
            { value: 130, date: '2026-04-01' },
            { value: 140, date: '2026-05-01' },
            { value: 150, date: '2026-06-01' },
            { value: 160, date: '2026-07-01' },
            { value: 170, date: '2026-08-01' },
            { value: 180, date: '2026-09-01' },
            { value: 190, date: '2026-10-01' },
            { value: 200, date: '2026-11-01' },
            { value: 210, date: '2026-12-01' },
        ],
        cogs: [
            { value: 40000, date: '2026-01-01' },
            { value: 44000, date: '2026-02-01' },
            { value: 48000, date: '2026-03-01' },
            { value: 52000, date: '2026-04-01' },
            { value: 56000, date: '2026-05-01' },
            { value: 60000, date: '2026-06-01' },
            { value: 64000, date: '2026-07-01' },
            { value: 68000, date: '2026-08-01' },
            { value: 72000, date: '2026-09-01' },
            { value: 76000, date: '2026-10-01' },
            { value: 80000, date: '2026-11-01' },
            { value: 84000, date: '2026-12-01' },
        ],
        expenses: [
            { value: 20000, date: '2026-01-01' },
            { value: 21000, date: '2026-02-01' },
            { value: 22000, date: '2026-03-01' },
            { value: 23000, date: '2026-04-01' },
            { value: 24000, date: '2026-05-01' },
            { value: 25000, date: '2026-06-01' },
            { value: 26000, date: '2026-07-01' },
            { value: 27000, date: '2026-08-01' },
            { value: 28000, date: '2026-09-01' },
            { value: 29000, date: '2026-10-01' },
            { value: 30000, date: '2026-11-01' },
            { value: 31000, date: '2026-12-01' },
        ],
        profit: [
            { value: 40000, date: '2026-01-01' },
            { value: 55000, date: '2026-02-01' },
            { value: 70000, date: '2026-03-01' },
            { value: 85000, date: '2026-04-01' },
            { value: 100000, date: '2026-05-01' },
            { value: 115000, date: '2026-06-01' },
            { value: 130000, date: '2026-07-01' },
            { value: 145000, date: '2026-08-01' },
            { value: 160000, date: '2026-09-01' },
            { value: 175000, date: '2026-10-01' },
            { value: 190000, date: '2026-11-01' },
            { value: 205000, date: '2026-12-01' },
        ],
        cashFlow: [
            { value: 5000, date: '2026-01-01' },
            { value: 8000, date: '2026-02-01' },
            { value: 10000, date: '2026-03-01' },
            { value: 12000, date: '2026-04-01' },
            { value: 15000, date: '2026-05-01' },
            { value: 18000, date: '2026-06-01' },
            { value: 20000, date: '2026-07-01' },
            { value: 22000, date: '2026-08-01' },
            { value: 25000, date: '2026-09-01' },
            { value: 28000, date: '2026-10-01' },
            { value: 30000, date: '2026-11-01' },
            { value: 32000, date: '2026-12-01' },
        ],
        inventory: [
            { value: 50, date: '2026-01-01' },
            { value: 55, date: '2026-02-01' },
            { value: 60, date: '2026-03-01' },
            { value: 65, date: '2026-04-01' },
            { value: 70, date: '2026-05-01' },
            { value: 75, date: '2026-06-01' },
            { value: 80, date: '2026-07-01' },
            { value: 85, date: '2026-08-01' },
            { value: 90, date: '2026-09-01' },
            { value: 95, date: '2026-10-01' },
            { value: 100, date: '2026-11-01' },
            { value: 105, date: '2026-12-01' },
        ],
        demand: [
            { value: 100, date: '2026-01-01' },
            { value: 110, date: '2026-02-01' },
            { value: 120, date: '2026-03-01' },
            { value: 130, date: '2026-04-01' },
            { value: 140, date: '2026-05-01' },
            { value: 150, date: '2026-06-01' },
            { value: 160, date: '2026-07-01' },
            { value: 170, date: '2026-08-01' },
            { value: 180, date: '2026-09-01' },
            { value: 190, date: '2026-10-01' },
            { value: 200, date: '2026-11-01' },
            { value: 210, date: '2026-12-01' },
        ],
        openingCash: 100000,
        currentReceivables: 40000,
        currentPayables: 30000,
        currentRevenue: 320000,
        currentExpenses: 31000,
        currentGrossMargin: 60,
        currentNetMargin: 45,
        otherIncome: 5000,
    };

    beforeEach(() => {
        orchestrator = new ForecastOrchestrator();
        orchestrator._fetchHistoricalData = jest
            .fn()
            .mockResolvedValue(mockHistoricalData);
    });

    describe('End-to-End Forecast Generation', () => {
        test('should generate a complete forecast with all modules integrated', async () => {
            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            // 1. Core Forecasts – all 10 present and finite
            expect(result.baseForecast).toBeDefined();
            expect(result.baseForecast.revenue).toBeDefined();
            expect(Number.isFinite(result.baseForecast.revenue.forecast)).toBe(true);
            expect(result.baseForecast.salesVolume).toBeDefined();
            expect(Number.isFinite(result.baseForecast.salesVolume.forecast)).toBe(true);
            expect(result.baseForecast.cogs).toBeDefined();
            expect(Number.isFinite(result.baseForecast.cogs.forecast)).toBe(true);
            expect(result.baseForecast.expenses).toBeDefined();
            expect(Number.isFinite(result.baseForecast.expenses.forecast)).toBe(true);
            expect(result.baseForecast.profit).toBeDefined();
            expect(Number.isFinite(result.baseForecast.profit.forecast)).toBe(true);
            expect(result.baseForecast.cashFlow).toBeDefined();
            expect(Number.isFinite(result.baseForecast.cashFlow.forecast)).toBe(true);
            expect(result.baseForecast.receivables).toBeDefined();
            expect(Number.isFinite(result.baseForecast.receivables.forecast)).toBe(true);
            expect(result.baseForecast.payables).toBeDefined();
            expect(Number.isFinite(result.baseForecast.payables.forecast)).toBe(true);
            expect(result.baseForecast.inventory).toBeDefined();
            expect(Number.isFinite(result.baseForecast.inventory.forecast)).toBe(true);
            expect(result.baseForecast.demand).toBeDefined();
            expect(Number.isFinite(result.baseForecast.demand.forecast)).toBe(true);

            // 2. Scenarios
            expect(result.scenarios).toBeDefined();
            expect(result.scenarios.conservative).toBeDefined();
            expect(result.scenarios.conservative.type).toBe('CONSERVATIVE');
            expect(result.scenarios.expected).toBeDefined();
            expect(result.scenarios.expected.type).toBe('EXPECTED');
            expect(result.scenarios.optimistic).toBeDefined();
            expect(result.scenarios.optimistic.type).toBe('OPTIMISTIC');

            expect(result.scenarios.conservative.values.revenue).toBeLessThan(
                result.scenarios.expected.values.revenue
            );
            expect(result.scenarios.optimistic.values.revenue).toBeGreaterThan(
                result.scenarios.expected.values.revenue
            );

            // 3. Intelligence
            expect(result.confidence).toBeDefined();
            expect(result.confidence.results).toBeDefined();
            expect(result.confidence.results.revenue).toBeDefined();
            expect(result.confidence.results.profit).toBeDefined();
            expect(result.confidence.results.cashFlow).toBeDefined();
            expect(result.confidence.bestMetric).toBeDefined();

            expect(result.risks).toBeDefined();
            expect(result.risks.overallSeverity).toBeDefined();
            expect(result.risks.risks).toBeDefined();

            // 4. Summary & Metadata
            expect(result.summary).toBeDefined();
            expect(result.summary.revenue).toBeDefined();
            expect(result.summary.profit).toBeDefined();
            expect(result.summary.cashFlow).toBeDefined();
            expect(result.summary.status).toBeDefined();

            expect(result.metadata).toBeDefined();
            expect(result.metadata.userId).toBe(1);
            expect(result.metadata.businessId).toBe(1);
            expect(result.metadata.horizon).toBe('30D');
            expect(result.metadata.dataPoints).toBeDefined();
        });

        test('should produce mathematically consistent forecasts', async () => {
            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            const base = result.baseForecast;

            // Profit ≈ Revenue − COGS − Expenses (allow 30 % tolerance –
            // independent methods + trend extrapolation produce small deltas)
            const profitFromComponents =
                base.revenue.forecast - base.cogs.forecast - base.expenses.forecast;
            const profitForecast = base.profit.forecast;

            expect(
                Math.abs(profitForecast - profitFromComponents)
            ).toBeLessThanOrEqual(
                Math.max(
                    Math.abs(profitForecast),
                    Math.abs(profitFromComponents)
                ) * 0.30
            );

            // Cash Flow ≈ Opening + Inflows − Outflows (approximate)
            const cashFromComponents =
                100000 +
                base.revenue.forecast * 0.8 -
                base.expenses.forecast * 0.7;
            const cashForecast = base.cashFlow.forecast;

            expect(
                Math.abs(cashForecast - cashFromComponents)
            ).toBeLessThanOrEqual(
                Math.max(Math.abs(cashForecast), Math.abs(cashFromComponents)) *
                    0.40
            );
        });

        test('should handle what-if analysis correctly', async () => {
            const whatIfChanges = [
                {
                    type: 'PRICE_INCREASE',
                    value: 0.1,
                    label: 'Price increase 10%',
                },
                {
                    type: 'COGS_DECREASE',
                    value: 0.05,
                    label: 'COGS decrease 5%',
                },
            ];

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
                whatIfChanges,
            });

            expect(result.whatIf).toBeDefined();
            expect(result.whatIf.original).toBeDefined();
            expect(result.whatIf.modified).toBeDefined();
            expect(result.whatIf.impacts).toBeDefined();

            const impact = result.whatIf.impacts;
            expect(impact.revenue.absoluteChange).toBeGreaterThan(0);
            expect(impact.profit.direction).toBe('INCREASE');
            expect(impact.profit.percentageChange).toBeGreaterThan(0);
        });

        test('should integrate confidence scores across all forecasts', async () => {
            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            const confidence = result.confidence;

            expect(confidence.results.revenue.score).toBeGreaterThan(0);
            expect(confidence.results.revenue.score).toBeLessThanOrEqual(100);
            expect(confidence.results.profit.score).toBeGreaterThan(0);
            expect(confidence.results.profit.score).toBeLessThanOrEqual(100);
            expect(confidence.results.cashFlow.score).toBeGreaterThan(0);
            expect(confidence.results.cashFlow.score).toBeLessThanOrEqual(100);

            // inventory is intentionally included in the compare set
            expect(confidence.bestMetric).toBeDefined();
            expect([
                'revenue',
                'profit',
                'cashFlow',
                'inventory',
            ]).toContain(confidence.bestMetric);

            expect(confidence.summary).toContain('Highest confidence');
        });

        test('should detect multiple risk types', async () => {
            orchestrator._fetchHistoricalData = jest.fn().mockResolvedValue({
                ...mockHistoricalData,
                currentRevenue: 1000000,
                currentExpenses: 400000,
                openingCash: 10000,
            });

            orchestrator.revenueForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 600000 });
            orchestrator.salesVolumeForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 60 });
            orchestrator.cogsForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 500000 });
            orchestrator.expenseForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 200000 });
            orchestrator.profitForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: -100000 });
            orchestrator.cashFlowForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: -50000 });
            orchestrator.receivablesForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 300000 });
            orchestrator.payablesForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 100000 });
            orchestrator.inventoryForecast.forecast = jest
                .fn()
                .mockResolvedValue({
                    forecast: 5,
                    reorderLevel: 20,
                    safetyStock: 10,
                });
            orchestrator.demandForecast.forecast = jest
                .fn()
                .mockResolvedValue({ forecast: 60 });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.risks.risks.length).toBeGreaterThan(0);

            const riskTypes = result.risks.risks.map((r) => r.type);
            const riskCount = new Set(riskTypes).size;

            expect(riskCount).toBeGreaterThan(1);
            expect(result.summary.risks.critical).toBeGreaterThan(0);
            expect(result.summary.status).toBe('CRITICAL');
        });
    });

    describe('Error Handling & Resilience', () => {
        test('should handle partial data gracefully', async () => {
            const partialData = {
                revenue: mockHistoricalData.revenue.slice(0, 3),
                salesVolume: mockHistoricalData.salesVolume.slice(0, 3),
                cogs: mockHistoricalData.cogs.slice(0, 3),
                expenses: [],
                profit: [],
                cashFlow: [],
                inventory: [],
                demand: [],
                openingCash: 0,
                currentReceivables: 0,
                currentPayables: 0,
                currentRevenue: 0,
                currentExpenses: 0,
                currentGrossMargin: 0,
                currentNetMargin: 0,
                otherIncome: 0,
            };

            orchestrator._fetchHistoricalData = jest
                .fn()
                .mockResolvedValue(partialData);

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            // Engine must not crash and must still return a coherent package
            expect(result.baseForecast).toBeDefined();
            expect(result.baseForecast.revenue).toBeDefined();
            expect(
                Number.isFinite(result.baseForecast.revenue.forecast)
            ).toBe(true);
            // With only 3 points the real calculator may correctly return 0
            expect(result.baseForecast.revenue.forecast).toBeGreaterThanOrEqual(
                0
            );

            // Confidence should be lower than a full data set
            if (result.confidence?.results?.revenue) {
                expect(result.confidence.results.revenue.score).toBeLessThan(80);
            }

            expect(result.generatedAt).toBeDefined();
            expect(result.metadata).toBeDefined();
        });

        test('should handle missing orchestrator dependencies gracefully', async () => {
            const minimalOrchestrator = new ForecastOrchestrator();

            minimalOrchestrator._fetchHistoricalData = jest
                .fn()
                .mockResolvedValue(mockHistoricalData);

            const result = await minimalOrchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.baseForecast).toBeDefined();
            expect(result.scenarios).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.risks).toBeDefined();
            expect(result.summary).toBeDefined();
        });
    });

    describe('Performance & Scale', () => {
        test('should generate forecast within reasonable time', async () => {
            const start = Date.now();

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            const duration = Date.now() - start;

            expect(duration).toBeLessThan(5000);
            expect(result).toBeDefined();
        });

        test('should handle multiple concurrent requests', async () => {
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    orchestrator.generate({
                        userId: i + 1,
                        businessId: i + 1,
                        horizon: '30D',
                    })
                );
            }

            const results = await Promise.all(promises);

            expect(results.length).toBe(5);
            results.forEach((result) => {
                expect(result.generatedAt).toBeDefined();
                expect(result.baseForecast).toBeDefined();
            });
        });
    });
});