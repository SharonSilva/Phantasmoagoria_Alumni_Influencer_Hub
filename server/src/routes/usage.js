const express = require('express');
const router = express.Router();
const UsageStatsController = require('../controllers/usageStatsController');
const { authenticate, requireAdmin } = require('../middleware/Auth');
const { asyncHandler } = require('../middleware/errorHandler');

// All usage routes require authentication and admin role
router.use(authenticate, requireAdmin);

/**
 * Get all API usage statistics
 * GET /api/usage/stats
 */
router.get('/stats', asyncHandler(UsageStatsController.getAllUsageStats));

/**
 * Get usage for specific API key
 * GET /api/usage/key/:keyId
 */
router.get('/key/:keyId', asyncHandler(UsageStatsController.getKeyUsageStats));

/**
 * Get endpoint usage statistics
 * GET /api/usage/endpoints
 */
router.get('/endpoints', asyncHandler(UsageStatsController.getEndpointStats));

/**
 * Get usage report for date range
 * GET /api/usage/report?startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/report', asyncHandler(UsageStatsController.getUsageReport));

module.exports = router;