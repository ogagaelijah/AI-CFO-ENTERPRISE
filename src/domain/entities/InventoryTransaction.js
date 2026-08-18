// src/domain/entities/InventoryTransaction.js

class InventoryTransaction {
    constructor({
        id,
        inventoryItemId,
        businessId,
        type, // IN, OUT, ADJUSTMENT
        quantity,
        previousQuantity,
        newQuantity,
        referenceType = null, // SALE, PURCHASE, ADJUSTMENT, PRODUCTION
        referenceId = null,
        reason = '',
        notes = '',
        metadata = {},
        date = new Date(),
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.inventoryItemId = inventoryItemId;
        this.businessId = businessId;
        this.type = type;
        this.quantity = quantity;
        this.previousQuantity = previousQuantity;
        this.newQuantity = newQuantity;
        this.referenceType = referenceType;
        this.referenceId = referenceId;
        this.reason = reason;
        this.notes = notes;
        this.metadata = metadata;
        this.date = date;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    isStockIn() {
        return this.type === 'IN';
    }

    isStockOut() {
        return this.type === 'OUT';
    }

    isAdjustment() {
        return this.type === 'ADJUSTMENT';
    }

    getQuantityChange() {
        return this.quantity;
    }

    toJSON() {
        return {
            id: this.id,
            inventoryItemId: this.inventoryItemId,
            businessId: this.businessId,
            type: this.type,
            quantity: this.quantity,
            previousQuantity: this.previousQuantity,
            newQuantity: this.newQuantity,
            referenceType: this.referenceType,
            referenceId: this.referenceId,
            reason: this.reason,
            notes: this.notes,
            metadata: this.metadata,
            date: this.date,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = InventoryTransaction;