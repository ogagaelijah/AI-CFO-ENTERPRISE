// src/application/useCases/classes/DeleteClassUseCase.js

class DeleteClassUseCase {
    constructor({ classRepository, enrollmentRepository = null }) {
        this.classRepository = classRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({ classId, businessId }) {
        if (!classId) {
            throw new Error('Class ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.classRepository.findById(classId, businessId);
        if (!existing) {
            throw new Error('Class not found');
        }

        // Q4 policy: block deletion if any enrollments exist (active or historical).
        // The DB FK is ON DELETE RESTRICT, but we check explicitly to give a
        // clear error message instead of a Postgres constraint error.
        if (this.enrollmentRepository) {
            const enrollmentCount = await this.enrollmentRepository.countByBusinessId(
                businessId,
                { classId }
            );
            if (enrollmentCount > 0) {
                throw new Error(
                    `Cannot delete class: ${enrollmentCount} enrollment${enrollmentCount === 1 ? '' : 's'} ` +
                    `exist. Archive the class instead, or unenroll all students first.`
                );
            }
        }

        const deleted = await this.classRepository.delete(classId, businessId);
        if (!deleted) {
            throw new Error('Failed to delete class');
        }

        return {
            success: true,
            message: `Class "${existing.name}" deleted`,
        };
    }
}

module.exports = DeleteClassUseCase;