// tests/unit/reports/calculators/APCalculator.test.js

const APCalculator = require('../../../../src/application/services/reports/calculators/APCalculator');

const mockCreditorRepository = {
    findByUserId: jest.fn(),
};

describe('APCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new APCalculator({
            creditorRepository: mockCreditorRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate AP correctly with creditor data', async () => {
            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-15' },
                { supplier_name: 'Supplier B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-10' },
                { supplier_name: 'Supplier C', balance_remaining: 0, total_owed: 20000, amount_paid: 20000, status: 'PAID', due_date: '2026-07-01' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.totalOutstanding).toBe(80000);
            expect(result.activeCount).toBe(2);
            expect(result.totalCreditors).toBe(3);
            expect(result.averageBalance).toBe(40000);
        });

        test('should calculate overdue correctly', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 20);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: pastDateStr },
                { supplier_name: 'Supplier B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'OVERDUE', due_date: '2026-07-01' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.overdueAmount).toBe(80000);
            expect(result.overdueCount).toBe(2);
        });

        test('should include aging when requested', async () => {
            // Due date in the future so it's current
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
                { supplier_name: 'Supplier B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                includeAging: true,
            });

            expect(result.aging).toBeDefined();
            expect(result.aging.current).toBe(80000); // Both creditors are current
            expect(result.aging.total).toBe(80000);
        });

        test('should include details when requested', async () => {
            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-15' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.details).toBeDefined();
            expect(result.details.length).toBe(1);
            expect(result.details[0].supplierName).toBe('Supplier A');
            expect(result.details[0].balanceRemaining).toBe(50000);
        });

        test('should handle empty creditors', async () => {
            mockCreditorRepository.findByUserId.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.totalOutstanding).toBe(0);
            expect(result.activeCount).toBe(0);
            expect(result.totalCreditors).toBe(0);
            expect(result.averageBalance).toBe(0);
        });
    });
});