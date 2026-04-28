'use strict';

/**
 * Dashboard Controller (client)
 * Fetches analytics data from server and serves it to the frontend.
 * Uses API key auth (read:analytics scope) — NOT JWT session auth.
 * 
 * Solution: use /api/dashboard and /api/dashboard/bidding-analytics instead.
 */

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

function buildHeaders(session) {
  const analyticsKey = process.env.ANALYTICS_API_KEY || 'east_analytics_dashboard_k4';
  return {
    // Include JWT if present (staff may also be logged in via session)
    'Authorization': session?.authToken ? `Bearer ${session.authToken}` : '',
    // Analytics key must have read:analytics scope
    'X-API-Key': analyticsKey,
    'Content-Type': 'application/json',
  };
}

async function apiGet(endpoint, session) {
  const response = await axios.get(`${API_BASE}${endpoint}`, {
    headers: buildHeaders(session),
  });
  return response.data;
}

module.exports = {
  name: 'dashboard',

  /**
   * GET / → Dashboard info page (used by boot.js as the index route)
   */
  index: function(req, res) {
    res.json({
      page: 'dashboard',
      title: 'Alumni Analytics Dashboard',
      authenticated: !!(req.session && req.session.authToken),
    });
  },

  /**
   * GET /dashboard/api → Main dashboard metrics
   * Fetches from /api/dashboard (server DashboardController.getDashboard).
   */
  api: async function(req, res) {
    try {
      const dashData = await apiGet('/dashboard', req.session);

      res.json({
        success: true,
        metrics: dashData.metrics,
        breakdown: {
          byProgramme: dashData.breakdown?.byProgramme || {},
          byIndustry:  dashData.breakdown?.byIndustry  || {},
          byYear:      dashData.breakdown?.byGraduationYear || {},
        },
        recentWinners: dashData.recentWinners || [],
        topBidders:    dashData.topBidders    || [],
      });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /dashboard/biddingAnalytics → Bidding stats
   * /bids/history (JWT session auth) which the dashboard client can't access.
   */
  biddingAnalytics: async function(req, res) {
    try {
      const data = await apiGet('/dashboard/bidding-analytics', req.session);
      res.json({ success: true, data });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /dashboard/alumniStats → Alumni statistics
   */
  alumniStats: async function(req, res) {
    try {
      const data = await apiGet('/dashboard/alumni-stats', req.session);
      res.json({ success: true, data });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },
};