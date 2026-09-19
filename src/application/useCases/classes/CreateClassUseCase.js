// src/application/useCases/classes/CreateClassUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateClassUseCase {
    constructor({ classRepository }) {
        this.classRepository = classRepository;
    }

    async execute({
        businessId,
        name,
        level = null,
        termFee = 0,
        description = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!name || !String(name).trim()) {
            throw new Error('Class name is required');
        }

        // Guard: prevent duplicate class names within the same business.
        const existing = await this.classRepository.findByName(businessId, name);
        if (existing) {
            throw new Error(`A class named "${existing.name}" already exists`);
        }

        const Class = require('../../../domain/entities/Class');
        const klass = new Class({
            businessId,
            name,
            level,
            termFee,
            description,
            status: 'ACTIVE',
            metadata,
        });

        const saved = await withTransaction(async () => {
            return await this.classRepository.create(klass);
        });

        return {
            success: true,
            class: saved.toJSON(),
            message: `Class "${saved.name}" created`,
        };
    }
}

module.exports = CreateClassUseCase;