// src/application/useCases/pledges/GetPledgeUseCase.js

class GetPledgeUseCase {
    constructor({ pledgeRepository }) {
        if (!pledgeRepository) throw new Error('pledgeRepository is required');
        this.pledgeRepository = pledgeRepository;
    }

    async execute({ pledgeId, businessId }) {
        if (!pledgeId) throw new Error('Pledge ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const pledge = await this.pledgeRepository.findById(pledgeId, businessId);
        if (!pledge) throw new Error('Pledge not found');

        return { success: true, pledge: pledge.toJSON() };
    }
}

module.exports = GetPledgeUseCase;