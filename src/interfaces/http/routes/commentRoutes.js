// src/interfaces/http/routes/commentRoutes.js
// v1.1.0-prod — Removed DELETE route. Comments are now immutable.

const express = require('express');
const router = express.Router();
const CommentRepository = require('../../../infrastructure/database/sqlite/repositories/CommentRepository');
const { authMiddleware } = require('../middleware/authMiddleware');
const { standardLimiter } = require('../middleware/rateLimiter');
const logger = require('../../../shared/utils/logger');

const commentRepo = new CommentRepository();

// All routes here require authentication
router.use(authMiddleware);

// ─────────────────────────────────────────────
// GET /api/comments?entityType=SALE&entityId=123
// Fetch all comments for a specific record
// ─────────────────────────────────────────────
router.get('/', standardLimiter, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    const businessId = req.user.businessId;

    if (!entityType || !entityId) {
      return res.status(400).json({ success: false, message: 'entityType and entityId are required' });
    }

    const comments = await commentRepo.findByEntity(
      businessId,
      entityType.toUpperCase(),
      parseInt(entityId, 10)
    );

    return res.json({ success: true, data: comments });
  } catch (error) {
    logger.error({ err: error.message }, 'comments: GET list failed');
    return res.status(500).json({ success: false, message: 'Failed to load comments' });
  }
});

// ─────────────────────────────────────────────
// POST /api/comments
// Create a new comment
// ─────────────────────────────────────────────
router.post('/', standardLimiter, async (req, res) => {
  try {
    const { entityType, entityId, content } = req.body;
    const businessId = req.user.businessId;
    const userId = req.user.id;

    if (!entityType || !entityId || !content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'entityType, entityId, and content are required' });
    }

    const comment = await commentRepo.create({
      businessId,
      userId,
      entityType: entityType.toUpperCase(),
      entityId: parseInt(entityId, 10),
      content: content.trim(),
    });

    return res.status(201).json({ success: true, data: comment });
  } catch (error) {
    logger.error({ err: error.message }, 'comments: POST failed');
    return res.status(500).json({ success: false, message: 'Failed to create comment' });
  }
});

module.exports = router;