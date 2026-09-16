// src/application/useCases/timeEntries/GetTimeEntryUseCase.js

class GetTimeEntryUseCase {
    constructor({ timeEntryRepository }) {
        this.timeEntryRepository = timeEntryRepository;
    }

    async execute({ timeEntryId, businessId }) {
        if (!timeEntryId) {
            throw new Error('Time entry ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const entry = await this.timeEntryRepository.findById(timeEntryId, businessId);
        if (!entry) {
            throw new Error('Time entry not found');
        }

        return {
            success: true,
            timeEntry: entry.toJSON(),
        };
    }
}

module.exports = GetTimeEntryUseCase;