// src/application/useCases/projects/GetProjectsUseCase.js

class GetProjectsUseCase {
    constructor({ projectRepository }) {
        this.projectRepository = projectRepository;
    }

    async execute({
        businessId,
        status = null,
        search = null,
        customerId = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        let projects;

        if (customerId) {
            projects = await this.projectRepository.findByCustomer(
                businessId,
                customerId,
                { status, search, limit: safeLimit, offset: safeOffset }
            );
        } else {
            projects = await this.projectRepository.findByBusinessId(
                businessId,
                { status, search, limit: safeLimit, offset: safeOffset }
            );
        }

        const total = await this.projectRepository.countByBusinessId(businessId, {
            status,
            search,
        });

        return {
            success: true,
            projects: projects.map((p) => p.toJSON()),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + projects.length < total,
            },
        };
    }
}

module.exports = GetProjectsUseCase;