// src/application/useCases/purchases/RecordPurchaseUseCase.js

class RecordPurchaseUseCase {
    constructor({
        purchaseRepository,
        transactionRepository,
        inventoryRepository,
        inventoryTransactionRepository,
        creditorRepository,
        supplierRepository,
    }) {
        this.purchaseRepository = purchaseRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.creditorRepository = creditorRepository;
        this.supplierRepository = supplierRepository;
    }

    async execute({
        userId,
        businessId,
        supplierName,
        itemName,
        quantity,
        unitCost,
        sellingPrice,
        totalCost,
        paymentStatus = 'UNPAID',
        amountPaid = 0,
        dueDate = null,
        notes = '',
        purchaseDate = new Date(),
    }) {
        if (!userId) {
            throw new Error('User ID is required');
        }

        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!itemName) {
            throw new Error('Item name is required');
        }

        if (!quantity || quantity <= 0) {
            throw new Error('Quantity must be greater than zero');
        }

        if (!unitCost || unitCost <= 0) {
            throw new Error('Unit cost must be greater than zero');
        }

        if (!sellingPrice || sellingPrice <= 0) {
            throw new Error('Selling price must be greater than zero');
        }

        const calculatedTotal = quantity * unitCost;
        const finalTotal = totalCost || calculatedTotal;
        const profitPerUnit = sellingPrice - unitCost;
        const totalProfit = profitPerUnit * quantity;
        const profitMargin = unitCost > 0 ? ((profitPerUnit / unitCost) * 100).toFixed(1) : 0;

        // ✅ Find or create supplier
        let finalSupplierId = null;
        let finalSupplierName = supplierName || 'Unknown Supplier';

        if (supplierName && this.supplierRepository) {
            try {
                const existingSuppliers = await this.supplierRepository.findByBusinessId(businessId, {
                    search: supplierName,
                    limit: 10,
                });

                let supplier = null;
                if (existingSuppliers && existingSuppliers.length > 0) {
                    supplier = existingSuppliers.find(s => 
                        s.name.toLowerCase() === supplierName.toLowerCase()
                    );
                }

                if (!supplier) {
                    const supplierData = {
                        businessId: businessId,
                        name: supplierName,
                    };
                    supplier = await this.supplierRepository.create(supplierData);
                    console.log(`✅ Created new supplier: ${supplierName} (ID: ${supplier.id})`);
                } else {
                    console.log(`✅ Found existing supplier: ${supplierName} (ID: ${supplier.id})`);
                }

                if (supplier) {
                    finalSupplierId = supplier.id;
                    finalSupplierName = supplier.name;
                }
            } catch (error) {
                console.error('Supplier creation/lookup error:', error.message);
            }
        }

        const balanceRemaining = paymentStatus === 'PAID' ? 0 : 
                                 paymentStatus === 'PARTIAL' ? finalTotal - amountPaid : 
                                 finalTotal;

        // ✅ Create purchase
        const purchase = await this.purchaseRepository.create({
            user_id: userId,
            business_id: businessId,
            supplier_id: finalSupplierId,
            supplier_name: finalSupplierName,
            item_name: itemName,
            quantity: quantity,
            unit_cost: unitCost,
            total_cost: finalTotal,
            payment_status: paymentStatus,
            amount_paid: paymentStatus === 'PAID' ? finalTotal : (amountPaid || 0),
            balance_remaining: balanceRemaining,
            due_date: dueDate,
            purchase_date: purchaseDate instanceof Date ? purchaseDate.toISOString() : purchaseDate,
        });

        // ✅ Update inventory with selling price
        if (this.inventoryRepository) {
            try {
                const InventoryItem = require('../../../domain/entities/InventoryItem');
                let inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, itemName);
                
                if (!inventoryItem) {
                    // ✅ Create new inventory item with selling price
                    const newItem = new InventoryItem({
                        userId: userId,
                        name: itemName,
                        category: 'Purchased Goods',
                        quantity: 0,
                        costPrice: unitCost,
                        sellingPrice: sellingPrice,  // ✅ Add selling price
                        reorderLevel: 5,
                    });
                    
                    const savedData = await this.inventoryRepository.create(newItem.toJSON());
                    inventoryItem = new InventoryItem(savedData);
                    console.log(`✅ Created new inventory item: ${itemName} with selling price ₦${sellingPrice}`);
                } else {
                    console.log(`✅ Found existing inventory item: ${itemName} (ID: ${inventoryItem.id})`);
                }

                const previousQuantity = inventoryItem.quantity || 0;
                
                // ✅ Add stock
                inventoryItem.addStock(quantity);

                // ✅ Update cost price (weighted average)
                const totalCostValue = (inventoryItem.quantity * inventoryItem.costPrice) + (quantity * unitCost);
                const totalQuantity = inventoryItem.quantity;
                inventoryItem.costPrice = totalQuantity > 0 ? totalCostValue / totalQuantity : unitCost;
                
                // ✅ Update selling price (use the latest selling price)
                inventoryItem.sellingPrice = sellingPrice;
                
                await this.inventoryRepository.update(inventoryItem.id, inventoryItem);
                console.log(`✅ Inventory updated: ${itemName} (+${quantity}, new total: ${inventoryItem.quantity})`);
                console.log(`✅ Cost Price: ₦${inventoryItem.costPrice}, Selling Price: ₦${inventoryItem.sellingPrice}`);

                if (this.inventoryTransactionRepository) {
                    const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
                    const invTransaction = new InventoryTransaction({
                        inventoryItemId: inventoryItem.id,
                        businessId: businessId,
                        type: 'IN',
                        quantity: quantity,
                        previousQuantity: previousQuantity,
                        newQuantity: inventoryItem.quantity,
                        referenceType: 'PURCHASE',
                        referenceId: purchase.id,
                        reason: `Purchase of ${itemName}`,
                        notes: notes,
                    });
                    await this.inventoryTransactionRepository.create(invTransaction);
                }
            } catch (error) {
                console.error('❌ Inventory update error:', error.message);
                console.error('Stack:', error.stack);
            }
        }

        // ✅ Create creditor if not fully paid
        let creditorCreated = false;
        if (paymentStatus !== 'PAID' && balanceRemaining > 0) {
            try {
                const creditor = {
                    user_id: userId,
                    business_id: businessId,
                    supplier_id: finalSupplierId,
                    supplier_name: finalSupplierName,
                    total_owed: finalTotal,
                    amount_paid: paymentStatus === 'PAID' ? finalTotal : (amountPaid || 0),
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                    due_date: dueDate,
                    reference_type: 'PURCHASE',
                    reference_id: purchase.id,
                };

                await this.creditorRepository.create(creditor);
                creditorCreated = true;
                console.log(`✅ Creditor created for supplier: ${finalSupplierName} (${balanceRemaining})`);
            } catch (error) {
                console.error('Creditor creation error:', error.message);
            }
        }

        return {
            success: true,
            purchase: purchase,
            supplierId: finalSupplierId,
            supplierName: finalSupplierName,
            supplierCreated: finalSupplierId !== null,
            balanceRemaining: balanceRemaining,
            creditorCreated: creditorCreated,
            profitPerUnit: profitPerUnit,
            totalProfit: totalProfit,
            profitMargin: profitMargin,
            message: 'Purchase recorded successfully',
        };
    }
}

module.exports = RecordPurchaseUseCase;