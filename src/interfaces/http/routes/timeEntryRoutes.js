// src/interfaces/http/routes/timeEntryRoutes.js
// v2.1.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.
// v2.0.0-prod — Rate removed (monthly retainer model).

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
const { requireRole } = require('../middleware/requireRole');
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

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

// GET /api/time-entries
router.get('/', requireRole(...READ_ROLES), async (req, res) => {
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
            limit, offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/time-entries]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch time entries' });
    }
});

// GET /api/time-entries/:id
router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/time-entries/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// POST /api/time-entries — OWNER / ADMIN / MANAGER
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { projectId, customerId, entryDate, hours, description, billable, metadata } = req.body;

        const result = await createTimeEntryUseCase.execute({
            businessId,
            projectId: projectId || null,
            customerId: customerId || null,
            entryDate: entryDate ? new Date(entryDate) : new Date(),
            hours, description, billable, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/time-entries]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// PUT /api/time-entries/:id — OWNER / ADMIN / MANAGER
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { projectId, customerId, entryDate, hours, description, billable, metadata } = req.body;

        const result = await updateTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId, projectId, customerId,
            entryDate: entryDate !== undefined ? (entryDate ? new Date(entryDate) : null) : undefined,
            hours, description, billable, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/time-entries/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// DELETE /api/time-entries/:id — OWNER / ADMIN / MANAGER
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteTimeEntryUseCase.execute({
            timeEntryId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/time-entries/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;