const express = require('express');
const router = express.Router();
const ExportController = require('../controllers/exportController');
const { authenticateKey } = require('../middleware/Auth');
const { validateExportQuery, handleValidationErrors } = require('../middleware/validationMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Export alumni to CSV
 * GET /api/export/alumni/csv?programme=CS&industry=Tech
 */
router.get('/alumni/csv', [
  ...validateExportQuery,
  handleValidationErrors
], authenticateKey(['read:alumni', 'read:analytics']), asyncHandler(ExportController.exportAlumniCSV));

/**
 * Export dashboard data to CSV
 * GET /api/export/dashboard/csv
 */
router.get('/dashboard/csv', authenticateKey(['read:analytics']), asyncHandler(ExportController.exportDashboardCSV));

/**
 * Export bids to CSV
 * GET /api/export/bids/csv
 */
router.get('/bids/csv', authenticateKey(['read:analytics']), asyncHandler(ExportController.exportBidsCSV));

/**
 * Export winners to CSV
 * GET /api/export/winners/csv
 */
router.get('/winners/csv', authenticateKey(['read:analytics']), asyncHandler(ExportController.exportWinnersCSV));

/**
 * Custom export with filters
 * POST /api/export/custom
 * Body: { dataType: 'alumni', filters: { programme: 'CS' } }
 */
router.post('/custom', authenticateKey(['read:analytics']), asyncHandler(ExportController.exportCustom));

module.exports = router;