// src/application/useCases/classes/GetClassesUseCase.js

class GetClassesUseCase {
    constructor({ classRepository }) {
        this.classRepository = classRepository;
    }

    async execute({
        businessId,
        status = null,
        level = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const classes = await this.classRepository.findByBusinessId(businessId, {
            status,
            level,
            search,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.classRepository.countByBusinessId(businessId, {
            status,
        });

        return {
            success: true,
            classes: classes.map((c) => c.toJSON()),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + classes.length < total,
            },
        };
    }
}

module.exports = GetClassesUseCase;