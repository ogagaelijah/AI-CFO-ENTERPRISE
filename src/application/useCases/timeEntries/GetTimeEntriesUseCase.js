// src/application/useCases/timeEntries/GetTimeEntriesUseCase.js

class GetTimeEntriesUseCase {
    constructor({ timeEntryRepository }) {
        this.timeEntryRepository = timeEntryRepository;
    }

    async execute({
        businessId,
        projectId = null,
        customerId = null,
        billable = undefined,
        invoiced = undefined,
        fromDate = null,
        toDate = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const entries = await this.timeEntryRepository.findByBusinessId(businessId, {
            projectId,
            customerId,
            billable,
            invoiced,
            fromDate,
            toDate,
            search,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.timeEntryRepository.countByBusinessId(businessId, {
            projectId,
            invoiced,
        });

        const summary = await this.timeEntryRepository.getSummary(businessId, {
            fromDate,
            toDate,
        });

        return {
            success: true,
            timeEntries: entries.map((e) => e.toJSON()),
            summary,
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + entries.length < total,
            },
        };
    }
}

module.exports = GetTimeEntriesUseCase;
