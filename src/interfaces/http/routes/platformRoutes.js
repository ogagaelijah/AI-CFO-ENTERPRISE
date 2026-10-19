// src/interfaces/http/routes/platformRoutes.js
// v1.6.0-prod — Adds staff promotion/demotion endpoint.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const TeamInviteRepository = require('../../../infrastructure/database/sqlite/repositories/TeamInviteRepository');
const { requirePlatformRole } = require('../middleware/requirePlatformRole');
const logger = require('../../../shared/utils/logger');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const subscriptionRepo = new SubscriptionRepository();
const inviteRepo = new TeamInviteRepository();

const ALL_STAFF = ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'TECHNICAL', 'OPERATIONS', 'MARKETING', 'HR', 'COMPLIANCE', 'FINANCE'];
const ALLOWED_ROLES = ['SUPERADMIN', 'ADMIN', 'SUPPORT', 'TECHNICAL', 'OPERATIONS', 'MARKETING', 'HR', 'COMPLIANCE', 'FINANCE'];
const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─────────────────────────────────────────────
// GET /api/platform/stats
// ─────────────────────────────────────────────
router.get('/stats', requirePlatformRole(...ALL_STAFF), async (req, res) => {
  try {
    const totalUsers = await userRepo.count();
    const totalBusinesses = await businessRepo.count();
    const activeSubscriptions = await subscriptionRepo.countActive();
    const industryDistribution = await businessRepo.getIndustryDistribution();
    
    const recentResult = await userRepo._query(
      'SELECT id, full_name, email, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const recentRegistrations = recentResult.rows.map(u => ({
      id: u.id,
      name: u.full_name || 'Unknown User',
      email: u.email,
      industry: 'N/A',
      date: new Date(u.created_at).toISOString().split('T')[0]
    }));

    return res.json({
      success: true,
      data: {
        totalUsers,
        activeBusinesses: totalBusinesses,
        totalRevenue: 25000,
        activeSubscriptions,
        usersGrowth: 12.5,
        revenueGrowth: 8.3,
        industryDistribution,
        recentRegistrations
      }
    });
  } catch (error) {
    logger.error({ err: error.message }, 'platform: GET stats failed');
    return res.status(500).json({ success: false, message: 'Failed to load platform stats' });
  }
});

// ─────────────────────────────────────────────
// GET /api/platform/staff
// List all current platform staff.
// ─────────────────────────────────────────────
router.get('/staff', requirePlatformRole('SUPERADMIN'), async (req, res) => {
  try {
    const result = await userRepo._query(
      `SELECT id, full_name, email, platform_role, created_at 
       FROM users 
       WHERE platform_role IS NOT NULL 
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error({ err: error.message }, 'platform: GET staff failed');
    return res.status(500).json({ success: false, message: 'Failed to load staff' });
  }
});

// ─────────────────────────────────────────────
// POST /api/platform/staff
// Hire: Promote if exists, Invite if new.
// ─────────────────────────────────────────────
router.post('/staff', requirePlatformRole('SUPERADMIN'), async (req, res) => {
  try {
    const { email, platformRole } = req.body;

    if (!ALLOWED_ROLES.includes(platformRole)) {
      return res.status(400).json({ success: false, message: 'Invalid platform role' });
    }

    const user = await userRepo.findByEmail(email);

    // PATH A: User exists → Promote them immediately
    if (user) {
      await userRepo.update(user.id, { platformRole });
      return res.json({
        success: true,
        status: 'promoted',
        message: `${user.fullName || email} has been promoted to ${platformRole}.`,
      });
    }

    // PATH B: User does not exist → Create Platform Invite
    const businessId = req.user.businessId; 
    if (!businessId) {
      return res.status(400).json({ success: false, message: 'Superadmin must have a business to send invites.' });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await inviteRepo.create({
      businessId,
      email,
      role: 'OWNER', 
      tokenHash,
      invitedBy: req.user.id,
      expiresAt,
      platformRole,
    });

    const inviteUrl = `${FRONTEND_URL}/accept-invite?token=${rawToken}&platform=${platformRole}`;

    return res.json({
      success: true,
      status: 'invited',
      message: `Invite generated for ${email} as ${platformRole}.`,
      inviteUrl
    });

  } catch (error) {
    logger.error({ err: error.message }, 'platform: POST staff failed');
    return res.status(500).json({ success: false, message: 'Failed to hire staff' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/platform/staff/:id
// Change a staff member's role (promotion/demotion).
// ─────────────────────────────────────────────
router.put('/staff/:id', requirePlatformRole('SUPERADMIN'), async (req, res) => {
  try {
    const staffId = parseInt(req.params.id, 10);
    const { platformRole } = req.body;

    if (!ALLOWED_ROLES.includes(platformRole)) {
      return res.status(400).json({ success: false, message: 'Invalid platform role' });
    }

    // Prevent self-demotion (Superadmin shouldn't accidentally lock themselves out)
    if (staffId === req.user.id && platformRole !== 'SUPERADMIN') {
      return res.status(400).json({ success: false, message: 'You cannot demote yourself from Superadmin.' });
    }

    const user = await userRepo.findById(staffId);
    if (!user || !user.platformRole) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await userRepo.update(staffId, { platformRole });
    return res.json({ success: true, message: `Role updated to ${platformRole}.` });
  } catch (error) {
    logger.error({ err: error.message }, 'platform: PUT staff failed');
    return res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/platform/staff/:id
// Revoke platform access (Fire staff).
// ─────────────────────────────────────────────
router.delete('/staff/:id', requirePlatformRole('SUPERADMIN'), async (req, res) => {
  try {
    const staffId = parseInt(req.params.id, 10);
    
    if (staffId === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot revoke your own Superadmin access.' });
    }

    const user = await userRepo.findById(staffId);
    if (!user || !user.platformRole) {
      return res.status(404).json({ success: false, message: 'Staff member not found.' });
    }

    await userRepo.update(staffId, { platformRole: null });

    return res.json({ success: true, message: `${user.fullName || user.email} has been removed from the platform staff.` });
  } catch (error) {
    logger.error({ err: error.message }, 'platform: DELETE staff failed');
    return res.status(500).json({ success: false, message: 'Failed to revoke staff access' });
  }
});

module.exports = router;