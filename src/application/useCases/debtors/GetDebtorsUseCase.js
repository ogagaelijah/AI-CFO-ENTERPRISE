// src/application/useCases/debtors/GetDebtorsUseCase.js

class GetDebtorsUseCase {
    constructor({ debtorRepository }) {
        this.debtorRepository = debtorRepository;
    }

    async execute({
        businessId,
        limit = 50,
        offset = 0,
        status = null, // 'ACTIVE', 'PAID', 'OVERDUE'
        customerType = null, // 'CUSTOMER', 'PATIENT', 'CLIENT', 'TENANT', 'STUDENT'
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const debtors = await this.debtorRepository.findByFilters({
            businessId,
            status,
            customerType,
            limit,
            offset,
        });

        const total = await this.debtorRepository.countByFilters({
            businessId,
            status,
            customerType,
        });

        // Calculate total outstanding
        const totalOutstanding = debtors
            .filter(d => d.status !== 'PAID')
            .reduce((sum, d) => sum + d.balanceRemaining, 0);

        return {
            success: true,
            debtors: debtors.map(d => d.toJSON()),
            total,
            totalOutstanding,
            limit,
            offset,
            hasMore: offset + debtors.length < total,
        };
    }
}

module.exports = GetDebtorsUseCase;