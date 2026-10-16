// src/interfaces/http/routes/termRoutes.js
// v1.1.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.

'use strict';

const express = require('express');
const router = express.Router();

const TermRepository = require('../../../infrastructure/database/sqlite/repositories/TermRepository');

const CreateTermUseCase = require('../../../application/useCases/terms/CreateTermUseCase');
const GetTermUseCase = require('../../../application/useCases/terms/GetTermUseCase');
const GetTermsUseCase = require('../../../application/useCases/terms/GetTermsUseCase');
const UpdateTermUseCase = require('../../../application/useCases/terms/UpdateTermUseCase');
const SetActiveTermUseCase = require('../../../application/useCases/terms/SetActiveTermUseCase');
const DeleteTermUseCase = require('../../../application/useCases/terms/DeleteTermUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const termRepo = new TermRepository();

const createTermUseCase = new CreateTermUseCase({ termRepository: termRepo });
const getTermUseCase = new GetTermUseCase({ termRepository: termRepo });
const getTermsUseCase = new GetTermsUseCase({ termRepository: termRepo });
const updateTermUseCase = new UpdateTermUseCase({ termRepository: termRepo });
const setActiveTermUseCase = new SetActiveTermUseCase({ termRepository: termRepo });
const deleteTermUseCase = new DeleteTermUseCase({ termRepository: termRepo });

router.use(authMiddleware);

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|active term/i.test(msg)) return 400;
  return 500;
}

router.get('/', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { limit = 50, offset = 0, status, session } = req.query;

        const result = await getTermsUseCase.execute({
            businessId,
            status: status || null,
            session: session || null,
            limit, offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/terms]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch terms' });
    }
});

router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/terms/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { name, session, startDate, endDate, status, metadata, setAsActive } = req.body;

        const result = await createTermUseCase.execute({
            businessId, name, session, startDate, endDate,
            status: status || 'ACTIVE',
            metadata,
            setAsActive: setAsActive === true,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/terms]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { name, session, startDate, endDate, status, metadata } = req.body;

        const result = await updateTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
            name, session, startDate, endDate, status, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/terms/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.post('/:id/set-active', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await setActiveTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [POST /api/terms/:id/set-active]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/terms/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;