// src/application/useCases/customers/GetCustomerHistoryUseCase.js

class GetCustomerHistoryUseCase {
    constructor({
        customerRepository,
        saleRepository,
        debtorRepository,
    }) {
        this.customerRepository = customerRepository;
        this.saleRepository = saleRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({ customerId, businessId, limit = 50 }) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Verify business ownership
        if (customer.businessId !== businessId) {
            throw new Error('Access denied: Customer does not belong to this business');
        }

        // Get all sales for this customer
        const sales = await this.saleRepository.findByCustomerId(
            businessId,
            customerId,
            customer.type
        );

        // Get all debtors for this customer
        const debtors = await this.debtorRepository.findByCustomerId(
            businessId,
            customerId,
            customer.type
        );

        // Calculate totals
        const totalSales = sales.length;
        const totalAmount = sales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPaid = sales
            .filter(s => s.paymentStatus === 'PAID')
            .reduce((sum, s) => sum + s.totalAmount, 0);
        const totalUnpaid = sales
            .filter(s => s.paymentStatus === 'UNPAID' || s.paymentStatus === 'PARTIAL')
            .reduce((sum, s) => sum + s.totalAmount, 0);

        // Get outstanding debt
        const outstandingDebt = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        // Get overdue debt
        const overdueDebt = debtors
            .filter(d => d.isOverdue())
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        // Sort sales by date (most recent first)
        const sortedSales = sales
            .sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
            .slice(0, limit);

        return {
            success: true,
            customer: customer.toJSON(),
            summary: {
                totalSales,
                totalAmount,
                totalPaid,
                totalUnpaid,
                outstandingDebt,
                overdueDebt,
                averageSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
            },
            recentSales: sortedSales.map(s => s.toJSON()),
            debtors: debtors.map(d => d.toJSON()),
        };
    }
}

module.exports = GetCustomerHistoryUseCase;