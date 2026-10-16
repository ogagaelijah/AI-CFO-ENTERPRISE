// src/interfaces/http/middleware/requireRole.js
// v1.0.0-prod — Route-level role gate.
//
// Usage:
//   router.post('/invite', requireRole('OWNER', 'ADMIN'), handler)
//   router.delete('/:id', requireRole('OWNER'), handler)
//
// Assumes authMiddleware has already run and populated req.user.role.

const logger = require('../../../shared/utils/logger');

/**
 * @param {...string} allowedRoles - one or more of OWNER, ADMIN, MANAGER, CASHIER, ACCOUNTANT
 * @returns Express middleware
 */
const requireRole = (...allowedRoles) => {
  const allowed = new Set(allowedRoles);

  return (req, res, next) => {
    const role = req.user?.role;

    if (!role) {
      // Should never happen — authMiddleware always sets role on success.
      logger.warn(
        { path: req.originalUrl, userId: req.user?.id },
        'requireRole: no role on req.user (authMiddleware missing or bypassed)'
      );
      return res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
    }

    if (!allowed.has(role)) {
      logger.warn(
        {
          userId: req.user.id,
          businessId: req.user.businessId,
          role,
          required: allowedRoles,
          path: req.originalUrl,
        },
        'requireRole: forbidden'
      );
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    return next();
  };
};

module.exports = { requireRole };