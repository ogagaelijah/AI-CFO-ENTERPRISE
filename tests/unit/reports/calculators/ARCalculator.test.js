// tests/unit/reports/calculators/ARCalculator.test.js

const ARCalculator = require('../../../../src/application/services/reports/calculators/ARCalculator');

const mockDebtorRepository = {
    findByUserId: jest.fn(),
};

describe('ARCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new ARCalculator({
            debtorRepository: mockDebtorRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate AR correctly with debtor data', async () => {
            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-15' },
                { customer_name: 'Customer B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-10' },
                { customer_name: 'Customer C', balance_remaining: 0, total_owed: 20000, amount_paid: 20000, status: 'PAID', due_date: '2026-07-01' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.totalOutstanding).toBe(80000);
            expect(result.activeCount).toBe(2);
            expect(result.totalDebtors).toBe(3);
            expect(result.averageBalance).toBe(40000);
        });

        test('should calculate overdue correctly', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 20);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: pastDateStr },
                { customer_name: 'Customer B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'OVERDUE', due_date: '2026-07-01' },
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

            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
                { customer_name: 'Customer B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                includeAging: true,
            });

            expect(result.aging).toBeDefined();
            expect(result.aging.current).toBe(80000); // Both debtors are current
            expect(result.aging.total).toBe(80000);
        });

        test('should include details when requested', async () => {
            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-15' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.details).toBeDefined();
            expect(result.details.length).toBe(1);
            expect(result.details[0].customerName).toBe('Customer A');
            expect(result.details[0].balanceRemaining).toBe(50000);
        });

        test('should handle empty debtors', async () => {
            mockDebtorRepository.findByUserId.mockResolvedValue([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
            });

            expect(result.totalOutstanding).toBe(0);
            expect(result.activeCount).toBe(0);
            expect(result.totalDebtors).toBe(0);
            expect(result.averageBalance).toBe(0);
        });
    });
});