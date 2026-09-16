// src/application/useCases/timeEntries/UpdateTimeEntryUseCase.js
// v2.0.0-prod — Rate removed. Hours-only time tracking.

class UpdateTimeEntryUseCase {
    constructor({ timeEntryRepository, projectRepository = null }) {
        this.timeEntryRepository = timeEntryRepository;
        this.projectRepository = projectRepository;
    }

    async execute({
        timeEntryId,
        businessId,
        projectId,
        customerId,
        entryDate,
        hours,
        description,
        billable,
        metadata,
    }) {
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

        // Once invoiced, the entry is locked — only description/metadata editable.
        if (existing.invoiced) {
            const allowed = {};
            if (description !== undefined) allowed.description = description;
            if (metadata !== undefined) allowed.metadata = metadata;

            if (Object.keys(allowed).length === 0) {
                throw new Error('Invoiced time entries cannot be edited');
            }
            const updated = await this.timeEntryRepository.update(timeEntryId, businessId, allowed);
            return {
                success: true,
                timeEntry: updated.toJSON(),
                message: 'Time entry updated (invoiced entry: only description/metadata allowed)',
            };
        }

        // If a new project is referenced, verify ownership
        if (projectId !== undefined && projectId && this.projectRepository) {
            const project = await this.projectRepository.findById(projectId);
            if (!project) {
                throw new Error('Project not found');
            }
            if (project.businessId !== businessId) {
                throw new Error('Access denied: Project does not belong to this business');
            }
        }

        // Validate hours if provided
        if (hours !== undefined) {
            const h = Number(hours);
            if (!Number.isFinite(h) || h <= 0) {
                throw new Error('Hours must be a positive number');
            }
            if (h > 24) {
                throw new Error('Hours cannot exceed 24 in a single entry');
            }
        }

        const updateData = {};
        if (projectId !== undefined) updateData.projectId = projectId;
        if (customerId !== undefined) updateData.customerId = customerId;
        if (entryDate !== undefined) updateData.entryDate = entryDate ? new Date(entryDate) : null;
        if (hours !== undefined) updateData.hours = Number(hours);
        if (description !== undefined) updateData.description = description;
        if (billable !== undefined) updateData.billable = Boolean(billable);
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                timeEntry: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.timeEntryRepository.update(timeEntryId, businessId, updateData);

        return {
            success: true,
            timeEntry: updated.toJSON(),
            message: 'Time entry updated successfully',
        };
    }
}

module.exports = UpdateTimeEntryUseCase;