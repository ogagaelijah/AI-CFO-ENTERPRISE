// tests/unit/reports/foundation/ReportResponseBuilder.test.js

const ReportResponseBuilder = require('../../../../src/application/services/reports/foundation/ReportResponseBuilder');

// Mock dependencies
const mockPeriodResolver = {
    resolve: jest.fn(),
};

const mockReportValidator = {
    validate: jest.fn(),
};

describe('ReportResponseBuilder', () => {
    let builder;

    beforeEach(() => {
        jest.clearAllMocks();
        builder = new ReportResponseBuilder({
            periodResolver: mockPeriodResolver,
            reportValidator: mockReportValidator,
        });
    });

    describe('build()', () => {
        test('should build a complete report response', () => {
            const period = {
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                label: 'August 2026',
                previousStartDate: '2026-07-01',
                previousEndDate: '2026-07-31',
            };

            const result = builder.build({
                reportType: 'profit_loss',
                period,
                data: { revenue: 1000000, netProfit: 200000 },
                warnings: ['Test warning'],
                integrityChecks: { isBalanced: true },
            });

            expect(result.reportType).toBe('profit_loss');
            expect(result.generatedAt).toBeDefined();
            expect(result.period.start).toBe('2026-08-01');
            expect(result.period.end).toBe('2026-08-31');
            expect(result.data.revenue).toBe(1000000);
            expect(result.warnings).toEqual(['Test warning']);
            expect(result.integrity.isBalanced).toBe(true);
            expect(result.status).toBe('SUCCESS');
        });

        test('should set status to ERROR when errors exist', () => {
            const period = {
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                label: 'August 2026',
            };

            const result = builder.build({
                reportType: 'profit_loss',
                period,
                data: null,
                errors: ['Failed to calculate revenue'],
            });

            expect(result.status).toBe('ERROR');
            expect(result.errors).toEqual(['Failed to calculate revenue']);
        });
    });

    describe('success()', () => {
        test('should build a success response', () => {
            const period = {
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                label: 'August 2026',
            };

            const result = builder.success({
                reportType: 'profit_loss',
                period,
                data: { revenue: 1000000 },
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.revenue).toBe(1000000);
            expect(result.errors).toBeNull();
        });
    });

    describe('error()', () => {
        test('should build an error response', () => {
            const period = {
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                label: 'August 2026',
            };

            const result = builder.error({
                reportType: 'profit_loss',
                period,
                errors: ['Something went wrong'],
            });

            expect(result.status).toBe('ERROR');
            expect(result.errors).toEqual(['Something went wrong']);
            expect(result.data).toBeNull();
        });
    });

    describe('buildComparison()', () => {
        test('should calculate comparison correctly', () => {
            const result = builder.buildComparison(1000, 800, 'Revenue');

            expect(result.current).toBe(1000);
            expect(result.previous).toBe(800);
            expect(result.absoluteChange).toBe(200);
            expect(result.percentageChange).toBe(25);
            expect(result.direction).toBe('INCREASE');
            expect(result.label).toBe('Revenue');
        });

        test('should handle decrease correctly', () => {
            const result = builder.buildComparison(600, 800, 'Revenue');

            expect(result.absoluteChange).toBe(-200);
            expect(result.percentageChange).toBe(-25);
            expect(result.direction).toBe('DECREASE');
        });

        test('should handle no change correctly', () => {
            const result = builder.buildComparison(800, 800, 'Revenue');

            expect(result.absoluteChange).toBe(0);
            expect(result.percentageChange).toBe(0);
            expect(result.direction).toBe('NO_CHANGE');
        });

        test('should handle previous value of zero', () => {
            const result = builder.buildComparison(1000, 0, 'Revenue');

            expect(result.percentageChange).toBe(null);
            expect(result.direction).toBe('INCREASE');
        });
    });

    describe('buildSummaryCard()', () => {
        test('should build a summary card with currency formatting', () => {
            const result = builder.buildSummaryCard({
                title: 'Revenue',
                value: 1000000,
                format: 'currency',
            });

            expect(result.title).toBe('Revenue');
            expect(result.formattedValue).toBe('₦1,000,000');
        });

        test('should build a summary card with percentage formatting', () => {
            const result = builder.buildSummaryCard({
                title: 'Margin',
                value: 25.5,
                format: 'percentage',
            });

            expect(result.formattedValue).toBe('25.5%');
        });

        test('should include change when previousValue provided', () => {
            const result = builder.buildSummaryCard({
                title: 'Revenue',
                value: 1000,
                previousValue: 800,
                format: 'currency',
            });

            expect(result.change).toBeDefined();
            expect(result.change.absolute).toBe(200);
            expect(result.change.percentage).toBe(25);
            expect(result.change.direction).toBe('INCREASE');
        });
    });
});