'use strict'

/**
 * Charts Controller
 * Generate data for various analytics visualizations
 */

const axios = require('axios');

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'charts',

  /**
   * GET /charts/skills-gap → Skills gap analysis
   */
  skillsGap: async function(req, res) {
    try {
      const token = req.session.authToken;
      const alumniData = await axios.get(`${API_BASE}/public/alumni`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      // Count certifications
      const certCounts = {};
      alumniData.data.forEach(profile => {
        if (profile.certifications) {
          profile.certifications.forEach(cert => {
            certCounts[cert.name] = (certCounts[cert.name] || 0) + 1;
          });
        }
      });

      // Calculate gaps (e.g., 73% have Docker but degree doesn't teach it)
      const totalAlumni = alumniData.data.length;
      const gaps = Object.entries(certCounts).map(([skill, count]) => ({
        skill,
        alumniCount: count,
        percentage: Math.round((count / totalAlumni) * 100),
        gap: 100 - Math.round((count / totalAlumni) * 100),
        criticality: Math.round((count / totalAlumni) * 100) > 60 ? 'critical' : 'significant'
      })).sort((a, b) => b.percentage - a.percentage);

      res.json({
        success: true,
        data: gaps,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /charts/career-trends → Career progression by year
   */
  careerTrends: async function(req, res) {
    try {
      const token = req.session.authToken;
      const alumniData = await axios.get(`${API_BASE}/public/alumni`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      // Group by graduation year
      const byYear = {};
      alumniData.data.forEach(profile => {
        const year = profile.graduationYear || 2020;
        if (!byYear[year]) {
          byYear[year] = { count: 0, roles: {}, salary: [] };
        }
        byYear[year].count++;
        
        if (profile.currentRole) {
          byYear[year].roles[profile.currentRole] = (byYear[year].roles[profile.currentRole] || 0) + 1;
        }
      });

      const trends = Object.entries(byYear)
        .sort((a, b) => a[0] - b[0])
        .map(([year, data]) => ({
          year: parseInt(year),
          alumniCount: data.count,
          topRoles: Object.entries(data.roles)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([role, count]) => ({ role, count }))
        }));

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /charts/industry-distribution → Alumni by industry sector
   */
  industryDistribution: async function(req, res) {
    try {
      const token = req.session.authToken;
      const alumniData = await axios.get(`${API_BASE}/public/alumni`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      // Group by industry
      const byIndustry = {};
      alumniData.data.forEach(profile => {
        const industry = profile.industry || 'Not specified';
        byIndustry[industry] = (byIndustry[industry] || 0) + 1;
      });

      const distribution = Object.entries(byIndustry)
        .map(([industry, count]) => ({ industry, count }))
        .sort((a, b) => b.count - a.count);

      res.json({
        success: true,
        data: distribution,
        total: alumniData.data.length
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  /**
   * GET /charts/certifications → Top certifications obtained
   */
  certifications: async function(req, res) {
    try {
      const token = req.session.authToken;
      const alumniData = await axios.get(`${API_BASE}/public/alumni`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      const certCounts = {};
      alumniData.data.forEach(profile => {
        if (profile.certifications) {
          profile.certifications.forEach(cert => {
            certCounts[cert.name] = (certCounts[cert.name] || 0) + 1;
          });
        }
      });

      const topCerts = Object.entries(certCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);

      res.json({
        success: true,
        data: topCerts
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};