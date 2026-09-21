// src/application/useCases/fees/GenerateFeeUseCase.js
// v1.1.0-prod — On SENT, creates the linked debtor row atomically
//               (reference_type='FEE'). Fails loudly if debtorRepository
//               is missing and status=SENT.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class GenerateFeeUseCase {
    constructor({
        feeRepository,
        studentRepository,
        termRepository,
        classRepository = null,
        debtorRepository = null,
    }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        if (!studentRepository) throw new Error('studentRepository is required');
        if (!termRepository) throw new Error('termRepository is required');
        this.feeRepository = feeRepository;
        this.studentRepository = studentRepository;
        this.termRepository = termRepository;
        this.classRepository = classRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({
        businessId,
        userId = null,
        studentId,
        termId,
        classId = null,
        amount = null,
        description = '',
        issueDate = new Date(),
        dueDate = null,
        status = 'DRAFT',
        notes = '',
        metadata = {},
    }) {
        if (!businessId) throw new Error('Business ID is required');
        if (!studentId) throw new Error('Student ID is required');
        if (!termId) throw new Error('Term ID is required');

        const validStatuses = ['DRAFT', 'SENT'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Initial status must be DRAFT or SENT. Got: ${status}`);
        }

        // If SENT, we MUST be able to create the debtor row.
        if (status === 'SENT' && !this.debtorRepository) {
            throw new Error('debtorRepository is required to create a SENT fee');
        }

        const student = await this.studentRepository.findById(studentId, businessId);
        if (!student) throw new Error('Student not found');

        const term = await this.termRepository.findById(termId, businessId);
        if (!term) throw new Error('Term not found');

        let resolvedClass = null;
        if (classId && this.classRepository) {
            resolvedClass = await this.classRepository.findById(classId, businessId);
            if (!resolvedClass) throw new Error('Class not found');
        }

        const existing = await this.feeRepository.findByStudentAndTerm(
            businessId, studentId, termId
        );
        if (existing) {
            throw new Error(
                `A fee already exists for this student in this term (${existing.feeNumber})`
            );
        }

        let finalAmount = amount !== null && amount !== undefined ? Number(amount) : null;
        if (finalAmount === null) {
            if (resolvedClass && Number(resolvedClass.termFee) > 0) {
                finalAmount = Number(resolvedClass.termFee);
            } else {
                throw new Error(
                    'Fee amount is required (no class term-fee available to default from)'
                );
            }
        }
        if (!Number.isFinite(finalAmount) || finalAmount < 0) {
            throw new Error('Fee amount must be a non-negative number');
        }

        const feeNumber = await this.feeRepository.nextFeeNumber(businessId);

        const Fee = require('../../../domain/entities/Fee');
        const fee = new Fee({
            businessId,
            studentId,
            termId,
            classId: classId || null,
            feeNumber,
            description: description || `Tuition fee — ${term.name} ${term.session}`,
            amount: finalAmount,
            amountPaid: 0,
            currency: 'NGN',
            status,
            issueDate,
            dueDate,
            notes,
            metadata,
        });

        const saved = await withTransaction(async () => {
            const created = await this.feeRepository.create(fee);

            // On SENT, create the linked debtor row so the receivable
            // shows on the Debtors page and can receive payments.
            if (status === 'SENT' && this.debtorRepository) {
                const alreadyLinked = await this.debtorRepository.findByReference(
                    businessId, 'FEE', created.id
                );
                if (!alreadyLinked) {
                    await this.debtorRepository.create({
                        userId,
                        businessId,
                        customer_id: null,
                        customer_name: student.fullName,     // student acts as the debtor
                        customer_type: 'STUDENT',
                        total_owed: finalAmount,
                        amount_paid: 0,
                        balance_remaining: finalAmount,
                        status: 'ACTIVE',
                        due_date: dueDate || null,
                        reference_type: 'FEE',
                        reference_id: created.id,
                        notes: `Fee ${created.feeNumber} — ${student.fullName}`,
                    });
                }
            }

            return created;
        });

        return {
            success: true,
            fee: saved.toJSON(),
            message: `Fee ${saved.feeNumber} created for ${student.fullName}`,
        };
    }
}

module.exports = GenerateFeeUseCase;