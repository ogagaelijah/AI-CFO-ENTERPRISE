// src/interfaces/http/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');

const userRepo = new UserRepository();
const businessRepo = new BusinessRepository();

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authenticated'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        // Get user from database
        const user = await userRepo.findById(decoded.id);
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get business for this user
        const business = await businessRepo.findByUserIdFirst(user.id);

        // Attach complete user info including businessId
        req.user = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            businessId: business?.id || null,
            industry: business?.industry || null,
        };
        
        console.log('✅ Auth - User:', req.user.id, 'Business ID:', req.user.businessId);

        next();
    } catch (error) {
        console.error('❌ Auth middleware error:', error.message);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};

module.exports = { authMiddleware };