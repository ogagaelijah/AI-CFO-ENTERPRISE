// src/interfaces/http/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '7d';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

// ─────────────────────────────────────────────
// Helper: Sign JWT with businessId included
// The JWT carries id, email, businessId, industry
// so the middleware never needs to hit the DB for auth context.
// ─────────────────────────────────────────────
const signToken = (user, business) => {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      businessId: business?.id || null,
      industry: business?.industry || null,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ─────────────────────────────────────────────
// POST /register
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phone, password, businessName, industry } = req.body;

    // Validate required fields
    if (!fullName || !email || !password || !businessName || !industry) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: fullName, email, password, businessName, industry',
      });
    }

    // Check if user exists
    const existingUser = await userRepo.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Get database connection
    const db = userRepo.db;

    // Generate a unique telegram_id for web users
    const uniqueTelegramId = `web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (telegram_id, email, phone_number, full_name, password_hash, email_verified, phone_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      uniqueTelegramId,
      email,
      phone || null,
      fullName,
      passwordHash,
      0,
      0
    );

    // Get the created user
    const user = await userRepo.findById(result.lastInsertRowid);

    // Create business
    const business = await businessRepo.create({
      userId: user.id,
      name: businessName,
      industry: industry,
    });

    // Generate JWT with businessId included
    const token = signToken(user, business);

    res.cookie('token', token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business.industry,
        businessId: business.id,
      },
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
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

    // Find user
    const user = await userRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // Get business (needed for JWT payload)
    const business = await businessRepo.findByUserIdFirst(user.id);

    // Generate JWT with businessId included
    const token = signToken(user, business);

    res.cookie('token', token, COOKIE_OPTIONS);

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business ? business.industry : null,
        businessId: business ? business.id : null,
      },
      business: business
        ? { id: business.id, name: business.name, industry: business.industry }
        : null,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
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

    // Trust decoded JWT businessId first (faster), fall back to DB lookup only if missing
    let business = null;
    if (decoded.businessId) {
      business = await businessRepo.findById(decoded.businessId);
    }
    if (!business) {
      business = await businessRepo.findByUserIdFirst(user.id);
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        industry: business ? business.industry : null,
        businessId: business ? business.id : null,
      },
      business: business
        ? { id: business.id, name: business.name, industry: business.industry }
        : null,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
});

// ─────────────────────────────────────────────
// POST /logout
// ─────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;