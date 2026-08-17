// src/application/useCases/creditors/GetCreditorsUseCase.js

class GetCreditorsUseCase {
    constructor(creditorRepository) {
        this.creditorRepository = creditorRepository;
    }

    async execute(userId, filter = 'all') {
        switch (filter) {
            case 'active':
                return await this.creditorRepository.findActive(userId);
            case 'overdue':
                return await this.creditorRepository.findOverdue(userId);
            default:
                return await this.creditorRepository.findByUserId(userId);
        }
    }

    async getSummary(userId) {
        return this.creditorRepository.getSummary(userId);
    }
}

module.exports = GetCreditorsUseCase;