const express = require('express');
const router = express.Router();
const UsageStatsController = require('../controllers/usageStatsController');
const { authenticate, requireAdmin, authenticateKey } = require('../middleware/Auth');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get all API usage statistics
 * Access: Admin Session OR API Key with 'read:analytics'
 */
router.get('/stats', 
  authenticateKey(['read:analytics']), 
  asyncHandler(UsageStatsController.getAllUsageStats)
);

/**
 * Get endpoint usage statistics
 */
router.get('/endpoints', 
  authenticateKey(['read:analytics']), 
  asyncHandler(UsageStatsController.getEndpointStats)
);

/**
 * Get usage for specific API key
 * Usually an Admin-only task to investigate a specific key
 */
router.get('/key/:keyId', 
  authenticate, 
  requireAdmin, 
  asyncHandler(UsageStatsController.getKeyUsageStats)
);

/**
 * Get usage report for date range
 */
router.get('/report', 
  authenticate, 
  requireAdmin, 
  asyncHandler(UsageStatsController.getUsageReport)
);

module.exports = router;