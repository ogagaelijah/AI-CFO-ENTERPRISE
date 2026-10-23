// src/interfaces/http/routes/notificationRoutes.js
// v1.1.0-prod — Adds push token registration for mobile devices.

const express = require('express');
const router = express.Router();
const NotificationRepository = require('../../../infrastructure/database/sqlite/repositories/NotificationRepository');
const UserRepository = require('../../../infrastructure/database/sqlite/repositories/UserRepository'); // ★ NEW
const { authMiddleware } = require('../middleware/authMiddleware');
const logger = require('../../../shared/utils/logger');

const notificationRepo = new NotificationRepository();
const userRepo = new UserRepository(); // ★ NEW

// All routes here require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/notifications
// Get all notifications for the logged-in user
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const notifications = await notificationRepo.findByUserId(req.user.id);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    
    return res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  } catch (error) {
    logger.error({ err: error.message }, 'notifications: GET list failed');
    return res.status(500).json({ success: false, message: 'Failed to load notifications' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/notifications/:id/read
// Mark a specific notification as read
// ─────────────────────────────────────────────
router.put('/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const success = await notificationRepo.markAsRead(id, req.user.id);
    
    if (!success) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    return res.json({ success: true, message: 'Marked as read' });
  } catch (error) {
    logger.error({ err: error.message }, 'notifications: PUT read failed');
    return res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// ─────────────────────────────────────────────
// PUT /api/notifications/read-all
// Mark all notifications as read
// ─────────────────────────────────────────────
router.put('/read-all', async (req, res) => {
  try {
    await notificationRepo.markAllAsRead(req.user.id);
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    logger.error({ err: error.message }, 'notifications: PUT read-all failed');
    return res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

// ─────────────────────────────────────────────
// POST /api/notifications/push-token
// Register a mobile device's Expo push token
// ─────────────────────────────────────────────
router.post('/push-token', async (req, res) => {
  try {
    const { pushToken } = req.body;
    const userId = req.user.id;
    const businessId = req.user.businessId;

    if (!pushToken) {
      return res.status(400).json({ success: false, message: 'Push token is required' });
    }

    const updated = await userRepo.updatePushToken(userId, businessId, pushToken);

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Business membership not found' });
    }

    return res.json({ success: true, message: 'Push token registered successfully' });
  } catch (error) {
    logger.error({ err: error.message }, 'notifications: POST push-token failed');
    return res.status(500).json({ success: false, message: error.message || 'Failed to register push token' });
  }
});

module.exports = router;