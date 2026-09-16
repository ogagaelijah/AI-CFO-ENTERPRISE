// src/application/useCases/projects/DeleteProjectUseCase.js

class DeleteProjectUseCase {
    constructor({ projectRepository, timeEntryRepository = null }) {
        this.projectRepository = projectRepository;
        this.timeEntryRepository = timeEntryRepository;
    }

    async execute({ projectId, businessId }) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }
        if (project.businessId !== businessId) {
            throw new Error('Access denied: Project does not belong to this business');
        }

        // Guard: refuse to delete a project that has billable uninvoiced time.
        // The DB uses ON DELETE SET NULL for time_entries.project_id, so the
        // delete would silently orphan billable time. Block it instead.
        if (this.timeEntryRepository) {
            const pending = await this.timeEntryRepository.findUninvoicedBillable(
                businessId,
                { projectId }
            );
            if (pending.length > 0) {
                throw new Error(
                    `Cannot delete project: ${pending.length} uninvoiced billable time ` +
                    `entr${pending.length === 1 ? 'y' : 'ies'} still reference it. ` +
                    `Invoice or remove them first.`
                );
            }
        }

        const deleted = await this.projectRepository.delete(projectId);
        if (!deleted) {
            throw new Error('Failed to delete project');
        }

        return {
            success: true,
            message: 'Project deleted successfully',
        };
    }
}

module.exports = DeleteProjectUseCase;