// src/interfaces/http/routes/authRoutes.js
// v5.7.0-prod — Handles Platform Staff login (no business) without crashing.

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const BusinessMemberRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessMemberRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const SecurityEventService = require('../../../infrastructure/services/security/SecurityEventService');
const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const plans = require('../../../config/plans');

const LoginUseCase = require('../../../application/useCases/auth/LoginUseCase');
const VerifyEmailUseCase = require('../../../application/useCases/auth/VerifyEmailUseCase');
const ForgotPasswordUseCase = require('../../../application/useCases/auth/ForgotPasswordUseCase');
const ResetPasswordUseCase = require('../../../application/useCases/auth/ResetPasswordUseCase');
const Setup2FAUseCase = require('../../../application/useCases/auth/Setup2FAUseCase');
const Enable2FAUseCase = require('../../../application/useCases/auth/Enable2FAUseCase');
const Verify2FALoginUseCase = require('../../../application/useCases/auth/Verify2FALoginUseCase');
const Disable2FAUseCase = require('../../../application/useCases/auth/Disable2FAUseCase');

const emailService = require('../../../infrastructure/services/email/ResendService');
const logger = require('../../../shared/utils/logger');

const {
  loginEmailLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  strictLimiter,
} = require('../middleware/rateLimiter');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const memberRepo = new BusinessMemberRepository();
const subscriptionRepo = new SubscriptionRepository();
const securityEvents = new SecurityEventService();

const loginUseCase = new LoginUseCase(userRepo, memberRepo, businessRepo);
const verifyEmailUseCase = new VerifyEmailUseCase({ userRepository: userRepo });
const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepo, { emailService });
const resetPasswordUseCase = new ResetPasswordUseCase(userRepo);
const setup2FAUseCase = new Setup2FAUseCase(userRepo);
const enable2FAUseCase = new Enable2FAUseCase(userRepo);
const verify2FALoginUseCase = new Verify2FALoginUseCase(userRepo);
const disable2FAUseCase = new Disable2FAUseCase(userRepo);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';

const isDev = process.env.NODE_ENV === 'development';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !isDev,
  sameSite: isDev ? 'lax' : 'none',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_BYTES = 72;

const validatePassword = (password) => {
  if (typeof password !== 'string') return 'Password must be a string';
  if (password.length < PASSWORD_MIN_LENGTH) return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  if (password.trim().length === 0) return 'Password cannot be only whitespace';
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) return `Password is too long (max ${PASSWORD_MAX_BYTES} bytes)`;
  return null;
};

const normalizePhone = (input) => {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim().replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('234') && s.length === 13) s = '0' + s.slice(3);
  if (!/^0\d{10}$/.test(s)) return null;
  return s;
};

