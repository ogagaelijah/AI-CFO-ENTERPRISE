// tests/unit/forecast/foundation/ForecastFoundation.test.js
const TrendAnalyzer = require('../../../../src/application/services/forecast/foundation/TrendAnalyzer');
const SeasonalityDetector = require('../../../../src/application/services/forecast/foundation/SeasonalityDetector');
const VolatilityAnalyzer = require('../../../../src/application/services/forecast/foundation/VolatilityAnalyzer');

describe('Forecast Foundation', () => {
    describe('TrendAnalyzer', () => {
        test('should detect upward trend correctly', () => {
            const data = [100, 120, 140, 160, 180, 200];
            const result = TrendAnalyzer.analyze(data);
            expect(result.available).toBe(true);
            expect(result.direction).toBe('UP');
            expect(result.slope).toBeGreaterThan(0);
            expect(result.percentageChange).toBe(100);
            expect(result.strength).toBe('STRONG');
            expect(result.dataPoints).toBe(6);
            expect(result.message).toContain('increasing');
        });

        test('should detect downward trend correctly', () => {
            const data = [200, 180, 160, 140, 120, 100];
            const result = TrendAnalyzer.analyze(data);
            expect(result.direction).toBe('DOWN');
            expect(result.percentageChange).toBe(-50);
        });

        test('should detect stable trend correctly', () => {
            const data = [100, 101, 99, 100, 102, 98];
            const result = TrendAnalyzer.analyze(data);
            expect(result.direction).toBe('STABLE');
            expect(result.percentageChange).toBeCloseTo(0, 0);
        });

        test('should handle insufficient data', () => {
            const data = [100, 120];
            const result = TrendAnalyzer.analyze(data);
            expect(result.available).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_DATA');
        });

        test('should combine multiple trends', () => {
            const trend1 = TrendAnalyzer.analyze([100, 120, 140, 160]);
            const trend2 = TrendAnalyzer.analyze([50, 55, 60, 65]);
            const trend3 = TrendAnalyzer.analyze([200, 190, 180, 170]);
            const combined = TrendAnalyzer.combine([trend1, trend2, trend3]);
            expect(combined.overallDirection).toBe('UP');
            expect(combined.summary).toContain('trend overall');
        });
    });

    describe('SeasonalityDetector', () => {
        test('should detect seasonal pattern with 12 months of data', () => {
            const data = Array.from({length: 12}, (_, i) => ({
                date: `2025-${String(i+1).padStart(2,'0')}-01`, 
                value: 100 + (i === 11 ? 50 : 0) // Dec spike
            }));
            const result = SeasonalityDetector.detect(data);
            expect(result.available).toBe(true);
            expect(result.hasSeasonality).toBe(true);
            expect(result.seasonalIndices[11]).toBeGreaterThan(120);
        });

        test('should return not available for < 12 data points', () => {
            const data = [{date: '2025-01-01', value: 100}];
            const result = SeasonalityDetector.detect(data);
            expect(result.available).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_DATA');
        });

        test('should return seasonal factors map', () => {
            const data = Array.from({length: 12}, (_, i) => ({date: `2025-${String(i+1).padStart(2,'0')}-01`, value: 100}));
            const result = SeasonalityDetector.getSeasonalFactors(data);
            expect(typeof result).toBe('object');
            expect(Object.keys(result).length).toBe(12);
        });
    });

    describe('VolatilityAnalyzer', () => {
        test('should calculate volatility correctly for stable data', () => {
            const data = [100, 102, 98, 101, 99];
            const result = VolatilityAnalyzer.analyze(data);
            expect(result.available).toBe(true);
            expect(result.volatility).toBeLessThan(0.05);
            expect(result.level).toBe('LOW');
        });

        test('should return high volatility for spiky data', () => {
            const data = [100, 500, 50, 800, 120];
            const result = VolatilityAnalyzer.analyze(data);
            expect(result.available).toBe(true);
            expect(result.volatility).toBeGreaterThan(0.5);
            expect(result.level).toBe('HIGH');
        });

        test('should return not available for < 3 data points', () => {
            const data = [100, 200];
            const result = VolatilityAnalyzer.analyze(data);
            expect(result.available).toBe(false);
            expect(result.reason).toBe('INSUFFICIENT_DATA');
        });
    });
});