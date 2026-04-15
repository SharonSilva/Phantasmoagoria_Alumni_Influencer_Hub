'use strict';

const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

// Build auth headers for backend requests.
// BUG FIX: Must include X-API-Key with analytics-scoped key (read:alumni).
// The mobile AR key (east_mobile_v2_def456uvw) only has read:alumni_of_day — wrong scope.
function buildHeaders(session) {
  const analyticsKey = process.env.ANALYTICS_API_KEY || 'east_analytics_dashboard_k4';
  return {
    'Authorization': session.authToken ? `Bearer ${session.authToken}` : '',
    'X-API-Key': analyticsKey, // must have read:alumni scope
    'Content-Type': 'application/json',
  };
}

module.exports = {
  name: 'alumni',

  /**
   * GET /alumnis → Fetch filtered alumni list from backend
   */
  list: async function(req, res) {
    try {
      const { programme, year, industry, search, page = 1, limit = 20 } = req.query;

      const response = await axios.get(`${API_BASE}/public/alumni`, {
        headers: buildHeaders(req.session),
        params: { programme, graduationYear: year, industry, search, page, limit },
      });

      // BUG FIX: backend wraps in { success, data, meta } — unwrap safely
      const raw = response.data.data || response.data;
      const alumni = (Array.isArray(raw) ? raw : []).map(a => ({
        id:              a.id || a.userId,
        name:            a.name,
        programme:       a.profile?.programme    || a.programme    || 'Unknown',
        graduationYear:  a.profile?.graduationYear || a.graduationYear,
        currentRole:     a.profile?.currentRole  || a.currentRole  || 'N/A',
        currentEmployer: a.profile?.currentEmployer || a.currentEmployer || 'N/A',
        industry:        a.profile?.industry     || a.industry     || 'Unknown',
        bio:             a.profile?.bio          || a.bio,
        photoUrl:        a.profile?.photoUrl     || a.photoUrl,
        linkedInUrl:     a.profile?.linkedInUrl  || a.linkedInUrl,
        certifications:  a.profile?.certifications || a.certifications || [],
        degrees:         a.profile?.degrees      || a.degrees      || [],
      }));

      res.json({
        success: true,
        count: alumni.length,
        pagination: response.data.meta || {},
        data: alumni,
        filters: { programme, year, industry, search },
      });
    } catch (error) {
      const status = error.response?.status || 500;
      res.status(status).json({ success: false, error: error.response?.data?.message || error.message });
    }
  },

  /**
   * GET /alumni/:alumni_id → Single alumni profile
   */
  show: async function(req, res) {
    try {
      const alumniId = req.params.alumni_id;

      const response = await axios.get(`${API_BASE}/public/alumni/${alumniId}`, {
        headers: buildHeaders(req.session),
      });

      const raw = response.data.data || response.data;
      res.json({ success: true, data: raw });
    } catch (error) {
      const status = error.response?.status || 404;
      res.status(status).json({ success: false, error: 'Alumni not found' });
    }
  },
};