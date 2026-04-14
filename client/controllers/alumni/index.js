'use strict'

/**
 * Alumni Controller
 * View, filter, and search alumni profiles
 */

const axios = require('axios');

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'alumni',

  /**
   * GET /alumnis → Fetch and return filtered alumni data
   */
  list: async function(req, res) {
    try {
      const token = req.session.authToken;

      // Get filter parameters from query
      const { programme, year, industry, search } = req.query;

      // Call backend API
      const response = await axios.get(`${API_BASE}/public/alumni`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        params: { programme, year, industry, search }
      });

      // Transform data for frontend
      const alumni = response.data.map(profile => ({
        id: profile.userId,
        name: profile.name,
        programme: profile.programme,
        graduationYear: profile.graduationYear,
        currentRole: profile.currentRole,
        currentEmployer: profile.currentEmployer,
        industry: profile.industry || 'Unknown',
        bio: profile.bio,
        photoUrl: profile.photoUrl,
        linkedInUrl: profile.linkedInUrl,
        certifications: profile.certifications || [],
        degrees: profile.degrees || []
      }));

      res.json({
        success: true,
        count: alumni.length,
        data: alumni,
        filters: { programme, year, industry, search }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  },

  /**
   * GET /alumni/:alumni_id → View single alumni profile
   */
  show: async function(req, res) {
    try {
      const alumniId = req.params.alumni_id;
      const token = req.session.authToken;

      const response = await axios.get(`${API_BASE}/public/alumni/${alumniId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      res.json({
        success: true,
        data: response.data
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: 'Alumni not found'
      });
    }
  }
};