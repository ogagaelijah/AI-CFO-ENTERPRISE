// src/application/useCases/terms/GetTermsUseCase.js

class GetTermsUseCase {
    constructor({ termRepository }) {
        this.termRepository = termRepository;
    }

    async execute({
        businessId,
        status = null,
        session = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const terms = await this.termRepository.findByBusinessId(businessId, {
            status,
            session,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.termRepository.countByBusinessId(businessId, {
            status,
            session,
        });

        return {
            success: true,
            terms: terms.map((t) => t.toJSON()),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + terms.length < total,
            },
        };
    }
}

module.exports = GetTermsUseCase;