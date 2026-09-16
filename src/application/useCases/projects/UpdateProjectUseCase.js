// src/application/useCases/projects/UpdateProjectUseCase.js

class UpdateProjectUseCase {
    constructor({ projectRepository }) {
        this.projectRepository = projectRepository;
    }

    async execute({
        projectId,
        businessId,
        name,
        description,
        status,
        budget,
        startDate,
        endDate,
        customerId,
        customerType,
        notes,
        metadata,
    }) {
        if (!projectId) {
            throw new Error('Project ID is required');
        }
        if (!businessId) {
            throw new Error('Business ID is required');
        }

        const existing = await this.projectRepository.findById(projectId);
        if (!existing) {
            throw new Error('Project not found');
        }
        if (existing.businessId !== businessId) {
            throw new Error('Access denied: Project does not belong to this business');
        }

        if (name !== undefined && (!name || name.trim().length === 0)) {
            throw new Error('Project name cannot be empty');
        }
        if (budget !== undefined && Number(budget) < 0) {
            throw new Error('Budget cannot be negative');
        }

        const updateData = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (budget !== undefined) updateData.budget = Number(budget);
        if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
        if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
        if (customerId !== undefined) updateData.customerId = customerId;
        if (customerType !== undefined) updateData.customerType = customerType;
        if (notes !== undefined) updateData.notes = notes;
        if (metadata !== undefined) updateData.metadata = metadata;

        if (Object.keys(updateData).length === 0) {
            return {
                success: true,
                project: existing.toJSON(),
                message: 'No changes made',
            };
        }

        const updated = await this.projectRepository.update(projectId, updateData);

        return {
            success: true,
            project: updated.toJSON(),
            message: 'Project updated successfully',
        };
    }
}

module.exports = UpdateProjectUseCase;