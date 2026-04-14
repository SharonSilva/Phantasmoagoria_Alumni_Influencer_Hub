'use strict'

/**
 * Charts Controller
 * Generate Chart.js-ready data for analytics visualizations
 */

const axios = require('axios');

const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

async function fetchAlumni(token) {
  const res = await axios.get(`${API_BASE}/public/alumni`, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
  });
  return res.data;
}

const COLORS = [
  'rgba(255, 99, 132, 0.7)',
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(75, 192, 192, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
  'rgba(199, 199, 199, 0.7)',
  'rgba(83, 102, 255, 0.7)'
];

module.exports = {
  name: 'charts',

  /**
   * GET /charts/skillsGap → Skills gap analysis
   */
  skillsGap: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const certCounts = {};
      alumni.forEach(profile => {
        (profile.certifications || []).forEach(cert => {
          certCounts[cert.name] = (certCounts[cert.name] || 0) + 1;
        });
      });

      const sorted = Object.entries(certCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      res.json({
        type: 'bar',
        labels: sorted.map(([name]) => name),
        datasets: [{
          label: 'Alumni with Certification',
          data: sorted.map(([, count]) => count),
          backgroundColor: COLORS,
          borderWidth: 1
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/careerTrends → Alumni count by graduation year
   */
  careerTrends: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const byYear = {};
      alumni.forEach(profile => {
        const year = profile.graduationYear || 'Unknown';
        byYear[year] = (byYear[year] || 0) + 1;
      });

      const sorted = Object.entries(byYear).sort((a, b) => a[0] - b[0]);

      res.json({
        type: 'line',
        labels: sorted.map(([year]) => year),
        datasets: [{
          label: 'Graduates per Year',
          data: sorted.map(([, count]) => count),
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          fill: true,
          tension: 0.3
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/industryDistribution → Alumni by industry sector
   */
  industryDistribution: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const byIndustry = {};
      alumni.forEach(profile => {
        const industry = profile.industry || 'Not specified';
        byIndustry[industry] = (byIndustry[industry] || 0) + 1;
      });

      const sorted = Object.entries(byIndustry).sort((a, b) => b[1] - a[1]);

      res.json({
        type: 'doughnut',
        labels: sorted.map(([industry]) => industry),
        datasets: [{
          data: sorted.map(([, count]) => count),
          backgroundColor: COLORS
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/certifications → Top certifications obtained
   */
  certifications: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const certCounts = {};
      alumni.forEach(profile => {
        (profile.certifications || []).forEach(cert => {
          certCounts[cert.name] = (certCounts[cert.name] || 0) + 1;
        });
      });

      const sorted = Object.entries(certCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15);

      res.json({
        type: 'bar',
        labels: sorted.map(([name]) => name),
        datasets: [{
          label: 'Number of Alumni',
          data: sorted.map(([, count]) => count),
          backgroundColor: 'rgba(153, 102, 255, 0.7)',
          borderWidth: 1
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/programmeDistribution → Alumni by programme
   */
  programmeDistribution: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const byProgramme = {};
      alumni.forEach(profile => {
        const prog = profile.programme || 'Unknown';
        byProgramme[prog] = (byProgramme[prog] || 0) + 1;
      });

      const sorted = Object.entries(byProgramme).sort((a, b) => b[1] - a[1]);

      res.json({
        type: 'pie',
        labels: sorted.map(([prog]) => prog),
        datasets: [{
          data: sorted.map(([, count]) => count),
          backgroundColor: COLORS
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/graduationYears → Alumni count per graduation year
   */
  graduationYears: async function(req, res) {
    try {
      const alumni = await fetchAlumni(req.session.authToken);

      const byYear = {};
      alumni.forEach(profile => {
        const year = profile.graduationYear || 'Unknown';
        byYear[year] = (byYear[year] || 0) + 1;
      });

      const sorted = Object.entries(byYear).sort((a, b) => a[0] - b[0]);

      res.json({
        type: 'bar',
        labels: sorted.map(([year]) => String(year)),
        datasets: [{
          label: 'Alumni',
          data: sorted.map(([, count]) => count),
          backgroundColor: 'rgba(75, 192, 192, 0.7)',
          borderWidth: 1
        }]
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/biddingTrends → Bidding activity over time
   */
  biddingTrends: async function(req, res) {
    try {
      const token = req.session.authToken;
      let data = { labels: [], datasets: [] };

      try {
        const response = await axios.get(`${API_BASE}/bids/trends`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        const trends = response.data || [];
        data = {
          type: 'line',
          labels: trends.map(t => t.date || t.month || t.label),
          datasets: [{
            label: 'Bids',
            data: trends.map(t => t.count || t.value),
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            fill: true,
            tension: 0.3
          }]
        };
      } catch {
        // Fallback: empty chart if bids endpoint not available
        data = {
          type: 'line',
          labels: [],
          datasets: [{
            label: 'Bids',
            data: [],
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)'
          }]
        };
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  /**
   * GET /charts/sponsorships → Sponsorship data
   */
  sponsorships: async function(req, res) {
    try {
      const token = req.session.authToken;
      let data = { labels: [], datasets: [] };

      try {
        const response = await axios.get(`${API_BASE}/sponsorships`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        const sponsorships = response.data || [];
        const bySponsor = {};
        sponsorships.forEach(s => {
          const name = s.sponsorName || s.name || 'Unknown';
          bySponsor[name] = (bySponsor[name] || 0) + (s.amount || 1);
        });

        const sorted = Object.entries(bySponsor).sort((a, b) => b[1] - a[1]);

        data = {
          type: 'bar',
          labels: sorted.map(([name]) => name),
          datasets: [{
            label: 'Sponsorship Amount (£)',
            data: sorted.map(([, amount]) => amount),
            backgroundColor: COLORS,
            borderWidth: 1
          }]
        };
      } catch {
        // Fallback: empty chart if sponsorships endpoint not available
        data = {
          type: 'bar',
          labels: [],
          datasets: [{
            label: 'Sponsorship Amount (£)',
            data: [],
            backgroundColor: COLORS
          }]
        };
      }

      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};