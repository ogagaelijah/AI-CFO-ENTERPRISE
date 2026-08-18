// src/infrastructure/database/sqlite/repositories/CustomerRepository.js

const BaseRepository = require('./BaseRepository');

class CustomerRepository extends BaseRepository {
    constructor() {
        super('customers');
    }

    /**
     * Create a new customer
     * @param {Object} customerData - Customer entity data
     * @returns {Promise<Object>} Created customer
     */
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

    /**
     * Find customer by ID
     * @param {string|number} id - Customer ID
     * @returns {Promise<Object|null>} Customer or null
     */
    findById(id) {
        const result = this.db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find customers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} options - { limit, offset, type, search }
     * @returns {Promise<Array>} Array of customers
     */
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

    /**
     * Find customer by name
     * @param {string|number} businessId - Business ID
     * @param {string} name - Customer name
     * @returns {Promise<Object|null>} Customer or null
     */
    findByName(businessId, name) {
        const result = this.db.prepare(
            'SELECT * FROM customers WHERE business_id = ? AND name = ?'
        ).get(businessId, name);

        if (!result) return null;
        return this._hydrate(result);
    }

    /**
     * Find customers by type
     * @param {string|number} businessId - Business ID
     * @param {string} type - CUSTOMER, PATIENT, CLIENT, TENANT, STUDENT
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of customers
     */
    findByType(businessId, type, options = {}) {
        return this.findByBusinessId(businessId, { ...options, type });
    }

    /**
     * Search customers
     * @param {string|number} businessId - Business ID
     * @param {string} searchTerm - Search term
     * @param {Object} options - { limit, offset }
     * @returns {Promise<Array>} Array of customers
     */
    search(businessId, searchTerm, options = {}) {
        return this.findByBusinessId(businessId, { ...options, search: searchTerm });
    }

    /**
     * Update a customer
     * @param {string|number} id - Customer ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated customer
     */
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

    /**
     * Delete a customer
     * @param {string|number} id - Customer ID
     * @returns {Promise<boolean>} True if deleted
     */
    delete(id) {
        const stmt = this.db.prepare('DELETE FROM customers WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    /**
     * Count customers by business ID
     * @param {string|number} businessId - Business ID
     * @param {Object} filters - { type, search }
     * @returns {Promise<number>} Count of customers
     */
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

    /**
     * Get customer history summary
     * @param {string|number} customerId - Customer ID
     * @param {Object} options - { startDate, endDate }
     * @returns {Promise<Object>} Summary with total sales, payments, etc.
     */
    getHistory(customerId, options = {}) {
        const customer = this.findById(customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        let query = `
            SELECT
                COUNT(*) as total_transactions,
                SUM(amount) as total_amount,
                COUNT(CASE WHEN payment_status = 'PAID' THEN 1 END) as paid_count,
                COUNT(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN 1 END) as unpaid_count,
                SUM(CASE WHEN payment_status = 'PAID' THEN amount ELSE 0 END) as total_paid,
                SUM(CASE WHEN payment_status IN ('UNPAID', 'PARTIAL') THEN amount ELSE 0 END) as total_unpaid
            FROM transactions
            WHERE business_id = ? AND metadata LIKE ?
        `;

        const params = [
            customer.businessId,
            `%"customerId":${customerId}%`
        ];

        if (options.startDate) {
            query += ' AND date >= ?';
            params.push(options.startDate.toISOString());
        }

        if (options.endDate) {
            query += ' AND date <= ?';
            params.push(options.endDate.toISOString());
        }

        const result = this.db.prepare(query).get(...params);

        return {
            customer: customer.toJSON(),
            totalTransactions: result?.total_transactions || 0,
            totalAmount: result?.total_amount || 0,
            totalPaid: result?.total_paid || 0,
            totalUnpaid: result?.total_unpaid || 0,
            paidCount: result?.paid_count || 0,
            unpaidCount: result?.unpaid_count || 0,
        };
    }

    /**
     * Hydrate database row to entity
     * @param {Object} row - Database row
     * @returns {Object} Customer entity
     */
    _hydrate(row) {
        const Customer = require('../../../domain/entities/Customer');
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