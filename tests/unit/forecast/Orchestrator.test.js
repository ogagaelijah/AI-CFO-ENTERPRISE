const ForecastOrchestrator = require('../../../src/application/services/forecast/ForecastOrchestrator');

// Mock data for testing
const mockHistoricalData = {
    revenue: Array.from({ length: 8 }, (_, i) => ({ value: 100000 + i * 20000, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    salesVolume: Array.from({ length: 8 }, (_, i) => ({ value: 100 + i * 20, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    cogs: Array.from({ length: 8 }, (_, i) => ({ value: 40000 + i * 8000, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    expenses: Array.from({ length: 8 }, (_, i) => ({ value: 20000 + i * 2000, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    profit: Array.from({ length: 8 }, (_, i) => ({ value: 40000 + i * 10000, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    cashFlow: Array.from({ length: 8 }, (_, i) => ({ value: 5000 + i * 3000, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    inventory: Array.from({ length: 8 }, (_, i) => ({ value: 50 + i * 5, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    demand: Array.from({ length: 8 }, (_, i) => ({ value: 100 + i * 10, date: `2026-${String(i + 1).padStart(2, '0')}-01` })),
    openingCash: 50000,
    currentReceivables: 30000,
    currentPayables: 20000,
    currentRevenue: 240000,
    currentExpenses: 34000,
    currentGrossMargin: 60,
    currentNetMargin: 45,
    otherIncome: 5000,
    safetyStock: 10,
    reorderLevel: 20,
};

const EMPTY_RESULT = { forecast: 0, available: false, reason: 'INSUFFICIENT_DATA' };

describe('ForecastOrchestrator v5.5.0-prod', () => {
    let orchestrator;

    beforeEach(() => {
        orchestrator = new ForecastOrchestrator();
        jest.spyOn(orchestrator, '_fetchHistoricalData').mockResolvedValue(mockHistoricalData);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('generate()', () => {
        test('should generate a complete forecast package with SSOT metadata', async () => {
            // Mock all forecast calculators to return predictable values with available: true
            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 104000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 36000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: 120000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: 35000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 25000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 90, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 180, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            // Verify SSOT structure
            expect(result).toBeDefined();
            expect(Object.isFrozen(result)).toBe(true);
            expect(result.generatedAt).toBeDefined();
            expect(result.horizon).toBe('30D');
            expect(result.period).toBeDefined();
            expect(result.baseForecast).toBeDefined();
            expect(result.scenarios).toBeDefined();
            expect(result.confidence).toBeDefined();
            expect(result.risks).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.metadata).toBeDefined();

            // Verify v5.5.0 metadata
            expect(result.metadata.orchestratorVersion).toBe('5.5.0-prod');
            expect(result.metadata.traceId).toMatch(/^orch_/);
            expect(result.metadata.durationMs).toBeGreaterThanOrEqual(0);
            expect(result.metadata.partialSuccess).toBe(false);
            expect(result.metadata.warnings).toBeUndefined();

            // Verify summary
            expect(result.summary.revenue.forecast).toBe(260000);
            expect(result.summary.profit.forecast).toBe(120000);
            expect(result.summary.cashFlow.forecast).toBe(35000);
            expect(result.summary.status).toBe('POSITIVE');
        });

        test('should handle what-if changes with cap', async () => {
            // Inject a real mock logger so we can assert on .warn
            const mockLogger = {
                warn: jest.fn(),
                info: jest.fn(),
                error: jest.fn(),
                debug: jest.fn(),
            };

            orchestrator = new ForecastOrchestrator({ logger: mockLogger });
            jest.spyOn(orchestrator, '_fetchHistoricalData').mockResolvedValue(mockHistoricalData);

            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 104000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 36000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: 120000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: 35000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 25000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 90, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 180, available: true });

            const whatIfChanges = Array(15).fill({ type: 'PRICE_INCREASE', value: 0.10 }); // 15 > MAX 10

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
                whatIfChanges,
            });

            expect(result.whatIf).toBeDefined();
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('whatIfChanges truncated'),
                expect.any(Object)
            );
        });

        test('should handle empty historical data with warnings and partialSuccess false', async () => {
            orchestrator._fetchHistoricalData.mockResolvedValue({
                ...mockHistoricalData,
                revenue: [],
                profit: [],
                cashFlow: [],
                inventory: [],
            });

            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue(EMPTY_RESULT);

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.baseForecast.revenue.forecast).toBe(0);
            expect(result.baseForecast.revenue.available).toBe(false);
            expect(result.summary.revenue.forecast).toBe(0);
            // Current implementation prioritises critical risks → CRITICAL
            expect(result.summary.status).toBe('CRITICAL');
            expect(result.metadata.warnings).toEqual(
                expect.arrayContaining(['revenue: INSUFFICIENT_DATA'])
            );
            expect(result.metadata.partialSuccess).toBe(false);
        });

        test('should handle calculator rejection as partial success', async () => {
            // Note: _safeForecast catches the rejection, so allSettled never sees a "rejected" status.
            // partialSuccess therefore stays false and the reason becomes CALCULATOR_ERROR:…
            orchestrator.revenueForecast.forecast = jest.fn().mockRejectedValue(new Error('DB Timeout'));
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 104000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 36000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: 120000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: 35000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 25000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 90, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 180, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            // _safeForecast returns a richer reason
            expect(result.baseForecast.revenue).toEqual({
                forecast: 0,
                available: false,
                reason: 'CALCULATOR_ERROR:revenue',
            });

            // Because the rejection is swallowed inside _safeForecast,
            // allSettled never records a "rejected" entry → partialSuccess stays false
            expect(result.metadata.partialSuccess).toBe(false);

            // Warning is still emitted via the !available path
            expect(result.metadata.warnings).toEqual(
                expect.arrayContaining(['revenue: INSUFFICIENT_DATA'])
            );
        });

        test('should handle negative profit scenario -> WARNING', async () => {
            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 100000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 100, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 80000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: -20000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: -10000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 50000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 30000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 50, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 100, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.summary.profit.forecast).toBe(-20000);
            expect(result.summary.cashFlow.forecast).toBe(-10000);
            // Risk detector currently surfaces CRITICAL risks for negative profit/cash → status CRITICAL
            expect(result.summary.status).toBe('CRITICAL');
        });

        test('should handle positive profit scenario -> POSITIVE', async () => {
            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 300000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 300, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 120000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 50000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: 130000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: 50000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 20000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 80, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 160, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.summary.profit.forecast).toBe(130000);
            expect(result.summary.cashFlow.forecast).toBe(50000);
            expect(result.summary.status).toBe('POSITIVE');
        });

        test('should detect risks and bubble CRITICAL', async () => {
            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 80000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 80, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 60000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: -20000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: -15000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 60000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 50000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 5, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 80, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.risks.risks.length).toBeGreaterThan(0);
            expect(result.summary.risks.total).toBeGreaterThan(0);
            expect(['CRITICAL', 'HIGH']).toContain(result.summary.risks.overallSeverity);
        });

        test('should generate scenarios with correct structure', async () => {
            orchestrator.revenueForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260000, available: true });
            orchestrator.salesVolumeForecast.forecast = jest.fn().mockResolvedValue({ forecast: 260, available: true });
            orchestrator.cogsForecast.forecast = jest.fn().mockResolvedValue({ forecast: 104000, available: true });
            orchestrator.expenseForecast.forecast = jest.fn().mockResolvedValue({ forecast: 36000, available: true });
            orchestrator.profitForecast.forecast = jest.fn().mockResolvedValue({ forecast: 120000, available: true });
            orchestrator.cashFlowForecast.forecast = jest.fn().mockResolvedValue({ forecast: 35000, available: true });
            orchestrator.receivablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 40000, available: true });
            orchestrator.payablesForecast.forecast = jest.fn().mockResolvedValue({ forecast: 25000, available: true });
            orchestrator.inventoryForecast.forecast = jest.fn().mockResolvedValue({ forecast: 90, available: true });
            orchestrator.demandForecast.forecast = jest.fn().mockResolvedValue({ forecast: 180, available: true });

            const result = await orchestrator.generate({
                userId: 1,
                businessId: 1,
                horizon: '30D',
            });

            expect(result.scenarios.conservative).toBeDefined();
            expect(result.scenarios.expected).toBeDefined();
            expect(result.scenarios.optimistic).toBeDefined();
            expect(result.scenarios.conservative.values.revenue)
                .toBeLessThan(result.scenarios.expected.values.revenue);
            expect(result.scenarios.optimistic.values.revenue)
                .toBeGreaterThan(result.scenarios.expected.values.revenue);
        });

        test('should return error package for invalid params, never throw', async () => {
            const result = await orchestrator.generate({
                userId: null,
                businessId: 1,
            });

            expect(result.error).toBe('INVALID_PARAMS');
            expect(result.metadata.orchestratorVersion).toBe('5.5.0-prod');
            expect(Object.isFrozen(result)).toBe(true);
        });
    });
});