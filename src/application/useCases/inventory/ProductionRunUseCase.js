// src/application/useCases/inventory/ProductionRunUseCase.js

class ProductionRunUseCase {
    constructor({
        inventoryRepository,
        inventoryTransactionRepository,
    }) {
        this.inventoryRepository = inventoryRepository;
        this.inventoryTransactionRepository = inventoryTransactionRepository;
    }

    async execute({
        businessId,
        finishedGoodId,
        quantity,
        rawMaterials = [], // [{ id, quantity }]
        notes = '',
        productionDate = new Date(),
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!finishedGoodId) {
            throw new Error('Finished good ID is required');
        }

        if (!quantity || quantity <= 0) {
            throw new Error('Production quantity must be greater than zero');
        }

        if (!rawMaterials || rawMaterials.length === 0) {
            throw new Error('At least one raw material is required');
        }

        // Get finished good
        const finishedGood = await this.inventoryRepository.findById(finishedGoodId);
        if (!finishedGood) {
            throw new Error('Finished good not found');
        }

        if (finishedGood.businessId !== businessId) {
            throw new Error('Access denied: Finished good does not belong to this business');
        }

        // Validate raw materials
        const materialItems = [];
        for (const material of rawMaterials) {
            if (!material.id) {
                throw new Error('Raw material ID is required');
            }
            if (!material.quantity || material.quantity <= 0) {
                throw new Error('Raw material quantity must be greater than zero');
            }

            const item = await this.inventoryRepository.findById(material.id);
            if (!item) {
                throw new Error(`Raw material not found: ${material.id}`);
            }

            if (item.businessId !== businessId) {
                throw new Error(`Access denied: Raw material does not belong to this business`);
            }

            if (item.quantity < material.quantity) {
                throw new Error(
                    `Insufficient stock for "${item.name}". Available: ${item.quantity}, Required: ${material.quantity}`
                );
            }

            materialItems.push({ item, requestedQuantity: material.quantity });
        }

        // Record previous quantities for finished good
        const finishedGoodPreviousQuantity = finishedGood.quantity;

        // Add finished goods
        finishedGood.addStock(quantity);
        await this.inventoryRepository.update(finishedGood.id, finishedGood);

        // Record finished good transaction
        const InventoryTransaction = require('../../../domain/entities/InventoryTransaction');
        const finishedTransaction = new InventoryTransaction({
            inventoryItemId: finishedGood.id,
            businessId,
            type: 'IN',
            quantity: quantity,
            previousQuantity: finishedGoodPreviousQuantity,
            newQuantity: finishedGood.quantity,
            referenceType: 'PRODUCTION',
            referenceId: null,
            reason: `Production run completed`,
            notes,
        });

        await this.inventoryTransactionRepository.create(finishedTransaction);

        // Process raw materials
        const materialResults = [];
        for (const { item, requestedQuantity } of materialItems) {
            const previousQuantity = item.quantity;

            // Remove raw materials
            item.removeStock(requestedQuantity);
            await this.inventoryRepository.update(item.id, item);

            // Record raw material transaction
            const materialTransaction = new InventoryTransaction({
                inventoryItemId: item.id,
                businessId,
                type: 'OUT',
                quantity: requestedQuantity,
                previousQuantity,
                newQuantity: item.quantity,
                referenceType: 'PRODUCTION',
                referenceId: null,
                reason: `Raw materials used for production of ${finishedGood.name}`,
                notes,
            });

            await this.inventoryTransactionRepository.create(materialTransaction);

            materialResults.push({
                id: item.id,
                name: item.name,
                usedQuantity: requestedQuantity,
                remainingQuantity: item.quantity,
            });
        }

        return {
            success: true,
            finishedGood: finishedGood.toJSON(),
            quantityProduced: quantity,
            previousQuantity: finishedGoodPreviousQuantity,
            newQuantity: finishedGood.quantity,
            rawMaterialsUsed: materialResults,
            message: `Production run complete: ${quantity} units of ${finishedGood.name} produced`,
        };
    }
}

module.exports = ProductionRunUseCase;