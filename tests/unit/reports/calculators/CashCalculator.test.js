// tests/unit/reports/calculators/CashCalculator.test.js

const CashCalculator = require('../../../../src/application/services/reports/calculators/CashCalculator');

const mockPaymentRepository = {
    findByDateRange: jest.fn(),
};

describe('CashCalculator', () => {
    let calculator;

    beforeEach(() => {
        jest.clearAllMocks();
        calculator = new CashCalculator({
            paymentRepository: mockPaymentRepository,
        });
    });

    describe('calculate()', () => {
        test('should calculate cash correctly with payment data', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([
                    { type: 'RECEIVED', amount: 50000 },
                    { type: 'MADE', amount: 20000 },
                ])
                .mockResolvedValueOnce([
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'RECEIVED', amount: 50000, referenceType: 'DEBTOR' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                    { type: 'MADE', amount: 20000, referenceType: 'EXPENSE' },
                ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.openingCash).toBe(30000);
            expect(result.cashIn).toBe(150000);
            expect(result.cashOut).toBe(60000);
            expect(result.netCashFlow).toBe(90000);
            expect(result.closingCash).toBe(120000);
            expect(result.paymentCount).toBe(4);
        });

        test('should handle no payments', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.openingCash).toBe(0);
            expect(result.cashIn).toBe(0);
            expect(result.cashOut).toBe(0);
            expect(result.netCashFlow).toBe(0);
            expect(result.closingCash).toBe(0);
        });

        test('should include details when requested', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                includeDetails: true,
            });

            expect(result.details).toBeDefined();
            expect(result.details.cashIn.length).toBe(1);
            expect(result.details.cashOut.length).toBe(1);
        });

        test('should use provided opening cash', async () => {
            mockPaymentRepository.findByDateRange.mockResolvedValueOnce([
                { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
            ]);

            const result = await calculator.calculate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
                openingCash: 50000,
            });

            expect(result.openingCash).toBe(50000);
            expect(result.cashIn).toBe(100000);
            expect(result.cashOut).toBe(40000);
            expect(result.netCashFlow).toBe(60000);
            expect(result.closingCash).toBe(110000);
        });
    });
});