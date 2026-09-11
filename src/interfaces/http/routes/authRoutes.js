// src/interfaces/http/routes/authRoutes.js
// v3.0.1-prod — Enumeration-safe, security-logged, email-verified

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const SecurityEventService = require('../../../infrastructure/services/security/SecurityEventService');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const securityEvents = new SecurityEventService();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, phone, password, businessName, industry } = req.body;

        if (!fullName || !email || !password || !businessName || !industry) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields',
            });
        }

        // ── Enumeration-safe: same response whether email exists or not ──
        const emailExists = userRepo.emailExists(email);
        if (emailExists) {
            securityEvents.log({
                eventType: 'REGISTER_DUPLICATE_EMAIL',
                email,
                ipAddress: clientIp(req),
                userAgent: clientUa(req),
            });
            return res.status(200).json({
                success: true,
                message: 'If your information is valid, please check your email to continue.',
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const uniqueTelegramId = `web_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        // Email verification token (hashed before store)
        const rawVerifyToken = crypto.randomBytes(32).toString('hex');
        const hashedVerifyToken = hashToken(rawVerifyToken);
        const verifyExpiry = new Date(
            Date.now() + EMAIL_VERIFICATION_TTL_MS
        ).toISOString();

        const user = await userRepo.create({
            telegramId: uniqueTelegramId,
            email,
            phoneNumber: phone || null,
            fullName,
            passwordHash,
            emailVerified: false,
            phoneVerified: false,
            emailVerificationToken: hashedVerifyToken,
            emailVerificationExpiry: verifyExpiry,
            passwordChangedAt: new Date().toISOString(),
        });

        const business = await businessRepo.create({
            userId: user.id,
            name: businessName,
            industry,
        });

        const token = signToken(user, business);
        res.cookie('token', token, COOKIE_OPTIONS);

        // In production, email `rawVerifyToken`
        const verifyUrl = `/verify-email?token=${rawVerifyToken}`;

        return res.status(201).json({
            success: true,
            message: 'Account created. Please verify your email.',
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
            ...(process.env.NODE_ENV !== 'production' && { verifyUrl }),
        });
    } catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Registration failed',
        });
    }
});

// ─────────────────────────────────────────────
// POST /login
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required',
            });
        }

        const user = await userRepo.findByEmail(email);
        if (!user) {
            securityEvents.log({
                eventType: 'LOGIN_FAILED_UNKNOWN_EMAIL',
                email,
                ipAddress: clientIp(req),
                userAgent: clientUa(req),
            });
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
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
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
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
        return res.status(500).json({
            success: false,
            message: error.message || 'Login failed',
        });
    }
});

// ─────────────────────────────────────────────
// GET /me
// ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Not authenticated' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await userRepo.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found' });
        }

        let business = null;
        if (decoded.businessId) {
            business = await businessRepo.findById(decoded.businessId);
        }
        if (!business) {
            business = await businessRepo.findByUserIdFirst(user.id);
        }

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
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;