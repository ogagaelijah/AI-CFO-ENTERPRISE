// src/application/useCases/projects/CreateProjectUseCase.js

class CreateProjectUseCase {
    constructor({ projectRepository }) {
        this.projectRepository = projectRepository;
    }

    async execute({
        businessId,
        name,
        description = '',
        budget = 0,
        startDate = new Date(),
        endDate = null,
        customerId = null,
        customerType = null,
        notes = '',
        metadata = {},
    }) {
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        if (!name || name.trim().length === 0) {
            throw new Error('Project name is required');
        }

        if (budget < 0) {
            throw new Error('Budget cannot be negative');
        }

        // Create project
        const Project = require('../../../domain/entities/Project');
        const project = new Project({
            businessId,
            name: name.trim(),
            description,
            status: 'ACTIVE',
            budget,
            startDate,
            endDate,
            customerId,
            customerType,
            notes,
            metadata,
        });

        const savedProject = await this.projectRepository.create(project);

        return {
            success: true,
            project: savedProject.toJSON(),
            message: 'Project created successfully',
        };
    }
}

module.exports = CreateProjectUseCase;