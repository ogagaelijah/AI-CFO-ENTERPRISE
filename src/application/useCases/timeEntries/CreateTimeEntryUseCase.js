// src/application/useCases/timeEntries/CreateTimeEntryUseCase.js
// v2.0.0-prod — Rate removed (monthly retainer model). Hours-only time tracking.

class CreateTimeEntryUseCase {
    constructor({ timeEntryRepository, projectRepository = null }) {
        this.timeEntryRepository = timeEntryRepository;
        this.projectRepository = projectRepository;
    }

    async execute({
        businessId,
        projectId = null,
        customerId = null,
        entryDate = new Date(),
        hours,
        description = '',
        billable = true,
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        // If a project is referenced, verify it belongs to this business
        if (projectId && this.projectRepository) {
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }
            if (project.businessId !== businessId) {
                throw new Error('Access denied: Project does not belong to this business');
            }
        }

        // Entity constructor enforces hours > 0, <= 24
        const TimeEntry = require('../../../domain/entities/TimeEntry');
        const entry = new TimeEntry({
            businessId,
            projectId,
            customerId,
            entryDate,
            hours,
            rate: 0,           // rate column stays in DB, always 0 (monthly retainer model)
            description,
            billable,
            invoiced: false,
            metadata,
        });

        const saved = await this.timeEntryRepository.create(entry);

        return {
            success: true,
            timeEntry: saved.toJSON(),
            message: 'Time entry created successfully',
        };
    }
}

module.exports = CreateTimeEntryUseCase;