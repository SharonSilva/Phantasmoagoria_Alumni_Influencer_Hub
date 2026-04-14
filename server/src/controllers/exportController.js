/**
 * Export Controller
 * Handles CSV and PDF exports of alumni data
 */

const { db } = require('../db');
const User = require('../models/User');
const json2csv = require('json2csv').parse;

class ExportController {
  /**
   * Export alumni data to CSV
   * GET /api/export/alumni/csv
   */
  static exportAlumniCSV(req, res) {
    try {
      const { programme, industry, graduationYear } = req.query;

      let profiles = [...db.profiles];

      // Apply filters
      if (programme) profiles = profiles.filter(p => p.programme === programme);
      if (industry) profiles = profiles.filter(p => p.industry === industry);
      if (graduationYear) profiles = profiles.filter(p => p.graduationYear === parseInt(graduationYear));

      // Prepare data for CSV
      const csvData = profiles.map(profile => {
        const user = User.findById(profile.userId);
        const certs = db.certifications.filter(c => c.profileId === profile.id);

        return {
          Name: user?.name || 'Unknown',
          Email: user?.email || 'N/A',
          Role: profile.currentRole || 'N/A',
          Employer: profile.currentEmployer || 'N/A',
          Industry: profile.industry || 'N/A',
          Programme: profile.programme || 'N/A',
          'Graduation Year': profile.graduationYear || 'N/A',
          'Wallet Balance': profile.walletBalance || 0,
          Certifications: certs.map(c => c.name).join('; ') || 'None',
          'LinkedIn URL': profile.linkedInUrl || 'N/A'
        };
      });

      const csv = json2csv(csvData);

      res.setHeader('Content-Disposition', 'attachment; filename=alumni-export.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error exporting to CSV',
        error: err.message 
      });
    }
  }

  /**
   * Export dashboard report
   * GET /api/export/dashboard/csv
   */
  static exportDashboardCSV(req, res) {
    try {
      const dashboardData = [{
        'Total Alumni': db.profiles.length,
        'Total Bids': db.bids.length,
        'Total Winners': db.winners.length,
        'Total Sponsors': db.sponsors.length,
        'Active API Keys': db.apiKeys.filter(k => k.active).length,
        'Total Sponsorships': db.sponsorships.length,
        'Export Date': new Date().toISOString()
      }];

      const csv = json2csv(dashboardData);

      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-report.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Export bids data
   * GET /api/export/bids/csv
   */
  static exportBidsCSV(req, res) {
    try {
      const bidsData = db.bids.map(bid => {
        const user = User.findById(bid.userId);

        return {
          'Bidder Name': user?.name || 'Unknown',
          'Bid Date': bid.bidDate,
          'Amount': bid.amount,
          'Status': bid.status,
          'Submitted At': bid.submittedAt
        };
      });

      const csv = json2csv(bidsData);

      res.setHeader('Content-Disposition', 'attachment; filename=bids-export.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Export winners data
   * GET /api/export/winners/csv
   */
  static exportWinnersCSV(req, res) {
    try {
      const winnersData = db.winners.map(winner => {
        const user = User.findById(winner.userId);

        return {
          'Winner Name': user?.name || 'Unknown',
          'Display Date': winner.displayDate,
          'Bid Amount': winner.bidAmount,
          'Created At': winner.createdAt
        };
      });

      const csv = json2csv(winnersData);

      res.setHeader('Content-Disposition', 'attachment; filename=winners-export.csv');
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Export with custom filters
   * POST /api/export/custom
   * Body: { dataType: 'alumni', filters: {...} }
   */
  static exportCustom(req, res) {
    try {
      const { dataType, filters } = req.body;

      let data = [];

      if (dataType === 'alumni') {
        let profiles = [...db.profiles];
        if (filters.programme) profiles = profiles.filter(p => p.programme === filters.programme);
        if (filters.industry) profiles = profiles.filter(p => p.industry === filters.industry);
        
        data = profiles.map(p => {
          const user = User.findById(p.userId);
          return {
            Name: user?.name,
            Email: user?.email,
            Role: p.currentRole,
            Industry: p.industry
          };
        });
      } else if (dataType === 'bids') {
        data = db.bids.map(b => {
          const user = User.findById(b.userId);
          return {
            'Bidder': user?.name,
            'Amount': b.amount,
            'Date': b.bidDate,
            'Status': b.status
          };
        });
      }

      const csv = json2csv(data);

      res.setHeader('Content-Disposition', `attachment; filename=${dataType}-export-${Date.now()}.csv`);
      res.setHeader('Content-Type', 'text/csv');
      res.send(csv);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ExportController;