const Sale = require('../../../domain/entities/Sale');

class RecordSaleUseCase {
    constructor(saleRepository, inventoryRepository, debtorRepository, customerRepository = null, paymentRepository = null) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.customerRepository = customerRepository;
        this.paymentRepository = paymentRepository; // <-- ADDED
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
        items = [],
        totalCost = 0,
        totalRevenue = 0,
        totalProfit = 0,
        notes = '',
    }) {
        if (items && items.length > 1) {
            return this._executeMultiItem({
                userId,
                businessId,
                items,
                customerName,
                customerId,
                customerType,
                paymentStatus,
                amountPaid,
                saleDate,
                skipInventory,
                totalCost,
                totalRevenue,
                totalProfit,
                notes,
            });
        }

        return this._executeSingleItem({
            userId,
            businessId,
            itemName: items.length === 1? items[0].name : itemName,
            quantity: items.length === 1? items[0].quantity : quantity,
            unitPrice: items.length === 1? items[0].sellingPrice : unitPrice,
            customerName,
            customerId,
            customerType,
            paymentStatus,
            amountPaid,
            skipInventory: items.length === 1? (items[0].skipInventory || skipInventory) : skipInventory,
            inventoryId: items.length === 1? items[0].inventoryId : inventoryId,
            saleDate,
            items: items,
            notes,
        });
    }

    // ✅ Multi-item execution
    async _executeMultiItem({
        userId,
        businessId,
        items,
        customerName,
        customerId,
        customerType,
        paymentStatus,
        amountPaid,
        saleDate,
        skipInventory,
        totalCost,
        totalRevenue,
        totalProfit,
        notes,
    }) {
        if (items.length === 0) throw new Error('At least one item is required');
        if (!customerName) throw new Error('Customer name is required');

        let finalCustomerId = customerId;
        let finalCustomerType = customerType;

        if (customerName && businessId && this.customerRepository) {
            let customer = null;
            const existingCustomers = await this.customerRepository.findByBusinessId(businessId, { search: customerName, limit: 1 });
            if (existingCustomers && existingCustomers.length > 0) {
                customer = existingCustomers[0];
            }
            if (!customer) {
                try {
                    const Customer = require('../../../domain/entities/Customer');
                    const newCustomer = new Customer({ businessId: businessId, name: customerName, type: 'CUSTOMER' });
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

        const processedItems = [];
        let totalCostValue = 0;
        let totalRevenueValue = 0;
        let totalProfitValue = 0;
        let totalQuantity = 0;
        let totalCogs = 0;
        const inventoryItemsToReduce = [];

        for (const item of items) {
            const qty = item.quantity || 1;
            const sellPrice = item.sellingPrice || item.unitPrice || 0;

            let unitCost = 0;
            let finalInventoryId = item.inventoryId || null;
            let finalItemName = item.name;

            if (!skipInventory) {
                let inventoryItem = null;
                if (item.inventoryId) {
                    inventoryItem = await this.inventoryRepository.findById(item.inventoryId);
                } else if (item.name) {
                    inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, item.name);
                    if (inventoryItem) {
                        finalInventoryId = inventoryItem.id;
                        finalItemName = inventoryItem.item_name;
                        unitCost = inventoryItem.cost_price || 0; // FREEZE cost
                    }
                }
                if (finalInventoryId && inventoryItem) {
                    if (inventoryItem.quantity < qty) {
                        throw new Error(`Insufficient stock for "${finalItemName}". Available: ${inventoryItem.quantity}, Requested: ${qty}`);
                    }
                    inventoryItemsToReduce.push({ id: finalInventoryId, quantity: qty });
                }
            }

            const itemTotalRevenue = qty * sellPrice;
            const itemCogs = qty * unitCost;
            const itemProfit = itemTotalRevenue - itemCogs;

            totalQuantity += qty;
            totalCostValue += itemCogs;
            totalRevenueValue += itemTotalRevenue;
            totalProfitValue += itemProfit;
            totalCogs += itemCogs;

            processedItems.push({
                name: finalItemName || item.name,
                quantity: qty,
                unitCost: unitCost,
                sellingPrice: sellPrice,
                inventoryId: finalInventoryId,
                total: itemTotalRevenue,
                cogs: itemCogs,
                profit: itemProfit,
            });
        }

        const marginPercentage = totalRevenueValue > 0? (totalProfitValue / totalRevenueValue) * 100 : 0;
        const itemNames = processedItems.map(i => i.name).join(', ');

        const sale = new Sale({
            userId, businessId, itemName: itemNames, quantity: totalQuantity, unitPrice: totalRevenueValue / totalQuantity,
            totalPrice: totalRevenueValue, customerName, customerId: finalCustomerId, customerType: finalCustomerType,
            paymentStatus, amountPaid: amountPaid || (paymentStatus === 'PAID'? totalRevenueValue : 0),
            balanceRemaining: paymentStatus === 'PAID'? 0 : totalRevenueValue - (amountPaid || 0),
            saleDate, unitCost: totalCostValue / totalQuantity, cogs: totalCostValue,
            grossProfit: totalProfitValue, marginPercentage: marginPercentage,
        });

        const saleData = sale.toJSON();
        const formattedSaleDate = saleData.saleDate instanceof Date? saleData.saleDate.toISOString() : new Date().toISOString();

        const dbReadyData = {
            user_id: saleData.userId, item_name: saleData.itemName, quantity: saleData.quantity, unit_price: saleData.unitPrice,
            total_price: saleData.totalPrice, customer_name: saleData.customerName || null, customer_id: saleData.customerId || null,
            customer_type: saleData.customerType || 'CUSTOMER', business_id: saleData.businessId || null,
            payment_status: saleData.paymentStatus || 'UNPAID', amount_paid: saleData.amountPaid || 0,
            balance_remaining: saleData.balanceRemaining || 0, sale_date: formattedSaleDate,
            unit_cost: saleData.unitCost || 0, cogs: saleData.cogs || 0, gross_profit: saleData.grossProfit || 0,
            margin_percentage: saleData.marginPercentage || 0, items: JSON.stringify(processedItems),
            invoice_no: `INV-${Date.now().toString().slice(-8)}`, notes: notes || '',
        };

        console.log('📊 Saving multi-item sale:', dbReadyData);

        // STEP 1: Save sale FIRST
        const savedSale = await this.saleRepository.create(dbReadyData);

        // STEP 2: Reduce inventory
        if (!skipInventory) {
            for (const inv of inventoryItemsToReduce) {
                await this.inventoryRepository.reduceStock(inv.id, inv.quantity);
            }
        }

        // STEP 3: CREATE PAYMENT RECORD <-- ADDED
        if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
            const paidAmount = amountPaid || (paymentStatus === 'PAID'? totalRevenueValue : 0);
            if (paidAmount > 0) {
                await this.paymentRepository.create({
                    businessId: businessId,
                    userId: userId,
                    type: 'RECEIVED',
                    amount: paidAmount,
                    paymentDate: new Date(formattedSaleDate),
                    referenceType: 'SALE',
                    referenceId: savedSale.id,
                    paymentMethod: 'CASH',
                    notes: `Payment for ${savedSale.invoice_no}`
                });
            }
        }

        // STEP 4: Create debtor if unpaid/partial
        const balanceRemaining = paymentStatus === 'PAID'? 0 : totalRevenueValue - (amountPaid || 0);
        if (paymentStatus!== 'PAID' && customerName && balanceRemaining > 0) {
            const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
            const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);
            const paidAmount = paymentStatus === 'PARTIAL'? (amountPaid || 0) : 0;
            if (existingDebtor) {
                await this.debtorRepository.update(existingDebtor.id, {
                    total_owed: existingDebtor.total_owed + balanceRemaining,
                    balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                    amount_paid: (existingDebtor.amount_paid || 0) + paidAmount, status: 'ACTIVE',
                });
            } else {
                await this.debtorRepository.create({
                    user_id: userId, customer_name: customerName, customer_id: finalCustomerId,
                    total_owed: balanceRemaining, balance_remaining: balanceRemaining, amount_paid: paidAmount,
                    status: 'ACTIVE', reference_type: 'SALE', reference_id: savedSale.id, notes: notes || '',
                });
            }
        }

        return {
            success: true, sale: savedSale, customerId: finalCustomerId, customerType: finalCustomerType,
            totalCost: totalCostValue, totalRevenue: totalRevenueValue, totalProfit: totalProfitValue, items: processedItems,
        };
    }

    // ✅ Single item execution
    async _executeSingleItem({
        userId, businessId, itemName, quantity, unitPrice, customerName, customerId, customerType,
        paymentStatus, amountPaid, skipInventory, inventoryId, saleDate, items = [], notes = '',
    }) {
        if (quantity <= 0) throw new Error('Quantity must be greater than 0');
        if (unitPrice < 0) throw new Error('Unit price cannot be negative');
        if (paymentStatus === 'PAID' && amountPaid <= 0) {
            amountPaid = quantity * unitPrice;
        }

        const totalPrice = quantity * unitPrice;
        const balanceRemaining = paymentStatus === 'PAID'? 0 : totalPrice - amountPaid;

        let unitCost = 0;
        let cogs = 0;
        let grossProfit = 0;
        let marginPercentage = 0;
        let finalInventoryId = inventoryId;
        let finalItemName = itemName;
        let inventoryItem = null;

        if (!skipInventory) {
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
                if (inventoryItem.quantity < quantity) {
                    throw new Error(`Insufficient stock for "${finalItemName}". Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
                }
                unitCost = inventoryItem.cost_price || 0; // FREEZE cost
                cogs = quantity * unitCost;
                grossProfit = totalPrice - cogs;
                marginPercentage = totalPrice > 0? (grossProfit / totalPrice) * 100 : 0;
            }
        }

        let finalCustomerId = customerId;
        let finalCustomerType = customerType;
        if (customerName && businessId && this.customerRepository) {
            let customer = null;
            const existingCustomers = await this.customerRepository.findByBusinessId(businessId, { search: customerName, limit: 1 });
            if (existingCustomers && existingCustomers.length > 0) {
                customer = existingCustomers[0];
            }
            if (!customer) {
                try {
                    const Customer = require('../../../domain/entities/Customer');
                    const newCustomer = new Customer({ businessId: businessId, name: customerName, type: 'CUSTOMER' });
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

        const sale = new Sale({
            userId, businessId, itemName: finalItemName, quantity, unitPrice, totalPrice,
            customerName, customerId: finalCustomerId, customerType: finalCustomerType,
            paymentStatus, amountPaid, balanceRemaining, saleDate,
            unitCost, cogs, grossProfit, marginPercentage,
        });

        const saleData = sale.toJSON();
        const formattedSaleDate = saleData.saleDate instanceof Date? saleData.saleDate.toISOString() : new Date().toISOString();

        const itemsArray = items && items.length > 0? items : [{
            name: finalItemName, quantity: quantity, unitCost: unitCost, sellingPrice: unitPrice,
            inventoryId: finalInventoryId, total: totalPrice, cogs: cogs, profit: grossProfit,
        }];

        const dbReadyData = {
            user_id: saleData.userId, item_name: saleData.itemName, quantity: saleData.quantity, unit_price: saleData.unitPrice,
            total_price: saleData.totalPrice, customer_name: saleData.customerName || null, customer_id: saleData.customerId || null,
            customer_type: saleData.customerType || 'CUSTOMER', business_id: saleData.businessId || null,
            payment_status: saleData.paymentStatus || 'UNPAID', amount_paid: saleData.amountPaid || 0,
            balance_remaining: saleData.balanceRemaining || 0, sale_date: formattedSaleDate,
            unit_cost: saleData.unitCost || 0, cogs: saleData.cogs || 0, gross_profit: saleData.grossProfit || 0,
            margin_percentage: saleData.marginPercentage || 0, items: JSON.stringify(itemsArray),
            invoice_no: `INV-${Date.now().toString().slice(-8)}`, notes: notes || '',
        };

        console.log('📊 Saving single-item sale:', dbReadyData);

        // STEP 1: Save sale FIRST
        const savedSale = await this.saleRepository.create(dbReadyData);

        // STEP 2: Reduce inventory
        if (!skipInventory && finalInventoryId && inventoryItem) {
            await this.inventoryRepository.reduceStock(finalInventoryId, quantity);
        }

        // STEP 3: CREATE PAYMENT RECORD <-- ADDED
        if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
            const paidAmount = amountPaid || (paymentStatus === 'PAID'? totalPrice : 0);
            if (paidAmount > 0) {
                await this.paymentRepository.create({
                    businessId: businessId,
                    userId: userId,
                    type: 'RECEIVED',
                    amount: paidAmount,
                    paymentDate: new Date(formattedSaleDate),
                    referenceType: 'SALE',
                    referenceId: savedSale.id,
                    paymentMethod: 'CASH',
                    notes: `Payment for ${savedSale.invoice_no}`
                });
            }
        }

        // STEP 4: Create debtor if unpaid/partial
        if (paymentStatus!== 'PAID' && customerName && balanceRemaining > 0) {
            const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
            const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);
            const paidAmount = paymentStatus === 'PARTIAL'? (amountPaid || 0) : 0;
            if (existingDebtor) {
                await this.debtorRepository.update(existingDebtor.id, {
                    total_owed: existingDebtor.total_owed + balanceRemaining,
                    balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                    amount_paid: (existingDebtor.amount_paid || 0) + paidAmount, status: 'ACTIVE',
                });
            } else {
                await this.debtorRepository.create({
                    user_id: userId, customer_name: customerName, customer_id: finalCustomerId,
                    total_owed: balanceRemaining, balance_remaining: balanceRemaining, amount_paid: paidAmount,
                    status: 'ACTIVE', reference_type: 'SALE', reference_id: savedSale.id, notes: notes || '',
                });
            }
        }

        return {
            success: true, sale: savedSale, customerId: finalCustomerId, customerType: finalCustomerType,
            unitCost, cogs, grossProfit, marginPercentage,
            inventoryRemaining: finalInventoryId? (await this.inventoryRepository.findById(finalInventoryId))?.quantity : null,
        };
    }
}

module.exports = RecordSaleUseCase;