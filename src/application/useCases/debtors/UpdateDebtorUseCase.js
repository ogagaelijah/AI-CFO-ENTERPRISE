// src/application/useCases/debtors/UpdateDebtorUseCase.js

class UpdateDebtorUseCase {
    constructor({ debtorRepository }) {
        this.debtorRepository = debtorRepository;
    }

    async execute({
        debtorId,
        businessId,
        dueDate = null,
        notes = null,
        status = null,
        customerId = null,
        customerType = null,
    }) {
        if (!debtorId) {
            throw new Error('Debtor ID is required');
        }

        const debtor = await this.debtorRepository.findById(debtorId);
        if (!debtor) {
            throw new Error('Debtor not found');
        }

        // Verify business ownership
        if (debtor.businessId !== businessId) {
            throw new Error('Access denied: Debtor does not belong to this business');
        }

        // Update fields
        if (dueDate !== undefined) {
            debtor.dueDate = dueDate;
        }

        if (notes !== undefined) {
            debtor.notes = notes;
        }

        if (status !== undefined) {
            const validStatuses = ['ACTIVE', 'PAID', 'OVERDUE'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
            }
            debtor.status = status;
        }

        if (customerId !== undefined) {
            debtor.customerId = customerId;
        }

        if (customerType !== undefined) {
            const validTypes = ['CUSTOMER', 'PATIENT', 'CLIENT', 'TENANT', 'STUDENT'];
            if (!validTypes.includes(customerType)) {
                throw new Error(`Invalid customer type. Must be one of: ${validTypes.join(', ')}`);
            }
            debtor.customerType = customerType;
        }

        debtor.updatedAt = new Date();

        // If status is being set to PAID, ensure balance is 0
        if (status === 'PAID' && debtor.balanceRemaining > 0) {
            throw new Error('Cannot mark as PAID when balance remaining is greater than 0');
        }

        await this.debtorRepository.update(debtor.id, debtor);

        return {
            success: true,
            debtor: debtor.toJSON(),
            message: 'Debtor updated successfully',
        };
    }
}

module.exports = UpdateDebtorUseCase;