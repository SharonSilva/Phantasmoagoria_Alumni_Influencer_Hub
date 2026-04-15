/**
 * Charts Controller
 * Provides data for various chart visualizations
 */

const { db } = require('../db');
const User = require('../models/User');

class ChartsController {
  static calcPercentages(values) {
    const total = values.reduce((sum, v) => sum + (Number(v) || 0), 0);
    if (!total) return values.map(() => 0);
    return values.map(v => Number((((Number(v) || 0) / total) * 100).toFixed(1)));
  }

  static buildInsightBadges(percentages) {
    return percentages.map(pct => {
      if (pct >= 40) return 'critical';
      if (pct >= 20) return 'significant';
      return 'emerging';
    });
  }
  /**
   * Skills gap analysis
   * GET /api/charts/skills-gap
   */
  static getSkillsGap(req, res) {
    try {
      const skills = {};
      
      // Count certifications by issuer
      db.certifications.forEach(cert => {
        skills[cert.issuer] = (skills[cert.issuer] || 0) + 1;
      });

      const labels = Object.keys(skills);
      const data = Object.values(skills);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'bar',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Number of Certifications',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Career trends over time
   * GET /api/charts/career-trends
   */
  static getCareerTrends(req, res) {
    try {
      const trendsByYear = {};
      
      // Group employment history by year
      db.employmentHistory.forEach(job => {
        const year = new Date(job.startDate).getFullYear();
        trendsByYear[year] = (trendsByYear[year] || 0) + 1;
      });

      const years = Object.keys(trendsByYear).sort();
      const counts = years.map(y => trendsByYear[y]);
      const percentages = ChartsController.calcPercentages(counts);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'line',
        labels: years,
        percentages,
        insights,
        datasets: [{
          label: 'Employment Starts by Year',
          data: counts,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          tension: 0.4
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Industry distribution pie chart
   * GET /api/charts/industry-distribution
   */
  static getIndustryDistribution(req, res) {
    try {
      const industries = {};
      
      db.profiles.forEach(profile => {
        const industry = profile.industry || 'Other';
        industries[industry] = (industries[industry] || 0) + 1;
      });

      const labels = Object.keys(industries);
      const data = Object.values(industries);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);
      const colors = [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)',
        'rgba(153, 102, 255, 0.5)',
        'rgba(255, 159, 64, 0.5)',
        'rgba(199, 199, 199, 0.5)',
        'rgba(83, 102, 255, 0.5)'
      ];

      res.json({
        success: true,
        type: 'doughnut',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Alumni by Industry',
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length).map(c => c.replace('0.5', '1')),
          borderWidth: 1
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Top certifications
   * GET /api/charts/certifications
   */
  static getCertifications(req, res) {
    try {
      const certs = {};
      
      db.certifications.forEach(cert => {
        certs[cert.name] = (certs[cert.name] || 0) + 1;
      });

      const sorted = Object.entries(certs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

      const labels = sorted.map(c => c[0]);
      const data = sorted.map(c => c[1]);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'radar',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Certifications Held',
          data,
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderWidth: 2
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Programme distribution
   * GET /api/charts/programme-distribution
   */
  static getProgrammeDistribution(req, res) {
    try {
      const programmes = {};
      
      db.profiles.forEach(profile => {
        const programme = profile.programme || 'Unknown';
        programmes[programme] = (programmes[programme] || 0) + 1;
      });

      const labels = Object.keys(programmes);
      const data = Object.values(programmes);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'bar',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Alumni by Programme',
          data,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 1
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Graduation year distribution
   * GET /api/charts/graduation-years
   */
  static getGraduationYears(req, res) {
    try {
      const years = {};
      
      db.profiles.forEach(profile => {
        const year = profile.graduationYear || 'Unknown';
        years[year] = (years[year] || 0) + 1;
      });

      const sorted = Object.entries(years)
        .sort((a, b) => a[0] - b[0]);

      const labels = sorted.map(y => y[0].toString());
      const data = sorted.map(y => y[1]);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'line',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Alumni by Graduation Year',
          data,
          borderColor: 'rgba(255, 159, 64, 1)',
          backgroundColor: 'rgba(255, 159, 64, 0.2)',
          tension: 0.4,
          fill: true
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Bidding trends
   * GET /api/charts/bidding-trends
   */
  static getBiddingTrends(req, res) {
    try {
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
      }

      const bidsPerDay = last7Days.map(day => 
        db.bids.filter(b => b.bidDate === day).length
      );
      const percentages = ChartsController.calcPercentages(bidsPerDay);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'line',
        labels: last7Days,
        percentages,
        insights,
        datasets: [{
          label: 'Daily Bids (Last 7 Days)',
          data: bidsPerDay,
          borderColor: 'rgba(255, 99, 132, 1)',
          backgroundColor: 'rgba(255, 99, 132, 0.2)',
          tension: 0.4
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Sponsorship distribution
   * GET /api/charts/sponsorships
   */
  static getSponsorships(req, res) {
    try {
      const sponsorStats = {};
      
      db.sponsorships.forEach(sp => {
        const sponsor = db.sponsors.find(s => s.id === sp.sponsorId);
        if (sponsor) {
          sponsorStats[sponsor.name] = (sponsorStats[sponsor.name] || 0) + sp.offerAmount;
        }
      });

      const labels = Object.keys(sponsorStats);
      const data = Object.values(sponsorStats);
      const percentages = ChartsController.calcPercentages(data);
      const insights = ChartsController.buildInsightBadges(percentages);

      res.json({
        success: true,
        type: 'doughnut',
        labels,
        percentages,
        insights,
        datasets: [{
          label: 'Sponsorship Amount by Organization',
          data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)'
          ]
        }]
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ChartsController;