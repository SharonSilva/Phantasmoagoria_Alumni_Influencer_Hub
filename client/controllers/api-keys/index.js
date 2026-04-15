'use strict'

/**
 * API Keys Controller
 * Manage API keys, permissions, and usage statistics
 */

const axios = require('axios');

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'api-keys',

  /**
   * GET /api-keyss → List all API keys
   */
  list: async function(req, res) {
    try {
      const token = req.session.authToken;
      if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const response = await axios.get(`${API_BASE}/keys`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      res.json({
        success: true,
        data: response.data,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /api-keys/:api_keys_id → View single API key details
   */
  show: async function(req, res) {
    try {
      const token = req.session.authToken;
      const keyId = req.params.api_keys_id; // The ID coming from your Client URL

      const response = await axios.get(`${API_BASE}/keys/${keyId}`, { // Backend expects keyId
        headers: { 'Authorization': `Bearer ${token}` }
      });

      res.json({ success: true, data: response.data.data });
    } catch (error) {
      res.status(404).json({ success: false, error: 'API key not found' });
    }
},

  /**
   * POST /api-keys → Create new API key
   */
  create: async function(req, res) {
    try {
      const token = req.session.authToken;
      if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const { name, scopes } = req.body;

      const response = await axios.post(`${API_BASE}/keys`, 
        { name, scopes },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      res.json({
        success: true,
        message: 'API key created successfully',
        data: response.data
      });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /api/keys/usage → Get API usage statistics
   */
  usage: async function(req, res) {
    try {
      const token = req.session.authToken;
      if (!token) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }

      const response = await axios.get(`${API_BASE}/keys/usage/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};