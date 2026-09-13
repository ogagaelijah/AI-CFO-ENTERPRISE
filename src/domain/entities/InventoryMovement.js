// src/domain/entities/InventoryMovement.js
// Domain entity for the inventory_movements ledger table.
// Matches the schema created in migration 022.

class InventoryMovement {
    constructor({
        id = null,
        inventoryItemId,
        businessId,
        userId,
        movementType, // IN | OUT | ADJUSTMENT_IN | ADJUSTMENT_OUT | DAMAGE | LOSS | RETURN | TRANSFER
        quantity,
        unitCost = 0,
        totalCost = 0,
        quantityBefore = 0,
        quantityAfter = 0,
        costPriceBefore = 0,
        costPriceAfter = 0,
        referenceType = null,
        referenceId = null,
        reason = '',
        notes = '',
        metadata = {},
        createdAt = new Date(),
    }) {
        this.id = id;
        this.inventoryItemId = inventoryItemId;
        this.businessId = businessId;
        this.userId = userId;
        this.movementType = movementType;
        this.quantity = quantity;
        this.unitCost = unitCost;
        this.totalCost = totalCost;
        this.quantityBefore = quantityBefore;
        this.quantityAfter = quantityAfter;
        this.costPriceBefore = costPriceBefore;
        this.costPriceAfter = costPriceAfter;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.reason = reason;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
    }

    isStockIn() {
        return this.movementType === 'IN' || this.movementType === 'ADJUSTMENT_IN' || this.movementType === 'RETURN';
    }

    isStockOut() {
        return this.movementType === 'OUT' || this.movementType === 'ADJUSTMENT_OUT' || this.movementType === 'DAMAGE' || this.movementType === 'LOSS';
    }

    getQuantityChange() {
        return this.isStockOut() ? -this.quantity : this.quantity;
    }

    toJSON() {
        return {
            id: this.id,
            inventoryItemId: this.inventoryItemId,
            businessId: this.businessId,
            userId: this.userId,
            movementType: this.movementType,
            quantity: this.quantity,
            unitCost: this.unitCost,
            totalCost: this.totalCost,
            quantityBefore: this.quantityBefore,
            quantityAfter: this.quantityAfter,
            costPriceBefore: this.costPriceBefore,
            costPriceAfter: this.costPriceAfter,
            referenceType: this.referenceType,
            referenceId: this.referenceId,
            reason: this.reason,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
        };
    }
}

module.exports = InventoryMovement;