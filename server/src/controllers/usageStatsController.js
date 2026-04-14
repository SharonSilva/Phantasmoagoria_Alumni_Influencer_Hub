/**
 * API Usage Statistics Controller
 * Tracks and reports API key usage
 */

const { db } = require('../db');

class UsageStatsController {
  /**
   * Get usage statistics for an API key
   * GET /api/usage/key/:keyId
   */
  static getKeyUsageStats(req, res) {
    try {
      const { keyId } = req.params;
      const key = db.apiKeys.find(k => k.id === keyId);

      if (!key) {
        return res.status(404).json({ 
          success: false, 
          message: 'API key not found' 
        });
      }

      const logs = db.apiUsageLogs.filter(l => l.apiKeyId === keyId);
      const today = new Date().toISOString().split('T')[0];
      const logsToday = logs.filter(l => l.timestamp.startsWith(today));

      // Endpoint breakdown
      const endpoints = {};
      logs.forEach(log => {
        endpoints[log.endpoint] = (endpoints[log.endpoint] || 0) + 1;
      });

      // Status code distribution
      const statusCodes = {};
      logs.forEach(log => {
        statusCodes[log.statusCode] = (statusCodes[log.statusCode] || 0) + 1;
      });

      res.json({
        success: true,
        keyName: key.name,
        totalRequests: logs.length,
        requestsToday: logsToday.length,
        scopes: key.scopes,
        active: key.active,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        endpoints,
        statusCodeDistribution: statusCodes,
        recentRequests: logs.slice(-10).map(l => ({
          endpoint: l.endpoint,
          method: l.method,
          timestamp: l.timestamp,
          statusCode: l.statusCode
        }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get all API usage statistics
   * GET /api/usage/stats
   */
  static getAllUsageStats(req, res) {
    try {
      const stats = db.apiKeys.map(key => {
        const logs = db.apiUsageLogs.filter(l => l.apiKeyId === key.id);
        const today = new Date().toISOString().split('T')[0];
        const logsToday = logs.filter(l => l.timestamp.startsWith(today));

        return {
          keyId: key.id,
          keyName: key.name,
          scopes: key.scopes,
          active: key.active,
          totalRequests: logs.length,
          requestsToday: logsToday.length,
          lastUsedAt: key.lastUsedAt,
          createdAt: key.createdAt
        };
      });

      res.json({
        success: true,
        totalKeys: stats.length,
        activeKeys: stats.filter(s => s.active).length,
        stats
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get endpoint usage statistics
   * GET /api/usage/endpoints
   */
  static getEndpointStats(req, res) {
    try {
      const endpoints = {};
      const methods = {};

      db.apiUsageLogs.forEach(log => {
        endpoints[log.endpoint] = (endpoints[log.endpoint] || 0) + 1;
        const key = `${log.method} ${log.endpoint}`;
        methods[key] = (methods[key] || 0) + 1;
      });

      // Get most used endpoints
      const mostUsed = Object.entries(endpoints)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      res.json({
        success: true,
        totalRequests: db.apiUsageLogs.length,
        totalEndpoints: Object.keys(endpoints).length,
        mostUsedEndpoints: Object.fromEntries(mostUsed),
        allEndpoints: endpoints
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Get usage report for date range
   * GET /api/usage/report?startDate=2024-01-01&endDate=2024-01-31
   */
  static getUsageReport(req, res) {
    try {
      const { startDate, endDate } = req.query;

      let logs = [...db.apiUsageLogs];

      if (startDate) {
        logs = logs.filter(l => l.timestamp >= startDate);
      }
      if (endDate) {
        logs = logs.filter(l => l.timestamp <= endDate + 'T23:59:59Z');
      }

      // Daily breakdown
      const dailyStats = {};
      logs.forEach(log => {
        const date = log.timestamp.split('T')[0];
        dailyStats[date] = (dailyStats[date] || 0) + 1;
      });

      // Status distribution
      const statusDistribution = {};
      logs.forEach(log => {
        statusDistribution[log.statusCode] = (statusDistribution[log.statusCode] || 0) + 1;
      });

      res.json({
        success: true,
        period: { startDate, endDate },
        totalRequests: logs.length,
        dailyStats,
        statusDistribution,
        successRate: ((statusDistribution[200] || 0) / logs.length * 100).toFixed(2) + '%'
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = UsageStatsController;