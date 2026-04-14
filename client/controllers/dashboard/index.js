'use strict'

/**
 * Dashboard Controller
 * Main analytics landing page with key metrics and visualizations
 */

const axios = require('axios');

// Backend API base URL
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

// Make authenticated API calls
async function apiCall(endpoint, token) {
  try {
    const response = await axios.get(`${API_BASE}${endpoint}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });
    return response.data;
  } catch (error) {
    console.error(`API Error: ${endpoint}`, error.message);
    throw error;
  }
}

module.exports = {
  name: 'dashboard',
  
  /**
   * GET / → Dashboard home page
   * Returns HTML page that loads dashboard via client-side JavaScript
   */
  index: function(req, res) {
    res.json({
      page: 'dashboard',
      title: 'Alumni Analytics Dashboard',
      apiEndpoint: '/api/dashboard'
    });
  },

  /**
   * GET /api/dashboard → Main analytics data
   * Returns all dashboard metrics
   */
  api: async function(req, res) {
    try {
      const token = req.session.authToken;

      // Fetch data from backend API
      const alumniData = await apiCall('/public/alumni', token);
      const analyticsData = await apiCall('/public/analytics', token);
      const winnersData = await apiCall('/winners', token);

      // Calculate statistics
      const totalAlumni = alumniData.length || 0;
      const totalBids = analyticsData.totalBids || 0;
      const totalWinners = winnersData.length || 0;

      // Group by programme
      const byProgramme = groupByField(alumniData, 'programme');
      
      // Group by industry
      const byIndustry = groupByField(alumniData, 'industry');

      res.json({
        success: true,
        metrics: {
          totalAlumni,
          totalBids,
          totalWinners,
          averageBidAmount: analyticsData.averageBid || 0,
          monthlyWinners: analyticsData.monthlyWins || 0
        },
        breakdown: {
          byProgramme,
          byIndustry
        },
        recentWinners: winnersData.slice(-5),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  }
};

// Helper: Group array of objects by field
function groupByField(arr, field) {
  return arr.reduce((acc, item) => {
    const key = item[field] || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}