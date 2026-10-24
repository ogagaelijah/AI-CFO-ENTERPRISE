// src/application/useCases/sales/RecordSaleUseCase.js
// v3.6.0-prod — Adds web notification trigger on sale creation.

const Sale = require('../../../domain/entities/Sale');
const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const NotificationRepository = require('../../../infrastructure/database/sqlite/repositories/NotificationRepository'); // ★ NEW
const { sendBulkPushNotifications } = require('../../../infrastructure/services/notifications/ExpoPushService');

class RecordSaleUseCase {
    constructor(
        saleRepository,
        inventoryRepository,
        debtorRepository,
        customerRepository = null,
        paymentRepository = null,
        inventoryMovementRepository = null,
    ) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
        this.customerRepository = customerRepository;
        this.paymentRepository = paymentRepository;
        this.inventoryMovementRepository = inventoryMovementRepository;
        this.userRepository = new UserRepository(); 
        this.notificationRepository = new NotificationRepository(); // ★ NEW
    }

    async execute({
        userId,
        businessId,
        itemName,
        quantity,
        unitPrice,
        customerName,
        customerPhone = null, 
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
        unitMultiplier = 1,
        soldUnit = 'Piece',
        dueDays = null,
    }) {
        if (!userId) throw new Error('User ID is required');
        if (!businessId) throw new Error('Business ID is required');

        let finalDueDate = null;
        if (dueDays !== null && dueDays !== undefined) {
            finalDueDate = new Date();
            finalDueDate.setDate(finalDueDate.getDate() + Number(dueDays));
        }

        if (items && items.length > 0) {
            return this._executeMultiItem({
                userId, businessId, items, customerName, customerPhone, customerId, customerType,
                paymentStatus, amountPaid, saleDate, skipInventory, notes, finalDueDate,
            });
        }

        return this._executeSingleItem({
            userId, businessId, itemName, quantity, unitPrice,
            customerName, customerPhone, customerId, customerType, paymentStatus, amountPaid,
            skipInventory, inventoryId, saleDate, notes,
            unitMultiplier, soldUnit, finalDueDate,
        });
    }

    // ★ UPDATED: Helper function to send push AND web notifications safely
    async _sendSaleNotification({ businessId, cashierId, customerName, itemNames, totalRevenue, invoiceNo }) {
        try {
            // 1. Fetch all users with push tokens for this business, excluding the cashier
            const members = await this.userRepository.findByBusinessIdWithPushTokens(businessId, cashierId);
            
            if (members.length > 0) {
                const bodyText = `${customerName} bought ${itemNames} for ₦${Number(totalRevenue).toLocaleString()}`;
                const titleText = `🛒 New Sale: ${invoiceNo}`;

                // 2. Save to database for the web dashboard bell
                // We create a notification for each member (or just the owner/admin, but here we do all)
                for (const member of members) {
                    await this.notificationRepository.create({
                        user_id: member.user_id,
                        title: titleText,
                        message: bodyText,
                        type: 'NEW_SALE',
                        is_read: false,
                        created_at: new Date().toISOString(),
                    });
                }

                // 3. Send mobile push notifications
                const tokens = members.map(m => m.push_token).filter(Boolean);
                if (tokens.length > 0) {
                    await sendBulkPushNotifications(
                        tokens,
                        titleText,
                        bodyText,
                        { screen: 'History', saleId: invoiceNo }
                    );
                }
                console.log(`[RecordSaleUseCase] Notifications sent to ${members.length} members.`);
            }
        } catch (error) {
            // We catch the error so a failed notification never rolls back a successful sale
            console.error('[RecordSaleUseCase] Failed to send sale notification:', error.message);
        }
    }

    async _writeStockMovement({
        businessId, userId, inventoryItemId, quantity, unitCost,
        quantityBefore, quantityAfter, referenceId, createdAt, notes = '',
    }) {
        if (!this.inventoryMovementRepository) return;

        try {
            const totalCost = Number(quantity) * (Number(unitCost) || 0);

            await this.inventoryMovementRepository.create({
                inventoryItemId,
                businessId,
                userId,
                movementType: 'OUT',
                quantity: Number(quantity),
                unitCost: Number(unitCost) || 0,
                totalCost,
                quantityBefore: Number(quantityBefore) || 0,
                quantityAfter: Number(quantityAfter) || 0,
                costPriceBefore: Number(unitCost) || 0,
                costPriceAfter: Number(unitCost) || 0,
                referenceType: 'SALE',
                referenceId,
                reason: 'Stock reduced by sale',
                notes: notes || '',
                metadata: {},
                createdAt,
            });
        } catch (err) {
            console.error(
                '[RecordSaleUseCase] movement write failed:',
                err.message,
                { businessId, inventoryItemId, quantity, referenceId }
            );
        }
    }

    async _findOrCreateCustomer({ businessId, customerName, customerPhone, customerId, customerType, userId }) {
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
            if (customerPhone && !existing[0].phone) {
                try {
                    await this.customerRepository.update(existing[0].id, { phone: customerPhone });
                } catch (e) {
                    console.error('Failed to update customer phone:', e.message);
                }
            }
            return {
                customerId: existing[0].id,
                customerType: existing[0].type || 'CUSTOMER',
            };
        }

        const Customer = require('../../../domain/entities/Customer');
        const created = await this.customerRepository.create(new Customer({
            businessId,
            name: customerName,
            phone: customerPhone || null, 
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
        businessId, userId, customerName, customerPhone, customerId, balanceRemaining, paidAmount,
        referenceId, notes, finalDueDate,
    }) {
        if (!customerName || balanceRemaining <= 0) return;

        const existing = await this.debtorRepository.findByCustomerName(businessId, customerName);
        const openDebtor = (existing || []).find(d => Number(d.balance_remaining) > 0);

        if (openDebtor) {
            const updateData = {
                total_owed: Number(openDebtor.total_owed || 0) + balanceRemaining,
                balance_remaining: Number(openDebtor.balance_remaining || 0) + balanceRemaining,
                amount_paid: Number(openDebtor.amount_paid || 0) + paidAmount,
                status: 'ACTIVE',
            };
            if (finalDueDate) updateData.due_date = finalDueDate.toISOString();
            if (customerPhone && !openDebtor.customer_phone) updateData.customer_phone = customerPhone;

            await this.debtorRepository.update(openDebtor.id, updateData);
        } else {
            const fallbackDate = new Date();
            fallbackDate.setDate(fallbackDate.getDate() + 3);
            const dueDateToSave = finalDueDate ? finalDueDate.toISOString() : fallbackDate.toISOString();

            await this.debtorRepository.create({
                user_id: userId,
                business_id: businessId,
                customer_name: customerName,
                customer_phone: customerPhone || null, 
                customer_id: customerId || null,
                total_owed: balanceRemaining,
                balance_remaining: balanceRemaining,
                amount_paid: paidAmount,
                status: 'ACTIVE',
                reference_type: 'SALE',
                reference_id: referenceId,
                notes: notes || '',
                due_date: dueDateToSave,
            });
        }
    }

    async _executeMultiItem({
        userId, businessId, items, customerName, customerPhone, customerId, customerType,
        paymentStatus, amountPaid, saleDate, skipInventory, notes, finalDueDate,
    }) {
        if (items.length === 0) throw new Error('At least one item is required');
        if (!customerName) throw new Error('Customer name is required');

        let resultToReturn = null;

        await withTransaction(async () => {
            const { customerId: finalCustomerId, customerType: finalCustomerType } =
                await this._findOrCreateCustomer({
                    businessId, customerName, customerPhone, customerId, customerType, userId,
                });

            const processedItems = [];
            const stockToReduce = [];
            let totalQuantity = 0;
            let totalCogs = 0;
            let totalRevenueValue = 0;

            for (const raw of items) {
                const unitMultiplier = Number(raw.unitMultiplier) || 1;
                const soldUnit = raw.soldUnit || 'Piece';
                const qty = Number(raw.quantity) || 1;
                const baseQty = qty * unitMultiplier;
                
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

                        if (item.quantity < baseQty) {
                            throw new Error(
                                `Insufficient stock for "${finalItemName}". ` +
                                `Available: ${item.quantity}, Requested: ${baseQty}`
                            );
                        }

                        stockToReduce.push({
                            id: finalInventoryId,
                            quantity: baseQty,
                            unitCost,
                            quantityBefore: Number(item.quantity) || 0,
                            quantityAfter: (Number(item.quantity) || 0) - baseQty,
                        });
                    }
                }

                const itemRevenue = qty * sellPrice;
                const itemCogs = baseQty * unitCost;

                totalQuantity += qty;
                totalRevenueValue += itemRevenue;
                totalCogs += itemCogs;

                processedItems.push({
                    name: finalItemName,
                    quantity: qty,
                    soldUnit: soldUnit,
                    unitMultiplier: unitMultiplier,
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
                    await this._writeStockMovement({
                        businessId,
                        userId,
                        inventoryItemId: inv.id,
                        quantity: inv.quantity,
                        unitCost: inv.unitCost,
                        quantityBefore: inv.quantityBefore,
                        quantityAfter: inv.quantityAfter,
                        referenceId: savedSale.id,
                        createdAt: saleDateObj,
                        notes: `Sale ${invoiceNo}`,
                    });
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
                businessId, userId, customerName, customerPhone, customerId: finalCustomerId,
                balanceRemaining, paidAmount: amountPaidValue,
                referenceId: savedSale.id, notes, finalDueDate,
            });

            resultToReturn = {
                success: true,
                sale: savedSale,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                totalCost: totalCogs,
                totalRevenue: totalRevenueValue,
                totalProfit: grossProfit,
                items: processedItems,
                invoiceNo: invoiceNo,
                itemNames: itemNames
            };
        });

        if (resultToReturn) {
            await this._sendSaleNotification({
                businessId,
                cashierId: userId,
                customerName,
                itemNames: resultToReturn.itemNames,
                totalRevenue: resultToReturn.totalRevenue,
                invoiceNo: resultToReturn.invoiceNo,
            });
        }

        return resultToReturn;
    }

    async _executeSingleItem({
        userId, businessId, itemName, quantity, unitPrice,
        customerName, customerPhone, customerId, customerType, paymentStatus, amountPaid,
        skipInventory, inventoryId, saleDate, notes,
        unitMultiplier = 1, soldUnit = 'Piece', finalDueDate,
    }) {
        const qty = Number(quantity);
        const baseQty = qty * unitMultiplier;
        const unitPriceNum = Number(unitPrice);

        if (!qty || qty <= 0) throw new Error('Quantity must be greater than 0');
        if (unitPriceNum < 0) throw new Error('Unit price cannot be negative');

        const totalPrice = qty * unitPriceNum;
        let amountPaidValue = Number(amountPaid) || 0;
        if (paymentStatus === 'PAID' && amountPaidValue <= 0) {
            amountPaidValue = totalPrice;
        }
        const balanceRemaining = paymentStatus === 'PAID' ? 0 : totalPrice - amountPaidValue;

        let resultToReturn = null;

        await withTransaction(async () => {
            let unitCost = 0;
            let cogs = 0;
            let grossProfit = 0;
            let marginPct = 0;
            let finalInventoryId = inventoryId || null;
            let finalItemName = itemName;
            let inventoryItem = null;
            let quantityBefore = 0;
            let quantityAfter = 0;

            if (!skipInventory) {
                inventoryItem = await this._findOrCreateInventoryItem({
                    userId, businessId, itemName,
                    sellingPrice: unitPriceNum, inventoryId,
                });
                if (inventoryItem) {
                    finalInventoryId = inventoryItem.id;
                    finalItemName = inventoryItem.item_name || itemName;
                    unitCost = Number(inventoryItem.cost_price) || 0;

                    if (inventoryItem.quantity < baseQty) {
                        throw new Error(
                            `Insufficient stock for "${finalItemName}". ` +
                            `Available: ${inventoryItem.quantity}, Requested: ${baseQty}`
                        );
                    }

                    quantityBefore = Number(inventoryItem.quantity) || 0;
                    quantityAfter = quantityBefore - baseQty;

                    cogs = baseQty * unitCost;
                    grossProfit = totalPrice - cogs;
                    marginPct = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;
                }
            }

            const { customerId: finalCustomerId, customerType: finalCustomerType } =
                await this._findOrCreateCustomer({
                    businessId, customerName, customerPhone, customerId, customerType, userId,
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
                soldUnit: soldUnit,
                unitMultiplier: unitMultiplier,
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

            if (!skipInventory && finalInventoryId && inventoryItem) {
                await this.inventoryRepository.reduceStock(finalInventoryId, baseQty);
                await this._writeStockMovement({
                    businessId,
                    userId,
                    inventoryItemId: finalInventoryId,
                    quantity: baseQty,
                    unitCost,
                    quantityBefore,
                    quantityAfter,
                    referenceId: savedSale.id,
                    createdAt: saleDateObj,
                    notes: `Sale ${invoiceNo}`,
                });
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
                businessId, userId, customerName, customerPhone, customerId: finalCustomerId,
                balanceRemaining, paidAmount: amountPaidValue,
                referenceId: savedSale.id, notes, finalDueDate,
            });

            resultToReturn = {
                success: true,
                sale: savedSale,
                customerId: finalCustomerId,
                customerType: finalCustomerType,
                unitCost, cogs, grossProfit, marginPercentage: marginPct,
                invoiceNo: invoiceNo,
                itemNames: finalItemName,
                totalRevenue: totalPrice,
                inventoryRemaining: finalInventoryId
                    ? (await this.inventoryRepository.findById(finalInventoryId))?.quantity
                    : null,
            };
        });

        if (resultToReturn) {
            await this._sendSaleNotification({
                businessId,
                cashierId: userId,
                customerName,
                itemNames: resultToReturn.itemNames,
                totalRevenue: resultToReturn.totalRevenue,
                invoiceNo: resultToReturn.invoiceNo,
            });
        }

        return resultToReturn;
    }
}

module.exports = RecordSaleUseCase;