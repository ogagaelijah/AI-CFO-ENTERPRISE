// tests/unit/forecast/scenarios/Scenarios.test.js

const ScenarioEngine = require('../../../../src/application/services/forecast/scenarios/ScenarioEngine');
const WhatIfEngine = require('../../../../src/application/services/forecast/scenarios/WhatIfEngine');

describe('Scenario Engine', () => {
    let scenarioEngine;

    beforeEach(() => {
        scenarioEngine = new ScenarioEngine();
    });

    describe('generate()', () => {
        test('should generate all three scenarios', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const historicalData = [
                { revenue: 900000, expenses: 190000, cogs: 380000 },
                { revenue: 950000, expenses: 195000, cogs: 390000 },
                { revenue: 1000000, expenses: 200000, cogs: 400000 },
            ];

            const result = await scenarioEngine.generate({
                baseForecast,
                historicalData,
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.conservative).toBeDefined();
            expect(result.expected).toBeDefined();
            expect(result.optimistic).toBeDefined();
            expect(result.comparison).toBeDefined();

            // Conservative should be lowest revenue
            expect(result.conservative.values.revenue)
                .toBeLessThan(result.expected.values.revenue);
            expect(result.optimistic.values.revenue)
                .toBeGreaterThan(result.expected.values.revenue);

            expect(result.conservative.type).toBe('CONSERVATIVE');
            expect(result.expected.type).toBe('EXPECTED');
            expect(result.optimistic.type).toBe('OPTIMISTIC');

            expect(result.conservative.values).toHaveProperty('revenue');
            expect(result.conservative.values).toHaveProperty('profit');
            expect(result.conservative.values).toHaveProperty('cashFlow');
            expect(result.conservative.values).toHaveProperty('grossMargin');
            expect(result.conservative.values).toHaveProperty('netMargin');

            expect(result.conservative.assumptions).toBeDefined();
            expect(result.conservative.assumptions.length).toBeGreaterThan(0);
        });

        test('should handle missing historical data', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await scenarioEngine.generate({
                baseForecast,
                historicalData: [],
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.conservative).toBeDefined();
            expect(result.expected).toBeDefined();
            expect(result.optimistic).toBeDefined();

            expect(result.conservative.values.revenue)
                .toBeLessThan(result.expected.values.revenue);
            expect(result.optimistic.values.revenue)
                .toBeGreaterThan(result.expected.values.revenue);
        });

        test('should handle custom override factors', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const overrideFactors = {
                revenueVolatility: 0.30,
                expenseVolatility: 0.25,
                cogsVolatility: 0.20,
            };

            const result = await scenarioEngine.generate({
                baseForecast,
                historicalData: [],
                overrideFactors,
                horizon: '30D',
            });

            expect(result.conservative.values.revenue)
                .toBeLessThan(result.expected.values.revenue * 0.7);
            expect(result.optimistic.values.revenue)
                .toBeGreaterThan(result.expected.values.revenue * 1.2);
        });

        test('should calculate confidence scores correctly', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                confidence: { score: 70 },
            };

            const historicalData = [
                { revenue: 900000, expenses: 190000, cogs: 380000 },
                { revenue: 950000, expenses: 195000, cogs: 390000 },
                { revenue: 1000000, expenses: 200000, cogs: 400000 },
                { revenue: 1020000, expenses: 202000, cogs: 408000 },
                { revenue: 1050000, expenses: 205000, cogs: 420000 },
                { revenue: 1080000, expenses: 208000, cogs: 432000 },
            ];

            const result = await scenarioEngine.generate({
                baseForecast,
                historicalData,
                horizon: '30D',
            });

            expect(result.expected.confidence.score)
                .toBeGreaterThan(result.conservative.confidence.score);
            expect(result.expected.confidence.score)
                .toBeGreaterThan(result.optimistic.confidence.score);
        });

        test('should generate comparison summary', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await scenarioEngine.generate({
                baseForecast,
                historicalData: [],
                horizon: '30D',
            });

            expect(result.comparison.revenue).toBeDefined();
            expect(result.comparison.revenue.conservative).toBeDefined();
            expect(result.comparison.revenue.expected).toBeDefined();
            expect(result.comparison.revenue.optimistic).toBeDefined();
            expect(result.comparison.revenue.variance).toBeDefined();

            expect(result.comparison.profit).toBeDefined();
            expect(result.comparison.profit.conservative).toBeDefined();
            expect(result.comparison.profit.expected).toBeDefined();
            expect(result.comparison.profit.optimistic).toBeDefined();
        });

        test('should handle invalid baseForecast gracefully', async () => {
            const result = await scenarioEngine.generate({
                baseForecast: null,
                historicalData: [],
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.metadata?.error).toBe('INVALID_BASE_FORECAST');
            expect(result.conservative.values.revenue).toBe(0);
        });
    });
});

