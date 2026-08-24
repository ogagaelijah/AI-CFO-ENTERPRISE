// src/interfaces/http/routes/businessRoutes.js
const express = require('express');
const router = express.Router();
const BusinessRepository = require('../../../infrastructure/database/sqlite/repositories/BusinessRepository');
const { authMiddleware } = require('../middleware/authMiddleware');

const businessRepo = new BusinessRepository();

// Get business info
router.get('/', authMiddleware, async (req, res) => {
  try {
    const businesses = await businessRepo.findByUserId(req.user.id);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    res.json({
      success: true,
      business: {
        id: business.id,
        name: business.name,
        industry: business.industry,
      },
    });
  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update business
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { name, industry } = req.body;
    const businesses = await businessRepo.findByUserId(req.user.id);
    const business = businesses && businesses.length > 0 ? businesses[0] : null;

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    const updated = await businessRepo.update(business.id, { name, industry });
    
    res.json({
      success: true,
      message: 'Business updated successfully',
      business: {
        id: updated.id,
        name: updated.name,
        industry: updated.industry,
      },
    });
  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;