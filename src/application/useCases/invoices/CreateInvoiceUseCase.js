// src/application/useCases/invoices/CreateInvoiceUseCase.js
// v2.1.0-prod — Always resolves customer name from customerRepository.
//               Fails loudly on misconfiguration. Idempotent debtor creation.
//               Never persists placeholder strings.

const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');

class CreateInvoiceUseCase {
    constructor({
        invoiceRepository,
        customerRepository = null,
        projectRepository = null,
        debtorRepository = null,
    }) {
        if (!invoiceRepository) {
            throw new Error('CreateInvoiceUseCase: invoiceRepository is required');
        }
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

        const sub = Number(subtotal) || 0;
        const tx = Number(tax) || 0;
        if (sub < 0) throw new Error('Subtotal cannot be negative');
        if (tx < 0) throw new Error('Tax cannot be negative');

        const computedTotal = Math.round((sub + tx) * 100) / 100;

        // ── Resolve customer (mandatory when customerId is set) ──
        let customerName = null;
        let resolvedCustomerType = null;

        if (customerId) {
            if (!this.customerRepository) {
                throw new Error(
                    'CreateInvoiceUseCase: customerRepository is required when customerId is provided'
                );
            }
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                throw new Error(`Customer ${customerId} not found`);
            }
            const customerBizId = Number(customer.business_id ?? customer.businessId);
            if (customerBizId !== Number(businessId)) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
            customerName = customer.name;
            resolvedCustomerType = customer.type || null;
        }

        // ── If SENT, we MUST be able to create the linked debtor ──
        const willCreateDebtor = status === 'SENT';
        if (willCreateDebtor && !this.debtorRepository) {
            throw new Error(
                'CreateInvoiceUseCase: debtorRepository is required to create an invoice with status SENT'
            );
        }

        // ── Verify project ownership if provided ──
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

        const saved = await withTransaction(async () => {
            const created = await this.invoiceRepository.create(invoice);

            if (willCreateDebtor) {
                const alreadyLinked = await this.debtorRepository.findByReference(
                    businessId,
                    'INVOICE',
                    created.id
                );
                if (!alreadyLinked) {
                    await this.debtorRepository.create({
                        userId,
                        businessId,
                        customer_id: customerId || null,
                        customer_name: customerName,
                        customer_type: resolvedCustomerType || 'CLIENT',
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