const express  = require('express');
const { body } = require('express-validator');
const ctrl     = require('../controllers/ApikeyController');
const { authenticate, requireAdmin } = require('../middleware/Auth');


const VALID_SCOPES = [
  'read:featured',
  'read:alumni',
  'read:alumni_of_day',
  'read:sponsors',
  'read:events',
  'read:analytics',
  'read:donations',
];

const router = express.Router();
router.use(authenticate, requireAdmin);

router.get('/',               ctrl.listKeys);

router.post('/', [
  body('name').trim().notEmpty(),
  body('scopes').optional().isArray().custom(scopes => {
    // checks against the updated VALID_SCOPES list
    const invalid = scopes.filter(s => !VALID_SCOPES.includes(s));
    if (invalid.length) {
      throw new Error(`Invalid scopes: ${invalid.join(', ')}`);
    }
    return true;
  }),
], ctrl.createKey);

router.get('/:keyId',         ctrl.getKeyDetail);
router.get('/:keyId/stats',   ctrl.getKeyStats);
router.delete('/:keyId',      ctrl.revokeKey);

module.exports = router;