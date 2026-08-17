// src/application/useCases/debtors/RecordDebtorPaymentUseCase.js

class RecordDebtorPaymentUseCase {
    constructor(debtorRepository) {
        this.debtorRepository = debtorRepository;
    }

    async execute({ debtorId, amount }) {
        if (amount <= 0) {
            throw new Error('Payment amount must be greater than 0');
        }

        const debtor = await this.debtorRepository.findById(debtorId);
        if (!debtor) {
            throw new Error('Debtor not found');
        }

        if (amount > debtor.balance_remaining) {
            throw new Error(`Payment amount exceeds outstanding balance of ₦${debtor.balance_remaining}`);
        }

        return await this.debtorRepository.recordPayment(debtorId, amount);
    }
}

module.exports = RecordDebtorPaymentUseCase;