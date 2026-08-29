// src/application/useCases/sales/RecordSaleUseCase.js

const Sale = require('../../../domain/entities/Sale');

class RecordSaleUseCase {
    constructor(saleRepository, inventoryRepository, debtorRepository, customerRepository = null, paymentRepository = null) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.customerRepository = customerRepository;
        this.paymentRepository = paymentRepository;
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
        // ✅ ALWAYS use multi-item logic if items array is provided
        if (items && items.length > 0) {
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

        // ✅ Single item
        return this._executeSingleItem({
            userId,
            businessId,
            itemName,
            quantity,
            unitPrice,
            customerName,
            customerId,
            customerType,
            paymentStatus,
            amountPaid,
            skipInventory,
            inventoryId,
            saleDate,
            items,
            notes,
        });
    }

    // ✅ Multi-item execution with transaction support
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

        // ✅ Get raw database for transaction
        const db = this.saleRepository.getRawDb ? this.saleRepository.getRawDb() : null;
        
        // ✅ Execute in transaction
        const executeTransaction = async () => {
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
                
                // ✅ ALWAYS get cost price from inventory
                let unitCost = 0;
                let finalInventoryId = item.inventoryId || null;
                let finalItemName = item.name;

                if (!skipInventory) {
                    let inventoryItem = null;
                    
                    // ✅ Try to find inventory item by ID first, then by name
                    if (item.inventoryId) {
                        inventoryItem = await this.inventoryRepository.findById(item.inventoryId);
                    }
                    
                    if (!inventoryItem && item.name) {
                        // ✅ PERMANENT FIX: Find exact match or create inventory item
                        inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, item.name);
                        
                        // ✅ If item doesn't exist in inventory, CREATE IT automatically
                        if (!inventoryItem) {
                            console.log(`⚠️ Item "${item.name}" not found in inventory. Creating with default cost...`);
                            const InventoryItem = require('../../../domain/entities/InventoryItem');
                            const newItem = new InventoryItem({
                                userId: userId,
                                name: item.name,
                                category: 'Goods',
                                quantity: 0,
                                costPrice: 0,
                                sellingPrice: sellPrice,
                                reorderLevel: 5,
                            });
                            const savedData = await this.inventoryRepository.create(newItem.toJSON());
                            inventoryItem = await this.inventoryRepository.findById(savedData.id);
                            console.log(`✅ Created new inventory item: ${item.name} with ID: ${inventoryItem.id}`);
                        }
                    }

                    if (inventoryItem) {
                        finalInventoryId = inventoryItem.id;
                        finalItemName = inventoryItem.item_name || item.name;
                        // ✅ FREEZE the current cost at time of sale
                        unitCost = inventoryItem.cost_price || 0;
                        
                        // ✅ Check stock (skip if quantity is 0 and we're just creating)
                        if (inventoryItem.quantity < qty && inventoryItem.quantity > 0) {
                            throw new Error(`Insufficient stock for "${finalItemName}". Available: ${inventoryItem.quantity}, Requested: ${qty}`);
                        }
                        
                        // ✅ Only reduce stock if item has quantity > 0
                        if (inventoryItem.quantity > 0) {
                            inventoryItemsToReduce.push({ id: finalInventoryId, quantity: qty });
                        } else {
                            console.log(`⚠️ Item "${finalItemName}" has 0 stock. Sale recorded but inventory not reduced.`);
                        }
                    } else {
                        console.log(`⚠️ Could not find or create inventory item for: ${item.name}`);
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

            const marginPercentage = totalRevenueValue > 0 ? (totalProfitValue / totalRevenueValue) * 100 : 0;
            const itemNames = processedItems.map(i => i.name).join(', ');

            const sale = new Sale({
                userId,
                businessId,
                itemName: itemNames,
                quantity: totalQuantity,
                unitPrice: totalRevenueValue / totalQuantity,
                totalPrice: totalRevenueValue,
                customerName,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                paymentStatus,
                amountPaid: amountPaid || (paymentStatus === 'PAID' ? totalRevenueValue : 0),
                balanceRemaining: paymentStatus === 'PAID' ? 0 : totalRevenueValue - (amountPaid || 0),
                saleDate,
                unitCost: totalCostValue / totalQuantity,
                cogs: totalCostValue,
                grossProfit: totalProfitValue,
                marginPercentage: marginPercentage,
            });

            const saleData = sale.toJSON();
            const formattedSaleDate = saleData.saleDate instanceof Date 
                ? saleData.saleDate.toISOString() 
                : new Date().toISOString();
            const paymentDateObj = saleData.saleDate instanceof Date ? saleData.saleDate : new Date();

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
                items: JSON.stringify(processedItems),
                invoice_no: `INV-${Date.now().toString().slice(-8)}`,
                notes: notes || '',
            };

            console.log('📊 Saving multi-item sale:', dbReadyData);

            // ✅ STEP 1: Save sale FIRST
            const savedSale = await this.saleRepository.create(dbReadyData);

            // ✅ STEP 2: Reduce inventory (only if stock > 0)
            if (!skipInventory) {
                for (const inv of inventoryItemsToReduce) {
                    await this.inventoryRepository.reduceStock(inv.id, inv.quantity);
                }
            }

            // ✅ STEP 3: CREATE PAYMENT RECORD IF PAID OR PARTIAL
            if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
                const paidAmount = amountPaid || (paymentStatus === 'PAID' ? totalRevenueValue : 0);
                if (paidAmount > 0) {
                    await this.paymentRepository.create({
                        businessId: businessId,
                        userId: userId,
                        type: 'RECEIVED',
                        amount: paidAmount,
                        paymentDate: paymentDateObj,
                        referenceType: 'SALE',
                        referenceId: savedSale.id,
                        paymentMethod: 'CASH',
                        notes: `Payment for ${savedSale.invoice_no}`,
                    });
                    console.log(`✅ Payment record created for sale ${savedSale.id}: ₦${paidAmount}`);
                }
            }

