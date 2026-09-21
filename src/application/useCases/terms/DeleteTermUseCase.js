// src/application/useCases/terms/DeleteTermUseCase.js

class DeleteTermUseCase {
    constructor({
        termRepository,
        invoiceRepository = null,
        enrollmentRepository = null,
    }) {
        this.termRepository = termRepository;
        this.invoiceRepository = invoiceRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    async execute({ termId, businessId }) {
        if (!termId) {
            throw new Error('Term ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.termRepository.findById(termId, businessId);
        if (!existing) {
            throw new Error('Term not found');
        }

        // Guard: block deletion if any invoice is linked to this term.
        // Enforced at the app layer because FKs to invoices will be added in Phase 4c-2.
        if (this.invoiceRepository) {
            const linkedInvoices = await this.invoiceRepository.countByBusinessId(
                businessId,
                { termId }
            );
            if (linkedInvoices > 0) {
                throw new Error(
                    `Cannot delete term: ${linkedInvoices} invoice${linkedInvoices === 1 ? '' : 's'} reference it. ` +
                    `Mark the term COMPLETED instead.`
                );
            }
        }

        const deleted = await this.termRepository.delete(termId, businessId);
        if (!deleted) {
            throw new Error('Failed to delete term');
        }

        return {
            success: true,
            message: `Term "${existing.name}" deleted`,
        };
    }
}

module.exports = DeleteTermUseCase;