const express = require('express');
const router = express.Router();
const AlumniController = require('../controllers/alumniController');
const { authenticateKey } = require('../middleware/Auth');
const { validateAlumniQuery, validateIdParam, handleValidationErrors } = require('../middleware/validationMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// ALUMNI ROUTES WITH VALIDATION 

/**
 * Get all alumni with filters & pagination
 * GET /api/alumni?page=1&limit=20&programme=CS&industry=Tech&search=john
 */
router.get('/', [
  ...validateAlumniQuery,
  handleValidationErrors
], authenticateKey(['read:alumni']), asyncHandler(AlumniController.getAllAlumni));

/**
 * Get alumni statistics
 * GET /api/alumni/stats
 */
router.get('/stats', authenticateKey(['read:alumni']), asyncHandler(AlumniController.getAlumniStats));

/**
 * Get single alumni profile
 * GET /api/alumni/:id
 */
router.get('/:id', [
  ...validateIdParam,
  handleValidationErrors
], authenticateKey(['read:alumni']), asyncHandler(AlumniController.getAlumniById));

/**
 * Get alumni by programme
 * GET /api/alumni/programme/CS
 */
router.get('/programme/:programme', [
  ...validateIdParam,
  handleValidationErrors
], authenticateKey(['read:alumni']), asyncHandler(AlumniController.getByProgramme));

module.exports = router;