/**
 * Dashboard Controller
 * Aggregates data for analytics dashboard
 */

const { db, dateStr } = require('../db');
const User = require('../models/User');
const Bid = require('../models/Bid');
const Profile = require('../models/Profile');

class DashboardController {
  /**
   * Get dashboard metrics and overview
   * GET /api/dashboard
   */
  static getDashboard(req, res) {
    try {
      // Calculate metrics
      const metrics = {
        totalAlumni: db.users.filter(u => u.role === 'alumni').length,
        totalBids: db.bids.length,
        totalWinners: db.winners.length,
        monthlyWinners: db.winners.filter(w => {
          const winDate = new Date(w.displayDate);
          const now = new Date();
          return winDate.getMonth() === now.getMonth() && 
                 winDate.getFullYear() === now.getFullYear();
        }).length,
        activeBids: db.bids.filter(b => b.status === 'active').length,
        totalSponsors: db.sponsors.length
      };

      // Alumni breakdown by programme
      const byProgramme = {};
      db.profiles.forEach(profile => {
        const programme = profile.programme || 'Unknown';
        byProgramme[programme] = (byProgramme[programme] || 0) + 1;
      });

      // Alumni breakdown by industry
      const byIndustry = {};
      db.profiles.forEach(profile => {
        const industry = profile.industry || 'Unknown';
        byIndustry[industry] = (byIndustry[industry] || 0) + 1;
      });

      // Alumni breakdown by graduation year
      const byGraduationYear = {};
      db.profiles.forEach(profile => {
        const year = profile.graduationYear || 'Unknown';
        byGraduationYear[year] = (byGraduationYear[year] || 0) + 1;
      });

      // Recent winners (last 10)
      const recentWinners = db.winners
        .sort((a, b) => new Date(b.displayDate) - new Date(a.displayDate))
        .slice(0, 10)
        .map(winner => {
          const user = User.findById(winner.userId);
          return {
            id: winner.id,
            name: user?.name || 'Unknown',
            displayDate: winner.displayDate,
            bidAmount: winner.bidAmount
          };
        });

      // Top bidders
      const topBidders = db.bids
        .reduce((acc, bid) => {
          const existing = acc.find(b => b.userId === bid.userId);
          if (existing) {
            existing.totalBids += 1;
            existing.totalAmount += bid.amount;
          } else {
            const user = User.findById(bid.userId);
            acc.push({
              userId: bid.userId,
              name: user?.name || 'Unknown',
              totalBids: 1,
              totalAmount: bid.amount,
              avgBid: bid.amount
            });
          }
          return acc;
        }, [])
        .sort((a, b) => b.totalAmount - a.totalAmount)
        .slice(0, 5);

      res.json({
        success: true,
        metrics,
        breakdown: {
          byProgramme,
          byIndustry,
          byGraduationYear
        },
        recentWinners,
        topBidders
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching dashboard data',
        error: err.message 
      });
    }
  }

  /**
   * Get detailed alumni statistics
   * GET /api/dashboard/alumni-stats
   */
  static getAlumniStats(req, res) {
    try {
      const totalAlumni = db.profiles.length;
      
      // Alumni with sponsorships
      const sponsoredAlumni = new Set(db.sponsorships.map(s => s.profileId)).size;
      
      // Alumni with certifications
      const certifiedAlumni = new Set(db.certifications.map(c => c.profileId)).size;
      
      // Employment status
      const employed = db.employmentHistory.filter(e => e.current).length;
      
      // Average wallet balance
      const avgWallet = db.profiles.reduce((sum, p) => sum + (p.walletBalance || 0), 0) / totalAlumni;

      res.json({
        success: true,
        totalAlumni,
        sponsoredAlumni,
        certifiedAlumni,
        employed,
        avgWalletBalance: avgWallet.toFixed(2)
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching alumni statistics',
        error: err.message 
      });
    }
  }

  /**
   * Get bidding analytics
   * GET /api/dashboard/bidding-analytics
   */
  static getBiddingAnalytics(req, res) {
    try {
      const today = dateStr();
      const todaysBids = db.bids.filter(b => b.bidDate === today);
      const highestBid = todaysBids.length > 0 
        ? Math.max(...todaysBids.map(b => b.amount)) 
        : 0;
      const averageBid = todaysBids.length > 0
        ? (todaysBids.reduce((sum, b) => sum + b.amount, 0) / todaysBids.length).toFixed(2)
        : 0;

      // Total wallet distributed
      const totalDistributed = db.sponsorships
        .filter(s => s.status === 'accepted')
        .reduce((sum, s) => sum + s.offerAmount, 0);

      res.json({
        success: true,
        todaysBidCount: todaysBids.length,
        highestBid,
        averageBid,
        totalDistributed,
        bidsThisMonth: db.bids.filter(b => {
          const bidDate = new Date(b.bidDate);
          const now = new Date();
          return bidDate.getMonth() === now.getMonth();
        }).length
      });
    } catch (err) {
      res.status(500).json({ 
        success: false, 
        message: 'Error fetching bidding analytics',
        error: err.message 
      });
    }
  }
}

module.exports = DashboardController;