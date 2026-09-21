// src/application/useCases/terms/UpdateTermUseCase.js

class UpdateTermUseCase {
    constructor({ termRepository }) {
        this.termRepository = termRepository;
    }

    async execute({
        termId,
        businessId,
        name,
        session,
        startDate,
        endDate,
        status,
        metadata,
    }) {
        if (!termId) {
            throw new Error('Term ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.termRepository.findById(termId, businessId);
        if (!existing) {
            throw new Error('Term not found');
        }

        // If renaming, verify no duplicate (business, session, name).
        if (name !== undefined && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
            const duplicate = await this.termRepository.findByBusinessAndName(
                businessId,
                session !== undefined ? String(session).trim() : existing.session,
                String(name).trim()
            );
            if (duplicate && duplicate.id !== existing.id) {
                throw new Error(`Term "${duplicate.name}" for ${duplicate.session} already exists`);
            }
        }

        const updateData = {};

        if (name !== undefined) updateData.name = String(name).trim();
        if (session !== undefined) updateData.session = String(session).trim();

        if (startDate !== undefined || endDate !== undefined) {
            const newStart = startDate !== undefined ? new Date(startDate) : existing.startDate;
            const newEnd = endDate !== undefined ? new Date(endDate) : existing.endDate;

            if (isNaN(newStart.getTime())) throw new Error('Invalid start date');
            if (isNaN(newEnd.getTime())) throw new Error('Invalid end date');
            if (newEnd < newStart) throw new Error('End date cannot be before start date');

            if (startDate !== undefined) updateData.startDate = newStart;
            if (endDate !== undefined) updateData.endDate = newEnd;
        }

        if (status !== undefined) {
            const VALID = ['ACTIVE', 'COMPLETED'];
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
                term: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.termRepository.update(termId, businessId, updateData);

        return {
            success: true,
            term: updated.toJSON(),
            message: 'Term updated',
        };
    }
}

module.exports = UpdateTermUseCase;