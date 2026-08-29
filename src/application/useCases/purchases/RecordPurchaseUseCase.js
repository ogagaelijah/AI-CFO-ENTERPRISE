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
        supplierPhone = null,
        supplierEmail = null,
        items = [],
        itemName,
        quantity,
        unitCost,
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

        // ✅ Process items - support both formats
        let processedItems = [];
        let totalPurchaseCost = 0;
        let totalQuantity = 0;

        // If items array is provided (multi-item from frontend)
        if (items && items.length > 0) {
            for (const item of items) {
                if (!item.name || !item.name.trim()) {
                    throw new Error('All items must have a name');
                }
                const qty = parseInt(item.quantity) || 1;
                const cost = parseFloat(item.unitCost) || 0;
                
                if (qty <= 0) {
                    throw new Error(`Quantity for "${item.name}" must be greater than 0`);
                }
                if (cost <= 0) {
                    throw new Error(`Unit cost for "${item.name}" must be greater than 0`);
                }
                
                processedItems.push({
                    name: item.name.trim(),
                    quantity: qty,
                    unitCost: cost,
                });
                
                totalPurchaseCost += qty * cost;
                totalQuantity += qty;
            }
        } 
        // Legacy single item format
        else if (itemName) {
            if (!quantity || quantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }
            if (!unitCost || unitCost <= 0) {
                throw new Error('Unit cost must be greater than zero');
            }
            
            processedItems = [{
                name: itemName,
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost),
            }];
            
            totalPurchaseCost = quantity * unitCost;
            totalQuantity = quantity;
        } 
        else {
            throw new Error('At least one item is required');
        }

        const finalTotalCost = totalCost || totalPurchaseCost;

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
                        phone: supplierPhone || null,
                        email: supplierEmail || null,
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
                                 paymentStatus === 'PARTIAL' ? finalTotalCost - amountPaid : 
                                 finalTotalCost;

        // ✅ Create ONE purchase record with items as JSON
        const itemNames = processedItems.map(i => i.name).join(', ');

        const purchase = await this.purchaseRepository.create({
            user_id: userId,
            business_id: businessId,
            supplier_id: finalSupplierId,
            supplier_name: finalSupplierName,
            item_name: itemNames,
            quantity: totalQuantity,
            unit_cost: totalPurchaseCost / totalQuantity,
            total_cost: finalTotalCost,
            payment_status: paymentStatus,
            amount_paid: paymentStatus === 'PAID' ? finalTotalCost : (amountPaid || 0),
            balance_remaining: balanceRemaining,
            due_date: dueDate,
            purchase_date: purchaseDate instanceof Date ? purchaseDate.toISOString() : purchaseDate,
            items: JSON.stringify(processedItems),
            notes: notes || '',
        });

        // ✅ UPDATE SUPPLIER METADATA WITH PURCHASE TOTALS
        if (finalSupplierId) {
            try {
                const supplier = await this.supplierRepository.findById(finalSupplierId);
                if (supplier) {
                    const currentMetadata = supplier.metadata || {};
                    const purchaseCount = (currentMetadata.purchaseCount || 0) + 1;
                    const totalPurchaseAmount = (currentMetadata.totalPurchaseAmount || 0) + finalTotalCost;
                    
                    await this.supplierRepository.update(finalSupplierId, {
                        metadata: {
                            ...currentMetadata,
                            purchaseCount: purchaseCount,
                            totalPurchaseAmount: totalPurchaseAmount,
                            lastPurchaseDate: new Date().toISOString(),
                        }
                    });
                    console.log(`✅ Updated supplier ${finalSupplierName} metadata: ${purchaseCount} purchases, ₦${totalPurchaseAmount}`);
                }
            } catch (error) {
                console.error('❌ Failed to update supplier metadata:', error.message);
            }
        }

        // ✅ Process each item for inventory
        let inventoryUpdates = [];
        for (const item of processedItems) {
            try {
                const InventoryItem = require('../../../domain/entities/InventoryItem');
                let inventoryItemData = await this.inventoryRepository.findByNameIgnoreCase(userId, item.name);
                let inventoryItem;
                let previousQuantity = 0;
                let previousCostPrice = 0;
                let previousSellingPrice = 0;
                
                if (!inventoryItemData) {
                    // ✅ Create new inventory item (selling price = 0, user sets it later)
                    const newItem = new InventoryItem({
                        userId: userId,
                        name: item.name,
                        category: 'Purchased Goods',
                        quantity: item.quantity,
                        costPrice: item.unitCost,
                        lastPurchaseCost: item.unitCost,
                        sellingPrice: 0,
                        reorderLevel: 5,
                    });
                    
                    const savedData = await this.inventoryRepository.create(newItem.toJSON());
                    inventoryItem = new InventoryItem(savedData);
                    previousQuantity = 0;
                    previousCostPrice = 0;
                    previousSellingPrice = 0;
                    console.log(`✅ Created new inventory item: ${item.name} (Qty: ${item.quantity}, Cost: ₦${item.unitCost})`);
                } else {
                    // ✅ Store previous values
                    previousQuantity = inventoryItemData.quantity || 0;
                    previousCostPrice = inventoryItemData.cost_price || 0;
                    previousSellingPrice = inventoryItemData.selling_price || 0;
                    
                    // ✅ Instantiate as InventoryItem entity
                    inventoryItem = new InventoryItem(inventoryItemData);
                    console.log(`✅ Found existing inventory item: ${item.name} (Qty: ${previousQuantity}, Avg Cost: ₦${previousCostPrice})`);

                    // ✅ Calculate new quantity
                    const newQuantity = previousQuantity + item.quantity;
                    
                    // ✅ Calculate weighted average cost (WAC)
                    const totalCurrentValue = previousQuantity * (previousCostPrice > 0 ? previousCostPrice : 0);
                    const totalNewValue = item.quantity * item.unitCost;
                    const totalQtyValue = previousQuantity + item.quantity;
                    const newCostPrice = totalQtyValue > 0 ? (totalCurrentValue + totalNewValue) / totalQtyValue : item.unitCost;
                    
                    // ✅ Update the entity
                    inventoryItem.quantity = newQuantity;
                    inventoryItem.costPrice = newCostPrice;
                    inventoryItem.lastPurchaseCost = item.unitCost;
                    inventoryItem.updatedAt = new Date();
                    
                    console.log(`📊 WAC: (${previousQuantity} × ₦${previousCostPrice}) + (${item.quantity} × ₦${item.unitCost}) = ₦${totalCurrentValue + totalNewValue} / ${totalQtyValue} = ₦${newCostPrice}`);
                    console.log(`📊 Last Purchase Cost: ₦${item.unitCost}`);
                    
                    // ✅ Save ONCE - explicitly pass all fields
                    await this.inventoryRepository.update(inventoryItem.id, {
                        quantity: inventoryItem.quantity,
                        cost_price: inventoryItem.costPrice,
                        selling_price: inventoryItem.sellingPrice,
                        last_purchase_cost: inventoryItem.lastPurchaseCost,
                    });
                    console.log(`✅ Inventory updated: ${item.name} (${previousQuantity} → ${newQuantity})`);
                }

                // ✅ Create inventory transaction record
                if (this.inventoryTransactionRepository) {
                    try {
                        const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
                        const invTransaction = new InventoryTransaction({
                            inventoryItemId: inventoryItem.id,
                            businessId: businessId,
                            type: 'IN',
                            quantity: item.quantity,
                            previousQuantity: previousQuantity,
                            newQuantity: inventoryItem.quantity,
                            referenceType: 'PURCHASE',
                            referenceId: purchase.id,
                            reason: `Purchase of ${item.name}`,
                            notes: notes,
                            metadata: {},
                        });
                        await this.inventoryTransactionRepository.create(invTransaction);
                    } catch (txError) {
                        console.warn(`⚠️ Inventory transaction not recorded:`, txError.message);
                    }
                }

                // ✅ Calculate inventory value
                const inventoryValue = inventoryItem.quantity * inventoryItem.costPrice;

                inventoryUpdates.push({
                    name: item.name,
                    previousQuantity,
                    newQuantity: inventoryItem.quantity,
                    newCostPrice: inventoryItem.costPrice,
                    lastPurchaseCost: inventoryItem.lastPurchaseCost,
                    inventoryValue: inventoryValue,
                });

                console.log(`📊 ${item.name}: Inventory Value: ₦${inventoryValue}`);

            } catch (error) {
                console.error(`❌ Inventory update error for ${item.name}:`, error.message);
                console.error('❌ Error stack:', error.stack);
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
                    total_owed: finalTotalCost,
                    amount_paid: paymentStatus === 'PAID' ? finalTotalCost : (amountPaid || 0),
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                    due_date: dueDate,
                    reference_type: 'PURCHASE',
                    reference_id: purchase.id,
                };

                await this.creditorRepository.create(creditor);
                creditorCreated = true;
                console.log(`✅ Creditor created for supplier: ${finalSupplierName}`);
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
            items: processedItems,
            inventoryUpdates: inventoryUpdates,
            message: 'Purchase recorded successfully',
        };
    }
}

module.exports = RecordPurchaseUseCase;