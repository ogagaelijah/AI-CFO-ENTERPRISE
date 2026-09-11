// src/interfaces/http/middleware/authMiddleware.js
// v3.0.1-prod — Stateless auth + session revocation via password_changed_at

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

        // ─────────────────────────────────────────────
        // Session revocation check
        // If the user changed their password AFTER this token was issued,
        // the token is invalid (forces re-login on password change).
        // ─────────────────────────────────────────────
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
            // decoded.iat is in seconds
            if (decoded.iat < passwordChangedAtSeconds) {
                return res.status(401).json({
                    success: false,
                    message: 'Session expired. Please log in again.',
                });
            }
        }

        // ─────────────────────────────────────────────
        // Fast path: JWT carries businessId
        // ─────────────────────────────────────────────
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
        console.error('❌ Auth middleware error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
};

module.exports = { authMiddleware };