// src/application/useCases/debtors/GetDebtorsUseCase.js

class GetDebtorsUseCase {
    constructor(debtorRepository) {
        this.debtorRepository = debtorRepository;
    }

    async execute(userId, filter = 'all') {
        switch (filter) {
            case 'active':
                return await this.debtorRepository.findActive(userId);
            case 'overdue':
                return await this.debtorRepository.findOverdue(userId);
            default:
                return await this.debtorRepository.findByUserId(userId);
        }
    }

    async getSummary(userId) {
        return this.debtorRepository.getSummary(userId);
    }
}

module.exports = GetDebtorsUseCase;