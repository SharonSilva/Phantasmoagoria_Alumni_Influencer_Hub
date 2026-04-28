'use strict';
const axios = require('axios');
const API_BASE = process.env.BACKEND_URL || 'http://localhost:3000/api';

module.exports = {
  name: 'wallet',

  balance: async function (req, res) {
    try {
      const token = req.session?.token || req.session?.authToken || '';
      const response = await axios.get(`${API_BASE}/wallet`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      res.json(response.data);
    } catch (err) {
      res.status(err.response?.status || 500).json({ error: err.message });
    }
  },
};