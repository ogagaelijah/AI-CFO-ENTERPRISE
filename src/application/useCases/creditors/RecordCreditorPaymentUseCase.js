// src/application/useCases/creditors/RecordCreditorPaymentUseCase.js

class RecordCreditorPaymentUseCase {
    constructor(creditorRepository) {
        this.creditorRepository = creditorRepository;
    }

    async execute({ creditorId, amount }) {
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        const creditor = await this.creditorRepository.findById(creditorId);
        if (!creditor) {
            throw new Error('Creditor not found');
        }

        if (amount > creditor.balance_remaining) {
            throw new Error(`Payment amount exceeds outstanding balance of ₦${creditor.balance_remaining}`);
        }

        return await this.creditorRepository.recordPayment(creditorId, amount);
    }
}

module.exports = RecordCreditorPaymentUseCase;