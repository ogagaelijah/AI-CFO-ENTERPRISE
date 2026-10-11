// src/interfaces/http/routes/authRoutes.js
// v4.0.0-prod — Email duplicate now returns 409 EMAIL_TAKEN with explicit
//               message (was generic 200 to prevent enumeration). Phone
//               duplicate already returned 409 PHONE_TAKEN.
// v3.9.0-prod — Friendly duplicate-phone error, phone normalization,
//               Postgres 23505 translation in /register catch.
// v3.8.0-prod — Email verification + password reset wired to Resend.
// v3.7.1-prod — loginIpLimiter removed from /login (runs at server layer).

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SubscriptionRepository = require('../../../infrastructure/database/sqlite/repositories/SubscriptionRepository');
const SecurityEventService = require('../../../infrastructure/services/security/SecurityEventService');
const { withTransaction } = require('../../../infrastructure/database/sqlite/connection');
const plans = require('../../../config/plans');

const VerifyEmailUseCase = require('../../../application/useCases/auth/VerifyEmailUseCase');
const ForgotPasswordUseCase = require('../../../application/useCases/auth/ForgotPasswordUseCase');
const ResetPasswordUseCase = require('../../../application/useCases/auth/ResetPasswordUseCase');

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
const subscriptionRepo = new SubscriptionRepository();
const securityEvents = new SecurityEventService();

const verifyEmailUseCase = new VerifyEmailUseCase({ userRepository: userRepo });
const forgotPasswordUseCase = new ForgotPasswordUseCase(userRepo, { emailService });
const resetPasswordUseCase = new ResetPasswordUseCase(userRepo);

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

/**
 * Normalize Nigerian phone numbers to canonical 11-digit form: 0XXXXXXXXXX.
 * Accepts (in any order): spaces, dashes, parentheses, leading + or 234 prefix.
 * Returns null if the input is not a plausible Nigerian phone number.
 *
 * Examples that all normalize to "07033621133":
 *   "07033621133"
 *   "0703 362 1133"
 *   "+2347033621133"
 *   "+234 703 362 1133"
 *   "234-703-362-1133"
 */
