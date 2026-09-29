// tests/unit/forecast/contracts/ForecastContracts.test.js
// Phase 5.4.1 - SSOT Contract Tests | PROD THRESHOLDS: 7/30/90

const {
    ForecastContracts,
    DATA_SUFFICIENCY
} = require('../../../../src/application/services/forecast/contracts/ForecastContracts');

describe('ForecastContracts Suite', () => {
    describe('insufficientData()', () => {
        test('should provide a baseline structure containing data statuses and error assumptions', () => {
            const result = ForecastContracts.insufficientData('revenue', 'Revenue');

            expect(result.dataStatus).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
            expect(result.forecast).toBe(0);
            expect(result.lowerBound).toBe(0);
            expect(result.upperBound).toBe(0);
            expect(result.method).toBe('insufficient_data');
            expect(result.confidence.score).toBe(0);
            expect(result.assumptions.length).toBeGreaterThan(0);
            expect(result.assumptions[0]).toContain('Not enough historical data');
        });
    });

    describe('getDataSufficiency()', () => {
        test('should return correct status based on data points - PROD THRESHOLDS 7/30/90', () => {
            // < 7
            expect(ForecastContracts.getDataSufficiency(1)).toBe(DATA_SUFFICIENCY.INSUFFICIENT);
            expect(ForecastContracts.getDataSufficiency(6)).toBe(DATA_SUFFICIENCY.INSUFFICIENT);

            // 7 - 29
            expect(ForecastContracts.getDataSufficiency(7)).toBe(DATA_SUFFICIENCY.MINIMAL);
            expect(ForecastContracts.getDataSufficiency(20)).toBe(DATA_SUFFICIENCY.MINIMAL);
            expect(ForecastContracts.getDataSufficiency(29)).toBe(DATA_SUFFICIENCY.MINIMAL);

            // 30 - 89
            expect(ForecastContracts.getDataSufficiency(30)).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(ForecastContracts.getDataSufficiency(60)).toBe(DATA_SUFFICIENCY.SUFFICIENT);
            expect(ForecastContracts.getDataSufficiency(89)).toBe(DATA_SUFFICIENCY.SUFFICIENT);

            // >= 90
            expect(ForecastContracts.getDataSufficiency(90)).toBe(DATA_SUFFICIENCY.EXCELLENT);
            expect(ForecastContracts.getDataSufficiency(120)).toBe(DATA_SUFFICIENCY.EXCELLENT);
            expect(ForecastContracts.getDataSufficiency(365)).toBe(DATA_SUFFICIENCY.EXCELLENT);
        });
    });

    describe('getConfidenceFromDataPoints()', () => {
        test('should return correct confidence level based on data points - PROD THRESHOLDS 7/30/90', () => {
            // < 7
            expect(ForecastContracts.getConfidenceFromDataPoints(1)).toBe('VERY_LOW');
            expect(ForecastContracts.getConfidenceFromDataPoints(6)).toBe('VERY_LOW');

            // 7 - 29
            expect(ForecastContracts.getConfidenceFromDataPoints(7)).toBe('MODERATE');
            expect(ForecastContracts.getConfidenceFromDataPoints(10)).toBe('MODERATE');
            expect(ForecastContracts.getConfidenceFromDataPoints(29)).toBe('MODERATE');

            // 30 - 89
            expect(ForecastContracts.getConfidenceFromDataPoints(30)).toBe('GOOD');
            expect(ForecastContracts.getConfidenceFromDataPoints(60)).toBe('GOOD');
            expect(ForecastContracts.getConfidenceFromDataPoints(89)).toBe('GOOD');

            // >= 90
            expect(ForecastContracts.getConfidenceFromDataPoints(90)).toBe('STRONG');
            expect(ForecastContracts.getConfidenceFromDataPoints(120)).toBe('STRONG');
            expect(ForecastContracts.getConfidenceFromDataPoints(365)).toBe('STRONG');
        });
    });

    describe('createRisk()', () => {
        test('should never return null for impact - SCALE SAFETY', () => {
            const risk = ForecastContracts.createRisk({
                metric: 'revenue', displayName: 'Revenue', type: 'TEST', impact: null
            });
            expect(risk.impact).toBe(0); // SCALE FIX
        });
    });

    describe('createForecast()', () => {
        test('should cap risks and assumptions to 5 - SCALE SAFETY', () => {
            const result = ForecastContracts.createForecast({
                metric: 'test', displayName: 'Test', period: { horizon: '30D' },
                risks: Array(10).fill({type: 'TEST'}),
                assumptions: Array(10).fill('TEST')
            });
            expect(result.risks.length).toBeLessThanOrEqual(5);
            expect(result.assumptions.length).toBeLessThanOrEqual(5);
        });
    });
});