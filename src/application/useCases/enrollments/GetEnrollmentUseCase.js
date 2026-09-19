// src/application/useCases/enrollments/GetEnrollmentUseCase.js

class GetEnrollmentUseCase {
    constructor({ enrollmentRepository }) {
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({ enrollmentId, businessId }) {
        if (!enrollmentId) {
            throw new Error('Enrollment ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const enrollment = await this.enrollmentRepository.findById(enrollmentId, businessId);
        if (!enrollment) {
            throw new Error('Enrollment not found');
        }

        return {
            success: true,
            enrollment: enrollment.toJSON(),
        };
    }
}

module.exports = GetEnrollmentUseCase;