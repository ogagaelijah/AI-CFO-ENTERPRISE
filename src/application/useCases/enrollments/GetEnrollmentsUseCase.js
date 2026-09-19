// src/application/useCases/enrollments/GetEnrollmentsUseCase.js

class GetEnrollmentsUseCase {
    constructor({ enrollmentRepository }) {
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({
        businessId,
        studentId = null,
        classId = null,
        session = null,
        term = null,
        status = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const enrollments = await this.enrollmentRepository.findByBusinessId(businessId, {
            studentId,
            classId,
            session,
            term,
            status,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.enrollmentRepository.countByBusinessId(businessId, {
            studentId,
            classId,
            session,
            status,
        });

        return {
            success: true,
            enrollments: enrollments.map((e) => e.toJSON()),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + enrollments.length < total,
            },
        };
    }
}

module.exports = GetEnrollmentsUseCase;