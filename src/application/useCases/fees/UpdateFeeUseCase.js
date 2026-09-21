// src/application/useCases/fees/UpdateFeeUseCase.js
// v1.1.0-prod — On DRAFT → SENT transition, creates the linked debtor
//               row atomically. Fails loudly if debtorRepository is
//               missing and transition requires it.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class UpdateFeeUseCase {
    constructor({ feeRepository, studentRepository = null, debtorRepository = null }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        this.feeRepository = feeRepository;
        this.studentRepository = studentRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({
        feeId,
        businessId,
        userId = null,
        description,
        amount,
        issueDate,
        dueDate,
        status,
        notes,
        metadata,
    }) {
        if (!feeId) throw new Error('Fee ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const existing = await this.feeRepository.findById(feeId, businessId);
        if (!existing) throw new Error('Fee not found');

        const hasPayments = existing.amountPaid > 0;
        if (hasPayments && amount !== undefined) {
            throw new Error('Cannot change amount on a fee that has recorded payments');
        }

        if (existing.status === 'PAID') {
            const allowed = {};
            if (notes !== undefined) allowed.notes = notes;
            if (metadata !== undefined) allowed.metadata = metadata;
            if (Object.keys(allowed).length === 0) {
                throw new Error('PAID fees cannot be edited');
            }
            const updated = await withTransaction(async () =>
                this.feeRepository.update(feeId, businessId, allowed)
            );
            return {
                success: true,
                fee: updated.toJSON(),
                message: 'Fee updated (PAID: only notes/metadata allowed)',
            };
        }

        const updateData = {};
        if (description !== undefined) updateData.description = description;
        if (amount !== undefined) {
            const amt = Number(amount);
            if (!Number.isFinite(amt) || amt < 0) {
                throw new Error('Amount must be a non-negative number');
            }
            updateData.amount = amt;
        }
        if (issueDate !== undefined) updateData.issueDate = issueDate;
        if (dueDate !== undefined) updateData.dueDate = dueDate;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        let nextStatus = null;
        if (status !== undefined && status !== existing.status) {
            const Fee = require('../../../domain/entities/Fee');
            const clone = new Fee(existing.toJSON());
            clone.updateStatus(status);
            nextStatus = clone.status;
            updateData.status = nextStatus;
        }

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                fee: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const isTransitioningToSent =
            nextStatus === 'SENT' &&
            existing.status !== 'SENT' &&
            existing.status !== 'PAID' &&
            existing.status !== 'CANCELLED';

        if (isTransitioningToSent && !this.debtorRepository) {
            throw new Error(
                'debtorRepository is required to transition a fee to SENT'
            );
        }

        const updated = await withTransaction(async () => {
            const result = await this.feeRepository.update(feeId, businessId, updateData);

            if (isTransitioningToSent) {
                const alreadyLinked = await this.debtorRepository.findByReference(
                    businessId, 'FEE', feeId
                );
                if (!alreadyLinked) {
                    const studentName =
                        result.studentName ||
                        existing.studentName ||
                        `Student #${result.studentId}`;
                    await this.debtorRepository.create({
                        userId,
                        businessId,
                        customer_id: null,
                        customer_name: studentName,
                        customer_type: 'STUDENT',
                        total_owed: result.amount,
                        amount_paid: result.amountPaid || 0,
                        balance_remaining: Math.max(0, result.amount - (result.amountPaid || 0)),
                        status: 'ACTIVE',
                        due_date: result.dueDate || null,
                        reference_type: 'FEE',
                        reference_id: feeId,
                        notes: `Fee ${result.feeNumber} — ${studentName}`,
                    });
                }
            }

            return result;
        });

        return {
            success: true,
            fee: updated.toJSON(),
            message: 'Fee updated successfully',
        };
    }
}

module.exports = UpdateFeeUseCase;