// tests/unit/forecast/core/CoreForecasts.test.js
// Phase 5.4.3 - Core Engine Tests | SSOT: 7/30/90

const RevenueForecastCalculator = require('../../../../src/application/services/forecast/core/RevenueForecastCalculator');
const SalesVolumeForecastCalculator = require('../../../../src/application/services/forecast/core/SalesVolumeForecastCalculator');
const COGSForecastCalculator = require('../../../../src/application/services/forecast/core/COGSForecastCalculator');
const ExpenseForecastCalculator = require('../../../../src/application/services/forecast/core/ExpenseForecastCalculator');
const ProfitForecastCalculator = require('../../../../src/application/services/forecast/core/ProfitForecastCalculator');
const CashFlowForecastCalculator = require('../../../../src/application/services/forecast/core/CashFlowForecastCalculator');
const ReceivablesForecastCalculator = require('../../../../src/application/services/forecast/core/ReceivablesForecastCalculator');
const PayablesForecastCalculator = require('../../../../src/application/services/forecast/core/PayablesForecastCalculator');
const DemandForecastCalculator = require('../../../../src/application/services/forecast/core/DemandForecastCalculator');
const InventoryForecastCalculator = require('../../../../src/application/services/forecast/core/InventoryForecastCalculator');
const { DATA_SUFFICIENCY } = require('../../../../src/application/services/forecast/contracts/ForecastContracts');

