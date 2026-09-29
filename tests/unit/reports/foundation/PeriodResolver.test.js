// tests/unit/reports/foundation/PeriodResolver.test.js

const PeriodResolver = require('../../../../src/application/services/reports/foundation/PeriodResolver');

describe('PeriodResolver', () => {
    let resolver;

    beforeEach(() => {
        resolver = new PeriodResolver();
    });

    describe('resolve()', () => {
        test('should resolve daily period correctly', () => {
            const result = resolver.resolve({
                period: 'daily',
                referenceDate: '2026-08-30'
            });

            expect(result.startDate).toBe('2026-08-30');
            expect(result.endDate).toBe('2026-08-30');
            expect(result.label).toBe('30 Aug 2026');
        });

        test('should resolve weekly period correctly (Monday-Sunday)', () => {
            // Aug 30, 2026 is a Sunday
            const result = resolver.resolve({
                period: 'weekly',
                referenceDate: '2026-08-30'
            });

            expect(result.startDate).toBe('2026-08-24');
            expect(result.endDate).toBe('2026-08-30');
            expect(result.label).toBe('Week of 24 Aug 2026');
        });

        test('should resolve weekly period correctly for Monday', () => {
            const result = resolver.resolve({
                period: 'weekly',
                referenceDate: '2026-08-24' // Monday
            });

            expect(result.startDate).toBe('2026-08-24');
            expect(result.endDate).toBe('2026-08-30');
            expect(result.label).toBe('Week of 24 Aug 2026');
        });

        test('should resolve monthly period correctly', () => {
            const result = resolver.resolve({
                period: 'monthly',
                referenceDate: '2026-08-15'
            });

            expect(result.startDate).toBe('2026-08-01');
            expect(result.endDate).toBe('2026-08-31');
            expect(result.label).toBe('August 2026');
        });

        test('should resolve quarterly period correctly', () => {
            const result = resolver.resolve({
                period: 'quarterly',
                referenceDate: '2026-08-15'
            });

            expect(result.startDate).toBe('2026-07-01');
            expect(result.endDate).toBe('2026-09-30');
            expect(result.label).toBe('Q3 2026');
        });

        test('should resolve yearly period correctly', () => {
            const result = resolver.resolve({
                period: 'yearly',
                referenceDate: '2026-08-15'
            });

            expect(result.startDate).toBe('2026-01-01');
            expect(result.endDate).toBe('2026-12-31');
            expect(result.label).toBe('2026');
        });

        test('should resolve custom period correctly', () => {
            const result = resolver.resolve({
                period: 'custom',
                startDate: '2026-08-01',
                endDate: '2026-08-15'
            });

            expect(result.startDate).toBe('2026-08-01');
            expect(result.endDate).toBe('2026-08-15');
            expect(result.label).toBe('1 Aug 2026 - 15 Aug 2026');
        });

        test('should calculate previous period dates', () => {
            const result = resolver.resolve({
                period: 'monthly',
                referenceDate: '2026-08-15'
            });

            expect(result.previousStartDate).toBe('2026-07-01');
            expect(result.previousEndDate).toBe('2026-07-31');
        });

        test('should throw error for invalid period', () => {
            expect(() => {
                resolver.resolve({
                    period: 'invalid',
                    referenceDate: '2026-08-15'
                });
            }).toThrow('Invalid period: invalid');
        });

        test('should throw error for custom period without dates', () => {
            expect(() => {
                resolver.resolve({
                    period: 'custom',
                    referenceDate: '2026-08-15'
                });
            }).toThrow('startDate and endDate are required for custom period');
        });

        test('should throw error when startDate is after endDate', () => {
            expect(() => {
                resolver.resolve({
                    period: 'custom',
                    startDate: '2026-08-15',
                    endDate: '2026-08-01'
                });
            }).toThrow('startDate cannot be after endDate');
        });
    });

    describe('getMonthName()', () => {
        test('should return correct month name', () => {
            expect(resolver.getMonthName(0)).toBe('January');
            expect(resolver.getMonthName(7)).toBe('August');
            expect(resolver.getMonthName(11)).toBe('December');
        });
    });

    describe('getPeriodTypeFromRange()', () => {
        test('should detect daily period', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-30', '2026-08-30');
            expect(result).toBe('daily');
        });

        test('should detect weekly period', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-24', '2026-08-30');
            expect(result).toBe('weekly');
        });

        test('should detect monthly period', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-01', '2026-08-31');
            expect(result).toBe('monthly');
        });

        test('should detect quarterly period', () => {
            const result = resolver.getPeriodTypeFromRange('2026-07-01', '2026-09-30');
            expect(result).toBe('quarterly');
        });

        test('should detect yearly period', () => {
            const result = resolver.getPeriodTypeFromRange('2026-01-01', '2026-12-31');
            expect(result).toBe('yearly');
        });

        test('should detect custom period for 15-day range', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-01', '2026-08-15');
            expect(result).toBe('custom');
        });

        test('should detect custom period for 45-day range', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-01', '2026-09-15');
            expect(result).toBe('custom');
        });

        test('should detect custom period for 100-day range', () => {
            const result = resolver.getPeriodTypeFromRange('2026-08-01', '2026-11-09');
            expect(result).toBe('custom');
        });
    });
});