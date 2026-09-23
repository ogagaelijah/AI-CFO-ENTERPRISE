// src/interfaces/http/routes/donationRoutes.js
// v1.0.0-prod — NGO donations endpoints.

'use strict';

const express = require('express');
const router = express.Router();

const DonationRepository = require('../../../infrastructure/database/sqlite/repositories/DonationRepository');
const PledgeRepository = require('../../../infrastructure/database/sqlite/repositories/PledgeRepository');
const CustomerRepository = require('../../../infrastructure/database/sqlite/repositories/CustomerRepository');
const IncomeRepository = require('../../../infrastructure/database/sqlite/repositories/IncomeRepository');
const PaymentRepository = require('../../../infrastructure/database/sqlite/repositories/PaymentRepository');

const RecordDonationUseCase = require('../../../application/useCases/donations/RecordDonationUseCase');
const GetDonationUseCase = require('../../../application/useCases/donations/GetDonationUseCase');
const GetDonationsUseCase = require('../../../application/useCases/donations/GetDonationsUseCase');
const UpdateDonationUseCase = require('../../../application/useCases/donations/UpdateDonationUseCase');
const DeleteDonationUseCase = require('../../../application/useCases/donations/DeleteDonationUseCase');

const { authMiddleware } = require('../middleware/authMiddleware');
const { invalidateAfterWrite } = require('../middleware/cacheInvalidator');

const donationRepo = new DonationRepository();
const pledgeRepo = new PledgeRepository();
const customerRepo = new CustomerRepository();
const incomeRepo = new IncomeRepository();
const paymentRepo = new PaymentRepository();

const recordDonation = new RecordDonationUseCase({
    donationRepository: donationRepo,
    pledgeRepository: pledgeRepo,
    customerRepository: customerRepo,
    incomeRepository: incomeRepo,
    paymentRepository: paymentRepo,
});
const getDonation = new GetDonationUseCase({ donationRepository: donationRepo });
const getDonations = new GetDonationsUseCase({ donationRepository: donationRepo });
const updateDonation = new UpdateDonationUseCase({
    donationRepository: donationRepo,
    customerRepository: customerRepo,
});
const deleteDonation = new DeleteDonationUseCase({
    donationRepository: donationRepo,
    pledgeRepository: pledgeRepo,
    incomeRepository: incomeRepo,
    paymentRepository: paymentRepo,
});

router.use(authMiddleware);

// GET /api/donations
router.get('/', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            limit = 50, offset = 0,
            category, method, donorId, pledgeId, fromDate, toDate, search,
        } = req.query;

        const result = await getDonations.execute({
            businessId,
            category: category || null,
            method: method || null,
            donorId: donorId || null,
            pledgeId: pledgeId || null,
            fromDate: fromDate || null,
            toDate: toDate || null,
            search: search || null,
            limit,
            offset,
        });

        res.json(result);
    } catch (error) {
        console.error('❌ [GET /api/donations]', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to fetch donations' });
    }
});

// GET /api/donations/:id
router.get('/:id', async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;
        const result = await getDonation.execute({
            donationId: parseInt(id, 10),
            businessId,
        });
        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            500;
        console.error('❌ [GET /api/donations/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// POST /api/donations
router.post('/', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const userId = req.user.id;
        if (!businessId) {
            return res.status(400).json({ success: false, message: 'Business ID is required' });
        }

        const {
            donorId, pledgeId, amount, category, method,
            donationDate, referenceNumber, notes, metadata,
        } = req.body;

        const result = await recordDonation.execute({
            businessId,
            userId,
            donorId: donorId || null,
            pledgeId: pledgeId || null,
            amount,
            category: category || 'GENERAL',
            method: method || 'CASH',
            donationDate: donationDate ? new Date(donationDate) : new Date(),
            referenceNumber: referenceNumber || null,
            notes,
            metadata,
        });

        res.status(201).json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            /cancelled|fulfilled|exceeds/i.test(error.message) ? 400 :
            400;
        console.error('❌ [POST /api/donations]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// PUT /api/donations/:id
router.put('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const { category, method, referenceNumber, notes, metadata } = req.body;

        const result = await updateDonation.execute({
            donationId: parseInt(id, 10),
            businessId,
            category,
            method,
            referenceNumber,
            notes,
            metadata,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            /access denied/i.test(error.message) ? 403 :
            400;
        console.error('❌ [PUT /api/donations/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

// DELETE /api/donations/:id
router.delete('/:id', invalidateAfterWrite, async (req, res) => {
    try {
        const businessId = req.user.businessId;
        const { id } = req.params;

        const result = await deleteDonation.execute({
            donationId: parseInt(id, 10),
            businessId,
        });

        res.json(result);
    } catch (error) {
        const status =
            /not found/i.test(error.message) ? 404 :
            400;
        console.error('❌ [DELETE /api/donations/:id]', error.message);
        res.status(status).json({ success: false, message: error.message });
    }
});

module.exports = router;