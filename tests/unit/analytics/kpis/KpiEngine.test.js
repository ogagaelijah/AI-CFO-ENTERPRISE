// tests/unit/analytics/kpis/KpiEngine.test.js

const KpiEngine = require('../../../../src/application/services/analytics/kpis/KpiEngine');

const mockReportService = { generate: jest.fn() };
const mockRevenueKpiCalculator = { calculate: jest.fn() };
const mockProfitabilityKpiCalculator = { calculate: jest.fn() };
const mockExpenseKpiCalculator = { calculate: jest.fn() };
const mockCashKpiCalculator = { calculate: jest.fn() };
const mockInventoryKpiCalculator = { calculate: jest.fn() };
const mockCustomerKpiCalculator = { calculate: jest.fn() };

describe('KpiEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        engine = new KpiEngine({
            reportService: mockReportService,
            revenueKpiCalculator: mockRevenueKpiCalculator,
            profitabilityKpiCalculator: mockProfitabilityKpiCalculator,
            expenseKpiCalculator: mockExpenseKpiCalculator,
            cashKpiCalculator: mockCashKpiCalculator,
            inventoryKpiCalculator: mockInventoryKpiCalculator,
            customerKpiCalculator: mockCustomerKpiCalculator
        });
    });

    describe('calculate()', () => {
        test('should execute and return structured KPIs with investor-grade metadata', async () => {
            const periodContext = { type: 'monthly', startDate: '2026-08-01', endDate: '2026-08-31', label: 'August 2026' };
            
            mockReportService.generate.mockResolvedValue({ summary: { totalRevenue: 300000 } });

            mockRevenueKpiCalculator.calculate.mockResolvedValue([{ name: 'revenue', value: 300000 }]);
            mockProfitabilityKpiCalculator.calculate.mockResolvedValue([{ name: 'netProfit', value: 140000 }]);
            mockExpenseKpiCalculator.calculate.mockResolvedValue([]);
            mockCashKpiCalculator.calculate.mockResolvedValue([]);
            mockInventoryKpiCalculator.calculate.mockResolvedValue([]);
            mockCustomerKpiCalculator.calculate.mockResolvedValue([]);

            const result = await engine.calculate({
                userId: 'user-777',
                businessId: 'biz-101',
                period: periodContext
            });

            // ✅ INVESTOR COMPLIANCE ASSERTIONS
            expect(result.dataStatus).toBe('VALID');
            expect(result.source).toBe('KpiEngine');
            expect(result.generatedAt).toBeDefined();
            expect(result.kpis.revenue[0].value).toBe(300000);
            expect(result.kpis.profitability[0].value).toBe(140000);
        });

        test('should capture internal system errors gracefully without crashing the runtime instance', async () => {
            const periodContext = { type: 'monthly', startDate: '2026-08-01', endDate: '2026-08-31', label: 'August 2026' };
            
            // Force an internal database connectivity mapping crash exception trigger
            mockReportService.generate.mockRejectedValue(new Error('Database Timeout Connection Anomaly'));

            const result = await engine.calculate({
                userId: 'user-777',
                businessId: 'biz-101',
                period: periodContext
            });

            expect(result.dataStatus).toBe('ERROR_STATE');
            expect(result.exceptionTrace).toBe('Database Timeout Connection Anomaly');
            expect(result.kpis.revenue).toEqual([]);
        });
    });
});
