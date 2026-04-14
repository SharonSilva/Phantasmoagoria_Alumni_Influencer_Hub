/**
 * Input Validation Middleware
 * Comprehensive validation for all request inputs
 */

const { body, validationResult, query, param } = require('express-validator');

// ============= VALIDATION RULES =============

// Auth Validation
const validateRegistration = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('email')
    .custom(email => {
      if (!email.endsWith('@alumni.eastminster.ac.uk') && !email.endsWith('@eastminster.ac.uk')) {
        throw new Error('Must use university email (@alumni.eastminster.ac.uk or @eastminster.ac.uk)');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain special character'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters')
];

const validateLogin = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const validateBid = [
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Bid amount must be a positive integer'),
  body('bidDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

const validateProfile = [
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  body('currentRole')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Role must be between 2 and 100 characters'),
  body('currentEmployer')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Employer must be between 2 and 100 characters'),
  body('graduationYear')
    .optional()
    .isInt({ min: 1990, max: new Date().getFullYear() + 5 })
    .withMessage('Invalid graduation year'),
  body('programme')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Programme must be between 2 and 100 characters'),
  body('industry')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Industry must be between 2 and 100 characters')
];

const validateCertification = [
  body('name')
    .notEmpty()
    .withMessage('Certification name required')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Certification name must be 2-200 characters'),
  body('issuer')
    .notEmpty()
    .withMessage('Issuer required')
    .trim(),
  body('completedDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format')
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .withMessage('Valid email required')
    .normalizeEmail()
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain number')
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage('Password must contain special character')
];

const validateExportQuery = [
  query('format')
    .optional()
    .isIn(['csv', 'json'])
    .withMessage('Format must be csv or json'),
  query('programme')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }),
  query('industry')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }),
  query('graduationYear')
    .optional()
    .isInt({ min: 1990, max: new Date().getFullYear() + 5 })
];

const validateAlumniQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 }),
  query('programme')
    .optional()
    .trim(),
  query('industry')
    .optional()
    .trim(),
  query('graduationYear')
    .optional()
    .isInt({ min: 1990, max: new Date().getFullYear() + 5 })
];

const validateIdParam = [
  param('id')
    .notEmpty()
    .withMessage('ID parameter required')
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Invalid ID format')
];

// ============= ERROR HANDLER MIDDLEWARE =============

/**
 * Handle validation errors
 * Must be called AFTER validation middleware
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for client
    const formattedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: formattedErrors
    });
  }
  
  next();
};

// ============= SANITIZATION MIDDLEWARE =============

/**
 * Sanitize all string inputs
 * Prevents XSS attacks
 */
const sanitizeInputs = (req, res, next) => {
  const xss = require('xss');

  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key].trim());
      }
    });
  }

  // Sanitize query
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = xss(req.query[key].trim());
      }
    });
  }

  next();
};

module.exports = {
  // Validation rule sets
  validateRegistration,
  validateLogin,
  validateBid,
  validateProfile,
  validateCertification,
  validateForgotPassword,
  validateResetPassword,
  validateExportQuery,
  validateAlumniQuery,
  validateIdParam,
  
  // Middleware
  handleValidationErrors,
  sanitizeInputs
};