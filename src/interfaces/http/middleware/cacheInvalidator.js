// src/interfaces/http/middleware/cacheInvalidator.js
// Middleware to invalidate cache after successful writes
// v1.0.0-prod

'use strict';

const { cacheService } = require('../../../infrastructure/services/cache/CacheService');

/**
 * Invalidate dashboard + intelligence caches for a business.
 * Called after successful POST/PUT/DELETE on transaction endpoints.
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next
 */
function invalidateAfterWrite(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = (body) => {
    // Only invalidate on successful writes
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const businessId = req.user?.businessId;
      if (businessId) {
        const count = cacheService.invalidateBusiness(businessId);
        if (count > 0) {
          console.log(`🗑️  [Cache] Invalidated ${count} keys for business ${businessId}`);
        }
      }
    }
    return originalJson(body);
  };

  next();
}

module.exports = { invalidateAfterWrite };