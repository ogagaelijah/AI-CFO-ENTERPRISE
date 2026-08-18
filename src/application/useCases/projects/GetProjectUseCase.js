// src/application/useCases/projects/GetProjectUseCase.js

class GetProjectUseCase {
    constructor({ projectRepository }) {
        this.projectRepository = projectRepository;
    }

    async execute({ projectId, businessId }) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }

        const project = await this.projectRepository.findById(projectId);
        if (!project) {
            throw new Error('Project not found');
        }

        // Verify business ownership
        if (project.businessId !== businessId) {
            throw new Error('Access denied: Project does not belong to this business');
        }

        return {
            success: true,
            project: project.toJSON(),
        };
    }
}

module.exports = GetProjectUseCase;