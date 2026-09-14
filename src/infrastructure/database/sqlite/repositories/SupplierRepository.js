// src/infrastructure/database/sqlite/repositories/SupplierRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

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

class SupplierRepository extends BaseRepository {
    constructor() {
        super('suppliers');
    }

    async create(supplierData) {
        const result = await this._query(
            `INSERT INTO suppliers (
                business_id, name, phone, email, address, tax_id, notes, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id`,
            [
                supplierData.businessId,
                supplierData.name,
                supplierData.phone || null,
                supplierData.email || null,
                supplierData.address || null,
                supplierData.taxId || null,
                supplierData.notes || '',
                JSON.stringify(supplierData.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM suppliers WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM suppliers WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

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
            'SELECT * FROM suppliers WHERE business_id = $1 AND name = $2',
            [businessId, name]
        );
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
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
            `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Supplier not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM suppliers WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM suppliers WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.search) {
            query += ` AND (name LIKE $${i} OR phone LIKE $${i} OR email LIKE $${i})`;
            params.push(`%${filters.search}%`);
            i++;
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }

    _hydrate(row) {
        return new Supplier({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            phone: row.phone,
            email: row.email,
            address: row.address,
            taxId: row.tax_id,
            notes: row.notes,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = SupplierRepository;