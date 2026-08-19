// src/infrastructure/database/sqlite/repositories/CustomerRepository.js

const BaseRepository = require('./BaseRepository');

// ✅ Define Customer class directly inside this file (no require needed)
class Customer {
    constructor({
        id,
        businessId,
        name,
        phone = null,
        email = null,
        address = null,
        type = 'CUSTOMER',
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
        this.type = type;
        this.taxId = taxId;
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
            taxId: this.taxId,
            notes: this.notes,
            metadata: this.metadata,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

class CustomerRepository extends BaseRepository {
    constructor() {
        super('customers');
    }

    create(customerData) {
        const stmt = this.db.prepare(`
            INSERT INTO customers (
                business_id, name, phone, email, address, type, tax_id, notes, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            customerData.businessId,
            customerData.name,
            customerData.phone || null,
            customerData.email || null,
            customerData.address || null,
            customerData.type || 'CUSTOMER',
            customerData.taxId || null,
            customerData.notes || '',
            JSON.stringify(customerData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const result = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM customers WHERE business_id = ?';
        const params = [businessId];

        if (options.type) {
            query += ' AND type = ?';
            params.push(options.type);
        }

        if (options.search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchTerm = `%${options.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        query += ' ORDER BY name ASC';

        if (options.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
        }

        if (options.offset) {
            query += ' OFFSET ?';
            params.push(options.offset);
        }

        const results = this.db.prepare(query).all(...params);
        return results.map(r => this._hydrate(r));
    }

    findByName(businessId, name) {
        const result = this.db.prepare(
            'SELECT * FROM customers WHERE business_id = ? AND name = ?'
        ).get(businessId, name);

        if (!result) return null;
        return this._hydrate(result);
    }

    findByType(businessId, type, options = {}) {
        return this.findByBusinessId(businessId, { ...options, type });
    }

    search(businessId, searchTerm, options = {}) {
        return this.findByBusinessId(businessId, { ...options, search: searchTerm });
    }

    update(id, data) {
        const fields = [];
        const values = [];

        if (data.name !== undefined) {
            fields.push('name = ?');
            values.push(data.name);
        }
        if (data.phone !== undefined) {
            fields.push('phone = ?');
            values.push(data.phone);
        }
        if (data.email !== undefined) {
            fields.push('email = ?');
            values.push(data.email);
        }
        if (data.address !== undefined) {
            fields.push('address = ?');
            values.push(data.address);
        }
        if (data.type !== undefined) {
            fields.push('type = ?');
            values.push(data.type);
        }
        if (data.taxId !== undefined) {
            fields.push('tax_id = ?');
            values.push(data.taxId);
        }
        if (data.notes !== undefined) {
            fields.push('notes = ?');
            values.push(data.notes);
        }
        if (data.metadata !== undefined) {
            fields.push('metadata = ?');
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = CURRENT_TIMESTAMP');

        if (fields.length === 0) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const stmt = this.db.prepare(
            `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Customer not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM customers WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM customers WHERE business_id = ?';
        const params = [businessId];

        if (filters.type) {
            query += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    getHistory(customerId, options = {}) {
        const customer = this.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        return {
            customer: customer.toJSON(),
            totalTransactions: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalUnpaid: 0,
            paidCount: 0,
            unpaidCount: 0,
        };
    }

    _hydrate(row) {
        return new Customer({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            type: row.type,
            taxId: row.tax_id,
            notes: row.notes,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = CustomerRepository;