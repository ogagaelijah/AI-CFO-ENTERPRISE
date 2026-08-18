// src/application/useCases/customers/GetTopCustomersUseCase.js

class GetTopCustomersUseCase {
    constructor({ saleRepository, customerRepository }) {
        this.saleRepository = saleRepository;
        this.customerRepository = customerRepository;
    }

    async execute({
        businessId,
        limit = 10,
        period = 'month', // 'today', 'week', 'month', 'year', 'all'
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // Determine date range based on period
        const now = new Date();
        let startDate;

        switch (period) {
            case 'today':
                startDate = new Date(now);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                const day = now.getDay();
                startDate = new Date(now);
                startDate.setDate(now.getDate() - day);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all':
                startDate = null;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // Get all sales for this business
        let sales = await this.saleRepository.findByBusinessId(businessId);

        // Filter by date range if applicable
        if (startDate) {
            sales = sales.filter(s => new Date(s.saleDate) >= startDate);
        }

        // Group by customer
        const customerMap = {};
        for (const sale of sales) {
            const customerId = sale.customerId;
            if (!customerId) continue;

            if (!customerMap[customerId]) {
                customerMap[customerId] = {
                    customerId,
                    customerType: sale.customerType,
                    totalSales: 0,
                    totalAmount: 0,
                    transactionCount: 0,
                };
            }

            customerMap[customerId].totalSales += 1;
            customerMap[customerId].totalAmount += sale.totalAmount;
            customerMap[customerId].transactionCount += 1;
        }

        // Convert to array and sort by total amount
        const topCustomers = Object.values(customerMap)
            .sort((a, b) => b.totalAmount - a.totalAmount)
            .slice(0, limit);

        // Fetch customer details
        const customerDetails = [];
        for (const customer of topCustomers) {
            const customerData = await this.customerRepository.findById(customer.customerId);
            if (customerData) {
                customerDetails.push({
                    ...customer,
                    name: customerData.name,
                    phone: customerData.phone,
                    email: customerData.email,
                    type: customerData.type,
                });
            }
        }

        // Calculate total revenue for percentage
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalAmount, 0);

        return {
            success: true,
            period,
            topCustomers: customerDetails.map(c => ({
                ...c,
                percentage: totalRevenue > 0
                    ? ((c.totalAmount / totalRevenue) * 100).toFixed(1)
                    : 0,
            })),
            totalRevenue,
            totalCustomers: customerDetails.length,
        };
    }
}

module.exports = GetTopCustomersUseCase;