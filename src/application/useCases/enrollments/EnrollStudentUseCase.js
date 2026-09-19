// src/application/useCases/enrollments/EnrollStudentUseCase.js

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class EnrollStudentUseCase {
    constructor({
        enrollmentRepository,
        studentRepository = null,
        classRepository = null,
    }) {
        this.enrollmentRepository = enrollmentRepository;
        this.studentRepository = studentRepository;
        this.classRepository = classRepository;
    }

    async execute({
        businessId,
        studentId,
        classId,
        term,
        session,
        enrolledOn = new Date(),
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }
        if (!studentId) {
            throw new Error('Student ID is required');
        }
        if (!classId) {
            throw new Error('Class ID is required');
        }
        if (!term || !String(term).trim()) {
            throw new Error('Term is required');
        }
        if (!session || !String(session).trim()) {
            throw new Error('Session is required');
        }

        // Verify student belongs to this business
        if (this.studentRepository) {
            const student = await this.studentRepository.findById(studentId, businessId);
            if (!student) {
                throw new Error('Student not found');
            }
            if (Number(student.businessId) !== Number(businessId)) {
                throw new Error('Access denied: Student does not belong to this business');
            }
            if (student.status !== 'ACTIVE') {
                throw new Error(`Cannot enroll a student with status ${student.status}`);
            }
        }

        // Verify class belongs to this business
        if (this.classRepository) {
            const klass = await this.classRepository.findById(classId, businessId);
            if (!klass) {
                throw new Error('Class not found');
            }
            if (Number(klass.businessId) !== Number(businessId)) {
                throw new Error('Access denied: Class does not belong to this business');
            }
            if (klass.status !== 'ACTIVE') {
                throw new Error(`Cannot enroll into a class with status ${klass.status}`);
            }
        }

        // Rule: a student can have only one ACTIVE enrollment per (session, term).
        const existingActive = await this.enrollmentRepository.findActiveByStudentSessionTerm(
            businessId,
            studentId,
            session,
            term
        );
        if (existingActive) {
            throw new Error(
                `Student is already enrolled in another class for ${term} ${session}. ` +
                `Unenroll them first.`
            );
        }

        // Also check duplicate: same student, same class, same session, same term.
        // The partial unique index would catch this, but we check explicitly for a
        // clean error message.
        const sameClassCheck = await this.enrollmentRepository.findByBusinessId(businessId, {
            studentId,
            classId,
            session,
            term,
            status: 'ACTIVE',
        });
        if (sameClassCheck.length > 0) {
            throw new Error('Student is already enrolled in this class for the given session and term');
        }

        const Enrollment = require('../../../domain/entities/Enrollment');
        const enrollment = new Enrollment({
            businessId,
            studentId,
            classId,
            term: String(term).trim(),
            session: String(session).trim(),
            status: 'ACTIVE',
            enrolledOn,
            metadata,
        });

        const saved = await withTransaction(async () => {
            return await this.enrollmentRepository.create(enrollment);
        });

        return {
            success: true,
            enrollment: saved.toJSON(),
            message: 'Student enrolled',
        };
    }
}

module.exports = EnrollStudentUseCase;