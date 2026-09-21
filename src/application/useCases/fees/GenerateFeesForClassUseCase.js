// src/application/useCases/fees/GenerateFeesForClassUseCase.js
// Bulk: create one fee per ACTIVE student enrolled in a class for a term.
// Skips students who already have a fee for that term.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class GenerateFeesForClassUseCase {
    constructor({
        feeRepository,
        studentRepository,
        termRepository,
        classRepository,
        enrollmentRepository,
    }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        if (!studentRepository) throw new Error('studentRepository is required');
        if (!termRepository) throw new Error('termRepository is required');
        if (!classRepository) throw new Error('classRepository is required');
        if (!enrollmentRepository) throw new Error('enrollmentRepository is required');
        this.feeRepository = feeRepository;
        this.studentRepository = studentRepository;
        this.termRepository = termRepository;
        this.classRepository = classRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({
        businessId,
        classId,
        termId,
        issueDate = new Date(),
        dueDate = null,
        status = 'DRAFT',
    }) {
        if (!businessId) throw new Error('Business ID is required');
        if (!classId) throw new Error('Class ID is required');
        if (!termId) throw new Error('Term ID is required');

        const validStatuses = ['DRAFT', 'SENT'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Initial status must be DRAFT or SENT. Got: ${status}`);
        }

        const klass = await this.classRepository.findById(classId, businessId);
        if (!klass) throw new Error('Class not found');

        const term = await this.termRepository.findById(termId, businessId);
        if (!term) throw new Error('Term not found');

        const amount = Number(klass.termFee);
        if (!Number.isFinite(amount) || amount < 0) {
            throw new Error('Class termFee is not a valid amount');
        }

        const enrollments = await this.enrollmentRepository.findByClass(
            businessId, classId, { status: 'ACTIVE' }
        );

        if (enrollments.length === 0) {
            return {
                success: true,
                created: 0,
                skipped: 0,
                fees: [],
                message: 'No active enrollments in this class',
            };
        }

        const Fee = require('../../../domain/entities/Fee');
        const results = { created: [], skipped: [] };

        await withTransaction(async () => {
            for (const enr of enrollments) {
                const studentId = enr.studentId;

                // Skip if a fee already exists for this student+term
                const existing = await this.feeRepository.findByStudentAndTerm(
                    businessId, studentId, termId
                );
                if (existing) {
                    results.skipped.push({ studentId, reason: existing.feeNumber });
                    continue;
                }

                const feeNumber = await this.feeRepository.nextFeeNumber(businessId);
                const fee = new Fee({
                    businessId,
                    studentId,
                    termId,
                    classId,
                    feeNumber,
                    description: `Tuition fee — ${klass.name} (${term.name} ${term.session})`,
                    amount,
                    amountPaid: 0,
                    currency: 'NGN',
                    status,
                    issueDate,
                    dueDate,
                    notes: '',
                    metadata: {},
                });
                const saved = await this.feeRepository.create(fee);
                results.created.push(saved.toJSON());
            }
        });

        return {
            success: true,
            created: results.created.length,
            skipped: results.skipped.length,
            fees: results.created,
            skippedDetails: results.skipped,
            message: `Generated ${results.created.length} fee(s), skipped ${results.skipped.length}`,
        };
    }
}

module.exports = GenerateFeesForClassUseCase;