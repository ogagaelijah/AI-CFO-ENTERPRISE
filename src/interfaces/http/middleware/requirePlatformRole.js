// src/interfaces/http/middleware/requirePlatformRole.js
const logger = require('../../../shared/utils/logger');

const requirePlatformRole = (...allowedRoles) => {
  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    // req.user comes from authMiddleware. 
    // It resolves the user from the DB and verifies the JWT.
    const role = req.user?.platformRole;

    if (!role) {
      logger.warn(
        { path: req.originalUrl, userId: req.user?.id },
        'requirePlatformRole: user has no platform role'
      );
      return res.status(403).json({
        success: false,
        message: 'Access denied. Platform staff credentials required.',
      });
    }

    if (!allowed.has(role)) {
      logger.warn(
        { userId: req.user.id, role, required: allowedRoles, path: req.originalUrl },
        'requirePlatformRole: forbidden'
      );
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
};

module.exports = { requirePlatformRole };