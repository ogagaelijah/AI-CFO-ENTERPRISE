// src/application/useCases/sales/RecordSaleUseCase.js
// v3.0.0-prod — All writes wrapped in a single withTransaction.
//               Per-business SALE-NNNN invoice numbering.
//               Correct repo contracts (inventory findByNameIgnoreCase takes businessId).
//               Removed broken getRawDb() transaction path.

const Sale = require('../../../domain/entities/Sale');
const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

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
        if (!userId) throw new Error('User ID is required');
        if (!businessId) throw new Error('Business ID is required');

        if (items && items.length > 0) {
            return this._executeMultiItem({
                userId, businessId, items, customerName, customerId, customerType,
                paymentStatus, amountPaid, saleDate, skipInventory, notes,
            });
        }

        return this._executeSingleItem({
            userId, businessId, itemName, quantity, unitPrice,
            customerName, customerId, customerType, paymentStatus, amountPaid,
            skipInventory, inventoryId, saleDate, notes,
        });
    }

    // ─────────────────────────────────────────────
    // Helpers shared by both paths
    // ─────────────────────────────────────────────

    async _findOrCreateCustomer({ businessId, customerName, customerId, customerType, userId }) {
        let finalCustomerId = customerId || null;
        let finalCustomerType = customerType || 'CUSTOMER';

        if (!customerName || !this.customerRepository) {
            return { customerId: finalCustomerId, customerType: finalCustomerType };
        }

        const existing = await this.customerRepository.findByBusinessId(
            businessId,
            { search: customerName, limit: 1 }
        );
        if (existing && existing.length > 0) {
            return {
                customerId: existing[0].id,
                customerType: existing[0].type || 'CUSTOMER',
            };
        }

        const Customer = require('../../../domain/entities/Customer');
        const created = await this.customerRepository.create(new Customer({
            businessId,
            name: customerName,
            type: 'CUSTOMER',
        }));
        return {
            customerId: created.id,
            customerType: created.type || 'CUSTOMER',
        };
    }

    async _findOrCreateInventoryItem({ userId, businessId, itemName, sellingPrice, inventoryId }) {
        if (!itemName && !inventoryId) return null;

        let item = null;
        if (inventoryId) {
            item = await this.inventoryRepository.findById(inventoryId);
        }
        if (!item && itemName) {
            item = await this.inventoryRepository.findByNameIgnoreCase(businessId, itemName);
        }
        if (item) return item;

        // Auto-create with zero stock. Sale records, stock not reduced.
        const newItem = await this.inventoryRepository.create({
            user_id: userId,
            business_id: businessId,
            item_name: itemName,
            quantity: 0,
            cost_price: 0,
            selling_price: sellingPrice || 0,
            last_purchase_cost: 0,
            reorder_level: 5,
        });
        return await this.inventoryRepository.findById(newItem.id);
    }

    async _createPaymentIfApplicable({ businessId, userId, amount, paymentDate, invoiceNo, referenceId }) {
        if (!this.paymentRepository) return;
        if (!amount || amount <= 0) return;

        await this.paymentRepository.create({
            businessId,
            userId,
            type: 'RECEIVED',
            amount,
            paymentDate,
            referenceType: 'SALE',
            referenceId,
            paymentMethod: 'CASH',
            notes: `Payment for ${invoiceNo}`,
        });
    }

    async _createOrUpdateDebtor({
        businessId, userId, customerName, customerId, balanceRemaining, paidAmount,
        referenceId, notes,
    }) {
        if (!customerName || balanceRemaining <= 0) return;

        // Look up any existing open debtor for this business + customer.
        const existing = await this.debtorRepository.findByCustomerName(businessId, customerName);
        const openDebtor = (existing || []).find(d => Number(d.balance_remaining) > 0);

        if (openDebtor) {
            await this.debtorRepository.update(openDebtor.id, {
                total_owed: Number(openDebtor.total_owed || 0) + balanceRemaining,
                balance_remaining: Number(openDebtor.balance_remaining || 0) + balanceRemaining,
                amount_paid: Number(openDebtor.amount_paid || 0) + paidAmount,
                status: 'ACTIVE',
            });
        } else {
            await this.debtorRepository.create({
                user_id: userId,
                business_id: businessId,
                customer_name: customerName,
                customer_id: customerId || null,
                total_owed: balanceRemaining,
                balance_remaining: balanceRemaining,
                amount_paid: paidAmount,
                status: 'ACTIVE',
                reference_type: 'SALE',
                reference_id: referenceId,
                notes: notes || '',
            });
        }
    }

    // ─────────────────────────────────────────────
    // Multi-item path
    // ─────────────────────────────────────────────

    async _executeMultiItem({
        userId, businessId, items, customerName, customerId, customerType,
        paymentStatus, amountPaid, saleDate, skipInventory, notes,
    }) {
        if (items.length === 0) throw new Error('At least one item is required');
        if (!customerName) throw new Error('Customer name is required');

        return withTransaction(async () => {
            const { customerId: finalCustomerId, customerType: finalCustomerType } =
                await this._findOrCreateCustomer({
                    businessId, customerName, customerId, customerType, userId,
                });

            const processedItems = [];
            const stockToReduce = [];
            let totalQuantity = 0;
            let totalCogs = 0;
            let totalRevenueValue = 0;

            for (const raw of items) {
                const qty = Number(raw.quantity) || 1;
                const sellPrice = Number(raw.sellingPrice ?? raw.unitPrice) || 0;
                let unitCost = 0;
                let finalItemName = raw.name;
                let finalInventoryId = raw.inventoryId || null;

                if (!skipInventory) {
                    const item = await this._findOrCreateInventoryItem({
                        userId, businessId, itemName: raw.name,
                        sellingPrice: sellPrice, inventoryId: raw.inventoryId,
                    });
                    if (item) {
                        finalInventoryId = item.id;
                        finalItemName = item.item_name || raw.name;
                        unitCost = Number(item.cost_price) || 0;

                        if (item.quantity < qty && item.quantity > 0) {
                            throw new Error(
                                `Insufficient stock for "${finalItemName}". ` +
                                `Available: ${item.quantity}, Requested: ${qty}`
                            );
                        }
                        if (item.quantity > 0) {
                            stockToReduce.push({ id: finalInventoryId, quantity: qty });
                        }
                    }
                }

                const itemRevenue = qty * sellPrice;
                const itemCogs = qty * unitCost;

                totalQuantity += qty;
                totalRevenueValue += itemRevenue;
                totalCogs += itemCogs;

                processedItems.push({
                    name: finalItemName,
                    quantity: qty,
                    unitCost,
                    sellingPrice: sellPrice,
                    inventoryId: finalInventoryId,
                    total: itemRevenue,
                    cogs: itemCogs,
                    profit: itemRevenue - itemCogs,
                });
            }

            const grossProfit = totalRevenueValue - totalCogs;
            const marginPct = totalRevenueValue > 0 ? (grossProfit / totalRevenueValue) * 100 : 0;
            const itemNames = processedItems.map(i => i.name).join(', ');

            const amountPaidValue = Number(amountPaid) || (paymentStatus === 'PAID' ? totalRevenueValue : 0);
            const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalRevenueValue - amountPaidValue;

            const saleDateObj = saleDate instanceof Date ? saleDate : new Date(saleDate);
            const invoiceNo = await this.saleRepository.nextSaleNumber(businessId);

            const sale = new Sale({
                userId, businessId,
                itemName: itemNames,
                quantity: totalQuantity,
                unitPrice: totalQuantity > 0 ? totalRevenueValue / totalQuantity : 0,
                totalPrice: totalRevenueValue,
                customerName,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                paymentStatus,
                amountPaid: amountPaidValue,
                balanceRemaining,
                saleDate: saleDateObj,
                unitCost: totalQuantity > 0 ? totalCogs / totalQuantity : 0,
                cogs: totalCogs,
                grossProfit,
                marginPercentage: marginPct,
            });

            const saleData = sale.toJSON();
            const savedSale = await this.saleRepository.create({
                user_id: userId,
                item_name: saleData.itemName,
                quantity: saleData.quantity,
                unit_price: saleData.unitPrice,
                total_price: saleData.totalPrice,
                customer_name: saleData.customerName || null,
                customer_id: saleData.customerId || null,
                customer_type: saleData.customerType || 'CUSTOMER',
                business_id: businessId,
                payment_status: saleData.paymentStatus || 'UNPAID',
                amount_paid: saleData.amountPaid || 0,
                balance_remaining: saleData.balanceRemaining || 0,
                sale_date: saleDateObj.toISOString(),
                unit_cost: saleData.unitCost || 0,
                cogs: saleData.cogs || 0,
                gross_profit: saleData.grossProfit || 0,
                margin_percentage: saleData.marginPercentage || 0,
                items: processedItems,
                invoice_no: invoiceNo,
                notes: notes || '',
            });

            if (!skipInventory) {
                for (const inv of stockToReduce) {
                    await this.inventoryRepository.reduceStock(inv.id, inv.quantity);
                }
            }

            if (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') {
                if (amountPaidValue > 0) {
                    await this._createPaymentIfApplicable({
                        businessId, userId, amount: amountPaidValue,
                        paymentDate: saleDateObj, invoiceNo, referenceId: savedSale.id,
                    });
                }
            }

            await this._createOrUpdateDebtor({
                businessId, userId, customerName, customerId: finalCustomerId,
                balanceRemaining, paidAmount: amountPaidValue,
                referenceId: savedSale.id, notes,
            });

            return {
                success: true,
                sale: savedSale,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                totalCost: totalCogs,
                totalRevenue: totalRevenueValue,
                totalProfit: grossProfit,
                items: processedItems,
            };
        });
    }

    // ─────────────────────────────────────────────
    // Single-item path
    // ─────────────────────────────────────────────

    async _executeSingleItem({
        userId, businessId, itemName, quantity, unitPrice,
        customerName, customerId, customerType, paymentStatus, amountPaid,
        skipInventory, inventoryId, saleDate, notes,
    }) {
        const qty = Number(quantity);
        const unitPriceNum = Number(unitPrice);

        if (!qty || qty <= 0) throw new Error('Quantity must be greater than 0');
        if (unitPriceNum < 0) throw new Error('Unit price cannot be negative');

        const totalPrice = qty * unitPriceNum;
        let amountPaidValue = Number(amountPaid) || 0;
        if (paymentStatus === 'PAID' && amountPaidValue <= 0) {
            amountPaidValue = totalPrice;
        }
        const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalPrice - amountPaidValue;

        return withTransaction(async () => {
            // Inventory
            let unitCost = 0;
            let cogs = 0;
            let grossProfit = 0;
            let marginPct = 0;
            let finalInventoryId = inventoryId || null;
            let finalItemName = itemName;
            let inventoryItem = null;

            if (!skipInventory) {
                inventoryItem = await this._findOrCreateInventoryItem({
                    userId, businessId, itemName,
                    sellingPrice: unitPriceNum, inventoryId,
                });
                if (inventoryItem) {
                    finalInventoryId = inventoryItem.id;
                    finalItemName = inventoryItem.item_name || itemName;
                    unitCost = Number(inventoryItem.cost_price) || 0;

                    if (inventoryItem.quantity < qty && inventoryItem.quantity > 0) {
                        throw new Error(
                            `Insufficient stock for "${finalItemName}". ` +
                            `Available: ${inventoryItem.quantity}, Requested: ${qty}`
                        );
                    }
                    cogs = qty * unitCost;
                    grossProfit = totalPrice - cogs;
                    marginPct = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;
                }
            }

            // Customer
            const { customerId: finalCustomerId, customerType: finalCustomerType } =
                await this._findOrCreateCustomer({
                    businessId, customerName, customerId, customerType, userId,
                });

            const saleDateObj = saleDate instanceof Date ? saleDate : new Date(saleDate);
            const invoiceNo = await this.saleRepository.nextSaleNumber(businessId);

            const sale = new Sale({
                userId, businessId,
                itemName: finalItemName,
                quantity: qty,
                unitPrice: unitPriceNum,
                totalPrice,
                customerName,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                paymentStatus,
                amountPaid: amountPaidValue,
                balanceRemaining,
                saleDate: saleDateObj,
                unitCost, cogs, grossProfit, marginPercentage: marginPct,
            });

            const saleData = sale.toJSON();
            const itemsArray = [{
                name: finalItemName,
                quantity: qty,
                unitCost,
                sellingPrice: unitPriceNum,
                inventoryId: finalInventoryId,
                total: totalPrice,
                cogs,
                profit: grossProfit,
            }];

            const savedSale = await this.saleRepository.create({
                user_id: userId,
                item_name: saleData.itemName,
                quantity: saleData.quantity,
                unit_price: saleData.unitPrice,
                total_price: saleData.totalPrice,
                customer_name: saleData.customerName || null,
                customer_id: saleData.customerId || null,
                customer_type: saleData.customerType || 'CUSTOMER',
                business_id: businessId,
                payment_status: saleData.paymentStatus || 'UNPAID',
                amount_paid: saleData.amountPaid || 0,
                balance_remaining: saleData.balanceRemaining || 0,
                sale_date: saleDateObj.toISOString(),
                unit_cost: saleData.unitCost || 0,
                cogs: saleData.cogs || 0,
                gross_profit: saleData.grossProfit || 0,
                margin_percentage: saleData.marginPercentage || 0,
                items: itemsArray,
                invoice_no: invoiceNo,
                notes: notes || '',
            });

            if (!skipInventory && finalInventoryId && inventoryItem && inventoryItem.quantity > 0) {
                await this.inventoryRepository.reduceStock(finalInventoryId, qty);
            }

            if (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL') {
                if (amountPaidValue > 0) {
                    await this._createPaymentIfApplicable({
                        businessId, userId, amount: amountPaidValue,
                        paymentDate: saleDateObj, invoiceNo, referenceId: savedSale.id,
                    });
                }
            }

            await this._createOrUpdateDebtor({
                businessId, userId, customerName, customerId: finalCustomerId,
                balanceRemaining, paidAmount: amountPaidValue,
                referenceId: savedSale.id, notes,
            });

            return {
                success: true,
                sale: savedSale,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                unitCost, cogs, grossProfit, marginPercentage: marginPct,
                inventoryRemaining: finalInventoryId
                    ? (await this.inventoryRepository.findById(finalInventoryId))?.quantity
                    : null,
            };
        });
    }
}

module.exports = RecordSaleUseCase;