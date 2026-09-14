// src/infrastructure/database/sqlite/repositories/ProjectRepository.js
// Postgres async. Same logic as SQLite.

const BaseRepository = require('./BaseRepository');

class ProjectRepository extends BaseRepository {
    constructor() {
        super('projects');
    }

    async create(projectData) {
        const result = await this._query(
            `INSERT INTO projects (
                business_id, name, description, status, budget,
                start_date, end_date, customer_id, customer_type,
                notes, metadata
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING id`,
            [
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
                JSON.stringify(projectData.metadata || {}),
            ]
        );
        return this.findById(result.rows[0].id);
    }

    async findById(id) {
        const result = await this._query('SELECT * FROM projects WHERE id = $1', [id]);
        if (!result.rows[0]) return null;
        return this._hydrate(result.rows[0]);
    }

    async findByBusinessId(businessId, options = {}) {
        let query = 'SELECT * FROM projects WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (options.status) {
            query += ` AND status = $${i++}`;
            params.push(options.status);
        }
        if (options.search) {
            query += ` AND (name LIKE $${i} OR description LIKE $${i})`;
            params.push(`%${options.search}%`);
            i++;
        }

        query += ' ORDER BY created_at DESC';

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

    async findByStatus(businessId, status, options = {}) {
        return this.findByBusinessId(businessId, { ...options, status });
    }

    async findByCustomer(businessId, customerId, options = {}) {
        let query = 'SELECT * FROM projects WHERE business_id = $1 AND customer_id = $2';
        const params = [businessId, customerId];
        let i = 3;

        if (options.status) {
            query += ` AND status = $${i++}`;
            params.push(options.status);
        }

        query += ' ORDER BY created_at DESC';

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

    async search(businessId, searchTerm, options = {}) {
        return this.findByBusinessId(businessId, { ...options, search: searchTerm });
    }

    async update(id, data) {
        const fields = [];
        const values = [];
        let i = 1;

        if (data.name !== undefined) {
            fields.push(`name = $${i++}`);
            values.push(data.name);
        }
        if (data.description !== undefined) {
            fields.push(`description = $${i++}`);
            values.push(data.description);
        }
        if (data.status !== undefined) {
            fields.push(`status = $${i++}`);
            values.push(data.status);
        }
        if (data.budget !== undefined) {
            fields.push(`budget = $${i++}`);
            values.push(data.budget);
        }
        if (data.startDate !== undefined) {
            fields.push(`start_date = $${i++}`);
            values.push(data.startDate ? data.startDate.toISOString() : null);
        }
        if (data.endDate !== undefined) {
            fields.push(`end_date = $${i++}`);
            values.push(data.endDate ? data.endDate.toISOString() : null);
        }
        if (data.customerId !== undefined) {
            fields.push(`customer_id = $${i++}`);
            values.push(data.customerId);
        }
        if (data.customerType !== undefined) {
            fields.push(`customer_type = $${i++}`);
            values.push(data.customerType);
        }
        if (data.notes !== undefined) {
            fields.push(`notes = $${i++}`);
            values.push(data.notes);
        }
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
            `UPDATE projects SET ${fields.join(', ')} WHERE id = $${i}`,
            values
        );

        if (result.rowCount === 0) {
            throw new Error('Project not found or no changes made');
        }

        return this.findById(id);
    }

    async delete(id) {
        const result = await this._query('DELETE FROM projects WHERE id = $1', [id]);
        return result.rowCount > 0;
    }

    async countByBusinessId(businessId, filters = {}) {
        let query = 'SELECT COUNT(*)::int as count FROM projects WHERE business_id = $1';
        const params = [businessId];
        let i = 2;

        if (filters.status) {
            query += ` AND status = $${i++}`;
            params.push(filters.status);
        }
        if (filters.search) {
            query += ` AND (name LIKE $${i} OR description LIKE $${i})`;
            params.push(`%${filters.search}%`);
            i++;
        }

        const result = await this._query(query, params);
        return result.rows[0]?.count || 0;
    }

    async getFinancialSummary(projectId) {
        const project = await this.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

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
        const Project = require('../../../../domain/entities/Project');
        return new Project({
            id: row.id,
            businessId: row.business_id,
            name: row.name,
            description: row.description,
            status: row.status,
            budget: Number(row.budget) || 0,
            startDate: new Date(row.start_date),
            endDate: row.end_date ? new Date(row.end_date) : null,
            customerId: row.customer_id,
            customerType: row.customer_type,
            notes: row.notes,
            metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : {},
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
        });
    }
}

module.exports = ProjectRepository;