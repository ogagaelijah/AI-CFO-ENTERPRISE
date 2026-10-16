// src/interfaces/http/middleware/authMiddleware.js
// v4.0.0-prod — Strict multi-tenant auth. Role resolved fresh from
//               business_members on every request. No fallback to
//               businesses.user_id. Removed users get 403 immediately.
// v3.1.0-prod — Stateless auth + session revocation.

const jwt = require('jsonwebtoken');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const BusinessMemberRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessMemberRepository');
const logger = require('../../../shared/utils/logger');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();
const memberRepo = new BusinessMemberRepository();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    '[authMiddleware] JWT_SECRET is not set. Refusing to start. Add it to .env.'
  );
}

const authMiddleware = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      logger.warn(
        { err: jwtErr.message, path: req.originalUrl },
        'auth: jwt verify failed'
      );
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
    }

    const user = await userRepo.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
      });
    }

    // Password change invalidates older tokens
    if (user.passwordChangedAt) {
      const passwordChangedAtSeconds = Math.floor(
        new Date(user.passwordChangedAt).getTime() / 1000
      );
      if (decoded.iat < passwordChangedAtSeconds) {
        return res.status(401).json({
          success: false,
          message: 'Session expired. Please log in again.',
        });
      }
    }

    // ── Resolve membership (strict, DB-fresh on every request) ──
    let membership = null;

    if (decoded.businessId) {
      // Normal path: JWT carries businessId → look up that specific membership
      membership = await memberRepo.findByBusinessAndUser(
        decoded.businessId,
        user.id
      );
    } else {
      // Legacy token path: JWT has no businessId → resolve first active membership
      membership = await memberRepo.findFirstActiveByUser(user.id);
    }

    // No active membership → 403 (not 401 — user is authenticated, just unauthorized)
    if (!membership || membership.status !== 'ACTIVE') {
      logger.warn(
        {
          userId: user.id,
          requestedBusinessId: decoded.businessId || null,
          path: req.originalUrl,
        },
        'auth: no active business membership'
      );
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this business. Contact the owner.',
      });
    }

    // Load the business (needed for industry + as tenant anchor)
    const business = await businessRepo.findById(membership.businessId);

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessId: membership.businessId,
      industry: business?.industry || null,
      role: membership.role,
      memberId: membership.id,
      emailVerified: user.emailVerified,
    };

    return next();
  } catch (error) {
    logger.error(
      { err: error.message, stack: error.stack, path: req.originalUrl },
      'auth: middleware crashed'
    );
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = { authMiddleware };