// src/domain/entities/Sale.js

class Sale {
    constructor({
        id,
        userId,
        businessId,
        itemName,
        quantity,
        unitPrice,
        totalPrice,
        customerName,
        customerId = null,
        customerType = 'CUSTOMER', // CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
        paymentStatus = 'UNPAID', // PAID, PARTIAL, UNPAID
        amountPaid = 0,
        balanceRemaining,
        saleDate = new Date(),
        createdAt = new Date(),
        updatedAt = new Date(),
        // 🆕 Cost tracking fields
        unitCost = 0,
        cogs = 0,
        grossProfit = 0,
        marginPercentage = 0,
    }) {
        this.id = id || null;
        this.userId = userId;
        this.businessId = businessId;
        this.itemName = itemName;
        this.quantity = quantity;
        this.unitPrice = unitPrice;
        this.totalPrice = totalPrice || (quantity * unitPrice);
        this.customerName = customerName;
        this.customerId = customerId;
        this.customerType = customerType;
        this.paymentStatus = paymentStatus;
        this.amountPaid = amountPaid || 0;
        this.balanceRemaining = balanceRemaining || (this.totalPrice - this.amountPaid);
        this.saleDate = saleDate;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        
        // 🆕 Cost tracking
        this.unitCost = unitCost || 0;
        this.cogs = cogs || (quantity * unitCost);
        this.grossProfit = grossProfit || (this.totalPrice - this.cogs);
        this.marginPercentage = marginPercentage || 
            (this.totalPrice > 0 ? (this.grossProfit / this.totalPrice) * 100 : 0);
    }

    // =============================================
    // Getters for calculated fields
    // =============================================

    get subtotal() {
        return this.totalPrice;
    }

    get amountPaidValue() {
        return this.amountPaid || 0;
    }

    get balance() {
        return this.balanceRemaining || (this.totalPrice - this.amountPaidValue);
    }

    isFullyPaid() {
        return this.paymentStatus === 'PAID';
    }

    isUnpaid() {
        return this.paymentStatus === 'UNPAID' || this.paymentStatus === 'PARTIAL';
    }

    isOverdue() {
        // Would need dueDate field
        return false;
    }

    // =============================================
    // 🆕 Cost-related methods for reporting
    // =============================================

    get margin() {
        return this.marginPercentage || 
            (this.totalPrice > 0 ? (this.grossProfit / this.totalPrice) * 100 : 0);
    }

    get hasCostData() {
        return this.unitCost > 0 || this.cogs > 0;
    }

    // Mark methods
    markAsPaid() {
        this.paymentStatus = 'PAID';
        this.amountPaid = this.totalPrice;
        this.balanceRemaining = 0;
        this.updatedAt = new Date();
        return this;
    }

    markAsPartial(amountPaid) {
        this.paymentStatus = 'PARTIAL';
        this.amountPaid = amountPaid;
        this.balanceRemaining = this.totalPrice - amountPaid;
        this.updatedAt = new Date();
        return this;
    }

    // =============================================
    // 🆕 Snapshot cost from inventory item
    // =============================================

    static fromInventoryItem(userId, inventoryItem, saleData) {
        const unitCost = inventoryItem?.cost_price || 0;
        const quantity = saleData.quantity;
        const unitPrice = saleData.unitPrice || inventoryItem?.selling_price || 0;
        const totalPrice = quantity * unitPrice;
        const cogs = quantity * unitCost;
        const grossProfit = totalPrice - cogs;
        const marginPercentage = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;

        return new Sale({
            userId,
            businessId: saleData.businessId,
            itemName: saleData.itemName || inventoryItem?.item_name,
            quantity,
            unitPrice,
            totalPrice,
            customerName: saleData.customerName,
            customerId: saleData.customerId,
            customerType: saleData.customerType || 'CUSTOMER',
            paymentStatus: saleData.paymentStatus || 'UNPAID',
            amountPaid: saleData.amountPaid || 0,
            saleDate: saleData.saleDate || new Date(),
            // Cost data
            unitCost,
            cogs,
            grossProfit,
            marginPercentage,
        });
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            businessId: this.businessId,
            itemName: this.itemName,
            quantity: this.quantity,
            unitPrice: this.unitPrice,
            totalPrice: this.totalPrice,
            customerName: this.customerName,
            customerId: this.customerId,
            customerType: this.customerType,
            paymentStatus: this.paymentStatus,
            amountPaid: this.amountPaid,
            balanceRemaining: this.balanceRemaining,
            saleDate: this.saleDate,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            // Cost data
            unitCost: this.unitCost,
            cogs: this.cogs,
            grossProfit: this.grossProfit,
            marginPercentage: this.marginPercentage,
        };
    }
}

module.exports = Sale;