// src/application/useCases/enrollments/UnenrollStudentUseCase.js

class UnenrollStudentUseCase {
    constructor({ enrollmentRepository }) {
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({ enrollmentId, businessId, reason = null }) {
        if (!enrollmentId) {
            throw new Error('Enrollment ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.enrollmentRepository.findById(enrollmentId, businessId);
        if (!existing) {
            throw new Error('Enrollment not found');
        }

        if (existing.status !== 'ACTIVE') {
            throw new Error(`Enrollment is already ${existing.status}`);
        }

        // Unenroll = mark WITHDRAWN (not delete). Preserves history.
        const updateData = { status: 'WITHDRAWN' };
        if (reason) {
            updateData.metadata = { ...existing.metadata, withdrawReason: reason };
        }

        const updated = await this.enrollmentRepository.update(
            enrollmentId,
            businessId,
            updateData
        );

        return {
            success: true,
            enrollment: updated.toJSON(),
            message: 'Student unenrolled',
        };
    }
}

module.exports = UnenrollStudentUseCase;