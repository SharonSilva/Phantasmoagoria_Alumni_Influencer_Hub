'use strict';

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'auth',

  /**
   * POST /auth/login
   * Forwards credentials to backend, stores JWT + CSRF token in session
   */
  login: async function(req, res) {
    try {
      const { email, password } = req.body;

      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });

      if (response.data.success) {
        const { token, csrfToken, user } = response.data.data;

        // Store JWT and CSRF token server-side in session (never expose JWT to browser JS)
        req.session.authToken  = token;
        req.session.csrfToken  = csrfToken;
        req.session.user       = user;

        return res.json({
          success: true,
          message: 'Login successful',
          // Send csrfToken to client so it can include it on state-changing requests
          csrfToken,
          token,
          user,
        });
      }

      // Should not reach here if backend returns success:false without throwing
      res.status(401).json({ success: false, error: 'Login failed' });

    } catch (error) {
      const status  = error.response?.status  || 500;
      const message = error.response?.data?.message || 'Connection to auth server failed';
      res.status(status).json({ success: false, error: message });
    }
  },

  /**
   * POST /auth/register
   * Registers a new university user.
   */
  register: async function(req, res) {
    try {
      const { name, email, password } = req.body;
      const response = await axios.post(`${API_BASE}/auth/register`, { name, email, password });
      res.status(201).json({
        success: true,
        message: response.data?.message || 'Registration successful. Please verify your email.',
        data: response.data?.data || null,
      });
    } catch (error) {
      const status = error.response?.status || 500;
      const payload = error.response?.data || {};
      res.status(status).json({
        success: false,
        error: payload.message || payload.error || 'Registration failed',
        details: payload.errors || [],
      });
    }
  },

  /**
   * GET /auth/verify?token=...
   */
  verify: async function(req, res) {
    try {
      const { token } = req.query;
      const response = await axios.get(`${API_BASE}/auth/verify-email`, { params: { token } });
      res.json({
        success: true,
        message: response.data?.message || 'Email verified successfully.',
      });
    } catch (error) {
      const status = error.response?.status || 500;
      const payload = error.response?.data || {};
      res.status(status).json({
        success: false,
        error: payload.message || payload.error || 'Email verification failed',
        details: payload.errors || [],
      });
    }
  },

  /**
   * POST /auth/forgotPassword
   */
  forgotPassword: async function(req, res) {
    try {
      const { email } = req.body;
      const response = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      res.json({
        success: true,
        message: response.data?.message || 'If that email is registered, a reset link has been sent.',
      });
    } catch (error) {
      const status = error.response?.status || 500;
      const payload = error.response?.data || {};
      res.status(status).json({
        success: false,
        error: payload.message || payload.error || 'Forgot password request failed',
        details: payload.errors || [],
      });
    }
  },

  /**
   * POST /auth/resetPassword
   */
  resetPassword: async function(req, res) {
    try {
      const { token, password } = req.body;
      const response = await axios.post(`${API_BASE}/auth/reset-password`, { token, password });
      res.json({
        success: true,
        message: response.data?.message || 'Password reset successfully.',
      });
    } catch (error) {
      const status = error.response?.status || 500;
      const payload = error.response?.data || {};
      res.status(status).json({
        success: false,
        error: payload.message || payload.error || 'Password reset failed',
        details: payload.errors || [],
      });
    }
  },

  /**
   * POST /auth/logout
   * Properly destroys express-session (req.session = null only works with cookie-session)
   * BUG FIX: express-session requires req.session.destroy(), not req.session = null
   */
  logout: function(req, res) {
    req.session.destroy(err => {
      if (err) {
        console.error('[LOGOUT ERROR]', err);
        return res.status(500).json({ success: false, error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  },

  /**
   * GET /auth/check
   * Frontend calls this on load to check if session is still valid
   */
  check: function(req, res) {
    if (req.session && req.session.authToken) {
      return res.json({ loggedIn: true, user: req.session.user, token: req.session.authToken });
    }
    res.json({ loggedIn: false });
  },
};