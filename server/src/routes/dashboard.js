const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/dashboardController');
const { authenticateKey } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Get dashboard metrics
 * GET /api/dashboard
 */
router.get('/', authenticateKey(['read:analytics']), asyncHandler(DashboardController.getDashboard));

/**
 * Get alumni statistics
 * GET /api/dashboard/alumni-stats
 */
router.get('/alumni-stats', authenticateKey(['read:analytics']), asyncHandler(DashboardController.getAlumniStats));

/**
 * Get bidding analytics
 * GET /api/dashboard/bidding-analytics
 */
router.get('/bidding-analytics', authenticateKey(['read:analytics']), asyncHandler(DashboardController.getBiddingAnalytics));

module.exports = router;