'use strict';

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'auth',

  /**
   * POST /auth/login
   * Called by your frontend login form
   */
  login: async function(req, res) {
    try {
      const { email, password } = req.body;

      // 1. Forward credentials to the Backend Server
      const response = await axios.post(`${API_BASE}/auth/login`, { email, password });

      // 2. If backend says OK, save the JWT to the session
      if (response.data.success) {
        // This is the CRITICAL line that allows other controllers to work
        req.session.authToken = response.data.data.token;
        req.session.user = response.data.data.user;

        return res.json({ 
          success: true, 
          message: 'Login successful',
          user: response.data.data.user 
        });
      }
    } catch (error) {
      // Catch 401 Unauthorized or 500 errors from backend
      const message = error.response?.data?.message || 'Connection to auth server failed';
      res.status(error.response?.status || 500).json({ 
        success: false, 
        error: message 
      });
    }
  },

  /**
   * POST /auth/logout
   * Destroys the session
   */
  logout: function(req, res) {
    req.session = null; // Clears the cookie-session
    res.json({ success: true, message: 'Logged out successfully' });
  },

  /**
   * GET /auth/check
   * Used by the frontend to see if the user is still logged in
   */
  check: function(req, res) {
    if (req.session && req.session.authToken) {
      return res.json({ loggedIn: true, user: req.session.user });
    }
    res.json({ loggedIn: false });
  }
};