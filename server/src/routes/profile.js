const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate, validateCsrf } = require('../middleware/authMiddleware');
const { validateProfile, validateCertification, handleValidationErrors, validateIdParam } = require('../middleware/validationMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// All profile routes require authentication
router.use(authenticate);

/**
 * Get own profile
 * GET /api/profile
 */
router.get('/', asyncHandler(profileController.getProfile));

/**
 * Update own profile
 * PUT /api/profile
 * Body: { bio, currentRole, currentEmployer, etc. }
 */
router.put('/', [
  ...validateProfile,
  handleValidationErrors,
  validateCsrf
], asyncHandler(profileController.updateProfile));

/**
 * Add certification
 * POST /api/profile/certifications
 * Body: { name, issuer, completedDate }
 */
router.post('/certifications', [
  ...validateCertification,
  handleValidationErrors,
  validateCsrf
], asyncHandler(profileController.addCertification));

/**
 * Delete certification
 * DELETE /api/profile/certifications/:certId
 */
router.delete('/certifications/:certId', [
  validateCsrf
], asyncHandler(profileController.deleteCertification));

module.exports = router;