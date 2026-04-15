const crypto   = require('crypto');
const { db, id, addApiKey, query } = require('../db');

class ApiKey {
  static getAll() {
    return db.apiKeys.map(k => ({
      ...k,
      usageCount: db.apiUsageLogs.filter(l => l.apiKeyId === k.id).length,
    }));
  }

  static findById(keyId) {
    return query.getApiKeyById(keyId);
  }

  static findByKey(keyStr) {
    return query.getApiKeyByKey(keyStr);
  }

  static create({ name, scopes, ownerId }) {
    const prefix = process.env.API_KEY_PREFIX || 'east_';
    const newKey = {
      id:         id(),
      name,
      key:        prefix + crypto.randomBytes(24).toString('hex'),
      ownerId,
      scopes:     scopes || ['read:featured'],
      active:     true,
      createdAt:  new Date().toISOString(),
      lastUsedAt: null,
    };
    addApiKey(newKey);
    return newKey;
  }

  static revoke(keyId, revokedBy) {
    const key = ApiKey.findById(keyId);
    if (!key || !key.active) return null;
    key.active    = false;
    key.revokedAt = new Date().toISOString();
    key.revokedBy = revokedBy;
    return key;
  }

  static logUsage(apiKeyId, endpoint, method, statusCode = 200) {
  db.apiUsageLogs.push({
    id: id(),
    apiKeyId,
    endpoint,
    method,
    statusCode,
    timestamp: new Date().toISOString()
  });
}

  static getStats(keyId) {
    const logs = db.apiUsageLogs
      .filter(l => l.apiKeyId === keyId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const byEndpoint = {};
    logs.forEach(l => {
      const k = `${l.method} ${l.endpoint}`;
      if (!byEndpoint[k]) byEndpoint[k] = { method: l.method, endpoint: l.endpoint, count: 0 };
      byEndpoint[k].count++;
    });
    return {
      totalCalls: logs.length,
      firstUsed:  logs.length ? logs[logs.length - 1].timestamp : null,
      lastUsed:   logs.length ? logs[0].timestamp : null,
      byEndpoint: Object.values(byEndpoint),
      allLogs:    logs,
    };
  }
}

module.exports = ApiKey;