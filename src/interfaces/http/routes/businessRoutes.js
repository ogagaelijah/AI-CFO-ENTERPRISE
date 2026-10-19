// src/interfaces/http/routes/businessRoutes.js
// v1.2.0-prod — Fix: GET / uses req.user.businessId (works for all roles).
//               Writes require OWNER/ADMIN. Error classification applied.
// v1.1.0-prod — Writes require OWNER/ADMIN.
// v1.0.0-prod — Initial.

const express = require('express');
const router = express.Router();
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');

const businessRepo = new BusinessRepository();

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/business — all authenticated
// Uses req.user.businessId (canonical tenant). Works for OWNER, ADMIN,
// MANAGER, CASHIER, ACCOUNTANT — everyone gets the business they belong to.
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business context missing',
      });
    }

    const business = await businessRepo.findById(businessId);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found',
      });
    }

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
      },
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(classifyError(error)).json({ success: false, message: error.message });
  }
});

// ─────────────────────────────────────────────
// PUT /api/business — OWNER / ADMIN
// Uses req.user.businessId (canonical tenant).
// ─────────────────────────────────────────────
router.put('/', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;

    if (!businessId) {
      return res.status(400).json({
        success: false,
        message: 'Business context missing',
      });
    }

    const { name, industry } = req.body;

    const updated = await businessRepo.update(businessId, { name, industry });

    res.json({
      success: true,
      message: 'Business updated successfully',
      business: {
        id: updated.id,
        name: updated.name,
        industry: updated.industry,
      },
    });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(classifyError(error)).json({ success: false, message: error.message });
  }
});

module.exports = router;