describe('Core Forecasts - SSOT v5.4.3', () => {
    describe('RevenueForecastCalculator', () => {
        const calculator = new RevenueForecastCalculator();
        test('should forecast revenue using simple average with stable data - MINIMAL', async () => {
            const historicalData = Array.from({ length: 12 }, (_, i) => ({ value: 210000 + (Math.random() - 0.5) * 20000, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.metric).toBe('revenue');
            expect(result.forecast).toBeGreaterThan(190000);
            expect(result.confidence.score).toBeGreaterThan(40);
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
        });
        test('should forecast revenue with upward trend', async () => {
            const historicalData = Array.from({ length: 10 }, (_, i) => ({ value: 200000 + (i * 5000), date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.forecast).toBeGreaterThan(240000);
            expect(result.method).toBe('linear_trend');
        });
        test('should handle insufficient data < 7', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData: [{ value: 100000, date: '2024-01-01' }], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
            expect(result.forecast).toBe(0);
        });
        test('should detect revenue decline risk', async () => {
            const historicalData = Array.from({ length: 30 }, (_, i) => ({ value: 100000 - (i * 3300), date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D', method: 'linear_trend' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.risks[0].type).toBe('REVENUE_DECLINE');
        });
    });

    describe('SalesVolumeForecastCalculator', () => {
        const calculator = new SalesVolumeForecastCalculator();
        test('should forecast sales volume using simple average - MINIMAL', async () => {
            const historicalData = Array.from({ length: 10 }, (_, i) => ({ value: 100 + i, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.metric).toBe('salesVolume');
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
        });
        test('should forecast volume with upward trend - SUFFICIENT', async () => {
            const historicalData = Array.from({ length: 35 }, (_, i) => ({ value: 100 + (i * 10), date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.confidence.level).toBe('GOOD');
        });
    });

    describe('COGSForecastCalculator', () => {
        const calculator = new COGSForecastCalculator();
        test('should forecast COGS based on stable input streams - MINIMAL', async () => {
            const historicalData = Array.from({ length: 7 }, (_, i) => ({ value: 150, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const salesVolumeForecastData = { forecast: 150 };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D', unitCost: 300, salesVolumeForecastData });
            expect(result.forecast).toBe(45000);
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
        });
    });

    describe('ExpenseForecastCalculator', () => {
        const calculator = new ExpenseForecastCalculator();
        test('should forecast expenses using categorized approach - MINIMAL', async () => {
            const historicalData = [
                { value: 50000, category: 'rent', date: '2024-01-01' }, { value: 20000, category: 'advertising', date: '2024-01-01' },
                { value: 10000, category: 'utilities', date: '2024-01-01' }, { value: 50000, category: 'rent', date: '2024-02-01' },
                { value: 22000, category: 'advertising', date: '2024-02-01' }, { value: 11000, category: 'utilities', date: '2024-02-01' },
                { value: 12000, category: 'utilities', date: '2024-03-01' }, { value: 80000, category: 'repair', description: 'AC repair', date: '2024-03-01' }
            ];
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.metadata.breakdown.irregular).toBeGreaterThan(0);
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
        });
        test('should handle insufficient expense data < 7', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData: [{ value: 5000, category: 'rent', date: '2024-01-01' }], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
        });
        test('should detect irregular expense by value spike > 3x avg', async () => {
            const historicalData = Array.from({ length: 8 }, (_, i) => ({ value: i === 7? 50000 : 1000, category: 'utilities', date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalData, horizon: '30D' });
            expect(result.metadata.breakdown.irregular).toBeGreaterThan(0);
        });
    });

    describe('ProfitForecastCalculator', () => {
        const calculator = new ProfitForecastCalculator();
        test('should calculate profit from component forecasts', async () => {
            const revenueForecastData = { forecast: 500000, confidence: { score: 70 }, method: 'linear_trend' };
            const cogsForecastData = { forecast: 200000, confidence: { score: 65 }, method: 'simple_average' };
            const expenseForecastData = { forecast: 140000, confidence: { score: 60 }, method: 'combined' };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', revenueForecastData, cogsForecastData, expenseForecastData, horizon: '30D' });
            expect(result.forecast).toBe(160000);
            expect(result.metadata.netMargin).toBeCloseTo(32, 0);
        });
        test('should use weighted confidence not simple average', async () => {
            const revenueForecastData = { forecast: 100, confidence: { score: 90 }, method: 'linear_trend' };
            const cogsForecastData = { forecast: 10, confidence: { score: 40 }, method: 'simple_average' };
            const expenseForecastData = { forecast: 10, confidence: { score: 50 }, method: 'combined' };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', revenueForecastData, cogsForecastData, expenseForecastData, horizon: '30D' });
            expect(result.confidence.score).toBe(67);
        });
        test('should cap confidence if any input is < 30', async () => {
            const revenueForecastData = { forecast: 100, confidence: { score: 90 }, method: 'linear_trend' };
            const cogsForecastData = { forecast: 10, confidence: { score: 20 }, method: 'simple_average' };
            const expenseForecastData = { forecast: 10, confidence: { score: 80 }, method: 'combined' };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', revenueForecastData, cogsForecastData, expenseForecastData, horizon: '30D' });
            expect(result.confidence.score).toBeLessThanOrEqual(50);
        });
        test('should detect negative profit risk', async () => {
            const revenueForecastData = { forecast: 100, confidence: { score: 70 }, method: 'linear_trend' };
            const cogsForecastData = { forecast: 80, confidence: { score: 70 }, method: 'simple_average' };
            const expenseForecastData = { forecast: 40, confidence: { score: 70 }, method: 'combined' };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', revenueForecastData, cogsForecastData, expenseForecastData, horizon: '30D' });
            expect(result.risks.find(r => r.type === 'MARGIN_COMPRESSION')).toBeDefined();
        });
    });

    describe('CashFlowForecastCalculator', () => {
        const calculator = new CashFlowForecastCalculator();
        test('should forecast cash flow with positive net', async () => {
            const revenueForecastData = { forecast: 500000, confidence: { score: 65 } };
            const expenseForecastData = { forecast: 300000, confidence: { score: 65 } };
            const historicalPayments = Array.from({ length: 10 }, (_, i) => ({ amount: 10000, type: i % 2 === 0? 'RECEIVED' : 'MADE' }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', openingCash: 100000, revenueForecastData, expenseForecastData, historicalPayments, horizon: '30D' });
            expect(result.metric).toBe('cashFlow');
            expect(result.forecast).toBeGreaterThan(100000);
            expect(result.metadata.closingCash).toBeDefined();
            expect(result.metadata.volatilityIndex).toBeGreaterThanOrEqual(0);
        });
        test('should detect CASH_PRESSURE CRITICAL when closing < 0', async () => {
            const revenueForecastData = { forecast: 100000, confidence: { score: 50 } };
            const expenseForecastData = { forecast: 300000, confidence: { score: 50 } };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', openingCash: 10000, revenueForecastData, expenseForecastData, historicalPayments: [], horizon: '30D' });
            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.risks[0].severity).toBe('CRITICAL');
            expect(result.risks[0].type).toBe('CASH_PRESSURE');
        });
        test('should handle insufficient data', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', openingCash: 10000, revenueForecastData: null, expenseForecastData: null, historicalPayments: [], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
        });
    });

    describe('ReceivablesForecastCalculator', () => {
        const calculator = new ReceivablesForecastCalculator();
        test('should forecast receivables with credit sales', async () => {
            const revenueForecastData = { forecast: 500000, confidence: { score: 70 } };
            const historicalCollections = Array.from({ length: 12 }, (_, i) => ({ amount: 20000, type: 'RECEIVED', paymentDate: `2024-${String(i + 1).padStart(2, '0')}-15`, saleDate: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentReceivables: 200000, revenueForecastData, historicalCollections, horizon: '30D' });
            expect(result.metric).toBe('receivables');
            expect(result.forecast).toBeGreaterThan(0);
            expect(result.historicalBasis.trend.available).toBe(true);
            expect(result.metadata.volatilityIndex).toBeGreaterThanOrEqual(0);
        });
        test('should detect RECEIVABLE_PRESSURE when AR grows > 30%', async () => {
            const revenueForecastData = { forecast: 1000000, confidence: { score: 70 } };
            const historicalCollections = Array.from({ length: 7 }, (_, i) => ({ amount: 5000, type: 'RECEIVED', paymentDate: `2024-${String(i + 1).padStart(2, '0')}-15`, saleDate: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentReceivables: 10000, revenueForecastData, historicalCollections, horizon: '30D', creditSalesPercentage: 0.9, collectionDelay: 90 });
            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.risks[0].type).toBe('RECEIVABLE_PRESSURE');
        });
        test('should handle insufficient data', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentReceivables: 100000, revenueForecastData: null, historicalCollections: [], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
        });
    });

    describe('PayablesForecastCalculator', () => {
        const calculator = new PayablesForecastCalculator();
        test('should forecast payables with credit purchases', async () => {
            const cogsForecastData = { forecast: 300000, confidence: { score: 65 } };
            const historicalPayments = Array.from({ length: 12 }, (_, i) => ({ amount: 25000, type: 'MADE', paymentDate: `2024-${String(i + 1).padStart(2, '0')}-30`, purchaseDate: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentPayables: 150000, cogsForecastData, historicalPayments, horizon: '30D' });
            expect(result.metric).toBe('payables');
            expect(result.forecast).toBeGreaterThan(0);
            expect(result.historicalBasis.trend.available).toBe(true);
            expect(result.metadata.volatilityIndex).toBeGreaterThanOrEqual(0);
        });
        test('should detect CASH_PRESSURE when AP grows > 30%', async () => {
            const cogsForecastData = { forecast: 500000, confidence: { score: 65 } };
            const historicalPayments = Array.from({ length: 7 }, (_, i) => ({ amount: 5000, type: 'MADE', paymentDate: `2024-${String(i + 1).padStart(2, '0')}-30`, purchaseDate: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentPayables: 10000, cogsForecastData, historicalPayments, horizon: '30D', creditPurchasesPercentage: 0.9, paymentDelay: 90 });
            expect(result.risks.length).toBeGreaterThan(0);
            expect(result.risks[0].type).toBe('CASH_PRESSURE');
        });
        test('should handle insufficient data', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', currentPayables: 100000, cogsForecastData: null, historicalPayments: [], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
        });
    });

    describe('DemandForecastCalculator', () => {
        const calculator = new DemandForecastCalculator();
        test('should forecast demand using simple average - MINIMAL', async () => {
            const historicalDemand = Array.from({ length: 10 }, (_, i) => ({ value: 200 + i * 5, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalDemand, horizon: '30D' });
            expect(result.metric).toBe('demand');
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
            expect(result.forecast).toBeGreaterThan(200);
        });
        test('should forecast demand with trend and seasonality - SUFFICIENT', async () => {
            const historicalDemand = Array.from({ length: 30 }, (_, i) => ({ value: 100 + (i * 10), date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalDemand, horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.confidence.score).toBeGreaterThan(50);
        });
        test('should handle insufficient data < 7', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalDemand: [{ value: 100, date: '2024-01-01' }], horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
            expect(result.forecast).toBe(0);
        });
        test('should detect DEMAND_DECLINE risk at SUFFICIENT', async () => {
            // 30 points → SUFFICIENT.
            // Decline, but last value stays high so forecast (via mock -99.9%) < lastValue * 0.5
            // (_detectRisks: sufficiency === SUFFICIENT && lastValue > 0 && forecast < lastValue * 0.5)
            const historicalDemand = Array.from({ length: 30 }, (_, i) => ({
                value: 100 - (i * 2), // 100 → 42 (lastValue = 42)
                date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01`
            }));

            const mockTrendAnalyzer = {
                analyze: () => ({
                    available: true,
                    rSquared: 0.95,
                    percentageChange: -99.9, // trendFactor ≈ 0.001 → forecast near 0
                    slope: -2,
                    stability: 80
                })
            };

            const mockSeasonalityDetector = {
                detect: () => ({
                    available: true,
                    hasSeasonality: true,
                    strength: 30,
                    seasonalIndices: {
                        '0': 1, '1': 1, '2': 1, '3': 1, '4': 1, '5': 1,
                        '6': 1, '7': 1, '8': 1, '9': 1, '10': 1, '11': 1
                    }
                })
            };

            const diCalculator = new DemandForecastCalculator({
                trendAnalyzer: mockTrendAnalyzer,
                seasonalityDetector: mockSeasonalityDetector
            });

            const result = await diCalculator.forecast({
                userId: 'u1',
                businessId: 'b1',
                historicalDemand,
                horizon: '30D'
            });

            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.forecast).toBeLessThan(1);
            expect(result.risks.find(r => r.type === 'DEMAND_DECLINE')).toBeDefined();
        });
    });

    describe('InventoryForecastCalculator', () => {
        const calculator = new InventoryForecastCalculator();
        test('should forecast inventory using combined method - MINIMAL', async () => {
            const historicalInventory = Array.from({ length: 10 }, (_, i) => ({ value: 500 - i * 10, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const purchaseHistory = Array.from({ length: 8 }, (_, i) => ({ value: 100, date: `2024-${String(i + 1).padStart(2, '0')}-01` }));
            const salesVolumeForecastData = { forecast: 120, confidence: { score: 60 } };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalInventory, purchaseHistory, salesVolumeForecastData, horizon: '30D' });
            expect(result.metric).toBe('inventory');
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.MINIMAL);
            expect(result.forecast).toBeGreaterThan(0);
        });
        test('should forecast inventory with SUFFICIENT data', async () => {
            const historicalInventory = Array.from({ length: 30 }, (_, i) => ({ value: 1000 - i * 5, date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const purchaseHistory = Array.from({ length: 30 }, (_, i) => ({ value: 150, date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const salesVolumeForecastData = { forecast: 100, confidence: { score: 80 } };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalInventory, purchaseHistory, salesVolumeForecastData, horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.confidence.score).toBeGreaterThan(60);
        });
        test('should handle insufficient data', async () => {
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalInventory: [], purchaseHistory: [], salesVolumeForecastData: null, horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
        });
        test('should detect INVENTORY_SHORTAGE CRITICAL when stock <= 0', async () => {
            // FIX: 35 points to force SUFFICIENT, and bigger demand to force 0 stock
            const historicalInventory = Array.from({ length: 35 }, (_, i) => ({ value: 100, date: `2024-${String((i % 12) + 1).padStart(2, '0')}-01` }));
            const purchaseHistory = [{ value: 0 }];
            const salesVolumeForecastData = { forecast: 500, confidence: { score: 70 } };
            const result = await calculator.forecast({ userId: 'u1', businessId: 'b1', historicalInventory, purchaseHistory, salesVolumeForecastData, horizon: '30D' });
            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(result.risks.find(r => r.type === 'INVENTORY_SHORTAGE' && r.severity === 'CRITICAL')).toBeDefined();
            expect(result.metadata.status.level).toBe('OUT_OF_STOCK');
        });
    });
});