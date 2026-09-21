// src/application/useCases/terms/CreateTermUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateTermUseCase {
    constructor({ termRepository }) {
        this.termRepository = termRepository;
    }

    async execute({
        businessId,
        name,
        session,
        startDate,
        endDate,
        status = 'ACTIVE',
        metadata = {},
        setAsActive = false,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!name || !String(name).trim()) {
            throw new Error('Term name is required');
        }
        if (!session || !String(session).trim()) {
            throw new Error('Term session is required');
        }
        if (!startDate || !endDate) {
            throw new Error('Term start date and end date are required');
        }

        const trimmedName = String(name).trim();
        const trimmedSession = String(session).trim();

        // Prevent duplicate (business, session, name).
        const existing = await this.termRepository.findByBusinessAndName(
            businessId,
            trimmedSession,
            trimmedName
        );
        if (existing) {
            throw new Error(`Term "${trimmedName}" for ${trimmedSession} already exists`);
        }

        const Term = require('../../../domain/entities/Term');
        const term = new Term({
            businessId,
            name: trimmedName,
            session: trimmedSession,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            status,
            metadata,
        });

        const saved = await withTransaction(async () => {
            const created = await this.termRepository.create(term);

            // Optionally make this the single ACTIVE term.
            if (setAsActive) {
                await this.termRepository.deactivateAllExcept(businessId, created.id);
            }

            return created;
        });

        return {
            success: true,
            term: saved.toJSON(),
            message: `Term "${saved.name}" (${saved.session}) created`,
        };
    }
}

module.exports = CreateTermUseCase;