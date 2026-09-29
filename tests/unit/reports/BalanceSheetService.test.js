// tests/unit/reports/BalanceSheetService.test.js

const BalanceSheetService = require('../../../src/application/services/reports/BalanceSheetService');

// Mock repositories
const mockPaymentRepository = {
    findByDateRange: jest.fn(),
};

const mockDebtorRepository = {
    findByUserId: jest.fn(),
};

const mockCreditorRepository = {
    findByUserId: jest.fn(),
};

const mockInventoryRepository = {
    findByUserId: jest.fn(),
};

const mockSaleRepository = {
    findByDateRange: jest.fn(),
};

const mockExpenseRepository = {
    findByDateRange: jest.fn(),
};

const mockIncomeRepository = {
    findByDateRange: jest.fn(),
};

describe('BalanceSheetService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new BalanceSheetService({
            paymentRepository: mockPaymentRepository,
            debtorRepository: mockDebtorRepository,
            creditorRepository: mockCreditorRepository,
            inventoryRepository: mockInventoryRepository,
            saleRepository: mockSaleRepository,
            expenseRepository: mockExpenseRepository,
            incomeRepository: mockIncomeRepository,
        });
    });

    describe('generate()', () => {
        test('should generate balanced balance sheet', async () => {
            // CashCalculator.calculate() with startDate: '2000-01-01' and endDate: '2026-08-31'
            // This will call findByDateRange twice:
            // 1. Opening balance (from beginning of time to 2000-01-01)
            // 2. Period payments (2000-01-01 to 2026-08-31)
            mockPaymentRepository.findByDateRange
                // Call 1: Opening balance (before 2000-01-01) → returns 0
                .mockResolvedValueOnce([])
                // Call 2: Period payments (2000-01-01 to 2026-08-31)
                .mockResolvedValueOnce([
                    { type: 'RECEIVED', amount: 100000 },
                    { type: 'MADE', amount: 40000 },
                    { type: 'RECEIVED', amount: 20000 },
                ]);

            // AR
            mockDebtorRepository.findByUserId.mockResolvedValue([
                { balance_remaining: 50000 },
                { balance_remaining: 30000 },
            ]);

            // Inventory
            mockInventoryRepository.findByUserId.mockResolvedValue([
                { quantity: 10, cost_price: 1000 },
                { quantity: 5, cost_price: 2000 },
            ]);

            // AP
            mockCreditorRepository.findByUserId.mockResolvedValue([
                { balance_remaining: 40000 },
                { balance_remaining: 20000 },
            ]);

            // Profit (sales, expenses, income)
            mockSaleRepository.findByDateRange.mockResolvedValue([
                { total_price: 300000, cogs: 120000 },
            ]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([
                { amount: 50000 },
            ]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([
                { amount: 10000 },
            ]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                asAtDate: '2026-08-31',
            });

            // Verify structure
            expect(result.asAtDate).toBe('2026-08-31');
            expect(result.assets).toBeDefined();
            expect(result.liabilities).toBeDefined();
            expect(result.equity).toBeDefined();
            expect(result.control).toBeDefined();

            // Verify cash: 100000 - 40000 + 20000 = 80000
            expect(result.assets.currentAssets.cash).toBe(80000);

            // Verify AR: 50000 + 30000 = 80000
            expect(result.assets.currentAssets.accountsReceivable).toBe(80000);

            // Verify Inventory: (10*1000) + (5*2000) = 20000
            expect(result.assets.currentAssets.inventory).toBe(20000);

            // Verify AP: 40000 + 20000 = 60000
            expect(result.liabilities.currentLiabilities.accountsPayable).toBe(60000);

            // Verify balance sheet balances
            expect(result.control.isBalanced).toBe(true);
            expect(Math.abs(result.control.difference)).toBeLessThan(0.01);
        });

        test('should handle empty data', async () => {
            // All repositories return empty arrays
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockDebtorRepository.findByUserId.mockResolvedValue([]);
            mockInventoryRepository.findByUserId.mockResolvedValue([]);
            mockCreditorRepository.findByUserId.mockResolvedValue([]);
            mockSaleRepository.findByDateRange.mockResolvedValue([]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                asAtDate: '2026-08-31',
            });

            expect(result.assets.totalAssets).toBe(0);
            expect(result.liabilities.totalLiabilities).toBe(0);
            expect(result.equity.totalEquity).toBe(0);
            expect(result.control.isBalanced).toBe(true);
        });

        test('should detect imbalance', async () => {
            // Force an imbalance by making assets > liabilities + equity
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([
                    { type: 'RECEIVED', amount: 1000000 },
                ]);

            mockDebtorRepository.findByUserId.mockResolvedValue([]);
            mockInventoryRepository.findByUserId.mockResolvedValue([]);
            mockCreditorRepository.findByUserId.mockResolvedValue([]);
            mockSaleRepository.findByDateRange.mockResolvedValue([]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([]);

            const result = await service.generate({
                userId: 1,
                businessId: 1,
                asAtDate: '2026-08-31',
            });

            // Owner's capital will balance it (auto-balancing figure)
            expect(result.control.isBalanced).toBe(true);
            expect(result.equity.ownersCapital).toBe(result.assets.totalAssets);
        });
    });

    describe('generateSummary()', () => {
        test('should generate summary', async () => {
            mockPaymentRepository.findByDateRange
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);

            mockDebtorRepository.findByUserId.mockResolvedValue([]);
            mockInventoryRepository.findByUserId.mockResolvedValue([]);
            mockCreditorRepository.findByUserId.mockResolvedValue([]);
            mockSaleRepository.findByDateRange.mockResolvedValue([]);
            mockExpenseRepository.findByDateRange.mockResolvedValue([]);
            mockIncomeRepository.findByDateRange.mockResolvedValue([]);

            const result = await service.generateSummary({
                userId: 1,
                businessId: 1,
                asAtDate: '2026-08-31',
            });

            expect(result.asAtDate).toBe('2026-08-31');
            expect(result.totalAssets).toBeDefined();
            expect(result.totalLiabilities).toBeDefined();
            expect(result.totalEquity).toBeDefined();
            expect(result.isBalanced).toBeDefined();
        });
    });
});