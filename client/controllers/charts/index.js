'use strict';

/**
 * Charts Controller (client)
 * Fetches chart data from backend /api/charts/* endpoints and passes through to frontend.
 * All endpoints require read:analytics scope — uses ANALYTICS_API_KEY from env.
 */

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

// BUG FIX: Must send analytics-scoped API key, not the mobile AR key.
// Mobile AR key only has read:alumni_of_day — charts need read:analytics.
function buildHeaders(session) {
  const analyticsKey = process.env.ANALYTICS_API_KEY || 'east_analytics_dashboard_k4';
  return {
    'Authorization': session?.authToken ? `Bearer ${session.authToken}` : '',
    'X-API-Key': analyticsKey,
    'Content-Type': 'application/json',
  };
}

// Generic chart fetch helper
async function fetchChart(endpoint, session) {
  const response = await axios.get(`${API_BASE}${endpoint}`, {
    headers: buildHeaders(session),
  });
  // Backend charts controller returns { success, type, labels, datasets } directly
  return response.data;
}

module.exports = {
  name: 'charts',

  /**
   * GET /charts/skillsGap
   */
  skillsGap: async function(req, res) {
    try {
      const data = await fetchChart('/charts/skills-gap', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/careerTrends
   */
  careerTrends: async function(req, res) {
    try {
      const data = await fetchChart('/charts/career-trends', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/industryDistribution
   */
  industryDistribution: async function(req, res) {
    try {
      const data = await fetchChart('/charts/industry-distribution', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/certifications
   */
  certifications: async function(req, res) {
    try {
      const data = await fetchChart('/charts/certifications', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/programmeDistribution
   */
  programmeDistribution: async function(req, res) {
    try {
      const data = await fetchChart('/charts/programme-distribution', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/graduationYears
   */
  graduationYears: async function(req, res) {
    try {
      const data = await fetchChart('/charts/graduation-years', req.session);
      res.json(data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },

  /**
   * GET /charts/biddingTrends
   * BUG FIX: Was calling /bids/trends which doesn't exist on the server.
   * Correct endpoint is /charts/bidding-trends (served by ChartsController.getBiddingTrends).
   */
  biddingTrends: async function(req, res) {
    try {
      const data = await fetchChart('/charts/bidding-trends', req.session);
      res.json(data);
    } catch (err) {
      // Fallback to empty chart rather than crashing
      res.json({
        type: 'line',
        labels: [],
        datasets: [{ label: 'Daily Bids', data: [], borderColor: 'rgba(255,99,132,1)', backgroundColor: 'rgba(255,99,132,0.2)' }],
      });
    }
  },

  /**
   * GET /charts/sponsorships
   */
  sponsorships: async function(req, res) {
    try {
      const data = await fetchChart('/charts/sponsorships', req.session);
      res.json(data);
    } catch (err) {
      res.json({
        type: 'doughnut',
        labels: [],
        datasets: [{ label: 'Sponsorship Amount (£)', data: [], backgroundColor: [] }],
      });
    }
  },
};