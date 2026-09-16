// src/interfaces/http/routes/projectRoutes.js

'use strict';

const express = require('express');
const router = express.Router();

const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');
const TimeEntryRepository = require('../../../infrastructure/database/sqlite/repositories/TimeEntryRepository');

const CreateProjectUseCase = require('../../../application/useCases/projects/CreateProjectUseCase');
const GetProjectUseCase = require('../../../application/useCases/projects/GetProjectUseCase');
const GetProjectsUseCase = require('../../../application/useCases/projects/GetProjectsUseCase');
const UpdateProjectUseCase = require('../../../application/useCases/projects/UpdateProjectUseCase');
const DeleteProjectUseCase = require('../../../application/useCases/projects/DeleteProjectUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const projectRepo = new ProjectRepository();
const timeEntryRepo = new TimeEntryRepository();

const createProjectUseCase = new CreateProjectUseCase({ projectRepository: projectRepo });
const getProjectUseCase = new GetProjectUseCase({ projectRepository: projectRepo });
const getProjectsUseCase = new GetProjectsUseCase({ projectRepository: projectRepo });
const updateProjectUseCase = new UpdateProjectUseCase({ projectRepository: projectRepo });
const deleteProjectUseCase = new DeleteProjectUseCase({
    projectRepository: projectRepo,
    timeEntryRepository: timeEntryRepo,
});

router.use(authMiddleware);

// =============================================
// GET /api/projects — list projects
// =============================================
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { limit = 50, offset = 0, status, search, customerId } = req.query;

        const result = await getProjectsUseCase.execute({
            businessId,
            status: status || null,
            search: search || null,
            customerId: customerId ? parseInt(customerId, 10) : null,
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/projects]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch projects' });
    }
});

// =============================================
// GET /api/projects/:id — single project
// =============================================
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getProjectUseCase.execute({
            projectId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 500;
        console.error('❌ [GET /api/projects/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// =============================================
// POST /api/projects — create project
// =============================================
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            name, description, budget, startDate, endDate,
            customerId, customerType, notes, metadata,
        } = req.body;

        const result = await createProjectUseCase.execute({
            businessId,
            name,
            description,
            budget,
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            customerId: customerId || null,
            customerType: customerType || null,
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/projects]', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// =============================================
// PUT /api/projects/:id — update project
// =============================================
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const {
            name, description, status, budget, startDate, endDate,
            customerId, customerType, notes, metadata,
        } = req.body;

        const result = await updateProjectUseCase.execute({
            projectId: parseInt(id, 10),
            businessId,
            name,
            description,
            status,
            budget,
            startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
            endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
            customerId,
            customerType,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/projects/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// =============================================
// DELETE /api/projects/:id — delete project
// =============================================
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteProjectUseCase.execute({
            projectId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [DELETE /api/projects/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;