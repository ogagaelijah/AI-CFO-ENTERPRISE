// src/application/useCases/invoices/UpdateInvoiceUseCase.js

class UpdateInvoiceUseCase {
    constructor({ invoiceRepository, customerRepository = null, projectRepository = null }) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.projectRepository = projectRepository;
    }

    async execute({
        invoiceId,
        businessId,
        customerId,
        projectId,
        invoiceNumber,
        issueDate,
        dueDate,
        status,
        subtotal,
        tax,
        currency,
        notes,
        metadata,
    }) {
        if (!invoiceId) {
            throw new Error('Invoice ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.invoiceRepository.findById(invoiceId, businessId);
        if (!existing) {
            throw new Error('Invoice not found');
        }

        // Money fields are locked once a payment has been recorded.
        // Allowing a subtotal/total change after payment would silently
        // corrupt the balance.
        const hasPayments = existing.amountPaid > 0;
        if (hasPayments && (subtotal !== undefined || tax !== undefined)) {
            throw new Error(
                'Cannot change amounts on an invoice that has recorded payments'
            );
        }

        // PAID invoices are locked entirely except notes/metadata.
        if (existing.status === 'PAID') {
            const allowed = {};
            if (notes !== undefined) allowed.notes = notes;
            if (metadata !== undefined) allowed.metadata = metadata;
            if (Object.keys(allowed).length === 0) {
                throw new Error('PAID invoices cannot be edited');
            }
            const updated = await this.invoiceRepository.update(invoiceId, businessId, allowed);
            return {
                success: true,
                invoice: updated.toJSON(),
                message: 'Invoice updated (PAID: only notes/metadata allowed)',
            };
        }

        // Verify ownership of any newly-referenced entities
        if (customerId !== undefined && customerId && this.customerRepository) {
            const c = await this.customerRepository.findById(customerId);
            if (!c) throw new Error('Customer not found');
            if (c.businessId !== businessId) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
        }
        if (projectId !== undefined && projectId && this.projectRepository) {
            const p = await this.projectRepository.findById(projectId);
            if (!p) throw new Error('Project not found');
            if (p.businessId !== businessId) {
                throw new Error('Access denied: Project does not belong to this business');
            }
        }

        const updateData = {};

        if (customerId !== undefined) updateData.customerId = customerId;
        if (projectId !== undefined) updateData.projectId = projectId;
        if (invoiceNumber !== undefined) updateData.invoiceNumber = String(invoiceNumber).trim();
        if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (currency !== undefined) updateData.currency = currency;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        // If subtotal or tax changes, recompute total server-side.
        if (subtotal !== undefined || tax !== undefined) {
            const newSub = subtotal !== undefined ? Number(subtotal) : existing.subtotal;
            const newTax = tax !== undefined ? Number(tax) : existing.tax;
            if (newSub < 0) throw new Error('Subtotal cannot be negative');
            if (newTax < 0) throw new Error('Tax cannot be negative');

            updateData.subtotal = newSub;
            updateData.tax = newTax;
            updateData.total = Math.round((newSub + newTax) * 100) / 100;
        }

        // Status transition — validate via entity rules before writing.
        if (status !== undefined) {
            const clone = new (require('../../../domain/entities/Invoice'))(existing.toJSON());
            clone.updateStatus(status); // throws if invalid
            updateData.status = clone.status;
        }

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                invoice: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.invoiceRepository.update(invoiceId, businessId, updateData);

        return {
            success: true,
            invoice: updated.toJSON(),
            message: 'Invoice updated successfully',
        };
    }
}

module.exports = UpdateInvoiceUseCase;