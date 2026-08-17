// src/application/useCases/sales/GetSalesUseCase.js

class GetSalesUseCase {
    constructor(saleRepository) {
        this.saleRepository = saleRepository;
    }

    async execute(userId, filters = {}) {
        let sales = await this.saleRepository.findByUserId(userId);

        // Apply filters
        if (filters.startDate && filters.endDate) {
            sales = await this.saleRepository.findByDateRange(userId, filters.startDate, filters.endDate);
        }

        return sales;
    }

    async getSummary(userId) {
        return this.saleRepository.getSalesSummary(userId);
    }

    async getToday(userId) {
        return this.saleRepository.getTodaySales(userId);
    }
}

module.exports = GetSalesUseCase;