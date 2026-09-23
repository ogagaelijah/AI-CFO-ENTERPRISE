// src/application/useCases/donations/GetDonationUseCase.js

class GetDonationUseCase {
    constructor({ donationRepository }) {
        if (!donationRepository) throw new Error('donationRepository is required');
        this.donationRepository = donationRepository;
    }

    async execute({ donationId, businessId }) {
        if (!donationId) throw new Error('Donation ID is required');
        if (!businessId) throw new Error('Business ID is required');

        const donation = await this.donationRepository.findById(donationId, businessId);
        if (!donation) throw new Error('Donation not found');

        return { success: true, donation: donation.toJSON() };
    }
}

module.exports = GetDonationUseCase;