            // ✅ STEP 4: Create debtor if unpaid/partial
            const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalRevenueValue - (amountPaid || 0);
            if (paymentStatus !== 'PAID' && customerName && balanceRemaining > 0) {
                const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
                const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);

                const paidAmount = paymentStatus === 'PARTIAL' ? (amountPaid || 0) : 0;

                if (existingDebtor) {
                    await this.debtorRepository.update(existingDebtor.id, {
                        total_owed: existingDebtor.total_owed + balanceRemaining,
                        balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                        amount_paid: (existingDebtor.amount_paid || 0) + paidAmount,
                        status: 'ACTIVE',
                    });
                    console.log(`✅ Updated existing debtor for ${customerName}`);
                } else {
                    await this.debtorRepository.create({
                        user_id: userId,
                        business_id: businessId,
                        customer_name: customerName,
                        customer_id: finalCustomerId,
                        total_owed: balanceRemaining,
                        balance_remaining: balanceRemaining,
                        amount_paid: paidAmount,
                        status: 'ACTIVE',
                        reference_type: 'SALE',
                        reference_id: savedSale.id,
                        notes: notes || '',
                    });
                    console.log(`✅ Created new debtor for ${customerName}: ₦${balanceRemaining}`);
                }
            }

            return {
                success: true,
                sale: savedSale,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                totalCost: totalCostValue,
                totalRevenue: totalRevenueValue,
                totalProfit: totalProfitValue,
                items: processedItems,
            };
        };

        // ✅ Execute with transaction if available
        if (db) {
            const transaction = db.transaction(executeTransaction);
            return transaction();
        } else {
            return executeTransaction();
        }
    }

    // ✅ Single item execution with transaction support
    async _executeSingleItem({
        userId,
        businessId,
        itemName,
        quantity,
        unitPrice,
        customerName,
        customerId,
        customerType,
        paymentStatus,
        amountPaid,
        skipInventory,
        inventoryId,
        saleDate,
        items = [],
        notes = '',
    }) {
        if (quantity <= 0) throw new Error('Quantity must be greater than 0');
        if (unitPrice < 0) throw new Error('Unit price cannot be negative');
        if (paymentStatus === 'PAID' && amountPaid <= 0) {
            amountPaid = quantity * unitPrice;
        }

        const totalPrice = quantity * unitPrice;
        const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalPrice - amountPaid;

        let unitCost = 0;
        let cogs = 0;
        let grossProfit = 0;
        let marginPercentage = 0;
        let finalInventoryId = inventoryId;
        let finalItemName = itemName;

        let inventoryItem = null;

        // ✅ ALWAYS get cost from inventory
        if (!skipInventory) {
            if (inventoryId) {
                inventoryItem = await this.inventoryRepository.findById(inventoryId);
            }

            if (!inventoryItem && itemName) {
                inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, itemName);
                
                // ✅ PERMANENT FIX: If item doesn't exist, CREATE it
                if (!inventoryItem) {
                    console.log(`⚠️ Item "${itemName}" not found in inventory. Creating with default cost...`);
                    const InventoryItem = require('../../../domain/entities/InventoryItem');
                    const newItem = new InventoryItem({
                        userId: userId,
                        name: itemName,
                        category: 'Goods',
                        quantity: 0,
                        costPrice: 0,
                        sellingPrice: unitPrice,
                        reorderLevel: 5,
                    });
                    const savedData = await this.inventoryRepository.create(newItem.toJSON());
                    inventoryItem = await this.inventoryRepository.findById(savedData.id);
                    console.log(`✅ Created new inventory item: ${itemName} with ID: ${inventoryItem.id}`);
                }
            }

            if (inventoryItem) {
                finalInventoryId = inventoryItem.id;
                finalItemName = inventoryItem.item_name || itemName;
                unitCost = inventoryItem.cost_price || 0;
                
                // ✅ Check stock
                if (inventoryItem.quantity < quantity && inventoryItem.quantity > 0) {
                    throw new Error(`Insufficient stock for "${finalItemName}". Available: ${inventoryItem.quantity}, Requested: ${quantity}`);
                }
                
                cogs = quantity * unitCost;
                grossProfit = totalPrice - cogs;
                marginPercentage = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;
            } else {
                console.log(`⚠️ Could not find or create inventory item for: ${itemName}`);
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

        const saleData = sale.toJSON();
        const formattedSaleDate = saleData.saleDate instanceof Date 
            ? saleData.saleDate.toISOString() 
            : new Date().toISOString();
        const paymentDateObj = saleData.saleDate instanceof Date ? saleData.saleDate : new Date();

        const itemsArray = items && items.length > 0 ? items : [{
            name: finalItemName,
            quantity: quantity,
            unitCost: unitCost,
            sellingPrice: unitPrice,
            inventoryId: finalInventoryId,
            total: totalPrice,
            cogs: cogs,
            profit: grossProfit,
        }];

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
            items: JSON.stringify(itemsArray),
            invoice_no: `INV-${Date.now().toString().slice(-8)}`,
            notes: notes || '',
        };

        console.log('📊 Saving single-item sale:', dbReadyData);

        // ✅ Get raw database for transaction
        const db = this.saleRepository.getRawDb ? this.saleRepository.getRawDb() : null;
        
        const executeTransaction = async () => {
            // ✅ STEP 1: Save sale FIRST
            const savedSale = await this.saleRepository.create(dbReadyData);

            // ✅ STEP 2: Reduce inventory (only if stock > 0)
            if (!skipInventory && finalInventoryId && inventoryItem) {
                if (inventoryItem.quantity > 0) {
                    await this.inventoryRepository.reduceStock(finalInventoryId, quantity);
                } else {
                    console.log(`⚠️ Item "${finalItemName}" has 0 stock. Sale recorded but inventory not reduced.`);
                }
            }

            // ✅ STEP 3: CREATE PAYMENT RECORD IF PAID OR PARTIAL
            if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
                const paidAmount = amountPaid || (paymentStatus === 'PAID' ? totalPrice : 0);
                if (paidAmount > 0) {
                    await this.paymentRepository.create({
                        businessId: businessId,
                        userId: userId,
                        type: 'RECEIVED',
                        amount: paidAmount,
                        paymentDate: paymentDateObj,
                        referenceType: 'SALE',
                        referenceId: savedSale.id,
                        paymentMethod: 'CASH',
                        notes: `Payment for ${savedSale.invoice_no}`,
                    });
                    console.log(`✅ Payment record created for sale ${savedSale.id}: ₦${paidAmount}`);
                }
            }

            // ✅ STEP 4: Create debtor if unpaid/partial
            if (paymentStatus !== 'PAID' && customerName && balanceRemaining > 0) {
                const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
                const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);

                const paidAmount = paymentStatus === 'PARTIAL' ? (amountPaid || 0) : 0;

                if (existingDebtor) {
                    await this.debtorRepository.update(existingDebtor.id, {
                        total_owed: existingDebtor.total_owed + balanceRemaining,
                        balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                        amount_paid: (existingDebtor.amount_paid || 0) + paidAmount,
                        status: 'ACTIVE',
                    });
                    console.log(`✅ Updated existing debtor for ${customerName}`);
                } else {
                    await this.debtorRepository.create({
                        user_id: userId,
                        business_id: businessId,
                        customer_name: customerName,
                        customer_id: finalCustomerId,
                        total_owed: balanceRemaining,
                        balance_remaining: balanceRemaining,
                        amount_paid: paidAmount,
                        status: 'ACTIVE',
                        reference_type: 'SALE',
                        reference_id: savedSale.id,
                        notes: notes || '',
                    });
                    console.log(`✅ Created new debtor for ${customerName}: ₦${balanceRemaining}`);
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
        };

        // ✅ Execute with transaction if available
        if (db) {
            const transaction = db.transaction(executeTransaction);
            return transaction();
        } else {
            return executeTransaction();
        }
    }
}

module.exports = RecordSaleUseCase;