// src/domain/entities/Supplier.js

class Supplier {
    constructor({
        id,
        businessId,
        name,
        phone = null,
        email = null,
        address = null,
        taxId = null,
        notes = '',
        metadata = {},
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.businessId = businessId;
        this.name = name;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.taxId = taxId;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    updateContact(phone, email, address) {
        if (phone !== undefined) this.phone = phone;
        if (email !== undefined) this.email = email;
        if (address !== undefined) this.address = address;
        this.updatedAt = new Date();
        return this;
    }

    toJSON() {
        return {
            id: this.id,
            businessId: this.businessId,
            name: this.name,
            phone: this.phone,
            email: this.email,
            address: this.address,
            taxId: this.taxId,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Supplier;