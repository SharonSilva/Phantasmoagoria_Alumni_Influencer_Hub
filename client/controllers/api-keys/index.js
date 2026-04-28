'use strict';

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

function buildHeaders(session) {
  const analyticsKey = process.env.ANALYTICS_API_KEY || 'east_analytics_dashboard_k4';
  const headers = {
    'Authorization': session.authToken ? `Bearer ${session.authToken}` : '',
    'X-API-Key': analyticsKey,
    'Content-Type': 'application/json',
  };
  if (session.csrfToken) headers['X-CSRF-Token'] = session.csrfToken;
  return headers;
}

module.exports = {
  name: 'api-keys',

  /**
   * GET /api-keyss → List all API keys (admin only)
   */
  list: async function(req, res) {
    try {
      if (!req.session?.authToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const response = await axios.get(`${API_BASE}/keys`, {
        headers: buildHeaders(req.session),
      });

      const data = response.data.data || response.data;
      res.json({ success: true, data, timestamp: new Date().toISOString() });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /api-keys/:api_keys_id → Single API key detail
   */
  show: async function(req, res) {
    try {
      if (!req.session?.authToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const keyId = req.params.api_keys_id;
      const response = await axios.get(`${API_BASE}/keys/${keyId}`, {
        headers: buildHeaders(req.session),
      });

      // Backend returns { success: true, data: { ...key, ...stats } } — one level of unwrap
      const data = response.data.data || response.data;
      res.json({ success: true, data });
    } catch (error) {
      const status = error.response?.status || 404;
      res.status(status).json({ success: false, error: 'API key not found' });
    }
  },

  /**
   * POST /api-keys → Create a new API key (admin only)
   */
  create: async function(req, res) {
    try {
      if (!req.session?.authToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { name, scopes } = req.body;
      const response = await axios.post(
        `${API_BASE}/keys`,
        { name, scopes },
        { headers: buildHeaders(req.session) },
      );

      res.json({
        success: true,
        message: 'API key created. Save it — it will not be shown in full again.',
        data: response.data.data || response.data,
      });
    } catch (error) {
      const status = error.response?.status || 400;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /api-keys/usage → Usage statistics for all keys
   * Correct server route is GET /api/usage/stats (usageRouter mounted at /usage).
   */
  usage: async function(req, res) {
    try {
      if (!req.session?.authToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const response = await axios.get(`${API_BASE}/usage/stats`, {
        headers: buildHeaders(req.session),
      });

      res.json({ success: true, data: response.data.stats || response.data });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /api-keys/endpointStats → endpoint usage statistics
   */
  endpointStats: async function(req, res) {
    try {
      if (!req.session?.authToken) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const response = await axios.get(`${API_BASE}/usage/endpoints`, {
        headers: buildHeaders(req.session),
      });
      res.json({ success: true, data: response.data });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },
};