const signToken = (user, business) =>
  jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      businessId: business?.id || null, 
      industry: business?.industry || null,
      platformRole: user.platformRole 
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
const clientUa = (req) => req.headers['user-agent'] || 'unknown';

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ─────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, email, phone, password, businessName, industry } = req.body;
    if (!fullName || !email || !password || !businessName || !industry) return res.status(400).json({ success: false, message: 'Missing required fields' });

    const pwError = validatePassword(password);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    let normalizedPhone = null;
    if (phone && String(phone).trim().length > 0) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) return res.status(400).json({ success: false, code: 'INVALID_PHONE', message: 'Please enter a valid Nigerian phone number.' });
    }

    if (await userRepo.emailExists(email)) {
      securityEvents.log({ eventType: 'REGISTER_DUPLICATE_EMAIL', email, ipAddress: clientIp(req), userAgent: clientUa(req) });
      return res.status(409).json({ success: false, code: 'EMAIL_TAKEN', message: 'This email is already registered.' });
    }

    if (normalizedPhone && await userRepo.phoneExists(normalizedPhone)) {
      securityEvents.log({ eventType: 'REGISTER_DUPLICATE_PHONE', phone: normalizedPhone, ipAddress: clientIp(req), userAgent: clientUa(req) });
      return res.status(409).json({ success: false, code: 'PHONE_TAKEN', message: 'This phone number is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uniqueTelegramId = `web_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    const { user, business, trialPlanId, trialPlan, trialDays, trialEndDate } = await withTransaction(async () => {
      const u = await userRepo.create({ telegramId: uniqueTelegramId, email, phoneNumber: normalizedPhone, fullName, passwordHash, emailVerified: false, phoneVerified: false, emailVerificationToken: hashedVerifyToken, emailVerificationExpiry: verifyExpiry, passwordChangedAt: new Date().toISOString() });
      const b = await businessRepo.create({ userId: u.id, name: businessName, industry });
      await memberRepo.create({ businessId: b.id, userId: u.id, role: 'OWNER', status: 'ACTIVE', invitedBy: null, invitedAt: null, acceptedAt: new Date().toISOString() });
      const tpId = plans.getTrialPlan(); const tp = plans.getPlan(tpId); const tDays = plans.getTrialDays(tpId);
      const tEnd = new Date(); tEnd.setDate(tEnd.getDate() + tDays);
      await subscriptionRepo.create({ businessId: b.id, planId: tpId, status: 'trial', billingCycle: 'trial', startDate: new Date(), endDate: null, trialEndDate: tEnd, features: tp.features });
      return { user: u, business: b, trialPlanId: tpId, trialPlan: tp, trialDays: tDays, trialEndDate: tEnd };
    });

    try { await emailService.sendVerification({ to: user.email, fullName: user.fullName, token: rawVerifyToken }); } catch (emailErr) { logger.error({ err: emailErr.message, userId: user.id }, 'register: verification email send failed'); }

    securityEvents.log({ eventType: 'REGISTER_SUCCESS', userId: user.id, email, ipAddress: clientIp(req), userAgent: clientUa(req), metadata: { businessId: business.id } });

    const token = signToken(user, business);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true, message: `Account created. You have ${trialDays} days of ${trialPlan.name} access.`, token,
      user: { id: user.id, fullName: user.fullName, email: user.email, phoneNumber: user.phoneNumber, industry: business.industry, businessId: business.id, role: 'OWNER', emailVerified: false, twoFactorEnabled: user.twoFactorEnabled, platformRole: user.platformRole },
      business: { id: business.id, name: business.name, industry: business.industry },
      trial: { planId: trialPlanId, planName: trialPlan.name, days: trialDays, endDate: trialEndDate },
    });
  } catch (error) {
    if (error.code === '23505') {
      const constraint = error.constraint || '';
      if (constraint.includes('email')) return res.status(409).json({ success: false, code: 'EMAIL_TAKEN', message: 'This email is already registered.' });
      if (constraint.includes('phone')) return res.status(409).json({ success: false, code: 'PHONE_TAKEN', message: 'This phone number is already registered.' });
      return res.status(409).json({ success: false, message: 'Some of your information is already registered.' });
    }
    return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
});

// ─────────────────────────────────────────────
// POST /verify-email
// ─────────────────────────────────────────────
router.post('/verify-email', strictLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Verification token is required' });
    const result = await verifyEmailUseCase.execute({ token });
    securityEvents.log({ eventType: 'EMAIL_VERIFIED', userId: result.user?.id, email: result.user?.email, ipAddress: clientIp(req), userAgent: clientUa(req) });
    return res.json({ success: true, message: result.message });
  } catch (error) { return res.status(400).json({ success: false, message: error.message || 'Verification failed' }); }
});

// ─────────────────────────────────────────────
// POST /resend-verification
// ─────────────────────────────────────────────
router.post('/resend-verification', strictLimiter, async (req, res) => {
  const genericResponse = { success: true, message: 'If your email is registered and unverified, a new verification link has been sent.' };
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await userRepo.findByEmail(email);
    if (!user || user.emailVerified) return res.json(genericResponse);

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    await userRepo.update(user.id, { emailVerificationToken: hashedVerifyToken, emailVerificationExpiry: verifyExpiry });
    try { await emailService.sendVerification({ to: user.email, fullName: user.fullName, token: rawVerifyToken }); } catch (emailErr) { logger.error({ err: emailErr.message, userId: user.id }, 'resend-verification: email send failed'); }
    return res.json(genericResponse);
  } catch (error) { return res.status(500).json({ success: false, message: 'Something went wrong. Please try again later.' }); }
});

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
router.post('/login', loginEmailLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

    const result = await loginUseCase.execute({ identifier: email, password });

    if (result.requires2FA) {
      return res.json({ success: true, requires2FA: true, tempToken: result.tempToken, message: 'Please enter your 6-digit Google Authenticator code.' });
    }

    const token = signToken(result.user, result.business);
    res.cookie('token', token, COOKIE_OPTIONS);
    securityEvents.log({ eventType: 'LOGIN_SUCCESS', userId: result.user.id, email, ipAddress: clientIp(req), userAgent: clientUa(req) });

    return res.json({
      success: true, message: 'Login successful', token,
      user: { 
        id: result.user.id, 
        fullName: result.user.fullName, 
        email: result.user.email, 
        phoneNumber: result.user.phoneNumber, 
        industry: result.business?.industry || null, 
        businessId: result.business?.id || null, 
        role: result.role, 
        emailVerified: result.user.emailVerified, 
        twoFactorEnabled: result.user.twoFactorEnabled, 
        platformRole: result.user.platformRole 
      },
      business: result.business 
        ? { id: result.business.id, name: result.business.name, industry: result.business.industry }
        : null,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: error.message || 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// POST /2fa/login
// ─────────────────────────────────────────────
router.post('/2fa/login', strictLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ success: false, message: 'Token and code are required' });

    const { user } = await verify2FALoginUseCase.execute(tempToken, code);
    
    const membership = await memberRepo.findFirstActiveByUser(user.id);
    let business = membership ? await businessRepo.findById(membership.businessId) : await businessRepo.findByUserIdFirst(user.id);
    
    // Allow Platform Staff to login without a business
    const isPlatformStaff = Boolean(user.platformRole);
    if (!business && !isPlatformStaff) return res.status(403).json({ success: false, message: 'No business associated with this account.' });

    const token = signToken(user, business);
    res.cookie('token', token, COOKIE_OPTIONS);
    securityEvents.log({ eventType: 'LOGIN_SUCCESS_2FA', userId: user.id, email: user.email, ipAddress: clientIp(req), userAgent: clientUa(req) });

    return res.json({
      success: true, message: 'Login successful', token,
      user: { 
        id: user.id, 
        fullName: user.fullName, 
        email: user.email, 
        phoneNumber: user.phoneNumber, 
        industry: business?.industry || null, 
        businessId: business?.id || null, 
        role: membership?.role || (isPlatformStaff ? 'PLATFORM_STAFF' : 'OWNER'), 
        emailVerified: user.emailVerified, 
        twoFactorEnabled: user.twoFactorEnabled, 
        platformRole: user.platformRole 
      },
      business: business ? { id: business.id, name: business.name, industry: business.industry } : null,
    });
  } catch (error) { return res.status(401).json({ success: false, message: error.message || '2FA verification failed' }); }
});

