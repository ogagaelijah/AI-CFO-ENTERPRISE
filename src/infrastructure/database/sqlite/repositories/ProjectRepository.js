// src/infrastructure/database/sqlite/repositories/ProjectRepository.js

const BaseRepository = require('./BaseRepository');

class ProjectRepository extends BaseRepository {
    constructor() {
        super('projects');
    }

    create(projectData) {
        const stmt = this.db.prepare(`
            INSERT INTO projects (
                business_id, name, description, status, budget,
                start_date, end_date, customer_id, customer_type,
                notes, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            projectData.businessId,
            projectData.name,
            projectData.description || '',
            projectData.status || 'ACTIVE',
            projectData.budget || 0,
            projectData.startDate ? projectData.startDate.toISOString() : new Date().toISOString(),
            projectData.endDate ? projectData.endDate.toISOString() : null,
            projectData.customerId || null,
            projectData.customerType || null,
            projectData.notes || '',
            JSON.stringify(projectData.metadata || {})
        );

        return this.findById(result.lastInsertRowid);
    }

    findById(id) {
        const result = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
        if (!result) return null;
        return this._hydrate(result);
    }

    findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM projects WHERE business_id = ?';
        const params = [businessId];

        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        if (options.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${options.search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY created_at DESC';

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

    findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    findByCustomer(businessId, customerId, options = {}) {
        let query = 'SELECT * FROM projects WHERE business_id = ? AND customer_id = ?';
        const params = [businessId, customerId];

        if (options.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        query += ' ORDER BY created_at DESC';

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
        if (data.description !== undefined) {
            fields.push('description = ?');
            values.push(data.description);
        }
        if (data.status !== undefined) {
            fields.push('status = ?');
            values.push(data.status);
        }
        if (data.budget !== undefined) {
            fields.push('budget = ?');
            values.push(data.budget);
        }
        if (data.startDate !== undefined) {
            fields.push('start_date = ?');
            values.push(data.startDate.toISOString());
        }
        if (data.endDate !== undefined) {
            fields.push('end_date = ?');
            values.push(data.endDate ? data.endDate.toISOString() : null);
        }
        if (data.customerId !== undefined) {
            fields.push('customer_id = ?');
            values.push(data.customerId);
        }
        if (data.customerType !== undefined) {
            fields.push('customer_type = ?');
            values.push(data.customerType);
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
            `UPDATE projects SET ${fields.join(', ')} WHERE id = ?`
        );
        const result = stmt.run(...values);

        if (result.changes === 0) {
            throw new Error('Project not found or no changes made');
        }

        return this.findById(id);
    }

    delete(id) {
        const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*) as count FROM projects WHERE business_id = ?';
        const params = [businessId];

        if (filters.status) {
            query += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.search) {
            query += ' AND (name LIKE ? OR description LIKE ?)';
            const searchTerm = `%${filters.search}%`;
            params.push(searchTerm, searchTerm);
        }

        const result = this.db.prepare(query).get(...params);
        return result?.count || 0;
    }

    getFinancialSummary(projectId) {
        const project = this.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // This would need to query sales, purchases, and expenses linked to this project
        // For now, return a basic summary
        return {
            projectId: project.id,
            name: project.name,
            budget: project.budget,
            totalRevenue: 0,
            totalCosts: 0,
            totalProfit: 0,
            status: project.status,
        };
    }

    _hydrate(row) {
        const Project = require('../../../domain/entities/Project');
        return new Project({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            description: row.description,
            status: row.status,
            budget: row.budget,
            startDate: new Date(row.start_date),
            endDate: row.end_date ? new Date(row.end_date) : null,
            customerId: row.customer_id,
            customerType: row.customer_type,
            notes: row.notes,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = ProjectRepository;