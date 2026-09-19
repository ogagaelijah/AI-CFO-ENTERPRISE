// src/application/useCases/enrollments/PromoteEnrollmentUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class PromoteEnrollmentUseCase {
    constructor({
        enrollmentRepository,
        studentRepository = null,
        classRepository = null,
    }) {
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.classRepository = classRepository;
    }

    /**
     * Promote a student from one enrollment (session/term/class) to a new one.
     * Marks the old enrollment COMPLETED and creates a new ACTIVE one.
     */
    async execute({
        enrollmentId,
        businessId,
        newClassId,
        newTerm,
        newSession,
        metadata = {},
    }) {
        if (!enrollmentId) {
            throw new Error('Enrollment ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!newClassId) {
            throw new Error('New class ID is required');
        }
        if (!newTerm || !String(newTerm).trim()) {
            throw new Error('New term is required');
        }
        if (!newSession || !String(newSession).trim()) {
            throw new Error('New session is required');
        }

        const current = await this.enrollmentRepository.findById(enrollmentId, businessId);
        if (!current) {
            throw new Error('Enrollment not found');
        }
        if (current.status !== 'ACTIVE') {
            throw new Error(`Cannot promote a ${current.status} enrollment`);
        }

        // Verify new class belongs to this business
        if (this.classRepository) {
            const klass = await this.classRepository.findById(newClassId, businessId);
            if (!klass) {
                throw new Error('New class not found');
            }
            if (Number(klass.businessId) !== Number(businessId)) {
                throw new Error('Access denied: Class does not belong to this business');
            }
            if (klass.status !== 'ACTIVE') {
                throw new Error(`Cannot promote into a class with status ${klass.status}`);
            }
        }

        // Atomic: complete the old, create the new
        const result = await withTransaction(async () => {
            await this.enrollmentRepository.update(enrollmentId, businessId, {
                status: 'COMPLETED',
            });

            const Enrollment = require('../../../domain/entities/Enrollment');
            const newEnrollment = new Enrollment({
                businessId,
                studentId: current.studentId,
                classId: newClassId,
                term: String(newTerm).trim(),
                session: String(newSession).trim(),
                status: 'ACTIVE',
                enrolledOn: new Date(),
                metadata: {
                    ...metadata,
                    promotedFrom: enrollmentId,
                },
            });

            return await this.enrollmentRepository.create(newEnrollment);
        });

        return {
            success: true,
            enrollment: result.toJSON(),
            message: 'Student promoted',
        };
    }
}

module.exports = PromoteEnrollmentUseCase;