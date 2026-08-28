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
        items = [],
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
                const sell = parseFloat(item.sellingPrice) || 0;
                
                if (qty <= 0) {
                    throw new Error(`Quantity for "${item.name}" must be greater than 0`);
                }
                if (cost <= 0) {
                    throw new Error(`Unit cost for "${item.name}" must be greater than 0`);
                }
                if (sell <= 0) {
                    throw new Error(`Selling price for "${item.name}" must be greater than 0`);
                }
                
                processedItems.push({
                    name: item.name.trim(),
                    quantity: qty,
                    unitCost: cost,
                    sellingPrice: sell,
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
            if (!sellingPrice || sellingPrice <= 0) {
                throw new Error('Selling price must be greater than zero');
            }
            
            processedItems = [{
                name: itemName,
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost),
                sellingPrice: parseFloat(sellingPrice),
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
            items: JSON.stringify(processedItems), // ✅ Store full items array
            notes: notes || '',
        });

        // ✅ Process each item for inventory
        let inventoryUpdates = [];
        for (const item of processedItems) {
            try {
                const InventoryItem = require('../../../domain/entities/InventoryItem');
                let inventoryItem = await this.inventoryRepository.findByNameIgnoreCase(userId, item.name);
                
                if (!inventoryItem) {
                    const newItem = new InventoryItem({
                        userId: userId,
                        name: item.name,
                        category: 'Purchased Goods',
                        quantity: 0,
                        costPrice: item.unitCost,
                        sellingPrice: item.sellingPrice,
                        reorderLevel: 5,
                    });
                    
                    const savedData = await this.inventoryRepository.create(newItem.toJSON());
                    inventoryItem = new InventoryItem(savedData);
                    console.log(`✅ Created new inventory item: ${item.name}`);
                }

                const previousQuantity = inventoryItem.quantity || 0;
                
                inventoryItem.addStock(item.quantity);

                const totalCostValue = (inventoryItem.quantity * inventoryItem.costPrice) + (item.quantity * item.unitCost);
                const totalQty = inventoryItem.quantity;
                inventoryItem.costPrice = totalQty > 0 ? totalCostValue / totalQty : item.unitCost;
                inventoryItem.sellingPrice = item.sellingPrice;
                
                await this.inventoryRepository.update(inventoryItem.id, inventoryItem);
                console.log(`✅ Inventory updated: ${item.name} (+${item.quantity})`);

                if (this.inventoryTransactionRepository) {
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
                    });
                    await this.inventoryTransactionRepository.create(invTransaction);
                }

                inventoryUpdates.push({
                    name: item.name,
                    previousQuantity,
                    newQuantity: inventoryItem.quantity,
                });

            } catch (error) {
                console.error(`❌ Inventory update error for ${item.name}:`, error.message);
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

        // ✅ Calculate total profit
        let totalProfit = 0;
        for (const item of processedItems) {
            totalProfit += (item.sellingPrice - item.unitCost) * item.quantity;
        }

        return {
            success: true,
            purchase: purchase,
            supplierId: finalSupplierId,
            supplierName: finalSupplierName,
            supplierCreated: finalSupplierId !== null,
            balanceRemaining: balanceRemaining,
            creditorCreated: creditorCreated,
            totalProfit: totalProfit,
            items: processedItems,
            inventoryUpdates: inventoryUpdates,
            message: 'Purchase recorded successfully',
        };
    }
}

module.exports = RecordPurchaseUseCase;