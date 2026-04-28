const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { db, query } = require('../db');
const Session = require('../models/Session');

const JWT_SECRET = (() => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production');
  }
  return 'eastminster-alumni-secret-changeme';
})();

// CSRF Token Generation & Validation
const csrfTokens = new Map(); // userId → token

function generateCsrfToken(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(userId, token);
  return token;
}

function validateCsrfToken(userId, token) {
  const stored = csrfTokens.get(userId);
  if (!stored || stored !== token) return false;
  csrfTokens.delete(userId); // Single-use
  return true;
}

// JWT Authentication middleware that verifies token and attaches user to request
function authenticate(req, res, next) {
  //Get authorization header from request
  const authHeader = req.headers['authorization'];
  //Check if header exists and follows "Bearer <token>" format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Missing or invalid Authorization header. Format: Bearer <token>',
    });
  }
  //Extract token from header (remove "Bearer")
  const token = authHeader.split(' ')[1];
  try {
    //Verify JWT using secret key (checks signature + expiry)
    const payload = jwt.verify(token, JWT_SECRET);
    //Ensure token contains a tokenId (used for session tracking)
    if (!payload.tokenId) {
      return res.status(401).json({ success: false, message: 'Invalid session token' });
    }
    //Check if session exists and is still active (not expired/revoked)
    const session = Session.findActiveByTokenId(payload.tokenId);
    if (!session) {
      return res.status(401).json({ success: false, message: 'Session is expired or revoked' });
    }
    //Fetch user linked to token 
    const user = query.getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Token valid but user not found' });
    }
    //update session Activity (eg: last used timestamp)
    Session.touch(payload.tokenId);
    // Attach authenticated user and token payload to request object 
    req.user = user;
    req.auth = payload;
    //Proceed to next middleware or route handler 
    next();
  } catch (err) {
    //Handle token errors (expired or invalid)
    return res.status(401).json({
      success: false,
      message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid token',
    });
  }
}

//CSFR Protection Middleware 
function validateCsrf(req, res, next) {
  // Only validate state-changing requests
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers['x-csrf-token'] || req.body.csrfToken;
  if (!csrfToken || !validateCsrfToken(req.user.id, csrfToken)) {
    return res.status(403).json({ success: false, message: 'CSRF token invalid or missing' });
  }
  next();
}

// API Key Authentication 
function authenticateKey(requiredScopes = []) {
  return (req, res, next) => {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(401).json({ success: false, message: 'Missing X-API-Key header' });
    }

    const apiKey = query.getApiKeyByKey(key);
    if (!apiKey) {
      return res.status(401).json({ success: false, message: 'Invalid API key' });
    }
    if (!apiKey.active) {
      return res.status(403).json({ success: false, message: 'API key has been revoked' });
    }

    // Scope check
    if (requiredScopes.length > 0) {
      // All required scopes must be present in key.scopes array
      const hasAll = requiredScopes.every(s => apiKey.scopes.includes(s));
      if (!hasAll) {
        return res.status(403).json({
          success: false,
          message: `Insufficient scope. Required: ${requiredScopes.join(', ')}`,
        });
      }
    }

    // Log usage
    // Log every request for audit trail
    const { id: genId } = require('../db');
    apiKey.lastUsedAt = new Date().toISOString();
    db.apiUsageLogs.push({
      id:         genId(),
      apiKeyId:   apiKey.id,
      endpoint:   req.path,
      method:     req.method,
      timestamp:  new Date().toISOString(),
      statusCode: null, // filled by response hook in routes if needed
    });

    req.apiKey = apiKey;
    next();
  };
}

// Admin Guard 
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
}

module.exports = { 
  authenticate, 
  authenticateKey, 
  requireAdmin, 
  validateCsrf,
  generateCsrfToken,
  validateCsrfToken,
  JWT_SECRET 
};