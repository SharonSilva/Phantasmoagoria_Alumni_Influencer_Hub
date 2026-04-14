/**
 * API Key Permissions Middleware
 * Enforces granular permission scoping for API keys
 */

const { db } = require('../db');

const permissionsMiddleware = (requiredScopes = []) => {
  return (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'API key required' 
      });
    }

    // Find the API key
    const keyRecord = db.apiKeys.find(k => k.key === apiKey);
    
    if (!keyRecord) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid API key' 
      });
    }

    // Check if key is active
    if (!keyRecord.active) {
      return res.status(403).json({ 
        success: false, 
        message: 'API key has been revoked' 
      });
    }

    // Check if user has required scopes
    const hasRequiredScope = requiredScopes.length === 0 || 
      requiredScopes.every(scope => keyRecord.scopes.includes(scope));

    if (!hasRequiredScope) {
      return res.status(403).json({ 
        success: false, 
        message: `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        requiredScopes,
        grantedScopes: keyRecord.scopes
      });
    }

    // Log API usage
    db.apiUsageLogs.push({
      id: require('uuid').v4(),
      apiKeyId: keyRecord.id,
      endpoint: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
      statusCode: 200
    });

    // Update last used timestamp
    keyRecord.lastUsedAt = new Date().toISOString();

    // Attach key info to request
    req.apiKey = keyRecord;
    next();
  };
};

module.exports = permissionsMiddleware;