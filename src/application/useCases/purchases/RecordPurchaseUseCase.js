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
        businessId,
        supplierId,
        invoiceNumber,
        items = [],
        totalAmount,
        paymentStatus = 'UNPAID',
        amountPaid = 0,
        dueDate = null,
        notes = '',
        purchaseDate = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!items || items.length === 0) {
            throw new Error('At least one item is required');
        }

        if (!totalAmount || totalAmount <= 0) {
            throw new Error('Total amount must be greater than zero');
        }

        // Validate supplier if provided
        if (supplierId) {
            const supplier = await this.supplierRepository.findById(supplierId);
            if (!supplier) {
                throw new Error('Supplier not found');
            }
        }

        // Calculate totals
        let calculatedTotal = 0;
        const purchaseItems = [];

        for (const item of items) {
            if (!item.name) {
                throw new Error('Item name is required');
            }
            if (!item.quantity || item.quantity <= 0) {
                throw new Error(`Quantity for "${item.name}" must be greater than zero`);
            }
            if (!item.costPrice || item.costPrice <= 0) {
                throw new Error(`Cost price for "${item.name}" must be greater than zero`);
            }

            const itemTotal = item.quantity * item.costPrice;
            calculatedTotal += itemTotal;

            purchaseItems.push({
                name: item.name,
                quantity: item.quantity,
                costPrice: item.costPrice,
                totalPrice: itemTotal,
                category: item.category || null,
                sku: item.sku || null,
            });
        }

        // Verify total matches calculated total
        if (Math.abs(calculatedTotal - totalAmount) > 0.01) {
            throw new Error(`Total amount (${totalAmount}) does not match calculated total (${calculatedTotal})`);
        }

        // Create purchase
        const purchase = new (require('../../../domain/entities/Purchase'))({
            businessId,
            supplierId,
            invoiceNumber,
            totalAmount,
            paymentStatus,
            items: purchaseItems,
            notes,
            purchaseDate,
            dueDate,
            metadata: { amountPaid },
        });

        const savedPurchase = await this.purchaseRepository.create(purchase);

        // Create transaction
        const transaction = new (require('../../../domain/entities/Transaction'))({
            businessId,
            type: 'PURCHASE',
            category: 'Purchase',
            amount: totalAmount,
            description: `Purchase ${invoiceNumber ? `#${invoiceNumber}` : ''}`,
            paymentStatus,
            referenceId: savedPurchase.id,
            referenceType: 'PURCHASE',
            date: purchaseDate,
            dueDate,
        });

        const savedTransaction = await this.transactionRepository.create(transaction);

        // Link purchase to transaction
        savedPurchase.transactionId = savedTransaction.id;
        await this.purchaseRepository.update(savedPurchase.id, savedPurchase);

        // Process inventory
        for (const item of purchaseItems) {
            // Find or create inventory item
            let inventoryItem = await this.inventoryRepository.findByName(businessId, item.name);

            if (!inventoryItem) {
                // Create new inventory item
                inventoryItem = new (require('../../../domain/entities/InventoryItem'))({
                    businessId,
                    name: item.name,
                    category: item.category || 'Purchased Goods',
                    quantity: 0,
                    costPrice: item.costPrice,
                    sellingPrice: 0,
                    reorderLevel: 5,
                });
                inventoryItem = await this.inventoryRepository.create(inventoryItem);
            }

            // Record previous quantity
            const previousQuantity = inventoryItem.quantity || 0;

            // Add stock
            inventoryItem.addStock(item.quantity);

            // Update cost price (weighted average or latest)
            // Option 1: Update to latest cost price (FIFO approach)
            // Option 2: Weighted average (use this approach)
            const totalCost = (inventoryItem.quantity * inventoryItem.costPrice) + (item.quantity * item.costPrice);
            const totalQuantity = inventoryItem.quantity;
            const newCostPrice = totalQuantity > 0 ? totalCost / totalQuantity : item.costPrice;

            inventoryItem.costPrice = newCostPrice;
            await this.inventoryRepository.update(inventoryItem.id, inventoryItem);

            // Record inventory transaction
            const inventoryTransaction = new (require('../../../domain/entities/InventoryTransaction'))({
                inventoryItemId: inventoryItem.id,
                businessId,
                type: 'IN',
                quantity: item.quantity,
                previousQuantity,
                newQuantity: inventoryItem.quantity,
                referenceType: 'PURCHASE',
                referenceId: savedPurchase.id,
                reason: `Purchase ${invoiceNumber ? `#${invoiceNumber}` : ''}`,
                notes: notes,
            });

            await this.inventoryTransactionRepository.create(inventoryTransaction);
        }

        // Create creditor if payment is not fully paid
        if (paymentStatus === 'UNPAID' || paymentStatus === 'PARTIAL') {
            const balanceRemaining = paymentStatus === 'PARTIAL'
                ? totalAmount - amountPaid
                : totalAmount;

            if (balanceRemaining > 0) {
                let creditor = await this.creditorRepository.findByReference(
                    businessId,
                    'PURCHASE',
                    savedPurchase.id
                );

                if (creditor) {
                    // Update existing creditor
                    creditor.originalAmount = totalAmount;
                    creditor.balanceRemaining = balanceRemaining;
                    creditor.amountPaid = amountPaid;
                    creditor.status = 'ACTIVE';
                    creditor.dueDate = dueDate || creditor.dueDate;
                    creditor.updatedAt = new Date();
                    await this.creditorRepository.update(creditor.id, creditor);
                } else {
                    // Create new creditor
                    creditor = new (require('../../../domain/entities/Creditor'))({
                        businessId,
                        referenceType: 'PURCHASE',
                        referenceId: savedPurchase.id,
                        supplierId,
                        originalAmount: totalAmount,
                        amountPaid,
                        balanceRemaining,
                        status: 'ACTIVE',
                        dueDate,
                        notes,
                    });

                    await this.creditorRepository.create(creditor);
                }
            }
        }

        return {
            success: true,
            purchase: savedPurchase.toJSON(),
            transaction: savedTransaction.toJSON(),
            items: purchaseItems,
            message: 'Purchase recorded successfully',
            creditor: paymentStatus === 'UNPAID' || paymentStatus === 'PARTIAL' ? {
                balanceRemaining: paymentStatus === 'PARTIAL' ? totalAmount - amountPaid : totalAmount,
                status: 'ACTIVE',
            } : null,
        };
    }
}

module.exports = RecordPurchaseUseCase;