const express = require('express');
const router = express.Router();
const bidController = require('../controllers/bidController');
const { authenticate, validateCsrf } = require('../middleware/authMiddleware');
const { validateBid, handleValidationErrors } = require('../middleware/validationMiddleware');
const { bidLimiter } = require('../middleware/rateLimitMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// All bid routes require authentication
router.use(authenticate);

/**
 * Place a new bid
 * POST /api/bids
 * Body: { amount: 250, bidDate: '2024-01-15' }
 */
router.post('/', [
  ...validateBid,
  handleValidationErrors,
  validateCsrf
], bidLimiter, asyncHandler(bidController.create));

/**
 * Get user's bids
 * GET /api/bids
 */
router.get('/', asyncHandler(bidController.getUserBids));

/**
 * Get specific bid
 * GET /api/bids/:id
 */
router.get('/:id', asyncHandler(bidController.getBid));

/**
 * Update bid (increase only)
 * PUT /api/bids/:id
 * Body: { amount: 300 }
 */
router.put('/:id', [
  ...validateBid,
  handleValidationErrors,
  validateCsrf
], asyncHandler(bidController.updateBid));

/**
 * Cancel bid
 * DELETE /api/bids/:id
 */
router.delete('/:id', [
  validateCsrf
], asyncHandler(bidController.cancelBid));

module.exports = router;