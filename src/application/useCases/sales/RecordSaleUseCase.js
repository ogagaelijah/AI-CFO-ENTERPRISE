// src/application/useCases/sales/RecordSaleUseCase.js

class RecordSaleUseCase {
    constructor(saleRepository, inventoryRepository, debtorRepository) {
        this.saleRepository = saleRepository;
        this.inventoryRepository = inventoryRepository;
        this.debtorRepository = debtorRepository;
    }

    async execute({
        userId,
        itemName,
        quantity,
        unitPrice,
        customerName,
        paymentStatus,
        amountPaid,
        skipInventory = false,
        inventoryId = null,
    }) {
        const totalPrice = quantity * unitPrice;
        let balanceRemaining = 0;

        // Calculate balance based on payment status
        if (paymentStatus === 'PAID') {
            balanceRemaining = 0;
        } else if (paymentStatus === 'PARTIAL') {
            balanceRemaining = totalPrice - amountPaid;
        } else {
            // UNPAID
            balanceRemaining = totalPrice;
        }

        // Save the sale
        const sale = await this.saleRepository.create({
            user_id: userId,
            item_name: itemName,
            quantity: quantity,
            unit_price: unitPrice,
            total_price: totalPrice,
            customer_name: customerName,
            payment_status: paymentStatus,
            amount_paid: amountPaid || 0,
            balance_remaining: balanceRemaining,
        });

        // Update inventory (if not skipped)
        if (!skipInventory && inventoryId) {
            await this.inventoryRepository.reduceStock(inventoryId, quantity);
        }

        // Create debtor if not fully paid and customer exists
        if (paymentStatus !== 'PAID' && customerName && balanceRemaining > 0) {
            // Check if debtor already exists
            const existingDebtors = await this.debtorRepository.findByCustomerName(userId, customerName);
            const existingDebtor = existingDebtors.find(d => d.balance_remaining > 0);

            if (existingDebtor) {
                await this.debtorRepository.update(existingDebtor.id, {
                    total_owed: existingDebtor.total_owed + balanceRemaining,
                    balance_remaining: existingDebtor.balance_remaining + balanceRemaining,
                    status: 'ACTIVE',
                });
            } else {
                await this.debtorRepository.create({
                    user_id: userId,
                    customer_name: customerName,
                    total_owed: balanceRemaining,
                    balance_remaining: balanceRemaining,
                    status: 'ACTIVE',
                });
            }
        }

        return sale;
    }
}

module.exports = RecordSaleUseCase;