// src/application/useCases/classes/UpdateClassUseCase.js

class UpdateClassUseCase {
    constructor({ classRepository }) {
        this.classRepository = classRepository;
    }

    async execute({
        classId,
        businessId,
        name,
        level,
        termFee,
        description,
        status,
        metadata,
    }) {
        if (!classId) {
            throw new Error('Class ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.classRepository.findById(classId, businessId);
        if (!existing) {
            throw new Error('Class not found');
        }

        // If renaming, verify the new name doesn't collide.
        if (name !== undefined && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
            const duplicate = await this.classRepository.findByName(businessId, name);
            if (duplicate && duplicate.id !== existing.id) {
                throw new Error(`A class named "${duplicate.name}" already exists`);
            }
        }

        const updateData = {};
        if (name !== undefined) updateData.name = String(name).trim();
        if (level !== undefined) updateData.level = level;
        if (termFee !== undefined) {
            const fee = Number(termFee);
            if (!Number.isFinite(fee) || fee < 0) {
                throw new Error('termFee must be a non-negative number');
            }
            updateData.termFee = fee;
        }
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) {
            const VALID = ['ACTIVE', 'ARCHIVED'];
            const norm = String(status).toUpperCase();
            if (!VALID.includes(norm)) {
                throw new Error(`Invalid status. Must be one of: ${VALID.join(', ')}`);
            }
            updateData.status = norm;
        }
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                class: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.classRepository.update(classId, businessId, updateData);

        return {
            success: true,
            class: updated.toJSON(),
            message: 'Class updated',
        };
    }
}

module.exports = UpdateClassUseCase;