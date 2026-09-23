// src/interfaces/http/routes/pledgeRoutes.js
// v1.0.0-prod — NGO pledges endpoints.

'use strict';

const express = require('express');
const router = express.Router();

const PledgeRepository = require('../../../infrastructure/database/sqlite/repositories/PledgeRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const DonationRepository = require('../../../infrastructure/database/sqlite/repositories/DonationRepository');

const CreatePledgeUseCase = require('../../../application/useCases/pledges/CreatePledgeUseCase');
const GetPledgeUseCase = require('../../../application/useCases/pledges/GetPledgeUseCase');
const GetPledgesUseCase = require('../../../application/useCases/pledges/GetPledgesUseCase');
const UpdatePledgeUseCase = require('../../../application/useCases/pledges/UpdatePledgeUseCase');
const DeletePledgeUseCase = require('../../../application/useCases/pledges/DeletePledgeUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const pledgeRepo = new PledgeRepository();
const customerRepo = new CustomerRepository();
const donationRepo = new DonationRepository();

const createPledge = new CreatePledgeUseCase({
    pledgeRepository: pledgeRepo,
    customerRepository: customerRepo,
});
const getPledge = new GetPledgeUseCase({ pledgeRepository: pledgeRepo });
const getPledges = new GetPledgesUseCase({ pledgeRepository: pledgeRepo });
const updatePledge = new UpdatePledgeUseCase({
    pledgeRepository: pledgeRepo,
    customerRepository: customerRepo,
});
const deletePledge = new DeletePledgeUseCase({
    pledgeRepository: pledgeRepo,
    donationRepository: donationRepo,
});

router.use(authMiddleware);

// GET /api/pledges
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { limit = 50, offset = 0, status, donorId, category, search } = req.query;

        const result = await getPledges.execute({
            businessId,
            status: status || null,
            donorId: donorId || null,
            category: category || null,
            search: search || null,
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/pledges]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch pledges' });
    }
});

// GET /api/pledges/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getPledge.execute({
            pledgeId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            500;
        console.error('❌ [GET /api/pledges/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/pledges
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const { donorId, amount, category, pledgeDate, dueDate, notes, metadata } = req.body;

        const result = await createPledge.execute({
            businessId,
            donorId: donorId || null,
            amount,
            category: category || 'GENERAL',
            pledgeDate: pledgeDate ? new Date(pledgeDate) : new Date(),
            dueDate: dueDate ? new Date(dueDate) : null,
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            400;
        console.error('❌ [POST /api/pledges]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// PUT /api/pledges/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { donorId, amount, category, dueDate, status, notes, metadata } = req.body;

        const result = await updatePledge.execute({
            pledgeId: parseInt(id, 10),
            businessId,
            donorId,
            amount,
            category,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            400;
        console.error('❌ [PUT /api/pledges/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/pledges/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deletePledge.execute({
            pledgeId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /donation|reference|partial/i.test(error.message) ? 409 :
            400;
        console.error('❌ [DELETE /api/pledges/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;