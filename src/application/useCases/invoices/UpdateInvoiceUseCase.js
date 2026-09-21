// src/application/useCases/invoices/UpdateInvoiceUseCase.js
// v2.1.0-prod — Resolves customer name from existing invoice when the
//               update does not explicitly change customerId.
//               Fails loudly on misconfiguration. Idempotent debtor creation.
//               Never persists placeholder strings.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class UpdateInvoiceUseCase {
    constructor({
        invoiceRepository,
        customerRepository = null,
        projectRepository = null,
        debtorRepository = null,
    }) {
        if (!invoiceRepository) {
            throw new Error('UpdateInvoiceUseCase: invoiceRepository is required');
        }
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

        // ── Money-field locking rules ──
        const hasPayments = existing.amountPaid > 0;
        if (hasPayments && (subtotal !== undefined || tax !== undefined)) {
            throw new Error(
                'Cannot change amounts on an invoice that has recorded payments'
            );
        }

        // PAID invoices are locked except notes/metadata.
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

        // Ownership check (belt and suspenders — findById already scoped).
        const existingBizId = Number(existing.businessId);
        if (existingBizId !== Number(businessId)) {
            throw new Error('Access denied: Invoice does not belong to this business');
        }

        // ── Resolve the effective customer ──
        // If the caller is changing customerId, use the new one.
        // Otherwise, fall back to the existing invoice's customerId so we can
        // still resolve the name when transitioning to SENT.
        const effectiveCustomerId =
            customerId !== undefined ? customerId : existing.customerId;

        let resolvedCustomerName = null;
        let resolvedCustomerType = null;

        if (effectiveCustomerId) {
            if (!this.customerRepository) {
                throw new Error(
                    'UpdateInvoiceUseCase: customerRepository is required when invoice has a customer'
                );
            }
            const c = await this.customerRepository.findById(effectiveCustomerId);
            if (!c) {
                throw new Error(`Customer ${effectiveCustomerId} not found`);
            }
            const cbId = Number(c.business_id ?? c.businessId);
            if (cbId !== Number(businessId)) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
            resolvedCustomerName = c.name;
            resolvedCustomerType = c.type || null;
        }

        // ── Verify project ownership if changing projectId ──
        if (projectId !== undefined && projectId && this.projectRepository) {
            const p = await this.projectRepository.findById(projectId);
            if (!p) throw new Error('Project not found');
            const pbId = Number(p.business_id ?? p.businessId);
            if (pbId !== Number(businessId)) {
                throw new Error('Access denied: Project does not belong to this business');
            }
        }

        // ── Build update payload ──
        const updateData = {};

        if (customerId !== undefined) updateData.customerId = customerId;
        if (projectId !== undefined) updateData.projectId = projectId;
        if (invoiceNumber !== undefined) updateData.invoiceNumber = String(invoiceNumber).trim();
        if (issueDate !== undefined) updateData.issueDate = issueDate ? new Date(issueDate) : null;
        if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
        if (currency !== undefined) updateData.currency = currency;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        if (subtotal !== undefined || tax !== undefined) {
            const newSub = subtotal !== undefined ? Number(subtotal) : existing.subtotal;
            const newTax = tax !== undefined ? Number(tax) : existing.tax;
            if (newSub < 0) throw new Error('Subtotal cannot be negative');
            if (newTax < 0) throw new Error('Tax cannot be negative');
            updateData.subtotal = newSub;
            updateData.tax = newTax;
            updateData.total = Math.round((newSub + newTax) * 100) / 100;
        }

        // ── Status transition ──
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

        const isTransitioningToSent =
            nextStatus === 'SENT' &&
            existing.status !== 'SENT' &&
            existing.status !== 'PAID' &&
            existing.status !== 'CANCELLED';

        // If we're about to create a debtor, we MUST have a repo.
        if (isTransitioningToSent && !this.debtorRepository) {
            throw new Error(
                'UpdateInvoiceUseCase: debtorRepository is required to transition an invoice to SENT'
            );
        }

        // ── Atomic: update invoice + (if transitioning) create debtor ──
        const updated = await withTransaction(async () => {
            const result = await this.invoiceRepository.update(invoiceId, businessId, updateData);

            if (isTransitioningToSent) {
                // Idempotency: don't double-link.
                const alreadyLinked = await this.debtorRepository.findByReference(
                    businessId,
                    'INVOICE',
                    invoiceId
                );
                if (!alreadyLinked) {
                    await this.debtorRepository.create({
                        userId,
                        businessId,
                        customer_id: effectiveCustomerId || null,
                        customer_name: resolvedCustomerName,           // null if no customer; real name otherwise
                        customer_type: resolvedCustomerType || 'CLIENT',
                        total_owed: result.total,
                        amount_paid: result.amountPaid || 0,
                        balance_remaining: Math.max(0, result.total - (result.amountPaid || 0)),
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