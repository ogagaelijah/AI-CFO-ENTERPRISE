// src/interfaces/http/routes/userRoutes.js
// v1.2.0-prod — Adds push-token endpoint.

const express = require('express');
const router = express.Router();
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { query } = require('../../../infrastructure/database/sqlite/connection'); // ★ NEW

const userRepo = new UserRepository();

function classifyError(error) {
  const msg = String(error?.message || '');
  if (/not found|does not exist/i.test(msg)) return 404;
  if (/access denied|forbidden|permission/i.test(msg)) return 403;
  if (/already exists|duplicate/i.test(msg)) return 409;
  if (/required|invalid|must be|cannot|exceed|only whitespace|too long/i.test(msg)) return 400;
  return 500;
}

router.use(authMiddleware);

// Get current user profile — every authenticated user
router.get('/profile', async (req, res) => {
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
    res.status(classifyError(error)).json({ success: false, message: error.message });
  }
});

// Update user profile — every authenticated user (own profile only)
router.put('/profile', async (req, res) => {
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
    res.status(classifyError(error)).json({ success: false, message: error.message });
  }
});

// ★ NEW: Save Push Token
router.post('/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }

    // Save token to DB
    await query('UPDATE users SET push_token = $1 WHERE id = $2', [pushToken, req.user.id]);

    res.json({ success: true, message: 'Push token saved successfully' });
  } catch (error) {
    console.error('Push token error:', error);
    res.status(500).json({ success: false, message: 'Failed to save push token' });
  }
});

module.exports = router;