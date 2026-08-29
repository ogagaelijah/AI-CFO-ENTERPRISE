// src/infrastructure/database/sqlite/repositories/SupplierRepository.js

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
    constructor(db = null) {
        super('suppliers', db);
    }

    create(supplierData) {
        const stmt = this.db.prepare(`
            INSERT INTO suppliers (
                business_id, name, phone, email, address, tax_id, notes, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            supplierData.businessId,
            supplierData.name,
            supplierData.phone || null,
            supplierData.email || null,
            supplierData.address || null,
            supplierData.taxId || null,
            supplierData.notes || '',
            JSON.stringify(supplierData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const result = this.db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM suppliers WHERE business_id = ?';
        const params = [businessId];

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
            'SELECT * FROM suppliers WHERE business_id = ? AND name = ?'
        ).get(businessId, name);

        if (!result) return null;
        return this._hydrate(result);
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
            `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Supplier not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM suppliers WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM suppliers WHERE business_id = ?';
        const params = [businessId];

        if (filters.search) {
            query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm, searchTerm);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
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
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = SupplierRepository;