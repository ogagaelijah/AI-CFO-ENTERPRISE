// src/infrastructure/database/sqlite/repositories/BusinessRepository.js

const BaseRepository = require('./BaseRepository');

// ✅ SIMPLE: Define Business class directly inside the repository
class Business {
    constructor(data) {
        this.id = data.id || null;
        this.userId = data.userId || null;
        this.name = data.name || null;
        this.industry = data.industry || null;
        this.categories = data.categories || {};
        this.features = data.features || {};
        this.setupCompleted = data.setupCompleted || false;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = data.updatedAt || new Date();
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            name: this.name,
            industry: this.industry,
            categories: this.categories,
            features: this.features,
            setupCompleted: this.setupCompleted,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

class BusinessRepository extends BaseRepository {
    constructor() {
        super('businesses');
    }

    toEntity(row) {
        if (!row) return null;
        return new Business({
            id: row.id,
            userId: row.user_id,
            name: row.name,
            industry: row.industry,
            categories: row.categories ? JSON.parse(row.categories) : {},
            features: row.features ? JSON.parse(row.features) : {},
            setupCompleted: row.setup_completed === 1,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    toDatabase(business) {
        return {
            user_id: business.userId,
            name: business.name,
            industry: business.industry,
            categories: business.categories ? JSON.stringify(business.categories) : null,
            features: business.features ? JSON.stringify(business.features) : null,
            setup_completed: business.setupCompleted ? 1 : 0,
        };
    }

    async save(business) {
        const data = this.toDatabase(business);
        if (business.id) {
            this.update(business.id, data);
            return this.findById(business.id);
        } else {
            const result = this.insert(data);
            return this.findById(result.id);
        }
    }

    findById(id) {
        const row = super.findById(id);
        return this.toEntity(row);
    }

    findByUserId(userId) {
        const rows = this.findByWhere('user_id = ?', [userId]);
        return rows.map(row => this.toEntity(row));
    }

    findPrimaryByUserId(userId) {
        const row = this.findOneByWhere('user_id = ? ORDER BY created_at ASC LIMIT 1', [userId]);
        return this.toEntity(row);
    }

    async update(business) {
        const data = this.toDatabase(business);
        this.update(business.id, data);
        return this.findById(business.id);
    }

    nameExistsForUser(userId, name) {
        return this.count('user_id = ? AND name = ?', [userId, name]) > 0;
    }
}

module.exports = BusinessRepository;