// src/application/useCases/sales/RecordSaleUseCase.js

class RecordSaleUseCase {
    constructor(saleRepository, inventoryRepository, debtorRepository, customerRepository = null) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.customerRepository = customerRepository; // ✅ Added for customer linking
    }

    async execute({
        userId,
        itemName,
        quantity,
        unitPrice,
        customerName,
        customerId = null, // ✅ New: Optional customer ID
        paymentStatus,
        amountPaid,
        skipInventory = false,
        inventoryId = null,
        businessId = null, // ✅ New: Required for customer linking
    }) {
        const totalPrice = quantity * unitPrice;
        let balanceRemaining = 0;

        // Calculate balance based on payment status
        if (paymentStatus === 'PAID') {
            balanceRemaining = 0;
        } else if (paymentStatus === 'PARTIAL') {
            balanceRemaining = totalPrice - amountPaid;
        } else {
            // UNPAID
            balanceRemaining = totalPrice;
        }

        // ✅ Find or create customer for analytics
        let finalCustomerId = customerId;
        let finalCustomerType = 'CUSTOMER';

        if (customerName && businessId) {
            // Try to find existing customer by name
            let customer = null;
            if (this.customerRepository) {
                // Try to find by exact name
                const existingCustomers = await this.customerRepository.findByBusinessId(businessId, { search: customerName, limit: 1 });
                if (existingCustomers && existingCustomers.length > 0) {
                    customer = existingCustomers[0];
                }

                // If not found, create new customer
                if (!customer) {
                    try {
                        const Customer = require('../../../domain/entities/Customer');
                        const newCustomer = new Customer({
                            businessId: businessId,
                            name: customerName,
                            type: 'CUSTOMER',
                        });
                        customer = await this.customerRepository.create(newCustomer);
                        console.log(`✅ Created new customer: ${customerName} (ID: ${customer.id})`);
                    } catch (error) {
                        console.error('Failed to create customer:', error.message);
                    }
                }
            }

            if (customer) {
                finalCustomerId = customer.id;
                finalCustomerType = customer.type || 'CUSTOMER';
            }
        }

        // Save the sale with customer linking
        const sale = await this.saleRepository.create({
            user_id: userId,
            item_name: itemName,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            customer_name: customerName,
            customer_id: finalCustomerId, // ✅ New: Link to customer table
            customer_type: finalCustomerType, // ✅ New: Customer type
            payment_status: paymentStatus,
            amount_paid: amountPaid || 0,
            balance_remaining: balanceRemaining,
            business_id: businessId, // ✅ New: Link to business
        });

        // Update inventory (if not skipped)
        if (!skipInventory && inventoryId) {
            await this.inventoryRepository.reduceStock(inventoryId, quantity);
        }

        // Create debtor if not fully paid and customer exists
        if (paymentStatus !== 'PAID' && customerName && balanceRemaining > 0) {
            // Check if debtor already exists
            const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
            const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);

            if (existingDebtor) {
                await this.debtorRepository.update(existingDebtor.id, {
                    total_owed: existingDebtor.total_owed + balanceRemaining,
                    balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                    status: 'ACTIVE',
                });
            } else {
                await this.debtorRepository.create({
                    user_id: userId,
                    customer_name: customerName,
                    customer_id: finalCustomerId, // ✅ Link debtor to customer
                    total_owed: balanceRemaining,
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                });
            }
        }

        return {
            ...sale,
            customerId: finalCustomerId,
            customerType: finalCustomerType,
        };
    }
}

module.exports = RecordSaleUseCase;