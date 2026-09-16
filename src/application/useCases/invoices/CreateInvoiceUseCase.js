// src/application/useCases/invoices/CreateInvoiceUseCase.js

class CreateInvoiceUseCase {
    constructor({ invoiceRepository, customerRepository = null, projectRepository = null }) {
        this.invoiceRepository = invoiceRepository;
        this.customerRepository = customerRepository;
        this.projectRepository = projectRepository;
    }

    async execute({
        businessId,
        customerId = null,
        projectId = null,
        invoiceNumber = null,
        issueDate = new Date(),
        dueDate = null,
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

        // Verify customer ownership if provided
        if (customerId && this.customerRepository) {
            const customer = await this.customerRepository.findById(customerId);
            if (!customer) {
                throw new Error('Customer not found');
            }
            if (customer.businessId !== businessId) {
                throw new Error('Access denied: Customer does not belong to this business');
            }
        }

        // Verify project ownership if provided
        if (projectId && this.projectRepository) {
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }
            if (project.businessId !== businessId) {
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
            status: 'DRAFT',
            subtotal: sub,
            tax: tx,
            total: computedTotal,
            amountPaid: 0,
            currency,
            notes,
            metadata,
        });

        const saved = await this.invoiceRepository.create(invoice);

        return {
            success: true,
            invoice: saved.toJSON(),
            message: 'Invoice created successfully',
        };
    }
}

module.exports = CreateInvoiceUseCase;