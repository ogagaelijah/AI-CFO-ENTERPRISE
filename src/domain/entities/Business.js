// src/domain/entities/Business.js

class Business {
    constructor({
        id,
        userId,
        name,
        industry,
        categories = {},
        features = {},
        setupCompleted = false,
        createdAt = new Date(),
        updatedAt = new Date(),
    }) {
        this.id = id || null;
        this.userId = userId;
        this.name = name;
        this.industry = industry;
        this.categories = categories;
        this.features = features;
        this.setupCompleted = setupCompleted;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    hasFeature(feature) {
        return this.features[feature] || false;
    }

    completeSetup() {
        this.setupCompleted = true;
        this.updatedAt = new Date();
        return this;
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

module.exports = Business;