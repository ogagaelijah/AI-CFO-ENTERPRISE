// src/interfaces/http/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

const userRepo = new UserRepository();

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await userRepo.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, phoneNumber } = req.body;
    const updated = await userRepo.update(req.user.id, { fullName, phoneNumber });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phoneNumber: updated.phoneNumber,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;