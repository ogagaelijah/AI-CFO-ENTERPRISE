// src/interfaces/http/routes/teamRoutes.js
// v1.0.0-prod — Team management: invite, accept, list, update role, remove.
//               Every route is tenant-scoped by req.user.businessId.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const BusinessMemberRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessMemberRepository');
const TeamInviteRepository = require('../../../infrastructure/database/sqlite/repositories/TeamInviteRepository');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const emailService = require('../../../infrastructure/services/email/ResendService');

const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/requireRole');
const { strictLimiter } = require('../middleware/rateLimiter');
const logger = require('../../../shared/utils/logger');

const memberRepo = new BusinessMemberRepository();
const inviteRepo = new TeamInviteRepository();
const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

const ALLOWED_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT'];
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

const normalizeEmail = (e) => String(e || '').trim().toLowerCase();

const validatePassword = (password) => {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.trim().length === 0) {
    return 'Password cannot be only whitespace';
  }
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    return `Password is too long (max ${PASSWORD_MAX_BYTES} bytes)`;
  }
  return null;
};

const FRONTEND_URL =
  process.env.FRONTEND_URL || 'http://localhost:5173';

// ═══════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════

// ─────────────────────────────────────────────
// GET /api/team/invite/:token
// Public: fetch invite details (email, business name, role) for the
// accept-invite page. Does NOT consume the invite.
// ─────────────────────────────────────────────
router.get('/invite/:token', strictLimiter, async (req, res) => {
  try {
    const tokenHash = hashToken(req.params.token);
    const invite = await inviteRepo.findByTokenHash(tokenHash);

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or already used' });
    }
    if (invite.isAccepted()) {
      return res.status(400).json({ success: false, message: 'This invite has already been accepted' });
    }
    if (invite.isExpired()) {
      return res.status(400).json({ success: false, message: 'This invite has expired' });
    }

    const business = await businessRepo.findById(invite.businessId);
    const existingUser = await userRepo.findByEmail(invite.email);

    return res.json({
      success: true,
      invite: {
        email: invite.email,
        role: invite.role,
        businessName: business?.name || null,
        // Tells the frontend whether to show "create account" or "log in to accept"
        userExists: Boolean(existingUser),
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, 'team: GET invite failed');
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/team/accept
// Public: accept invite. Two paths:
//   A) Existing user → just consume invite + add membership
//   B) New user → create account + add membership + issue JWT
// ─────────────────────────────────────────────
router.post('/accept', strictLimiter, async (req, res) => {
  try {
    const { token, fullName, password } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Invite token is required' });
    }

    const tokenHash = hashToken(token);
    const invite = await inviteRepo.findByTokenHash(tokenHash);

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found or already used' });
    }
    if (invite.isAccepted()) {
      return res.status(400).json({ success: false, message: 'This invite has already been accepted' });
    }
    if (invite.isExpired()) {
      return res.status(400).json({ success: false, message: 'This invite has expired' });
    }

    const existingUser = await userRepo.findByEmail(invite.email);

    // ── Path A: existing user
    if (existingUser) {
      const already = await memberRepo.exists(invite.businessId, existingUser.id);
      if (already) {
        await inviteRepo.markAccepted(invite.id);
        return res.status(409).json({
          success: false,
          message: 'You are already a member of this business.',
        });
      }

      await memberRepo.create({
        businessId: invite.businessId,
        userId: existingUser.id,
        role: invite.role,
        status: 'ACTIVE',
        invitedBy: invite.invitedBy,
        invitedAt: invite.createdAt,
        acceptedAt: new Date().toISOString(),
      });

      await inviteRepo.markAccepted(invite.id);

      const business = await businessRepo.findById(invite.businessId);

      return res.json({
        success: true,
        message: `You have joined ${business?.name || 'the team'}. Log in to continue.`,
        userExists: true,
      });
    }

    // ── Path B: new user → create account
    if (!fullName || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name and password are required to accept this invite.',
      });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uniqueTelegramId = `inv_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // Create user (emailVerified = true — they received the invite at this email)
    const newUser = await userRepo.create({
      telegramId: uniqueTelegramId,
      email: invite.email,
      phoneNumber: null,
      fullName,
      passwordHash,
      emailVerified: true,
      phoneVerified: false,
      passwordChangedAt: new Date().toISOString(),
    });

    // Add membership
    await memberRepo.create({
      businessId: invite.businessId,
      userId: newUser.id,
      role: invite.role,
      status: 'ACTIVE',
      invitedBy: invite.invitedBy,
      invitedAt: invite.createdAt,
      acceptedAt: new Date().toISOString(),
    });

    await inviteRepo.markAccepted(invite.id);

    const business = await businessRepo.findById(invite.businessId);

    return res.status(201).json({
      success: true,
      message: `Account created. You have joined ${business?.name || 'the team'}. Please log in.`,
      userExists: false,
    });
  } catch (error) {
    logger.error({ err: error.message, stack: error.stack }, 'team: POST accept failed');
    return res.status(500).json({ success: false, message: 'Something went wrong.' });
  }
});

// ═══════════════════════════════════════════════
// AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/team
// List all members of the current business + pending invites.
// Visible to OWNER and ADMIN.
// ─────────────────────────────────────────────
router.get('/', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;

    const [members, pendingInvites] = await Promise.all([
      memberRepo.findByBusinessId(businessId),
      inviteRepo.findPendingByBusiness(businessId),
    ]);

    return res.json({
      success: true,
      data: {
        members: members.map((m) => m.toJSON()),
        pendingInvites: pendingInvites.map((i) => i.toJSON()),
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, 'team: GET list failed');
    return res.status(500).json({ success: false, message: 'Failed to load team' });
  }
});

// ─────────────────────────────────────────────
// POST /api/team/invite
// Send an invite. OWNER or ADMIN only.
// Body: { email, role }
// ─────────────────────────────────────────────
router.post('/invite', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const invitedBy = req.user.id;
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ success: false, message: 'Email and role are required' });
    }

    const normalizedEmail = normalizeEmail(email);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: 'Invalid email address' });
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    // ADMIN cannot create another OWNER or ADMIN (only OWNER can)
    if (req.user.role === 'ADMIN' && (role === 'OWNER' || role === 'ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Only an OWNER can invite other OWNERs or ADMINs.',
      });
    }

    // Is this email already a member?
    const existingUser = await userRepo.findByEmail(normalizedEmail);
    if (existingUser) {
      const already = await memberRepo.exists(businessId, existingUser.id);
      if (already) {
        return res.status(409).json({
          success: false,
          message: 'This person is already a member of your business.',
        });
      }
    }

    // Remove any older pending invite for the same email so the unique index allows the new one
    await inviteRepo.deletePendingForEmail(businessId, normalizedEmail);

    // Create invite
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

    const invite = await inviteRepo.create({
      businessId,
      email: normalizedEmail,
      role,
      tokenHash,
      invitedBy,
      expiresAt,
    });

    // Fetch business + inviter for email
    const [business, inviter] = await Promise.all([
      businessRepo.findById(businessId),
      userRepo.findById(invitedBy),
    ]);

    const acceptUrl = `${FRONTEND_URL}/accept-invite?token=${rawToken}`;

    try {
      await emailService.sendTeamInvite({
        to: normalizedEmail,
        businessName: business?.name || 'a team',
        inviterName: inviter?.fullName || inviter?.email || 'A team member',
        role,
        acceptUrl,
        expiresAt,
      });
    } catch (emailErr) {
      logger.error(
        { err: emailErr.message, inviteId: invite.id, email: normalizedEmail },
        'team: invite email send failed (invite still created)'
      );
    }

    return res.status(201).json({
      success: true,
      message: `Invite sent to ${normalizedEmail}`,
      data: {
        invite: invite.toJSON(),
      },
    });
  } catch (error) {
    logger.error({ err: error.message }, 'team: POST invite failed');
    return res.status(500).json({ success: false, message: 'Failed to send invite' });
  }
});

// ─────────────────────────────────────────────
// POST /api/team/invite/:id/resend
// Resend an invite with a fresh token.
// ─────────────────────────────────────────────
router.post('/invite/:id/resend', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const inviteId = parseInt(req.params.id, 10);

    const oldInvite = await inviteRepo.findById(inviteId);
    if (!oldInvite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    if (oldInvite.businessId !== businessId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (oldInvite.isAccepted()) {
      return res.status(400).json({ success: false, message: 'This invite has already been accepted' });
    }

    // Delete the old one + create fresh
    await inviteRepo.delete(oldInvite.id);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

    const invite = await inviteRepo.create({
      businessId,
      email: oldInvite.email,
      role: oldInvite.role,
      tokenHash,
      invitedBy: req.user.id,
      expiresAt,
    });

    const [business, inviter] = await Promise.all([
      businessRepo.findById(businessId),
      userRepo.findById(req.user.id),
    ]);

    const acceptUrl = `${FRONTEND_URL}/accept-invite?token=${rawToken}`;

    try {
      await emailService.sendTeamInvite({
        to: oldInvite.email,
        businessName: business?.name || 'a team',
        inviterName: inviter?.fullName || inviter?.email || 'A team member',
        role: oldInvite.role,
        acceptUrl,
        expiresAt,
      });
    } catch (emailErr) {
      logger.error(
        { err: emailErr.message, inviteId: invite.id, email: oldInvite.email },
        'team: resend email failed (invite recreated)'
      );
    }

    return res.json({
      success: true,
      message: `Invite resent to ${oldInvite.email}`,
      data: { invite: invite.toJSON() },
    });
  } catch (error) {
    logger.error({ err: error.message }, 'team: POST resend failed');
    return res.status(500).json({ success: false, message: 'Failed to resend invite' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/team/invite/:id
// Revoke a pending invite.
// ─────────────────────────────────────────────
router.delete('/invite/:id', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const inviteId = parseInt(req.params.id, 10);

    const invite = await inviteRepo.findById(inviteId);
    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }
    if (invite.businessId !== businessId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await inviteRepo.delete(invite.id);
    return res.json({ success: true, message: 'Invite revoked' });
  } catch (error) {
    logger.error({ err: error.message }, 'team: DELETE invite failed');
    return res.status(500).json({ success: false, message: 'Failed to revoke invite' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/team/:memberId/role
// Change a member's role. OWNER only.
// ─────────────────────────────────────────────
router.put('/:memberId/role', requireRole('OWNER'), async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const memberId = parseInt(req.params.memberId, 10);
    const { role } = req.body;

    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`,
      });
    }

    const target = await memberRepo.findById(memberId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (target.businessId !== businessId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Prevent demoting the last OWNER
    if (target.role === 'OWNER' && role !== 'OWNER') {
      const owners = await memberRepo.countOwners(businessId);
      if (owners <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot demote the only OWNER. Promote another member first.',
        });
      }
    }

    const updated = await memberRepo.updateRole(memberId, role);
    return res.json({ success: true, data: { member: updated.toJSON() } });
  } catch (error) {
    logger.error({ err: error.message }, 'team: PUT role failed');
    return res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/team/:memberId
// Remove a member. OWNER or ADMIN.
// ─────────────────────────────────────────────
router.delete('/:memberId', requireRole('OWNER', 'ADMIN'), async (req, res) => {
  try {
    const businessId = req.user.businessId;
    const requesterId = req.user.id;
    const memberId = parseInt(req.params.memberId, 10);

    const target = await memberRepo.findById(memberId);
    if (!target) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    if (target.businessId !== businessId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Cannot remove yourself
    if (target.userId === requesterId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot remove yourself. Transfer ownership instead.',
      });
    }

    // ADMIN cannot remove OWNER or other ADMINs
    if (req.user.role === 'ADMIN' && (target.role === 'OWNER' || target.role === 'ADMIN')) {
      return res.status(403).json({
        success: false,
        message: 'Only an OWNER can remove OWNERs or ADMINs.',
      });
    }

    // Cannot remove the last OWNER
    if (target.role === 'OWNER') {
      const owners = await memberRepo.countOwners(businessId);
      if (owners <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the only OWNER.',
        });
      }
    }

    await memberRepo.delete(memberId);
    return res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    logger.error({ err: error.message }, 'team: DELETE member failed');
    return res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
});

module.exports = router;