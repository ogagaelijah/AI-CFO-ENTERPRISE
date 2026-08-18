// src/domain/entities/InventoryItem.js

class InventoryItem {
    constructor({
        id,
        businessId,
        name,
        category = null,
        sku = null,
        quantity = 0,
        reorderLevel = 5,
        costPrice = 0,
        sellingPrice = 0,
        unit = 'unit',
        location = null,
        supplierId = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.name = name;
        this.category = category;
        this.sku = sku;
        this.quantity = quantity;
        this.reorderLevel = reorderLevel;
        this.costPrice = costPrice;
        this.sellingPrice = sellingPrice;
        this.unit = unit;
        this.location = location;
        this.supplierId = supplierId;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getProfitPerUnit() {
        return this.sellingPrice - this.costPrice;
    }

    getProfitMargin() {
        if (this.costPrice === 0) return 0;
        return ((this.getProfitPerUnit() / this.costPrice) * 100);
    }

    getTotalCostValue() {
        return this.quantity * this.costPrice;
    }

    getTotalSellingValue() {
        return this.quantity * this.sellingPrice;
    }

    getTotalProfit() {
        return this.quantity * this.getProfitPerUnit();
    }

    isLowStock() {
        return this.quantity <= this.reorderLevel;
    }

    isOutOfStock() {
        return this.quantity <= 0;
    }

    addStock(quantity) {
        if (quantity <= 0) throw new Error('Quantity must be positive');
        this.quantity += quantity;
        this.updatedAt = new Date();
        return this;
    }

    removeStock(quantity) {
        if (quantity <= 0) throw new Error('Quantity must be positive');
        if (this.quantity < quantity) throw new Error(`Insufficient stock. Available: ${this.quantity}, Requested: ${quantity}`);
        this.quantity -= quantity;
        this.updatedAt = new Date();
        return this;
    }

    setQuantity(quantity) {
        if (quantity < 0) throw new Error('Quantity cannot be negative');
        this.quantity = quantity;
        this.updatedAt = new Date();
        return this;
    }

    updatePrice(costPrice, sellingPrice) {
        if (costPrice !== undefined) this.costPrice = costPrice;
        if (sellingPrice !== undefined) this.sellingPrice = sellingPrice;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            name: this.name,
            category: this.category,
            sku: this.sku,
            quantity: this.quantity,
            reorderLevel: this.reorderLevel,
            costPrice: this.costPrice,
            sellingPrice: this.sellingPrice,
            unit: this.unit,
            location: this.location,
            supplierId: this.supplierId,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = InventoryItem;