// src/application/useCases/timeEntries/DeleteTimeEntryUseCase.js

class DeleteTimeEntryUseCase {
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

        const existing = await this.timeEntryRepository.findById(timeEntryId, businessId);
        if (!existing) {
            throw new Error('Time entry not found');
        }

        // Invoiced entries are locked — deleting one would silently change
        // the amount owed on a billed invoice.
        if (existing.invoiced) {
            throw new Error(
                'Cannot delete an invoiced time entry. Cancel or adjust the invoice first.'
            );
        }

        const deleted = await this.timeEntryRepository.delete(timeEntryId, businessId);
        if (!deleted) {
            throw new Error('Failed to delete time entry');
        }

        return {
            success: true,
            message: 'Time entry deleted successfully',
        };
    }
}

module.exports = DeleteTimeEntryUseCase;