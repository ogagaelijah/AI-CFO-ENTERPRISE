// src/application/useCases/fees/GetFeeUseCase.js

class GetFeeUseCase {
    constructor({ feeRepository }) {
        if (!feeRepository) throw new Error('feeRepository is required');
        this.feeRepository = feeRepository;
    }

    async execute({ feeId, businessId }) {
        if (!feeId) throw new Error('Fee ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const fee = await this.feeRepository.findById(feeId, businessId);
        if (!fee) throw new Error('Fee not found');

        return { success: true, fee: fee.toJSON() };
    }
}

module.exports = GetFeeUseCase;