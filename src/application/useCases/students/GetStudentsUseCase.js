// src/application/useCases/students/GetStudentsUseCase.js

class GetStudentsUseCase {
    constructor({ studentRepository }) {
        this.studentRepository = studentRepository;
    }

    async execute({
        businessId,
        status = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const students = await this.studentRepository.findByBusinessId(businessId, {
            status,
            search,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.studentRepository.countByBusinessId(businessId, {
            status,
        });

        return {
            success: true,
            students: students.map((s) => s.toJSON()),
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + students.length < total,
            },
        };
    }
}

module.exports = GetStudentsUseCase;