const normalizePhone = (input) => {
  if (!input || typeof input !== 'string') return null;
  let s = input.trim().replace(/[^\d+]/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('234') && s.length === 13) {
    s = '0' + s.slice(3);
  }
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
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const hashToken = (raw) =>
  crypto.createHash('sha256').update(raw).digest('hex');

const clientIp = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.socket?.remoteAddress ||
  'unknown';

const clientUa = (req) => req.headers['user-agent'] || 'unknown';

// ─────────────────────────────────────────────
// POST /register
// Limited to 5 per hour per IP (registerLimiter).
// Creates user + business + trial subscription, sends verification email.
// ─────────────────────────────────────────────
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { fullName, email, phone, password, businessName, industry } = req.body;

    if (!fullName || !email || !password || !businessName || !industry) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const pwError = validatePassword(password);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    // Normalize phone if provided
    let normalizedPhone = null;
    if (phone && String(phone).trim().length > 0) {
      normalizedPhone = normalizePhone(phone);
      if (!normalizedPhone) {
        return res.status(400).json({
          success: false,
          code: 'INVALID_PHONE',
          message: 'Please enter a valid Nigerian phone number (e.g. 07033621133).',
        });
      }
    }

    // ── Duplicate email check (v4.0.0: explicit rejection, matching phone)
    const emailExists = await userRepo.emailExists(email);
    if (emailExists) {
      securityEvents.log({
        eventType: 'REGISTER_DUPLICATE_EMAIL',
        email,
        ipAddress: clientIp(req),
        userAgent: clientUa(req),
      });
      return res.status(409).json({
        success: false,
        code: 'EMAIL_TAKEN',
        message: 'This email is already registered. Please log in or use a different email.',
      });
    }

    // ── Duplicate phone check
    if (normalizedPhone) {
      const phoneExists = await userRepo.phoneExists(normalizedPhone);
      if (phoneExists) {
        securityEvents.log({
          eventType: 'REGISTER_DUPLICATE_PHONE',
          phone: normalizedPhone,
          ipAddress: clientIp(req),
          userAgent: clientUa(req),
        });
        return res.status(409).json({
          success: false,
          code: 'PHONE_TAKEN',
          message: 'This phone number is already registered. Please use a different one or log in.',
        });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const uniqueTelegramId = `web_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    const { user, business, trialPlanId, trialPlan, trialDays, trialEndDate } =
      await withTransaction(async () => {
        const u = await userRepo.create({
          telegramId: uniqueTelegramId,
          email,
          phoneNumber: normalizedPhone,
          fullName,
          passwordHash,
          emailVerified: false,
          phoneVerified: false,
          emailVerificationToken: hashedVerifyToken,
          emailVerificationExpiry: verifyExpiry,
          passwordChangedAt: new Date().toISOString(),
        });

        const b = await businessRepo.create({
          userId: u.id,
          name: businessName,
          industry,
        });

        const tpId = plans.getTrialPlan();
        const tp = plans.getPlan(tpId);
        const tDays = plans.getTrialDays(tpId);
        const tEnd = new Date();
        tEnd.setDate(tEnd.getDate() + tDays);

        await subscriptionRepo.create({
          businessId: b.id,
          planId: tpId,
          status: 'trial',
          billingCycle: 'trial',
          startDate: new Date(),
          endDate: null,
          trialEndDate: tEnd,
          features: tp.features,
        });

        return {
          user: u,
          business: b,
          trialPlanId: tpId,
          trialPlan: tp,
          trialDays: tDays,
          trialEndDate: tEnd,
        };
      });

    // Send verification email. Never block registration on email failure.
    try {
      await emailService.sendVerification({
        to: user.email,
        fullName: user.fullName,
        token: rawVerifyToken,
      });
    } catch (emailErr) {
      logger.error(
        { err: emailErr.message, userId: user.id, email: user.email },
        'register: verification email send failed'
      );
    }

    securityEvents.log({
      eventType: 'REGISTER_SUCCESS',
      userId: user.id,
      email,
      ipAddress: clientIp(req),
      userAgent: clientUa(req),
      metadata: { businessId: business.id, trialPlanId, trialDays },
    });

    const token = signToken(user, business);
    res.cookie('token', token, COOKIE_OPTIONS);

    return res.status(201).json({
      success: true,
      message: `Account created. Check your email to verify your account. You have ${trialDays} days of ${trialPlan.name} access.`,
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business.industry,
        businessId: business.id,
        emailVerified: false,
      },
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
      },
      trial: {
        planId: trialPlanId,
        planName: trialPlan.name,
        days: trialDays,
        endDate: trialEndDate,
      },
    });
  } catch (error) {
    console.error('Register error:', error);

    // Postgres unique-violation (23505). Translate into a friendly message
    // based on which constraint fired. Safety net for race conditions.
    if (error.code === '23505') {
      const constraint = error.constraint || '';

      if (constraint.includes('email')) {
        return res.status(409).json({
          success: false,
          code: 'EMAIL_TAKEN',
          message: 'This email is already registered. Please log in or use a different email.',
        });
      }

      if (constraint.includes('phone')) {
        return res.status(409).json({
          success: false,
          code: 'PHONE_TAKEN',
          message: 'This phone number is already registered. Please use a different one or log in.',
        });
      }

      return res.status(409).json({
        success: false,
        message: 'Some of your information is already registered. Please check and try again.',
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message || 'Registration failed',
    });
  }
});

// ─────────────────────────────────────────────
// POST /verify-email
// ─────────────────────────────────────────────
router.post('/verify-email', strictLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required' });
    }

    const result = await verifyEmailUseCase.execute({ token });

    securityEvents.log({
      eventType: 'EMAIL_VERIFIED',
      userId: result.user?.id,
      email: result.user?.email,
      ipAddress: clientIp(req),
      userAgent: clientUa(req),
    });

    return res.json({ success: true, message: result.message });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Verification failed',
    });
  }
});

// ─────────────────────────────────────────────
// POST /resend-verification
// ─────────────────────────────────────────────
router.post('/resend-verification', strictLimiter, async (req, res) => {
  const genericResponse = {
    success: true,
    message: 'If your email is registered and unverified, a new verification link has been sent.',
  };

  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) return res.json(genericResponse);
    if (user.emailVerified) return res.json(genericResponse);

    const rawVerifyToken = crypto.randomBytes(32).toString('hex');
    const hashedVerifyToken = hashToken(rawVerifyToken);
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

    await userRepo.update(user.id, {
      emailVerificationToken: hashedVerifyToken,
      emailVerificationExpiry: verifyExpiry,
    });

    try {
      await emailService.sendVerification({
        to: user.email,
        fullName: user.fullName,
        token: rawVerifyToken,
      });
    } catch (emailErr) {
      logger.error(
        { err: emailErr.message, userId: user.id },
        'resend-verification: email send failed'
      );
    }

    return res.json(genericResponse);
  } catch (error) {
    logger.error({ err: error.message }, 'resend-verification: unexpected error');
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
    });
  }
});

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
router.post('/login', loginEmailLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await userRepo.findByEmail(email);
    if (!user) {
      securityEvents.log({
        eventType: 'LOGIN_FAILED_UNKNOWN_EMAIL',
        email,
        ipAddress: clientIp(req),
        userAgent: clientUa(req),
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isValid = await user.verifyPassword(password);
    if (!isValid) {
      securityEvents.log({
        eventType: 'LOGIN_FAILED_BAD_PASSWORD',
        userId: user.id,
        email,
        ipAddress: clientIp(req),
        userAgent: clientUa(req),
      });
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const business = await businessRepo.findByUserIdFirst(user.id);
    const token = signToken(user, business);
    res.cookie('token', token, COOKIE_OPTIONS);

    securityEvents.log({
      eventType: 'LOGIN_SUCCESS',
      userId: user.id,
      email,
      ipAddress: clientIp(req),
      userAgent: clientUa(req),
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business ? business.industry : null,
        businessId: business ? business.id : null,
        emailVerified: user.emailVerified,
      },
      business: business
        ? { id: business.id, name: business.name, industry: business.industry }
        : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Login failed' });
  }
});

// ─────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token =
      req.cookies.token ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await userRepo.findById(decoded.id);
    if (!user) return res.status(401).json({ success: false, message: 'User not found' });

    let business = null;
    if (decoded.businessId) business = await businessRepo.findById(decoded.businessId);
    if (!business) business = await businessRepo.findByUserIdFirst(user.id);

    return res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business ? business.industry : null,
        businessId: business ? business.id : null,
        emailVerified: user.emailVerified,
      },
      business: business
        ? { id: business.id, name: business.name, industry: business.industry }
        : null,
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// ─────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: !isDev,
    sameSite: isDev ? 'lax' : 'none',
  });
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────
// POST /forgot-password
// ─────────────────────────────────────────────
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const result = await forgotPasswordUseCase.execute({ email });
    return res.json(result);
  } catch (error) {
    logger.error({ err: error.message }, 'forgot-password: unexpected error');
    return res.json({
      success: true,
      message: 'If your email is registered, you will receive a reset link.',
    });
  }
});

// ─────────────────────────────────────────────
// POST /reset-password
// ─────────────────────────────────────────────
router.post('/reset-password', strictLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    const pwError = validatePassword(newPassword);
    if (pwError) {
      return res.status(400).json({ success: false, message: pwError });
    }

    const result = await resetPasswordUseCase.execute({ token, newPassword });

    securityEvents.log({
      eventType: 'PASSWORD_RESET_SUCCESS',
      ipAddress: clientIp(req),
      userAgent: clientUa(req),
    });

    return res.json(result);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Password reset failed',
    });
  }
});

module.exports = router;