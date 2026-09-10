// src/interfaces/http/middleware/authMiddleware.js
// v2.0.0-prod — Stateless auth via JWT (no DB lookup per request)
//
// Performance: At 10K+ users, hitting the DB on every request to resolve
// businessId would add 50-100ms latency and saturate the connection pool.
// Since JWT now carries businessId, we trust it. Fallback only for legacy
// tokens that don't yet have businessId (one-time migration window).

const jwt = require('jsonwebtoken');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fast path: JWT carries businessId → no DB lookup
    if (decoded.businessId) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        businessId: decoded.businessId,
        industry: decoded.industry || null,
      };
      return next();
    }

    // Slow path (legacy tokens pre-fix): resolve businessId from DB once.
    // Users will re-login within 7 days (JWT expiry) and get fast path after.
    const user = await userRepo.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    const business = await businessRepo.findByUserIdFirst(user.id);

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessId: business?.id || null,
      industry: business?.industry || null,
    };

    return next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = { authMiddleware };