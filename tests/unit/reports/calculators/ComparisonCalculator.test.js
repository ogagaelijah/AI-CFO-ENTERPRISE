// tests/unit/reports/calculators/ComparisonCalculator.test.js

const ComparisonCalculator = require('../../../../src/application/services/reports/calculators/ComparisonCalculator');

describe('ComparisonCalculator', () => {
    let calculator;

    beforeEach(() => {
        calculator = new ComparisonCalculator();
    });

    describe('compareValues()', () => {
        test('should calculate increase correctly', () => {
            const result = calculator.compareValues(1000, 800, 'Revenue');

            expect(result.current).toBe(1000);
            expect(result.previous).toBe(800);
            expect(result.absoluteChange).toBe(200);
            expect(result.percentageChange).toBe(25);
            expect(result.direction).toBe('INCREASE');
            expect(result.label).toBe('Revenue');
        });

        test('should calculate decrease correctly', () => {
            const result = calculator.compareValues(600, 800, 'Revenue');

            expect(result.absoluteChange).toBe(-200);
            expect(result.percentageChange).toBe(-25);
            expect(result.direction).toBe('DECREASE');
        });

        test('should handle no change', () => {
            const result = calculator.compareValues(800, 800, 'Revenue');

            expect(result.absoluteChange).toBe(0);
            expect(result.percentageChange).toBe(0);
            expect(result.direction).toBe('NO_CHANGE');
        });

        test('should handle previous value of zero', () => {
            const result = calculator.compareValues(1000, 0, 'Revenue');

            expect(result.percentageChange).toBe(null);
            expect(result.direction).toBe('INCREASE');
        });
    });

    describe('compareMetrics()', () => {
        test('should compare multiple metrics', () => {
            const current = { revenue: 1000, profit: 200, margin: 20 };
            const previous = { revenue: 800, profit: 150, margin: 18.75 };
            const metrics = ['revenue', 'profit', 'margin'];

            const result = calculator.compareMetrics(current, previous, metrics);

            expect(result.revenue.direction).toBe('INCREASE');
            expect(result.profit.direction).toBe('INCREASE');
            expect(result.margin.direction).toBe('INCREASE');
            expect(result.revenue.percentageChange).toBe(25);
        });
    });

    describe('summarizeComparisons()', () => {
        test('should summarize multiple comparisons', () => {
            const current = { revenue: 1000, profit: 200, margin: 20, expenses: 800 };
            const previous = { revenue: 800, profit: 150, margin: 18.75, expenses: 650 };
            const metrics = ['revenue', 'profit', 'margin', 'expenses'];
            const comparisons = calculator.compareMetrics(current, previous, metrics);
            const summary = calculator.summarizeComparisons(comparisons);

            expect(summary.totalMetrics).toBe(4);
            // All metrics increased (expenses increased from 650 to 800)
            // The comparison method just compares numbers, it doesn't know if expense increase is good or bad
            expect(summary.increased).toBe(4);
            expect(summary.decreased).toBe(0);
            expect(summary.unchanged).toBe(0);
            expect(summary.largestIncrease).not.toBeNull();
            expect(summary.largestDecrease).toBeNull();
        });

        test('should handle all metrics unchanged', () => {
            const current = { revenue: 1000, profit: 200 };
            const previous = { revenue: 1000, profit: 200 };
            const metrics = ['revenue', 'profit'];
            const comparisons = calculator.compareMetrics(current, previous, metrics);
            const summary = calculator.summarizeComparisons(comparisons);

            expect(summary.totalMetrics).toBe(2);
            expect(summary.increased).toBe(0);
            expect(summary.decreased).toBe(0);
            expect(summary.unchanged).toBe(2);
        });

        test('should handle all metrics decreased', () => {
            const current = { revenue: 600, profit: 100 };
            const previous = { revenue: 800, profit: 150 };
            const metrics = ['revenue', 'profit'];
            const comparisons = calculator.compareMetrics(current, previous, metrics);
            const summary = calculator.summarizeComparisons(comparisons);

            expect(summary.totalMetrics).toBe(2);
            expect(summary.increased).toBe(0);
            expect(summary.decreased).toBe(2);
            expect(summary.unchanged).toBe(0);
        });

        test('should handle mixed metrics', () => {
            const current = { revenue: 1000, profit: 200, expenses: 800 };
            const previous = { revenue: 800, profit: 250, expenses: 650 };
            const metrics = ['revenue', 'profit', 'expenses'];
            const comparisons = calculator.compareMetrics(current, previous, metrics);
            const summary = calculator.summarizeComparisons(comparisons);

            expect(summary.totalMetrics).toBe(3);
            expect(summary.increased).toBe(2); // revenue increased, expenses increased
            expect(summary.decreased).toBe(1); // profit decreased
            expect(summary.unchanged).toBe(0);
        });
    });

    describe('calculateGrowth()', () => {
        test('should calculate growth over multiple periods', () => {
            const values = [100, 120, 150, 180];
            const labels = ['Jan', 'Feb', 'Mar', 'Apr'];

            const result = calculator.calculateGrowth(values, labels);

            expect(result.totalGrowth).toBe(80);
            expect(result.averageGrowth).toBeCloseTo(21.67, 1);
            expect(result.periods.length).toBe(3);
            expect(result.periods[0].growth).toBe(20);
            expect(result.firstValue).toBe(100);
            expect(result.lastValue).toBe(180);
        });

        test('should handle single period', () => {
            const values = [100];
            const labels = ['Jan'];

            const result = calculator.calculateGrowth(values, labels);

            expect(result.totalGrowth).toBe(0);
            expect(result.averageGrowth).toBe(0);
            expect(result.periods.length).toBe(1);
            expect(result.periods[0].growth).toBe(null);
        });
    });

    describe('comparePeriods()', () => {
        test('should compare two periods with rich context', () => {
            const current = { revenue: 1000, profit: 200, margin: 20 };
            const previous = { revenue: 800, profit: 150, margin: 18.75 };
            const metrics = ['revenue', 'profit', 'margin'];

            const result = calculator.comparePeriods(current, previous, metrics);

            expect(result.comparisons).toBeDefined();
            expect(result.summary).toBeDefined();
            expect(result.currentPeriod).toEqual(current);
            expect(result.previousPeriod).toEqual(previous);
            expect(result.comparisons.revenue.direction).toBe('INCREASE');
        });
    });
});