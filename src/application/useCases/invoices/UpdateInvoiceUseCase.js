// src/application/useCases/invoices/UpdateInvoiceUseCase.js
// v2.0.0-prod — Handles DRAFT → SENT transition (creates linked debtor).

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class UpdateInvoiceUseCase {
    constructor({
        invoiceRepository,
        customerRepository = null,
        projectRepository = null,
        debtorRepository = null,
    }) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.projectRepository = projectRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({
        invoiceId,
        businessId,
        userId = null,
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

        // Ownership check: existing must belong to this business.
        const existingBizId = Number(existing.businessId);
        if (existingBizId !== Number(businessId)) {
            throw new Error('Access denied: Invoice does not belong to this business');
        }

        // Verify ownership of any newly-referenced entities
        let customerName = null;
        if (customerId !== undefined && customerId && this.customerRepository) {
            const c = await this.customerRepository.findById(customerId);
            if (!c) throw new Error('Customer not found');
            const cbId = Number(c.business_id ?? c.businessId);
            if (cbId !== Number(businessId)) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
            customerName = c.name;
        }
        if (projectId !== undefined && projectId && this.projectRepository) {
            const p = await this.projectRepository.findById(projectId);
            if (!p) throw new Error('Project not found');
            const pbId = Number(p.business_id ?? p.businessId);
            if (pbId !== Number(businessId)) {
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
        let nextStatus = null;
        if (status !== undefined) {
            const Invoice = require('../../../domain/entities/Invoice');
            const clone = new Invoice(existing.toJSON());
            clone.updateStatus(status); // throws if invalid
            nextStatus = clone.status;
            updateData.status = nextStatus;
        }

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                invoice: existing.toJSON(),
                message: 'No changes made',
            };
        }

        // Atomic: update invoice + (if transitioning to SENT) create debtor.
        const updated = await withTransaction(async () => {
            const result = await this.invoiceRepository.update(invoiceId, businessId, updateData);

            // Only create the debtor once — when transitioning from a
            // non-SENT state to SENT, and only if a debtor doesn't already exist.
            const isTransitioningToSent =
                nextStatus === 'SENT' &&
                existing.status !== 'SENT' &&
                existing.status !== 'PAID' &&
                existing.status !== 'CANCELLED';

            if (isTransitioningToSent && this.debtorRepository) {
                const alreadyLinked = await this.debtorRepository.findByReference(
                    businessId,
                    'INVOICE',
                    invoiceId
                );
                if (!alreadyLinked) {
                    const finalCustomerId = updateData.customerId !== undefined
                        ? updateData.customerId
                        : existing.customerId;

                    await this.debtorRepository.create({
                        userId,
                        businessId,
                        customer_id: finalCustomerId || null,
                        customer_name: customerName || 'Unknown Client',
                        customer_type: 'CLIENT',
                        total_owed: result.total,
                        amount_paid: result.amountPaid || 0,
                        balance_remaining: result.balance,
                        status: 'ACTIVE',
                        due_date: result.dueDate || null,
                        reference_type: 'INVOICE',
                        reference_id: invoiceId,
                        notes: `Invoice ${result.invoiceNumber}`,
                    });
                }
            }

            return result;
        });

        return {
            success: true,
            invoice: updated.toJSON(),
            message: 'Invoice updated successfully',
        };
    }
}

module.exports = UpdateInvoiceUseCase;