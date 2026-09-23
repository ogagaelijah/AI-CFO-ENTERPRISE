// src/application/useCases/pledges/GetPledgesUseCase.js

class GetPledgesUseCase {
    constructor({ pledgeRepository }) {
        if (!pledgeRepository) throw new Error('pledgeRepository is required');
        this.pledgeRepository = pledgeRepository;
    }

    async execute({
        businessId,
        status = null,
        donorId = null,
        category = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const filters = {
            status: status || null,
            donorId: donorId ? parseInt(donorId, 10) : null,
            category: category || null,
            search: search || null,
        };

        const pledges = await this.pledgeRepository.findByBusinessId(businessId, {
            ...filters,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.pledgeRepository.countByBusinessId(businessId, filters);
        const summary = await this.pledgeRepository.getSummary(businessId, filters);

        return {
            success: true,
            pledges: pledges.map((p) => p.toJSON()),
            summary,
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + pledges.length < total,
            },
        };
    }
}

module.exports = GetPledgesUseCase;