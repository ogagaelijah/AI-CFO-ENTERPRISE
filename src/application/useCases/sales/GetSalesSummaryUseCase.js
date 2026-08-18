// src/application/useCases/sales/GetSalesSummaryUseCase.js

class GetSalesSummaryUseCase {
    constructor({ saleRepository, transactionRepository }) {
        this.saleRepository = saleRepository;
        this.transactionRepository = transactionRepository;
    }

    async execute({ businessId, period = 'today' }) {
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
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
        }

        // Get sales in date range
        const sales = await this.saleRepository.findByDateRange(
            businessId,
            startDate,
            endDate
        );

        // Get transactions linked to sales
        const transactionIds = sales.map(s => s.transactionId).filter(id => id);
        let transactions = [];
        if (transactionIds.length > 0) {
            transactions = await this.transactionRepository.findByIds(transactionIds);
        }

        const totalSales = sales.length;
        const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = sales
            .filter(s => s.paymentStatus === 'PAID')
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalUnpaid = sales
            .filter(s => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL')
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalDiscount = sales.reduce((sum, sale) => sum + (sale.discount || 0), 0);
        const totalTax = sales.reduce((sum, sale) => sum + (sale.tax || 0), 0);

        // Payment status breakdown
        const statusBreakdown = {
            paid: sales.filter(s => s.paymentStatus === 'PAID').length,
            partial: sales.filter(s => s.paymentStatus === 'PARTIAL').length,
            unpaid: sales.filter(s => s.paymentStatus === 'UNPAID').length,
        };

        return {
            period,
            startDate,
            endDate,
            totalSales,
            totalAmount,
            totalPaid,
            totalUnpaid,
            totalDiscount,
            totalTax,
            averageSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
            statusBreakdown,
            sales: sales.map(s => s.toJSON()),
        };
    }
}

module.exports = GetSalesSummaryUseCase;