// src/domain/entities/Customer.js
// v1.1.0-prod — Removed taxId. Added DONOR display type.

class Customer {
    constructor({
        id,
        businessId,
        name,
        phone = null,
        email = null,
        address = null,
        type = 'CUSTOMER', // CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT, DONOR
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
        this.type = type;
        this.notes = notes;
        this.metadata = metadata;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    getDisplayType() {
        const types = {
            CUSTOMER: 'Customer',
            PATIENT: 'Patient',
            CLIENT: 'Client',
            TENANT: 'Tenant',
            STUDENT: 'Student',
            DONOR: 'Donor',
        };
        return types[this.type] || this.type;
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
            type: this.type,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Customer;