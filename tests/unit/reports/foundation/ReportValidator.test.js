// tests/unit/reports/foundation/ReportValidator.test.js

const ReportValidator = require('../../../../src/application/services/reports/foundation/ReportValidator');

describe('ReportValidator', () => {
    let validator;

    beforeEach(() => {
        validator = new ReportValidator();
    });

    describe('validate()', () => {
        test('should validate correct inputs', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'monthly',
                referenceDate: '2026-08-30',
            });

            expect(result.valid).toBe(true);
            expect(result.errors).toEqual([]);
        });

        test('should reject missing userId', () => {
            const result = validator.validate({
                businessId: 1,
                period: 'monthly',
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('userId is required');
        });

        test('should reject missing businessId', () => {
            const result = validator.validate({
                userId: 1,
                period: 'monthly',
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('businessId is required');
        });

        test('should reject missing period', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('period is required');
        });

        test('should reject invalid period', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'invalid',
            });

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('period must be one of');
        });

        test('should reject custom period without dates', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'custom',
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('startDate is required for custom period');
            expect(result.errors).toContain('endDate is required for custom period');
        });

        test('should validate custom period with dates', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'custom',
                startDate: '2026-08-01',
                endDate: '2026-08-15',
            });

            expect(result.valid).toBe(true);
        });

        test('should reject invalid date format', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'custom',
                startDate: 'invalid-date',
                endDate: '2026-08-15',
            });

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('startDate must be a valid date');
        });

        test('should reject startDate after endDate', () => {
            const result = validator.validate({
                userId: 1,
                businessId: 1,
                period: 'custom',
                startDate: '2026-08-15',
                endDate: '2026-08-01',
            });

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('startDate cannot be after endDate');
        });
    });

    describe('validatePositiveNumber()', () => {
        test('should validate positive number', () => {
            const result = validator.validatePositiveNumber(100, 'amount');
            expect(result.valid).toBe(true);
        });

        test('should reject negative number', () => {
            const result = validator.validatePositiveNumber(-100, 'amount');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('amount must be non-negative');
        });

        test('should reject undefined', () => {
            const result = validator.validatePositiveNumber(undefined, 'amount');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('amount is required');
        });

        test('should reject NaN', () => {
            const result = validator.validatePositiveNumber(NaN, 'amount');
            expect(result.valid).toBe(false);
            expect(result.message).toBe('amount must be a number');
        });
    });
});