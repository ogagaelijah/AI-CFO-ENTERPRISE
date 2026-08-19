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

    async execute({ customerId, businessId, limit = 20 }) {
        if (!customerId) {
            throw new Error('Customer ID is required');
        }

        const customer = await this.customerRepository.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        if (customer.businessId !== businessId) {
            throw new Error('Access denied: Customer does not belong to this business');
        }

        // ✅ FIX: Use findByUserId instead of findByBusinessId
        let sales = [];
        let debtors = [];

        try {
            // Get all sales for this business (using user_id, not business_id)
            // SaleRepository uses findByUserId(userId) or findByUser(userId)
            if (this.saleRepository.findByUserId) {
                // If SaleRepository has findByUserId, use it
                // But we need to get the user_id from the business
                // Since we don't have user_id, we need to find sales by customer name
                const allSales = await this.saleRepository.findByUserId(businessId);
                sales = allSales.filter(s => 
                    s.customer_name && s.customer_name.toLowerCase() === customer.name.toLowerCase()
                );
            } else if (this.saleRepository.findAll) {
                // Fallback to findAll
                const allSales = await this.saleRepository.findAll();
                sales = allSales.filter(s => 
                    s.customer_name && s.customer_name.toLowerCase() === customer.name.toLowerCase()
                );
            } else {
                // If no method exists, create a simple query
                // Use the database connection directly if available
                console.warn('⚠️ SaleRepository has no findByUserId or findAll method');
                sales = [];
            }
        } catch (error) {
            console.error('Error fetching sales:', error.message);
            sales = [];
        }

        try {
            // Get all debtors for this customer
            if (this.debtorRepository.findByCustomerName) {
                debtors = await this.debtorRepository.findByCustomerName(businessId, customer.name);
            } else if (this.debtorRepository.findByUserId) {
                const allDebtors = await this.debtorRepository.findByUserId(businessId);
                debtors = allDebtors.filter(d => 
                    d.customer_name && d.customer_name.toLowerCase() === customer.name.toLowerCase()
                );
            } else {
                debtors = [];
            }
        } catch (error) {
            console.error('Error fetching debtors:', error.message);
            debtors = [];
        }

        // Calculate totals
        const totalSales = sales.length;
        const totalAmount = sales.reduce((sum, s) => sum + (s.total_price || s.totalAmount || 0), 0);
        const totalPaid = sales
            .filter(s => (s.payment_status || s.paymentStatus) === 'PAID')
            .reduce((sum, s) => sum + (s.total_price || s.totalAmount || 0), 0);
        const totalUnpaid = sales
            .filter(s => (s.payment_status || s.paymentStatus) === 'UNPAID' || (s.payment_status || s.paymentStatus) === 'PARTIAL')
            .reduce((sum, s) => sum + (s.total_price || s.totalAmount || 0), 0);

        const outstandingDebt = debtors
            .filter(d => (d.status || d.status) !== 'PAID')
            .reduce((sum, d) => sum + (d.balance_remaining || d.balanceRemaining || 0), 0);

        const overdueDebt = debtors
            .filter(d => {
                const isOverdue = d.status === 'OVERDUE' || (d.due_date && new Date(d.due_date) < new Date());
                return isOverdue && (d.balance_remaining || d.balanceRemaining || 0) > 0;
            })
            .reduce((sum, d) => sum + (d.balance_remaining || d.balanceRemaining || 0), 0);

        // Sort sales by date (most recent first)
        const sortedSales = sales
            .sort((a, b) => {
                const dateA = a.sale_date || a.saleDate || new Date(0);
                const dateB = b.sale_date || b.saleDate || new Date(0);
                return new Date(dateB) - new Date(dateA);
            })
            .slice(0, limit);

        return {
            success: true,
            customer: customer.toJSON ? customer.toJSON() : customer,
            summary: {
                totalSales,
                totalAmount,
                totalPaid,
                totalUnpaid,
                outstandingDebt,
                overdueDebt,
                averageSaleValue: totalSales > 0 ? totalAmount / totalSales : 0,
            },
            recentSales: sortedSales.map(s => ({
                id: s.id,
                itemName: s.item_name || s.itemName,
                quantity: s.quantity,
                unitPrice: s.unit_price || s.unitPrice,
                totalAmount: s.total_price || s.totalAmount,
                saleDate: s.sale_date || s.saleDate,
                paymentStatus: s.payment_status || s.paymentStatus,
                customerName: s.customer_name || s.customerName,
            })),
            debtors: debtors.map(d => ({
                id: d.id,
                customerName: d.customer_name || d.customerName,
                totalOwed: d.total_owed || d.totalOwed,
                amountPaid: d.amount_paid || d.amountPaid,
                balanceRemaining: d.balance_remaining || d.balanceRemaining,
                status: d.status,
                dueDate: d.due_date || d.dueDate,
            })),
        };
    }
}

module.exports = GetCustomerHistoryUseCase;