// src/application/useCases/terms/GetTermUseCase.js

class GetTermUseCase {
    constructor({ termRepository }) {
        this.termRepository = termRepository;
    }

    async execute({ termId, businessId }) {
        if (!termId) {
            throw new Error('Term ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const term = await this.termRepository.findById(termId, businessId);
        if (!term) {
            throw new Error('Term not found');
        }

        return {
            success: true,
            term: term.toJSON(),
        };
    }
}

module.exports = GetTermUseCase;