// ─────────────────────────────────────────────
// POST /2fa/setup & /2fa/enable
// ─────────────────────────────────────────────
router.post('/2fa/setup', authenticateToken, async (req, res) => {
  try { const result = await setup2FAUseCase.execute(req.user.id); return res.json({ success: true, message: '2FA setup initiated.', data: result }); } 
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.post('/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });
    const result = await enable2FAUseCase.execute(req.user.id, code);
    return res.json({ success: true, message: result.message });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Code is required' });
    const result = await disable2FAUseCase.execute(req.user.id, code);
    securityEvents.log({ eventType: '2FA_DISABLED', userId: req.user.id, ipAddress: clientIp(req), userAgent: clientUa(req) });
    return res.json({ success: true, message: result.message });
  } catch (error) { return res.status(400).json({ success: false, message: error.message }); }
});

// ─────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies.token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await userRepo.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    let membership = null;
    if (decoded.businessId) membership = await memberRepo.findByBusinessAndUser(decoded.businessId, user.id);
    if (!membership) membership = await memberRepo.findFirstActiveByUser(user.id);

    // Allow Platform Staff to bypass strict business membership check
    const isPlatformStaff = Boolean(user.platformRole);
    if ((!membership || membership.status !== 'ACTIVE') && !isPlatformStaff) {
      return res.status(403).json({ success: false, message: 'You do not have access to this business.' });
    }

    const business = membership ? await businessRepo.findById(membership.businessId) : null;

    return res.json({
      success: true,
      user: { 
        id: user.id, 
        fullName: user.fullName, 
        email: user.email, 
        phoneNumber: user.phoneNumber, 
        industry: business ? business.industry : null, 
        businessId: business ? business.id : null, 
        role: membership?.role || (isPlatformStaff ? 'PLATFORM_STAFF' : null), 
        emailVerified: user.emailVerified, 
        twoFactorEnabled: user.twoFactorEnabled, 
        platformRole: user.platformRole 
      },
      business: business ? { id: business.id, name: business.name, industry: business.industry } : null,
    });
  } catch (error) { return res.status(401).json({ success: false, message: 'Invalid token' }); }
});

// ─────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, secure: !isDev, sameSite: isDev ? 'lax' : 'none' });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────
// POST /forgot-password
// ─────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });
    const result = await forgotPasswordUseCase.execute({ email });
    return res.json(result);
  } catch (error) { return res.json({ success: true, message: 'If your email is registered, you will receive a reset link.' }); }
});

// ─────────────────────────────────────────────
// POST /reset-password
// ─────────────────────────────────────────────
router.post('/reset-password', strictLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, message: 'Token and new password are required.' });

    const pwError = validatePassword(newPassword);
    if (pwError) return res.status(400).json({ success: false, message: pwError });

    const result = await resetPasswordUseCase.execute({ token, newPassword });
    securityEvents.log({ eventType: 'PASSWORD_RESET_SUCCESS', ipAddress: clientIp(req), userAgent: clientUa(req) });
    return res.json(result);
  } catch (error) { return res.status(400).json({ success: false, message: error.message || 'Password reset failed' }); }
});

module.exports = router;