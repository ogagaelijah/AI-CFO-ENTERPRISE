// src/application/useCases/purchases/GetPurchaseSummaryUseCase.js

class GetPurchaseSummaryUseCase {
    constructor({ purchaseRepository }) {
        this.purchaseRepository = purchaseRepository;
    }

    async execute({ businessId, period = 'month' }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Determine date range based on period
        const now = new Date();
        let startDate, endDate;

        switch (period) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
        }

        const purchases = await this.purchaseRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        const totalPurchases = purchases.length;
        const totalAmount = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
        const totalPaid = purchases
            .filter(p => p.paymentStatus === 'PAID')
            .reduce((sum, p) => sum + p.totalAmount, 0);
        const totalUnpaid = purchases
            .filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL')
            .reduce((sum, p) => sum + p.totalAmount, 0);

        // Payment status breakdown
        const statusBreakdown = {
            paid: purchases.filter(p => p.paymentStatus === 'PAID').length,
            partial: purchases.filter(p => p.paymentStatus === 'PARTIAL').length,
            unpaid: purchases.filter(p => p.paymentStatus === 'UNPAID').length,
        };

        return {
            period,
            startDate,
            endDate,
            totalPurchases,
            totalAmount,
            totalPaid,
            totalUnpaid,
            averagePurchaseValue: totalPurchases > 0 ? totalAmount / totalPurchases : 0,
            statusBreakdown,
            purchases: purchases.map(p => p.toJSON()),
        };
    }
}

module.exports = GetPurchaseSummaryUseCase;