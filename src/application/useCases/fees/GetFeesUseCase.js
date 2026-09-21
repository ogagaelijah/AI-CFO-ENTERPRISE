// src/application/useCases/fees/GetFeesUseCase.js

class GetFeesUseCase {
    constructor({ feeRepository }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        this.feeRepository = feeRepository;
    }

    async execute({
        businessId,
        status = null,
        studentId = null,
        termId = null,
        classId = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const filters = {
            status: status || null,
            studentId: studentId ? parseInt(studentId, 10) : null,
            termId: termId ? parseInt(termId, 10) : null,
            classId: classId ? parseInt(classId, 10) : null,
            search: search || null,
        };

        const fees = await this.feeRepository.findByBusinessId(businessId, {
            ...filters,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.feeRepository.countByBusinessId(businessId, filters);
        const summary = await this.feeRepository.getSummary(businessId, filters);

        return {
            success: true,
            fees: fees.map((f) => f.toJSON()),
            summary,
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + fees.length < total,
            },
        };
    }
}

module.exports = GetFeesUseCase;