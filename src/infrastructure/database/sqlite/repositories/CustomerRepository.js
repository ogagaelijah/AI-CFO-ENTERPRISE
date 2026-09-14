// src/infrastructure/database/sqlite/repositories/CustomerRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

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

    async create(customerData) {
        const result = await this._query(
            `INSERT INTO customers (
                business_id, name, phone, email, address, type, tax_id, notes, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [
                customerData.businessId,
                customerData.name,
                customerData.phone || null,
                customerData.email || null,
                customerData.address || null,
                customerData.type || 'CUSTOMER',
                customerData.taxId || null,
                customerData.notes || '',
                JSON.stringify(customerData.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM customers WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByUserId(userId) {
        const businessResult = await this._query(
            'SELECT id FROM businesses WHERE user_id = $1 LIMIT 1',
            [userId]
        );
        if (!businessResult.rows[0]) return [];
        return this.findByBusinessId(businessResult.rows[0].id);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM customers WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.type) {
            query += ` AND type = $${i++}`;
            params.push(options.type);
        }

        if (options.search) {
            query += ` AND (name LIKE $${i} OR phone LIKE $${i} OR email LIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        query += ' ORDER BY name ASC';

        if (options.limit) {
            query += ` LIMIT $${i++}`;
            params.push(options.limit);
        }

        if (options.offset) {
            query += ` OFFSET $${i++}`;
            params.push(options.offset);
        }

        const result = await this._query(query, params);
        return result.rows.map(r => this._hydrate(r));
    }

    async findByName(businessId, name) {
        const result = await this._query(
            'SELECT * FROM customers WHERE business_id = $1 AND name = $2',
            [businessId, name]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByNameIgnoreCase(businessId, name) {
        const result = await this._query(
            'SELECT * FROM customers WHERE business_id = $1 AND LOWER(name) = LOWER($2)',
            [businessId, name]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByType(businessId, type, options = {}) {
        return this.findByBusinessId(businessId, { ...options, type });
    }

    async search(businessId, searchTerm, options = {}) {
        return this.findByBusinessId(businessId, { ...options, search: searchTerm });
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.name !== undefined) { fields.push(`name = $${i++}`); values.push(data.name); }
        if (data.phone !== undefined) { fields.push(`phone = $${i++}`); values.push(data.phone); }
        if (data.email !== undefined) { fields.push(`email = $${i++}`); values.push(data.email); }
        if (data.address !== undefined) { fields.push(`address = $${i++}`); values.push(data.address); }
        if (data.type !== undefined) { fields.push(`type = $${i++}`); values.push(data.type); }
        if (data.taxId !== undefined) { fields.push(`tax_id = $${i++}`); values.push(data.taxId); }
        if (data.notes !== undefined) { fields.push(`notes = $${i++}`); values.push(data.notes); }
        if (data.metadata !== undefined) {
            fields.push(`metadata = $${i++}`);
            values.push(JSON.stringify(data.metadata));
        }

        fields.push('updated_at = NOW()');

        if (fields.length === 1) {
            throw new Error('No fields to update');
        }

        values.push(id);

        const result = await this._query(
            `UPDATE customers SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Customer not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM customers WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM customers WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.type) {
            query += ` AND type = $${i++}`;
            params.push(filters.type);
        }

        if (filters.search) {
            query += ` AND (name LIKE $${i} OR phone LIKE $${i} OR email LIKE $${i})`;
            params.push(`%${filters.search}%`);
            i++;
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }

    async getHistory(customerId, options = {}) {
        const customer = await this.findById(customerId);
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
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = CustomerRepository;