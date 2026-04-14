const jwt = require('jsonwebtoken');
const { db } = require('../db');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token', error: err.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

const validateCsrf = (req, res, next) => next();

const authenticateKey = (requiredScopes = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'API key required' });
    }
    const keyRecord = db.apiKeys.find(k => k.key === apiKey);
    if (!keyRecord) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    if (!keyRecord.active) {
      return res.status(403).json({ success: false, message: 'API key has been revoked' });
    }
    const hasScope = requiredScopes.length === 0 ||
      requiredScopes.every(scope => keyRecord.scopes.includes(scope));
    if (!hasScope) {
      return res.status(403).json({ success: false, message: `Insufficient permissions. Required: ${requiredScopes.join(', ')}` });
    }
    req.apiKey = keyRecord;
    next();
  };
};

module.exports = { authenticate: authMiddleware, requireAdmin, validateCsrf, authenticateKey };