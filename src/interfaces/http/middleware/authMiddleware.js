// src/interfaces/http/middleware/authMiddleware.js
// v3.1.0-prod — Stateless auth + session revocation

const jwt = require('jsonwebtoken');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const logger = require('../../../shared/utils/logger');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

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

    // Fast path: JWT carries businessId
    if (decoded.businessId) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        businessId: decoded.businessId,
        industry: decoded.industry || null,
        emailVerified: user.emailVerified,
      };
      return next();
    }

    // Slow path (legacy tokens): resolve businessId from DB
    const business = await businessRepo.findByUserIdFirst(user.id);

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      businessId: business?.id || null,
      industry: business?.industry || null,
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