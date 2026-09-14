// src/application/useCases/purchases/RecordPurchaseUseCase.js
// v3.4.0-prod — Postgres transactional (via withTransaction + AsyncLocalStorage).
// No silent failures. All writes atomic.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class RecordPurchaseUseCase {
    constructor({
        purchaseRepository,
        transactionRepository,
        inventoryRepository,
        inventoryMovementRepository,
        creditorRepository,
        supplierRepository,
        paymentRepository = null,
    }) {
        this.purchaseRepository = purchaseRepository;
        this.transactionRepository = transactionRepository;
        this.inventoryRepository = inventoryRepository;
        this.inventoryMovementRepository = inventoryMovementRepository;
        this.creditorRepository = creditorRepository;
        this.supplierRepository = supplierRepository;
        this.paymentRepository = paymentRepository;

        if (!this.purchaseRepository) throw new Error('PurchaseRepository is required');
        if (!this.inventoryRepository) throw new Error('InventoryRepository is required');
        if (!this.inventoryMovementRepository) throw new Error('InventoryMovementRepository is required');
        if (!this.creditorRepository) throw new Error('CreditorRepository is required');
        if (!this.supplierRepository) throw new Error('SupplierRepository is required');
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
        if (!userId) throw new Error('User ID is required');
        if (!businessId) throw new Error('Business ID is required');

        // ────── 1. Validate + normalize (pure, no DB) ──────
        const processedItems = this._processItems({ items, itemName, quantity, unitCost });
        const { totalPurchaseCost, totalQuantity } = this._sumItems(processedItems);
        const finalTotalCost = totalCost || totalPurchaseCost;
        const balanceRemaining = this._computeBalance(paymentStatus, finalTotalCost, amountPaid);
        const purchaseDateObj = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);

        // ────── 2. Execute everything inside ONE Postgres transaction ──────
        return withTransaction(async () => {
            // 2a. Supplier find-or-create
            const supplier = await this._findOrCreateSupplier({
                businessId, supplierName, supplierPhone, supplierEmail,
            });
            const finalSupplierId = supplier ? supplier.id : null;
            const finalSupplierName = supplier ? supplier.name : (supplierName || 'Unknown Supplier');

            // 2b. Purchase record
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
                purchase_date: purchaseDateObj.toISOString(),
                items: processedItems,
                notes: notes || '',
            });

            // 2c. Supplier metadata
            if (finalSupplierId) {
                const existingSupplier = await this.supplierRepository.findById(finalSupplierId);
                if (existingSupplier) {
                    const meta = existingSupplier.metadata || {};
                    await this.supplierRepository.update(finalSupplierId, {
                        metadata: {
                            ...meta,
                            purchaseCount: (meta.purchaseCount || 0) + 1,
                            totalPurchaseAmount: (meta.totalPurchaseAmount || 0) + finalTotalCost,
                            lastPurchaseDate: new Date().toISOString(),
                        },
                    });
                }
            }

            // 2d. Payment record
            if (this.paymentRepository && (paymentStatus === 'PAID' || paymentStatus === 'PARTIAL')) {
                const paidAmount = amountPaid || (paymentStatus === 'PAID' ? finalTotalCost : 0);
                if (paidAmount > 0) {
                    await this.paymentRepository.create({
                        businessId,
                        userId,
                        type: 'MADE',
                        amount: paidAmount,
                        paymentDate: purchaseDateObj,
                        referenceType: 'PURCHASE',
                        referenceId: purchase.id,
                        paymentMethod: 'CASH',
                        notes: `Payment for purchase ${purchase.id}`,
                    });
                }
            }

            // 2e. Inventory + ledger
            const inventoryUpdates = [];
            for (const item of processedItems) {
                const update = await this._applyInventoryAndLedger({
                    businessId, userId, item, purchaseId: purchase.id, notes, purchaseDateObj,
                });
                inventoryUpdates.push(update);
            }

            // 2f. Creditor for UNPAID / PARTIAL
            let creditor = null;
            if (paymentStatus !== 'PAID' && balanceRemaining > 0) {
                creditor = await this.creditorRepository.create({
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
            }

            return {
                success: true,
                purchase,
                supplierId: finalSupplierId,
                supplierName: finalSupplierName,
                supplierCreated: finalSupplierId !== null,
                balanceRemaining,
                creditorCreated: creditor !== null,
                creditorId: creditor ? creditor.id : null,
                items: processedItems,
                inventoryUpdates,
                message: 'Purchase recorded successfully',
            };
        });
    }

    // ────── Pure helpers (no DB) ──────

    _processItems({ items, itemName, quantity, unitCost }) {
        if (items && items.length > 0) {
            return items.map(it => {
                if (!it.name || !it.name.trim()) throw new Error('All items must have a name');
                const qty = parseInt(it.quantity) || 1;
                const cost = parseFloat(it.unitCost) || 0;
                if (qty <= 0) throw new Error(`Quantity for "${it.name}" must be greater than 0`);
                if (cost <= 0) throw new Error(`Unit cost for "${it.name}" must be greater than 0`);
                return { name: it.name.trim(), quantity: qty, unitCost: cost };
            });
        }
        if (itemName) {
            if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than zero');
            if (!unitCost || unitCost <= 0) throw new Error('Unit cost must be greater than zero');
            return [{ name: itemName.trim(), quantity: parseInt(quantity), unitCost: parseFloat(unitCost) }];
        }
        throw new Error('At least one item is required');
    }

    _sumItems(processedItems) {
        let totalPurchaseCost = 0;
        let totalQuantity = 0;
        for (const it of processedItems) {
            totalPurchaseCost += it.quantity * it.unitCost;
            totalQuantity += it.quantity;
        }
        return { totalPurchaseCost, totalQuantity };
    }

    _computeBalance(paymentStatus, finalTotalCost, amountPaid) {
        if (paymentStatus === 'PAID') return 0;
        if (paymentStatus === 'PARTIAL') return finalTotalCost - (amountPaid || 0);
        return finalTotalCost;
    }

    async _findOrCreateSupplier({ businessId, supplierName, supplierPhone, supplierEmail }) {
        if (!supplierName) return null;

        const existing = await this.supplierRepository.findByBusinessId(businessId, {
            search: supplierName,
            limit: 10,
        });

        let supplier = null;
        if (existing && existing.length > 0) {
            supplier = existing.find(s => s.name.toLowerCase() === supplierName.toLowerCase());
        }

        if (!supplier) {
            supplier = await this.supplierRepository.create({
                businessId,
                name: supplierName,
                phone: supplierPhone || null,
                email: supplierEmail || null,
            });
        }
        return supplier;
    }

    async _applyInventoryAndLedger({ businessId, userId, item, purchaseId, notes, purchaseDateObj }) {
        const inventoryItemData = await this.inventoryRepository.findByNameIgnoreCase(businessId, item.name);

        let inventoryItemId;
        let previousQuantity = 0;
        let previousCostPrice = 0;
        let newQuantity;
        let newCostPrice;

        if (!inventoryItemData) {
            const savedData = await this.inventoryRepository.create({
                userId,
                businessId,
                item_name: item.name,
                quantity: item.quantity,
                cost_price: item.unitCost,
                selling_price: 0,
                last_purchase_cost: item.unitCost,
                reorder_level: 5,
            });
            inventoryItemId = savedData.id;
            newQuantity = item.quantity;
            newCostPrice = item.unitCost;
        } else {
            previousQuantity = inventoryItemData.quantity || 0;
            previousCostPrice = Number(inventoryItemData.cost_price) || 0;

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
        }

        await this.inventoryMovementRepository.create({
            inventoryItemId,
            businessId,
            userId,
            movementType: 'IN',
            quantity: item.quantity,
            unitCost: item.unitCost,
            totalCost: item.quantity * item.unitCost,
            quantityBefore: previousQuantity,
            quantityAfter: newQuantity,
            costPriceBefore: previousCostPrice,
            costPriceAfter: newCostPrice,
            referenceType: 'PURCHASE',
            referenceId: purchaseId,
            reason: `Purchase of ${item.name}`,
            notes: notes || '',
            metadata: {
                unitCost: item.unitCost,
                previousCostPrice,
                newCostPrice,
            },
            createdAt: purchaseDateObj,
        });

        return {
            name: item.name,
            previousQuantity,
            newQuantity,
            previousCostPrice,
            newCostPrice,
            lastPurchaseCost: item.unitCost,
            inventoryValue: newQuantity * newCostPrice,
        };
    }
}

module.exports = RecordPurchaseUseCase;