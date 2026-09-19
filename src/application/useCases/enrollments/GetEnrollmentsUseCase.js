// src/application/useCases/enrollments/GetEnrollmentsUseCase.js
// v1.1.0-prod — Uses findByBusinessIdWithDetails so responses include
//               student + class names, avoiding N+1 lookups on the client.

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

        const rows = await this.enrollmentRepository.findByBusinessIdWithDetails(
            businessId,
            {
                studentId,
                classId,
                session,
                term,
                status,
                limit: safeLimit,
                offset: safeOffset,
            }
        );

        const total = await this.enrollmentRepository.countByBusinessId(businessId, {
            studentId,
            classId,
            session,
            status,
        });

        // Rows are already plain serializable objects (see _hydrateDetailed).
        return {
            success: true,
            enrollments: rows.map((r) => ({
                id: r.id,
                businessId: r.businessId,
                studentId: r.studentId,
                classId: r.classId,
                term: r.term,
                session: r.session,
                status: r.status,
                enrolledOn: r.enrolledOn,
                metadata: r.metadata,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt,
                studentName: r.studentName,
                admissionNumber: r.admissionNumber,
                className: r.className,
                classLevel: r.classLevel,
            })),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + rows.length < total,
            },
        };
    }
}

module.exports = GetEnrollmentsUseCase;