// src/application/useCases/students/DeleteStudentUseCase.js

class DeleteStudentUseCase {
    constructor({
        studentRepository,
        enrollmentRepository = null,
        invoiceRepository = null,
    }) {
        this.studentRepository = studentRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.invoiceRepository = invoiceRepository;
    }

    /**
     * Q5 policy:
     * - If the student has any enrollments or fees → mark WITHDRAWN, do not delete.
     * - Otherwise → hard delete.
     */
    async execute({ studentId, businessId }) {
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.studentRepository.findById(studentId, businessId);
        if (!existing) {
            throw new Error('Student not found');
        }

        // Check enrollments
        let hasEnrollments = false;
        if (this.enrollmentRepository) {
            const count = await this.enrollmentRepository.countByBusinessId(businessId, {
                studentId,
            });
            hasEnrollments = count > 0;
        }

        // Check fees (invoices of type FEE linked to this student)
        let hasFees = false;
        if (this.invoiceRepository) {
            const count = await this.invoiceRepository.countByBusinessId(businessId, {
                studentId,
            });
            hasFees = count > 0;
        }

        if (hasEnrollments || hasFees) {
            // Cannot hard-delete: mark WITHDRAWN instead.
            const updated = await this.studentRepository.update(studentId, businessId, {
                status: 'WITHDRAWN',
            });
            return {
                success: true,
                student: updated.toJSON(),
                message: hasEnrollments && hasFees
                    ? 'Student has enrollments and fees — marked as WITHDRAWN'
                    : hasEnrollments
                        ? 'Student has enrollments — marked as WITHDRAWN'
                        : 'Student has fees — marked as WITHDRAWN',
                action: 'WITHDRAWN',
            };
        }

        // Safe to hard-delete
        const deleted = await this.studentRepository.delete(studentId, businessId);
        if (!deleted) {
            throw new Error('Failed to delete student');
        }

        return {
            success: true,
            message: `Student ${existing.fullName} deleted`,
            action: 'DELETED',
        };
    }
}

module.exports = DeleteStudentUseCase;