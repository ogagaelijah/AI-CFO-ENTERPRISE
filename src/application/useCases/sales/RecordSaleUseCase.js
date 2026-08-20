// src/application/useCases/sales/RecordSaleUseCase.js

const Sale = require('../../../domain/entities/Sale');

class RecordSaleUseCase {
    constructor(saleRepository, inventoryRepository, debtorRepository, customerRepository = null) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.customerRepository = customerRepository;
    }

    async execute({
        userId,
        businessId,
        itemName,
        quantity,
        unitPrice,
        customerName,
        customerId = null,
        customerType = 'CUSTOMER',
        paymentStatus = 'UNPAID',
        amountPaid = 0,
        skipInventory = false,
        inventoryId = null,
        saleDate = new Date(),
    }) {
        // Validate input
        if (quantity <= 0) throw new Error('Quantity must be greater than 0');
        if (unitPrice < 0) throw new Error('Unit price cannot be negative');
        if (paymentStatus === 'PAID' && amountPaid <= 0) {
            amountPaid = quantity * unitPrice;
        }

        const totalPrice = quantity * unitPrice;
        const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalPrice - amountPaid;

        // Get cost data from inventory
        let unitCost = 0;
        let cogs = 0;
        let grossProfit = 0;
        let marginPercentage = 0;
        let finalInventoryId = inventoryId;
        let finalItemName = itemName;

        if (!skipInventory) {
            let inventoryItem = null;

            if (inventoryId) {
                inventoryItem = await this.inventoryRepository.findById(inventoryId);
            }

            if (!inventoryItem && itemName) {
                inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, itemName);
                if (inventoryItem) {
                    finalInventoryId = inventoryItem.id;
                    finalItemName = inventoryItem.item_name;
                }
            }

            if (inventoryItem) {
                unitCost = inventoryItem.cost_price || 0;
                cogs = quantity * unitCost;
                grossProfit = totalPrice - cogs;
                marginPercentage = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;
            }
        }

        // Find or create customer
        let finalCustomerId = customerId;
        let finalCustomerType = customerType;

        if (customerName && businessId && this.customerRepository) {
            let customer = null;

            const existingCustomers = await this.customerRepository.findByBusinessId(
                businessId,
                { search: customerName, limit: 1 }
            );

            if (existingCustomers && existingCustomers.length > 0) {
                customer = existingCustomers[0];
            }

            if (!customer) {
                try {
                    const Customer = require('../../../domain/entities/Customer');
                    const newCustomer = new Customer({
                        businessId: businessId,
                        name: customerName,
                        type: 'CUSTOMER',
                    });
                    customer = await this.customerRepository.create(newCustomer);
                } catch (error) {
                    console.error('Failed to create customer:', error.message);
                }
            }

            if (customer) {
                finalCustomerId = customer.id;
                finalCustomerType = customer.type || 'CUSTOMER';
            }
        }

        // Create Sale entity
        const sale = new Sale({
            userId,
            businessId,
            itemName: finalItemName,
            quantity,
            unitPrice,
            totalPrice,
            customerName,
            customerId: finalCustomerId,
            customerType: finalCustomerType,
            paymentStatus,
            amountPaid,
            balanceRemaining,
            saleDate,
            unitCost,
            cogs,
            grossProfit,
            marginPercentage,
        });

        // =============================================
        // Map fields to database column names
        // Ensure all values are SQLite-compatible
        // =============================================
        const saleData = sale.toJSON();
        
        // Format date as ISO string
        let formattedSaleDate = saleData.saleDate;
        if (formattedSaleDate instanceof Date) {
            formattedSaleDate = formattedSaleDate.toISOString();
        } else if (typeof formattedSaleDate === 'string') {
            // Already a string, keep it
        } else {
            formattedSaleDate = new Date().toISOString();
        }

        const dbReadyData = {
            user_id: saleData.userId,
            item_name: saleData.itemName,
            quantity: saleData.quantity,
            unit_price: saleData.unitPrice,
            total_price: saleData.totalPrice,
            customer_name: saleData.customerName || null,
            customer_id: saleData.customerId || null,
            customer_type: saleData.customerType || 'CUSTOMER',
            business_id: saleData.businessId || null,
            payment_status: saleData.paymentStatus || 'UNPAID',
            amount_paid: saleData.amountPaid || 0,
            balance_remaining: saleData.balanceRemaining || 0,
            sale_date: formattedSaleDate,
            unit_cost: saleData.unitCost || 0,
            cogs: saleData.cogs || 0,
            gross_profit: saleData.grossProfit || 0,
            margin_percentage: saleData.marginPercentage || 0,
        };

        // Debug: Log the data being saved
        console.log('📊 Saving sale with data:', dbReadyData);

        // Save to database
        const savedSale = await this.saleRepository.create(dbReadyData);

        // Update inventory (if not skipped)
        if (!skipInventory && finalInventoryId) {
            await this.inventoryRepository.reduceStock(finalInventoryId, quantity);
        }

        // Create debtor (if unpaid/partial)
        if (paymentStatus !== 'PAID' && customerName && balanceRemaining > 0) {
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
                    customer_id: finalCustomerId,
                    total_owed: balanceRemaining,
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                });
            }
        }

        return {
            success: true,
            sale: savedSale,
            customerId: finalCustomerId,
            customerType: finalCustomerType,
            unitCost,
            cogs,
            grossProfit,
            marginPercentage,
            inventoryRemaining: finalInventoryId ?
                (await this.inventoryRepository.findById(finalInventoryId))?.quantity : null,
        };
    }
}

module.exports = RecordSaleUseCase;