describe('WhatIfEngine', () => {
    let whatIfEngine;

    beforeEach(() => {
        whatIfEngine = new WhatIfEngine();
    });

    describe('analyze()', () => {
        test('should analyze price increase', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'PRICE_INCREASE', value: 0.10, label: 'Price increase 10%' },
                ],
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.original).toBeDefined();
            expect(result.modified).toBeDefined();
            expect(result.impacts).toBeDefined();
            expect(result.assumptions).toBeDefined();
            expect(result.summary).toBeDefined();

            expect(result.modified.revenue).toBeGreaterThan(result.original.revenue);
            expect(result.modified.profit).toBeGreaterThan(result.original.profit);
            expect(result.impacts.revenue.direction).toBe('INCREASE');
        });

        test('should analyze volume increase', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'VOLUME_INCREASE', value: 0.20, label: 'Volume increase 20%' },
                ],
                horizon: '30D',
            });

            // Volume changes revenue/salesVolume only — COGS is unchanged unless a COGS change is applied
            expect(result.modified.revenue).toBeGreaterThan(result.original.revenue);
            expect(result.modified.salesVolume).toBe(1200);
            expect(result.modified.cogs).toBe(result.original.cogs);
            expect(result.impacts.revenue.direction).toBe('INCREASE');
        });

        test('should analyze cost reduction', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'COGS_DECREASE', value: 0.15, label: 'COGS reduction 15%' },
                ],
                horizon: '30D',
            });

            expect(result.modified.cogs).toBeLessThan(result.original.cogs);
            expect(result.modified.profit).toBeGreaterThan(result.original.profit);
            expect(result.impacts.cogs.direction).toBe('DECREASE');
            expect(result.impacts.profit.direction).toBe('INCREASE');
        });

        test('should analyze expense reduction', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'EXPENSE_DECREASE', value: 0.10, label: 'Expense reduction 10%' },
                ],
                horizon: '30D',
            });

            expect(result.modified.expenses).toBeLessThan(result.original.expenses);
            expect(result.modified.profit).toBeGreaterThan(result.original.profit);
            expect(result.impacts.expenses.direction).toBe('DECREASE');
            expect(result.impacts.profit.direction).toBe('INCREASE');
        });

        test('should analyze combined changes', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    {
                        type: 'COMBINED',
                        label: 'Combined scenario',
                        changes: {
                            unitPrice: 0.10,
                            volume: 0.05,
                            cogs: -0.05,
                            expenses: -0.10,
                        },
                    },
                ],
                horizon: '30D',
            });

            expect(result.modified.revenue).not.toEqual(result.original.revenue);
            expect(result.modified.profit).not.toEqual(result.original.profit);
            expect(result.assumptions.some(a => a.includes('Combined'))).toBe(true);
        });

        test('should handle multiple changes', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'PRICE_INCREASE', value: 0.05, label: 'Price increase 5%' },
                    { type: 'VOLUME_INCREASE', value: 0.10, label: 'Volume increase 10%' },
                    { type: 'COGS_DECREASE', value: 0.05, label: 'COGS decrease 5%' },
                ],
                horizon: '30D',
            });

            // 5% price × 10% volume → revenue ≈ 1.155× base
            expect(result.modified.revenue).toBeGreaterThan(result.original.revenue * 1.15);
            expect(result.modified.profit).toBeGreaterThan(result.original.profit);
            expect(result.assumptions.length).toBeGreaterThan(1);
        });

        test('should handle empty changes', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [],
                horizon: '30D',
            });

            expect(result.modified.revenue).toEqual(result.original.revenue);
            expect(result.modified.profit).toEqual(result.original.profit);
            expect(result.assumptions.length).toBe(0);
        });

        test('should handle invalid change type', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'INVALID_TYPE', value: 0.10, label: 'Invalid change' },
                ],
                horizon: '30D',
            });

            expect(result).toBeDefined();
            expect(result.modified).toBeDefined();
            expect(result.assumptions.some(a => a.includes('Unknown type'))).toBe(true);
        });

        test('should clamp extreme change values', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [
                    { type: 'PRICE_INCREASE', value: 5.0, label: 'Extreme price increase' }, // clamped to +200%
                ],
                horizon: '30D',
            });

            expect(result.metadata.changesApplied[0].clampedValue).toBe(2);
            expect(result.modified.revenue).toBe(3000000); // 1000 * (1000 * 3)
        });
    });

    describe('Quick analysis methods', () => {
        test('analyzePriceIncrease() should work', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyzePriceIncrease({
                baseForecast,
                percentageIncrease: 10,
                horizon: '30D',
            });

            expect(result.modified.revenue).toBe(1100000);
            expect(result.modified.profit).toBeGreaterThan(400000);
        });

        test('analyzeVolumeIncrease() should work', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
                salesVolume: 1000,
            };

            const result = await whatIfEngine.analyzeVolumeIncrease({
                baseForecast,
                percentageIncrease: 20,
                horizon: '30D',
            });

            expect(result.modified.revenue).toBe(1200000);
            // COGS unchanged — volume does not auto-scale variable cost in SSOT WhatIf
            expect(result.modified.cogs).toBe(400000);
            expect(result.modified.salesVolume).toBe(1200);
        });

        test('COGS reduction via analyze() should work', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [{ type: 'COGS_DECREASE', value: 0.15 }],
                horizon: '30D',
            });

            expect(result.modified.cogs).toBe(340000);
            expect(result.modified.profit).toBe(460000);
        });

        test('expense reduction via analyze() should work', async () => {
            const baseForecast = {
                revenue: 1000000,
                cogs: 400000,
                expenses: 200000,
                profit: 400000,
                cashFlow: 100000,
            };

            const result = await whatIfEngine.analyze({
                baseForecast,
                changes: [{ type: 'EXPENSE_DECREASE', value: 0.10 }],
                horizon: '30D',
            });

            expect(result.modified.expenses).toBe(180000);
            expect(result.modified.profit).toBe(420000);
        });
    });
});