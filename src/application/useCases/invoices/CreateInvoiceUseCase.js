// src/application/useCases/invoices/CreateInvoiceUseCase.js
// v2.0.0-prod — Creates a linked debtor row (reference_type='INVOICE')
//               when the invoice is created with status = SENT.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateInvoiceUseCase {
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
        businessId,
        userId = null,
        customerId = null,
        projectId = null,
        invoiceNumber = null,
        issueDate = new Date(),
        dueDate = null,
        status = 'DRAFT',
        subtotal = 0,
        tax = 0,
        total = null,
        currency = 'NGN',
        notes = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const validStatuses = ['DRAFT', 'SENT'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Initial status must be DRAFT or SENT. Got: ${status}`);
        }

        // Verify customer ownership if provided
        let customerName = null;
        if (customerId && this.customerRepository) {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
            const customerBizId = Number(customer.business_id ?? customer.businessId);
            if (customerBizId !== Number(businessId)) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
            customerName = customer.name;
        }

        // Verify project ownership if provided
        if (projectId && this.projectRepository) {
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }
            const projectBizId = Number(project.business_id ?? project.businessId);
            if (projectBizId !== Number(businessId)) {
                throw new Error('Access denied: Project does not belong to this business');
            }
        }

        const sub = Number(subtotal) || 0;
        const tx = Number(tax) || 0;
        if (sub < 0) throw new Error('Subtotal cannot be negative');
        if (tx < 0) throw new Error('Tax cannot be negative');

        // Total always = subtotal + tax. Never trust a client-supplied total.
        const computedTotal = Math.round((sub + tx) * 100) / 100;

        // Generate invoice number server-side if not supplied.
        const finalNumber = invoiceNumber
            ? String(invoiceNumber).trim()
            : await this.invoiceRepository.nextInvoiceNumber(businessId);

        if (!finalNumber) {
            throw new Error('Invoice number could not be generated');
        }

        const Invoice = require('../../../domain/entities/Invoice');
        const invoice = new Invoice({
            businessId,
            customerId,
            projectId,
            invoiceNumber: finalNumber,
            issueDate,
            dueDate,
            status,
            subtotal: sub,
            tax: tx,
            total: computedTotal,
            amountPaid: 0,
            currency,
            notes,
            metadata,
        });

        // Create invoice. If SENT and we have a debtor repo, also create the
        // linked debtor row atomically so the ledger reflects the receivable.
        const saved = await withTransaction(async () => {
            const created = await this.invoiceRepository.create(invoice);

            if (status === 'SENT' && this.debtorRepository) {
                await this.debtorRepository.create({
                    userId,
                    businessId,
                    customer_id: customerId || null,
                    customer_name: customerName || 'Unknown Client',
                    customer_type: 'CLIENT',
                    total_owed: computedTotal,
                    amount_paid: 0,
                    balance_remaining: computedTotal,
                    status: 'ACTIVE',
                    due_date: dueDate || null,
                    reference_type: 'INVOICE',
                    reference_id: created.id,
                    notes: `Invoice ${finalNumber}`,
                });
            }

            return created;
        });

        return {
            success: true,
            invoice: saved.toJSON(),
            message: 'Invoice created successfully',
        };
    }
}

module.exports = CreateInvoiceUseCase;