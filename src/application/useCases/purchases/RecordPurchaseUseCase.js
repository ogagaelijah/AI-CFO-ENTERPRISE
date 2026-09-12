// src/application/useCases/purchases/RecordPurchaseUseCase.js
// v3.1.0-prod — Fixed multi-tenant inventory update + Weighted Average Cost

class RecordPurchaseUseCase {
    constructor({
        purchaseRepository,
        transactionRepository,
        inventoryRepository,
        inventoryTransactionRepository,
        creditorRepository,
        supplierRepository,
        paymentRepository = null,
    }) {
        this.purchaseRepository = purchaseRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
        this.creditorRepository = creditorRepository;
        this.supplierRepository = supplierRepository;
        this.paymentRepository = paymentRepository;
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
        } else if (itemName) {
            if (!quantity || quantity <= 0) {
                throw new Error('Quantity must be greater than zero');
            }
            if (!unitCost || unitCost <= 0) {
                throw new Error('Unit cost must be greater than zero');
            }

            processedItems = [{
                name: itemName.trim(),
                quantity: parseInt(quantity),
                unitCost: parseFloat(unitCost),
            }];

            totalPurchaseCost = quantity * unitCost;
            totalQuantity = quantity;
        } else {
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
            unit_cost: totalQuantity > 0 ? totalPurchaseCost / totalQuantity : 0,
            total_cost: finalTotalCost,
            payment_status: paymentStatus,
            amount_paid: paymentStatus === 'PAID' ? finalTotalCost : (amountPaid || 0),
            balance_remaining: balanceRemaining,
            due_date: dueDate,
            purchase_date: purchaseDate instanceof Date ? purchaseDate.toISOString() : purchaseDate,
            items: JSON.stringify(processedItems),
            notes: notes || '',
        });

        // ✅ UPDATE SUPPLIER METADATA
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
                }
            } catch (error) {
                console.error('❌ Failed to update supplier metadata:', error.message);
            }
        }

        // ✅ CREATE PAYMENT RECORD IF PAID OR PARTIAL
        if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
            const paidAmount = amountPaid || (paymentStatus === 'PAID' ? finalTotalCost : 0);
            if (paidAmount > 0) {
                const paymentDateObj = purchaseDate instanceof Date ? purchaseDate : new Date();
                await this.paymentRepository.create({
                    businessId: businessId,
                    userId: userId,
                    type: 'MADE',
                    amount: paidAmount,
                    paymentDate: paymentDateObj,
                    referenceType: 'PURCHASE',
                    referenceId: purchase.id,
                    paymentMethod: 'CASH',
                    notes: `Payment for purchase ${purchase.id}`,
                });
            }
        }

        // ✅ Process each item for inventory (FIXED: now uses businessId)
        let inventoryUpdates = [];

        for (const item of processedItems) {
            try {
                // 🔑 CRITICAL FIX: Use businessId, not userId
                let inventoryItemData = await this.inventoryRepository.findByNameIgnoreCase(businessId, item.name);

                let inventoryItemId = null;
                let previousQuantity = 0;
                let previousCostPrice = 0;
                let newQuantity = 0;
                let newCostPrice = 0;

                if (!inventoryItemData) {
                    // Create new inventory item
                    const savedData = await this.inventoryRepository.create({
                        userId: userId,
                        businessId: businessId,
                        item_name: item.name,
                        quantity: item.quantity,
                        cost_price: item.unitCost,
                        selling_price: 0,
                        last_purchase_cost: item.unitCost,
                        reorder_level: 5,
                    });

                    inventoryItemId = savedData.id;
                    previousQuantity = 0;
                    previousCostPrice = 0;
                    newQuantity = item.quantity;
                    newCostPrice = item.unitCost;

                    console.log(`✅ Created new inventory item: ${item.name} (Qty: ${item.quantity}, Cost: ₦${item.unitCost})`);
                } else {
                    // Existing item → Weighted Average Cost
                    previousQuantity = inventoryItemData.quantity || 0;
                    previousCostPrice = inventoryItemData.cost_price || 0;

                    const totalCurrentValue = previousQuantity * previousCostPrice;
                    const totalNewValue = item.quantity * item.unitCost;
                    const totalQty = previousQuantity + item.quantity;

                    newQuantity = totalQty;
                    newCostPrice = totalQty > 0
                        ? (totalCurrentValue + totalNewValue) / totalQty
                        : item.unitCost;

                    await this.inventoryRepository.update(inventoryItemData.id, {
                        quantity: newQuantity,
                        cost_price: newCostPrice,
                        last_purchase_cost: item.unitCost,
                    });

                    inventoryItemId = inventoryItemData.id;

                    console.log(`✅ Inventory updated (WAC): ${item.name} (${previousQuantity} → ${newQuantity}) | Cost: ₦${previousCostPrice.toFixed(2)} → ₦${newCostPrice.toFixed(2)}`);
                }

                // Create inventory transaction
                if (this.inventoryTransactionRepository && inventoryItemId) {
                    try {
                        await this.inventoryTransactionRepository.create({
                            inventoryItemId: inventoryItemId,
                            businessId: businessId,
                            type: 'IN',
                            quantity: item.quantity,
                            previousQuantity: previousQuantity,
                            newQuantity: newQuantity,
                            referenceType: 'PURCHASE',
                            referenceId: purchase.id,
                            reason: `Purchase of ${item.name}`,
                            notes: notes || '',
                            metadata: {
                                unitCost: item.unitCost,
                                previousCostPrice,
                                newCostPrice,
                            },
                            date: purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate),
                        });
                    } catch (txError) {
                        console.warn(`⚠️ Inventory transaction not recorded for ${item.name}:`, txError.message);
                    }
                }

                inventoryUpdates.push({
                    name: item.name,
                    previousQuantity,
                    newQuantity,
                    previousCostPrice,
                    newCostPrice,
                    lastPurchaseCost: item.unitCost,
                    inventoryValue: newQuantity * newCostPrice,
                });

            } catch (error) {
                console.error(`❌ Inventory update error for ${item.name}:`, error.message);
                console.error(error.stack);
            }
        }

        // ✅ Create creditor if not fully paid
        let creditorCreated = false;
        if (paymentStatus !== 'PAID' && balanceRemaining > 0) {
            try {
                await this.creditorRepository.create({
                    user_id: userId,
                    business_id: businessId,
                    supplier_id: finalSupplierId,
                    supplier_name: finalSupplierName,
                    total_owed: finalTotalCost,
                    amount_paid: amountPaid || 0,
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                    due_date: dueDate,
                    reference_type: 'PURCHASE',
                    reference_id: purchase.id,
                });
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