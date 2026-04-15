'use strict';

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

function ensureAuth(req, res) {
  if (!req.session?.authToken) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return false;
  }
  return true;
}

function authHeaders(session, csrfToken) {
  const headers = {
    Authorization: `Bearer ${session.authToken}`,
    'Content-Type': 'application/json',
  };
  if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  return headers;
}

async function issueCsrfToken(session) {
  const csrfRes = await axios.get(`${API_BASE}/csrf-token`, {
    headers: authHeaders(session),
  });
  return csrfRes.data?.data?.csrfToken;
}

async function bidMutation(req, res, method, endpoint, body) {
  if (!ensureAuth(req, res)) return;
  try {
    const csrfToken = await issueCsrfToken(req.session);
    const response = await axios({
      method,
      url: `${API_BASE}${endpoint}`,
      data: body,
      headers: authHeaders(req.session, csrfToken),
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    const status = error.response?.status || 500;
    res.status(status).json({
      success: false,
      error: error.response?.data?.message || error.message,
      details: error.response?.data?.errors || [],
    });
  }
}

module.exports = {
  name: 'bids',

  tomorrow: async function(req, res) {
    if (!ensureAuth(req, res)) return;
    try {
      const response = await axios.get(`${API_BASE}/bids/tomorrow`, {
        headers: authHeaders(req.session),
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  status: async function(req, res) {
    if (!ensureAuth(req, res)) return;
    try {
      const response = await axios.get(`${API_BASE}/bids/status`, {
        headers: authHeaders(req.session),
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  monthly: async function(req, res) {
    if (!ensureAuth(req, res)) return;
    try {
      const response = await axios.get(`${API_BASE}/bids/monthly`, {
        headers: authHeaders(req.session),
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  history: async function(req, res) {
    if (!ensureAuth(req, res)) return;
    try {
      const response = await axios.get(`${API_BASE}/bids/history`, {
        headers: authHeaders(req.session),
      });
      res.json(response.data);
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  create: async function(req, res) {
    return bidMutation(req, res, 'post', '/bids', { amount: req.body.amount });
  },

  update: async function(req, res) {
    return bidMutation(req, res, 'patch', `/bids/${req.params.bids_id}`, { amount: req.body.amount });
  },
};
