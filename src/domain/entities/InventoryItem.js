// src/domain/entities/InventoryItem.js

class InventoryItem {
    constructor({
        id,
        userId,
        businessId,
        name,
        category = null,
        sku = null,
        quantity = 0,
        reorderLevel = 5,
        costPrice = 0,
        sellingPrice = 0,
        lastPurchaseCost = 0,  // ✅ NEW: actual cost of most recent purchase
        unit = 'unit',
        location = null,
        supplierId = null,
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
        // ✅ Support snake_case from database
        user_id,
        business_id,
        item_name,
        reorder_level,
        cost_price,
        selling_price,
        last_purchase_cost,  // ✅ NEW
        supplier_id,
        created_at,
        updated_at,
    }) {
        this.id = id || null;
        this.userId = userId || user_id;
        this.businessId = businessId || business_id;
        this.name = name || item_name;
        this.category = category || null;
        this.sku = sku || null;
        this.quantity = quantity || 0;
        this.reorderLevel = reorderLevel || reorder_level || 5;
        this.costPrice = costPrice || cost_price || 0;
        this.sellingPrice = sellingPrice || selling_price || 0;
        this.lastPurchaseCost = lastPurchaseCost || last_purchase_cost || 0;  // ✅ NEW
        this.unit = unit || 'unit';
        this.location = location || null;
        this.supplierId = supplierId || supplier_id || null;
        this.metadata = metadata || {};
        this.createdAt = createdAt || created_at || new Date();
        this.updatedAt = updatedAt || updated_at || new Date();
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

    // ✅ NEW: Update average cost and last purchase cost on purchase
    updateCostOnPurchase(quantity, unitCost) {
        if (quantity <= 0) throw new Error('Quantity must be positive');
        if (unitCost <= 0) throw new Error('Unit cost must be positive');
        
        // Store last purchase cost
        this.lastPurchaseCost = unitCost;
        
        // Calculate new weighted average cost
        const totalCurrentValue = this.quantity * this.costPrice;
        const totalNewValue = quantity * unitCost;
        const totalQuantity = this.quantity + quantity;
        this.costPrice = totalQuantity > 0 ? (totalCurrentValue + totalNewValue) / totalQuantity : unitCost;
        this.quantity = totalQuantity;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            user_id: this.userId,
            business_id: this.businessId,
            item_name: this.name,
            quantity: this.quantity,
            reorder_level: this.reorderLevel,
            cost_price: this.costPrice,
            selling_price: this.sellingPrice,
            last_purchase_cost: this.lastPurchaseCost,  // ✅ NEW
            unit: this.unit,
            location: this.location,
            supplier_id: this.supplierId,
            metadata: this.metadata,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }
}

module.exports = InventoryItem;