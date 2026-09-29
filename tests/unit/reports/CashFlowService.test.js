// tests/unit/reports/CashFlowService.test.js

const CashFlowService = require('../../../src/application/services/reports/CashFlowService');

const mockPaymentRepository = {
    findByDateRange: jest.fn(),
};

describe('CashFlowService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CashFlowService({
            paymentRepository: mockPaymentRepository,
        });
    });

    describe('generate()', () => {
        test('should generate cash flow statement correctly', async () => {
            // CashCalculator calls findByDateRange twice:
            // 1. Opening balance (before startDate)
            // 2. Period payments (startDate to endDate)
            // Then CashFlowService calls findByDateRange once more for categorization:
            // 3. Period payments (startDate to endDate)
            // Total: 3 calls
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([   // Call 1: Opening balance
                    { type: 'RECEIVED', amount: 50000 },
                    { type: 'MADE', amount: 20000 },
                ])
                .mockResolvedValueOnce([   // Call 2: Period payments (CashCalculator)
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'RECEIVED', amount: 50000, referenceType: 'DEBTOR' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                    { type: 'MADE', amount: 20000, referenceType: 'EXPENSE' },
                ])
                .mockResolvedValueOnce([   // Call 3: Period payments (CashFlowService categorization)
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'RECEIVED', amount: 50000, referenceType: 'DEBTOR' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                    { type: 'MADE', amount: 20000, referenceType: 'EXPENSE' },
                ]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.period).toBeDefined();
            expect(result.period.startDate).toBe('2026-08-01');
            expect(result.period.endDate).toBe('2026-08-31');
            expect(result.openingCash).toBe(30000);
            // operatingIn: 100000 + 50000 = 150000
            // operatingOut: 40000 + 20000 = 60000
            // netOperatingCash: 150000 - 60000 = 90000
            expect(result.operatingActivities.netOperatingCash).toBe(90000);
            expect(result.closingCash).toBe(120000);
        });

        test('should handle no payments', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.openingCash).toBe(0);
            expect(result.operatingActivities.netOperatingCash).toBe(0);
            expect(result.closingCash).toBe(0);
        });
    });

    describe('generateSummary()', () => {
        test('should generate summary', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([   // Opening balance
                    { type: 'RECEIVED', amount: 50000 },
                ])
                .mockResolvedValueOnce([   // Period (CashCalculator)
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                ])
                .mockResolvedValueOnce([   // Period (CashFlowService categorization)
                    { type: 'RECEIVED', amount: 100000, referenceType: 'SALE' },
                    { type: 'MADE', amount: 40000, referenceType: 'PURCHASE' },
                ]);

            const result = await service.generateSummary({
                userId: 1,
                businessId: 1,
                startDate: '2026-08-01',
                endDate: '2026-08-31',
            });

            expect(result.netOperatingCash).toBe(60000);
            expect(result.openingCash).toBe(50000);
            expect(result.closingCash).toBe(110000);
        });
    });
});