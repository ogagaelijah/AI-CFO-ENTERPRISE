// src/interfaces/http/routes/partnerRoutes.js
// v1.1.0 — Adds Request Payout route.

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const BecomePartnerUseCase = require('../../../application/useCases/partners/BecomePartnerUseCase');
const GetPartnerDashboardUseCase = require('../../../application/useCases/partners/GetPartnerDashboardUseCase');
const RequestPayoutUseCase = require('../../../application/useCases/partners/RequestPayoutUseCase'); // ★ NEW

const becomePartnerUC = new BecomePartnerUseCase();
const getDashboardUC = new GetPartnerDashboardUseCase();
const requestPayoutUC = new RequestPayoutUseCase(); // ★ NEW

router.use(authMiddleware);

router.post('/apply', async (req, res) => {
  try {
    const partner = await becomePartnerUC.execute({
      userId: req.user.id,
      businessId: req.user.businessId,
      fullName: req.user.fullName || 'Partner'
    });
    res.json({ success: true, partner });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const data = await getDashboardUC.execute({ userId: req.user.id });
    res.json({ success: true, data });
  } catch (error) {
    res.status(404).json({ success: false, message: error.message });
  }
});

// ★ NEW: Request Withdrawal
router.post('/withdraw', async (req, res) => {
  try {
    const { amount, bankDetails } = req.body;
    const result = await requestPayoutUC.execute({ 
      userId: req.user.id, 
      amount, 
      bankDetails 
    });
    res.json({ success: true, message: 'Withdrawal requested successfully', data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;