// src/interfaces/http/routes/timeEntryRoutes.js
// v2.0.0-prod — Rate removed from POST/PUT (monthly retainer model).

'use strict';

const express = require('express');
const router = express.Router();

const TimeEntryRepository = require('../../../infrastructure/database/sqlite/repositories/TimeEntryRepository');
const ProjectRepository = require('../../../infrastructure/database/sqlite/repositories/ProjectRepository');

const CreateTimeEntryUseCase = require('../../../application/useCases/timeEntries/CreateTimeEntryUseCase');
const GetTimeEntryUseCase = require('../../../application/useCases/timeEntries/GetTimeEntryUseCase');
const GetTimeEntriesUseCase = require('../../../application/useCases/timeEntries/GetTimeEntriesUseCase');
const UpdateTimeEntryUseCase = require('../../../application/useCases/timeEntries/UpdateTimeEntryUseCase');
const DeleteTimeEntryUseCase = require('../../../application/useCases/timeEntries/DeleteTimeEntryUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const timeEntryRepo = new TimeEntryRepository();
const projectRepo = new ProjectRepository();

const createTimeEntryUseCase = new CreateTimeEntryUseCase({
    timeEntryRepository: timeEntryRepo,
    projectRepository: projectRepo,
});
const getTimeEntryUseCase = new GetTimeEntryUseCase({ timeEntryRepository: timeEntryRepo });
const getTimeEntriesUseCase = new GetTimeEntriesUseCase({ timeEntryRepository: timeEntryRepo });
const updateTimeEntryUseCase = new UpdateTimeEntryUseCase({
    timeEntryRepository: timeEntryRepo,
    projectRepository: projectRepo,
});
const deleteTimeEntryUseCase = new DeleteTimeEntryUseCase({ timeEntryRepository: timeEntryRepo });

router.use(authMiddleware);

// GET /api/time-entries
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            limit = 50, offset = 0, projectId, customerId,
            billable, invoiced, fromDate, toDate, search,
        } = req.query;

        const result = await getTimeEntriesUseCase.execute({
            businessId,
            projectId: projectId ? parseInt(projectId, 10) : null,
            customerId: customerId ? parseInt(customerId, 10) : null,
            billable: billable === undefined ? undefined : billable === 'true',
            invoiced: invoiced === undefined ? undefined : invoiced === 'true',
            fromDate: fromDate || null,
            toDate: toDate || null,
            search: search || null,
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/time-entries]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch time entries' });
    }
});

// GET /api/time-entries/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 500;
        console.error('❌ [GET /api/time-entries/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/time-entries
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            projectId, customerId, entryDate, hours,
            description, billable, metadata,
        } = req.body;

        const result = await createTimeEntryUseCase.execute({
            businessId,
            projectId: projectId || null,
            customerId: customerId || null,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            hours,
            description,
            billable,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/time-entries]', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT /api/time-entries/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const {
            projectId, customerId, entryDate, hours,
            description, billable, metadata,
        } = req.body;

        const result = await updateTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId,
            projectId,
            customerId,
            entryDate: entryDate !== undefined ? (entryDate ? new Date(entryDate) : null) : undefined,
            hours,
            description,
            billable,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/time-entries/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/time-entries/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : 400;
        console.error('❌ [DELETE /api/time-entries/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;