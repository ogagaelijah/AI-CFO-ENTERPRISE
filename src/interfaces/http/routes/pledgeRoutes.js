// src/interfaces/http/routes/pledgeRoutes.js
// v1.1.0-prod — Reads require OWNER/ADMIN/MANAGER/ACCOUNTANT.
//               Writes require OWNER/ADMIN/MANAGER.
//               Error classification applied.

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
const { requireRole } = require('../middleware/requireRole');
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

const READ_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'ACCOUNTANT'];
const WRITE_ROLES = ['OWNER', 'ADMIN', 'MANAGER'];

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long|donation|reference|partial/i.test(msg)) return 400;
  return 500;
}

// GET /api/pledges
router.get('/', requireRole(...READ_ROLES), async (req, res) => {
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
            limit, offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/pledges]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message || 'Failed to fetch pledges' });
    }
});

// GET /api/pledges/:id
router.get('/:id', requireRole(...READ_ROLES), async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getPledge.execute({
            pledgeId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/pledges/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// POST /api/pledges — OWNER / ADMIN / MANAGER
router.post('/', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
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
            notes, metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        console.error('❌ [POST /api/pledges]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// PUT /api/pledges/:id — OWNER / ADMIN / MANAGER
router.put('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { donorId, amount, category, dueDate, status, notes, metadata } = req.body;

        const result = await updatePledge.execute({
            pledgeId: parseInt(id, 10),
            businessId, donorId, amount, category,
            dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
            status, notes, metadata,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [PUT /api/pledges/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

// DELETE /api/pledges/:id — OWNER / ADMIN / MANAGER
router.delete('/:id', requireRole(...WRITE_ROLES), invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deletePledge.execute({
            pledgeId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [DELETE /api/pledges/:id]', error.message);
        res.status(classifyError(error)).json({ success: false, message: error.message });
    }
});

module.exports = router;