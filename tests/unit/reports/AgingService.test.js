// tests/unit/reports/AgingService.test.js

const AgingService = require('../../../src/application/services/reports/AgingService');

// Mock repositories
const mockDebtorRepository = {
    findByUserId: jest.fn(),
};

const mockCreditorRepository = {
    findByUserId: jest.fn(),
};

describe('AgingService', () => {
    let service;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new AgingService({
            debtorRepository: mockDebtorRepository,
            creditorRepository: mockCreditorRepository,
        });
    });

    describe('generateAR()', () => {
        test('should generate AR aging report correctly', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 45);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
                { customer_name: 'Customer B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: pastDateStr },
                { customer_name: 'Customer C', balance_remaining: 0, total_owed: 20000, amount_paid: 20000, status: 'PAID', due_date: '2026-07-01' },
            ]);

            const result = await service.generateAR({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.reportType).toBe('ar_aging');
            expect(result.data.summary.totalOutstanding).toBe(80000);
            expect(result.data.summary.activeCount).toBe(2);
            expect(result.data.details).toBeDefined();
            expect(result.data.details.length).toBe(2);
        });

        test('should handle no debtors', async () => {
            mockDebtorRepository.findByUserId.mockResolvedValue([]);

            const result = await service.generateAR({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.summary.totalOutstanding).toBe(0);
            expect(result.data.summary.activeCount).toBe(0);
            expect(result.data.details).toBeNull();
        });

        test('should return error for invalid inputs', async () => {
            const result = await service.generateAR({
                userId: null,
                businessId: 1,
            });

            expect(result.status).toBe('ERROR');
            expect(result.errors).toBeDefined();
        });
    });

    describe('generateAP()', () => {
        test('should generate AP aging report correctly', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const futureDateStr = futureDate.toISOString().split('T')[0];

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 45);
            const pastDateStr = pastDate.toISOString().split('T')[0];

            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: futureDateStr },
                { supplier_name: 'Supplier B', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: pastDateStr },
                { supplier_name: 'Supplier C', balance_remaining: 0, total_owed: 20000, amount_paid: 20000, status: 'PAID', due_date: '2026-07-01' },
            ]);

            const result = await service.generateAP({
                userId: 1,
                businessId: 1,
                includeDetails: true,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.reportType).toBe('ap_aging');
            expect(result.data.summary.totalOutstanding).toBe(80000);
            expect(result.data.summary.activeCount).toBe(2);
            expect(result.data.details).toBeDefined();
            expect(result.data.details.length).toBe(2);
        });

        test('should handle no creditors', async () => {
            mockCreditorRepository.findByUserId.mockResolvedValue([]);

            const result = await service.generateAP({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.data.summary.totalOutstanding).toBe(0);
            expect(result.data.summary.activeCount).toBe(0);
            expect(result.data.details).toBeNull();
        });
    });

    describe('generateBoth()', () => {
        test('should generate both AR and AP aging reports', async () => {
            mockDebtorRepository.findByUserId.mockResolvedValue([
                { customer_name: 'Customer A', balance_remaining: 50000, total_owed: 50000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-30' },
            ]);

            mockCreditorRepository.findByUserId.mockResolvedValue([
                { supplier_name: 'Supplier A', balance_remaining: 30000, total_owed: 30000, amount_paid: 0, status: 'ACTIVE', due_date: '2026-08-30' },
            ]);

            const result = await service.generateBoth({
                userId: 1,
                businessId: 1,
            });

            expect(result.status).toBe('SUCCESS');
            expect(result.reportType).toBe('aging_both');
            expect(result.data.accountsReceivable).toBeDefined();
            expect(result.data.accountsPayable).toBeDefined();
            expect(result.data.accountsReceivable.summary.totalOutstanding).toBe(50000);
            expect(result.data.accountsPayable.summary.totalOutstanding).toBe(30000);
        });
    });

    describe('_calculateDaysOverdue()', () => {
        test('should return 0 for future date', () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 10);
            const result = service._calculateDaysOverdue(futureDate.toISOString().split('T')[0]);
            expect(result).toBe(0);
        });

        test('should return correct days for past date', () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 15);
            const result = service._calculateDaysOverdue(pastDate.toISOString().split('T')[0]);
            expect(result).toBe(15);
        });
    });

    describe('_getBucket()', () => {
        test('should return correct bucket for days', () => {
            expect(service._getBucket(0)).toBe('current');
            expect(service._getBucket(15)).toBe('1-30');
            expect(service._getBucket(45)).toBe('31-60');
            expect(service._getBucket(75)).toBe('61-90');
            expect(service._getBucket(100)).toBe('90+');
        });
    });
});