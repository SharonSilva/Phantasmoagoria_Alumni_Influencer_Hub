const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { 
  validateRegistration, 
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  handleValidationErrors 
} = require('../middleware/validationMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

const DOMAIN = process.env.UNIVERSITY_DOMAIN || 'alumni.eastminster.ac.uk';

// ============= PUBLIC ROUTES =============

/**
 * Register new user
 * POST /api/auth/register
 */
router.post('/register', [
  ...validateRegistration,
  handleValidationErrors
], asyncHandler(authController.register));

/**
 * Verify email
 * GET /api/auth/verify-email?token=xyz
 */
router.get('/verify-email', asyncHandler(authController.verifyEmail));

/**
 * Login user
 * POST /api/auth/login
 */
router.post('/login', [
  ...validateLogin,
  handleValidationErrors
], authLimiter, asyncHandler(authController.login));

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', [
  ...validateForgotPassword,
  handleValidationErrors
], asyncHandler(authController.forgotPassword));

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
router.post('/reset-password', [
  ...validateResetPassword,
  handleValidationErrors
], asyncHandler(authController.resetPassword));

// ============= PROTECTED ROUTES =============

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', authenticate, asyncHandler(authController.logout));

/**
 * Get current user
 * GET /api/auth/me
 */
router.get('/me', authenticate, asyncHandler(authController.getMe));

module.exports = router;