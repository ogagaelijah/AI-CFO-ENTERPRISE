// src/interfaces/http/routes/termRoutes.js

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
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const termRepo = new TermRepository();

const createTermUseCase = new CreateTermUseCase({ termRepository: termRepo });
const getTermUseCase = new GetTermUseCase({ termRepository: termRepo });
const getTermsUseCase = new GetTermsUseCase({ termRepository: termRepo });
const updateTermUseCase = new UpdateTermUseCase({ termRepository: termRepo });
const setActiveTermUseCase = new SetActiveTermUseCase({ termRepository: termRepo });
const deleteTermUseCase = new DeleteTermUseCase({ termRepository: termRepo });

router.use(authMiddleware);

// GET /api/terms
router.get('/', async (req, res) => {
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
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/terms]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch terms' });
    }
});

// GET /api/terms/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await getTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 500;
        console.error('❌ [GET /api/terms/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/terms
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            name, session, startDate, endDate, status, metadata, setAsActive,
        } = req.body;

        const result = await createTermUseCase.execute({
            businessId,
            name,
            session,
            startDate,
            endDate,
            status: status || 'ACTIVE',
            metadata,
            setAsActive: setAsActive === true,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/terms]', error.message);
        res.status(400).json({ success: false, message: error.message });
    }
});

// PUT /api/terms/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { name, session, startDate, endDate, status, metadata } = req.body;

        const result = await updateTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
            name,
            session,
            startDate,
            endDate,
            status,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [PUT /api/terms/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/terms/:id/set-active
router.post('/:id/set-active', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await setActiveTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [POST /api/terms/:id/set-active]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/terms/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteTermUseCase.execute({
            termId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status = /not found/i.test(error.message) ? 404 : /access denied/i.test(error.message) ? 403 : 400;
        console.error('❌ [DELETE /api/terms/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;