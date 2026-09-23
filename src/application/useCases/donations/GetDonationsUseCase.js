// src/application/useCases/donations/GetDonationsUseCase.js

class GetDonationsUseCase {
    constructor({ donationRepository }) {
        if (!donationRepository) throw new Error('donationRepository is required');
        this.donationRepository = donationRepository;
    }

    async execute({
        businessId,
        category = null,
        method = null,
        donorId = null,
        pledgeId = null,
        fromDate = null,
        toDate = null,
        search = null,
        limit = 50,
        offset = 0,
    }) {
        if (!businessId) throw new Error('Business ID is required');

        const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
        const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

        const filters = {
            category: category || null,
            method: method || null,
            donorId: donorId ? parseInt(donorId, 10) : null,
            pledgeId: pledgeId ? parseInt(pledgeId, 10) : null,
            fromDate: fromDate || null,
            toDate: toDate || null,
            search: search || null,
        };

        const donations = await this.donationRepository.findByBusinessId(businessId, {
            ...filters,
            limit: safeLimit,
            offset: safeOffset,
        });

        const total = await this.donationRepository.countByBusinessId(businessId, filters);
        const summary = await this.donationRepository.getSummary(businessId, filters);
        const todayTotal = await this.donationRepository.getTodayTotal(businessId);
        const donorCount = await this.donationRepository.countDonors(businessId);

        return {
            success: true,
            donations: donations.map((d) => d.toJSON()),
            summary: {
                ...summary,
                todayTotal,
                donorCount,
            },
            pagination: {
                total,
                limit: safeLimit,
                offset: safeOffset,
                hasMore: safeOffset + donations.length < total,
            },
        };
    }
}

module.exports = GetDonationsUseCase;