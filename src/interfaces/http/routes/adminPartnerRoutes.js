// src/interfaces/http/routes/adminPartnerRoutes.js
// v1.0.0 — Admin routes for managing partner payouts.

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/authMiddleware');
const AdminProcessPayoutUseCase = require('../../../application/useCases/partners/AdminProcessPayoutUseCase');
const { query } = require('../../../infrastructure/database/sqlite/connection');

const processPayoutUC = new AdminProcessPayoutUseCase();

// Custom Admin check since we aren't importing a specific requireAdmin middleware
const requirePlatformAdmin = (req, res, next) => {
  if (!req.user || !req.user.platformRole) {
    return res.status(403).json({ success: false, message: 'Access denied: Platform Admin only' });
  }
  next();
};

router.use(authMiddleware);
router.use(requirePlatformAdmin); // ★ Enforce Admin access

// GET all payouts
router.get('/payouts', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, u.full_name as partner_name, u.email as partner_email
      FROM partner_payouts p
      JOIN partners pt ON pt.id = p.partner_id
      JOIN users u ON u.id = pt.user_id
      ORDER BY p.requested_at DESC
    `);
    res.json({ success: true, data: result.rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT process payout (Approve/Reject)
router.put('/payouts/:id', async (req, res) => {
  try {
    const { status } = req.body;
    await processPayoutUC.execute({ 
      payoutId: parseInt(req.params.id), 
      status 
    });
    res.json({ success: true, message: `Payout ${status.toLowerCase()} successfully` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;