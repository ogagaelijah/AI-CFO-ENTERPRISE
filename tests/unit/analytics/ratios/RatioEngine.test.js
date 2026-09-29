// tests/unit/analytics/ratios/RatioEngine.test.js

// ✅ PRODUCTION FIX: Updated path from 3 to 4 directory steps to escape deep test folder nesting
const RatioEngine = require('../../../../src/application/services/analytics/ratios/RatioEngine');
const { AnalyticsContracts } = require('../../../../src/application/services/analytics/contracts');

// Mock structural dependencies
const mockReportService = { generate: jest.fn() };
const mockCashCalculator = { calculate: jest.fn() };
const mockArCalculator = { calculate: jest.fn() };
const mockApCalculator = { calculate: jest.fn() };
const mockInventoryCalculator = { calculate: jest.fn() };
const mockSaleRepository = { findByDateRange: jest.fn() };
const mockPurchaseRepository = { findByDateRange: jest.fn() };

const mockPeriod = {
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    label: 'August 2026',
    type: 'monthly',
};

describe('RatioEngine', () => {
    let engine;

    beforeEach(() => {
        jest.clearAllMocks();

        // Stub standard corporate report payload context
        mockReportService.generate.mockResolvedValue({
            revenue: { totalRevenue: 300000, productSales: 300000, otherRevenue: 0 },
            cogs: { total: 120000 },
            grossProfit: { amount: 180000, margin: 60 },
            netProfit: { amount: 130000, margin: 43.33 },
            operatingProfit: { amount: 140000 },
            operatingExpenses: { total: 50000 },
            salesCount: 10,
            summary: { totalRevenue: 300000, salesCount: 10, totalExpenses: 50000 },
            comparison: {
                previousPeriod: { revenue: 250000, grossProfit: 150000, netProfit: 100000 }
            }
        });

        mockCashCalculator.calculate.mockResolvedValue({ closingCash: 100000 });
        mockArCalculator.calculate.mockResolvedValue({ totalOutstanding: 40000 });
        mockApCalculator.calculate.mockResolvedValue({ totalOutstanding: 30000 });
        mockInventoryCalculator.calculate.mockResolvedValue({ totalCostValue: 50000 });
        mockSaleRepository.findByDateRange.mockResolvedValue([]);
        mockPurchaseRepository.findByDateRange.mockResolvedValue([]);

        engine = new RatioEngine({
            reportService: mockReportService,
            saleRepository: mockSaleRepository,
            purchaseRepository: mockPurchaseRepository,
            cashCalculator: mockCashCalculator,
            arCalculator: mockArCalculator,
            apCalculator: mockApCalculator,
            inventoryCalculator: mockInventoryCalculator,
            profitabilityRatioCalculator: { calculate: jest.fn().mockResolvedValue({ grossMargin: { value: 60 }, netMargin: { value: 43.33 }, expenseRatio: { value: 16.67 } }) },
            liquidityRatioCalculator: { calculate: jest.fn().mockResolvedValue({ currentRatio: { value: 6.33 }, quickRatio: { value: 4.67 } }) },
            efficiencyRatioCalculator: { calculate: jest.fn().mockResolvedValue({ revenuePerTransaction: { value: 30000 }, expensePerSale: { value: 5000 } }) },
            workingCapitalRatioCalculator: { calculate: jest.fn().mockResolvedValue({ workingCapital: { value: 160000 } }) }
        });
    });

    describe('calculate()', () => {
        test('should calculate all corporate financial ratios correctly for investor audits', async () => {
            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            // Profitability Metrics Validation
            expect(result.profitability).toBeDefined();
            expect(result.profitability.grossMargin.value).toBe(60);
            expect(result.profitability.netMargin.value).toBeCloseTo(43.33, 1);
            expect(result.profitability.expenseRatio.value).toBeCloseTo(16.67, 1);

            // Liquidity Position Validation
            expect(result.liquidity).toBeDefined();
            expect(result.liquidity.currentRatio.value).toBeCloseTo(6.33, 1);
            expect(result.liquidity.quickRatio.value).toBeCloseTo(4.67, 1);

            // Operational Efficiency Validation
            expect(result.efficiency).toBeDefined();
            expect(result.efficiency.revenuePerTransaction.value).toBe(30000);
            expect(result.efficiency.expensePerSale.value).toBe(5000);

            // Capital Health Validation
            expect(result.workingCapital).toBeDefined();
            expect(result.workingCapital.workingCapital.value).toBe(160000);
        });

        test('should handle missing data gracefully without throwing reference errors', async () => {
            engine.profitabilityRatioCalculator.calculate.mockResolvedValue({ grossMargin: { dataStatus: 'INSUFFICIENT_DATA' } });
            engine.liquidityRatioCalculator.calculate.mockResolvedValue({ currentRatio: { dataStatus: 'INSUFFICIENT_DATA' } });

            mockReportService.generate.mockResolvedValue({
                revenue: { totalRevenue: 0 },
                cogs: { total: 0 },
                grossProfit: { amount: 0, margin: 0 },
                netProfit: { amount: 0, margin: 0 },
                operatingExpenses: { total: 0 }
            });

            const result = await engine.calculate({
                userId: 1,
                businessId: 1,
                period: mockPeriod,
            });

            expect(result.profitability.grossMargin.dataStatus).toBe('INSUFFICIENT_DATA');
            expect(result.liquidity.currentRatio.dataStatus).toBe('INSUFFICIENT_DATA');
        });
    });
});
