const { db, today, dateStr, addBid, addWinner, query } = require('../db');

class Bid {
  static getPendingSponsorPool(userId) {
    const profile = db.profiles.find(p => p.userId === userId);
    if (!profile) return 0;
    return db.sponsorships
      .filter(s => s.profileId === profile.id && s.status === 'accepted' && !s.paidOutAt)
      .reduce((sum, s) => sum + (Number(s.offerAmount) || 0), 0);
  }

  static getAvailableBidBalance(userId) {
    const profile = db.profiles.find(p => p.userId === userId);
    if (!profile) return 0;
    return (Number(profile.walletBalance) || 0) + Bid.getPendingSponsorPool(userId);
  }
  /**
   * Place a new bid for today's "Alumni of the Day" auction
   * @param {string} userId - User placing the bid
   * @param {number} amount - Bid amount in GBP (blind from other users)
   * @returns {object} New bid object
   */
  static place(userId, amount) {
    const { id } = require('../db');
    const newBid = {
      id: id(),
      userId,
      bidDate: today(),
      amount,
      status: 'active',
      submittedAt: new Date().toISOString(),
    };
    addBid(newBid);
    return newBid;
  }

  /**
   * Increase an existing bid to a higher amount
   * Prevents bidding down; only increases allowed
   * @param {string} bidId - Bid ID to increase
   * @param {number} newAmount - New amount (must be > current)
   * @returns {object} Updated bid
   */
  static increase(bidId, newAmount) {
    const bid = query.getBidById(bidId);
    if (bid) bid.amount = newAmount;
    return bid;
  }

  /**
   * Cancel a bid during bidding window
   * Called before winner selection (bidding closes at BID_CLOSE_HOUR_UTC)
   * @param {string} bidId - Bid to cancel
   */
  static cancel(bidId) {
    const bid = query.getBidById(bidId);
    if (bid) bid.status = 'cancelled';
  }

  /**
   * Find user's bid for today (if any)
   * Used to check if user already has a bid placed today
   * @param {string} userId - User ID
   * @returns {object|null} User's today bid or null
   */
  static findTodayBidByUser(userId) {
    return query.getBidsByUserId(userId).find(b => b.bidDate === today() && b.status === 'active') || null;
  }

  /**
   * Find bid by ID
   * @param {string} bidId - Bid ID
   * @returns {object|null} Bid or null
   */
  static findById(bidId) {
    return query.getBidById(bidId);
  }

  /**
   * Check if bidding window is open
   * Window closes at BID_CLOSE_HOUR_UTC (default 18:00 UTC)
   * Reopens at 00:00 UTC next day
   * @returns {boolean} true if can bid now
   */
  static isBiddingOpen() {
    const now = new Date();
    const hourUTC = now.getUTCHours();
    const closeHour = parseInt(process.env.BID_CLOSE_HOUR_UTC || '18');
    return hourUTC < closeHour; // Can bid if before close hour
  }

  /**
   * Check if a user is currently winning (has highest bid)
   * Does NOT account for blind aspect (client-side displays "winning" status)
   * @param {string} userId - User ID
   * @returns {boolean} true if user has highest active bid
   */
  static isCurrentlyWinning(userId) {
    const userBid = query.getBidsByUserId(userId).find(b => b.bidDate === today() && b.status === 'active');
    if (!userBid) return false;

    // Find highest active bid for today
    const highest = query.getBidsByDate(today())
      .filter(b => b.status === 'active')
      .sort((a, b) => b.amount - a.amount)[0];

    return highest && highest.userId === userId;
  }

  /**
   * Count how many times user has won in current calendar month
   * Counts winners in current month, respects monthly limit
   * @param {string} userId - User ID
   * @returns {number} Win count this month
   */
  static monthlyWinCount(userId) {
    const ym = new Date().toISOString().slice(0, 7); // "2026-04"
    return query.getWinnersByUserId(userId).filter(w => w.displayDate.startsWith(ym)).length;
  }

  /**
   * Check if user has attended an event this month (unlocks bonus slot)
   * @param {string} userId - User ID
   * @returns {boolean} true if attended event with unlocksExtraBid flag
   */
  static hasEventBonusThisMonth(userId) {
    const ym = new Date().toISOString().slice(0, 7);
    
    return db.eventAttendees.some(ea => {
      if (ea.userId !== userId) return false;
      
      // Check if event is this month and unlocks bid
      const evt = db.events.find(
        e => e.id === ea.eventId && e.unlocksExtraBid && e.date.startsWith(ym)
      );
      return !!evt;
    });
  }

  /**
   * Get max appearance slots for user this month
   * Base: 3 slots. +1 if attended event this month
   * @param {string} userId - User ID
   * @returns {number} 3 or 4
   */
  static maxMonthlyAppearances(userId) {
    const base = 3;
    const bonus = Bid.hasEventBonusThisMonth(userId) ? 1 : 0;
    return base + bonus; // 3 or 4
  }

  /**
   * Get user's complete bid history (all bids ever)
   * @param {string} userId - User ID
   * @returns {array} All bids by user, sorted by date desc
   */
  static getUserBidHistory(userId) {
    return query.getBidsByUserId(userId)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  /**
   * AUTOMATED AUCTION RESOLUTION
   * Called daily at configured UTC hour (default 00:00)
   * 
   * Algorithm:
   * 1. Get all active bids from today (bidDate = today)
   * 2. Filter out users who hit monthly limit
   * 3. Sort by: amount DESC, then submittedAt ASC (tiebreak)
   * 4. Select top bidder as winner
   * 5. Mark winner bid as 'won', losers as 'lost'
   * 6. Create winner record for tomorrow's display
   * 
   * @returns {object} { winner, loserIds, resolved }
   */
  static resolveAuction() {
    const bidDay = today();
    
    // Get all active bids from today's window
    let activeBids = db.bids.filter(b => 
      b.bidDate === bidDay && b.status === 'active'
    );

    if (activeBids.length === 0) {
      return { winner: null, loserIds: [], resolved: 0 };
    }

    // Sort by amount (highest first), then by submission time (earliest first for tiebreak)
    activeBids.sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.submittedAt.localeCompare(b.submittedAt);
    });

    // Find first winner who hasn't exceeded monthly limit
    let winner = null;
    for (const bid of activeBids) {
      const wins = this.monthlyWinCount(bid.userId);
      const max = this.maxMonthlyAppearances(bid.userId);
      
      if (wins < max) {
        winner = bid;
        break;
      }
    }

    if (!winner) {
      // No one qualified: all have hit monthly limit
      activeBids.forEach(b => { b.status = 'lost'; });
      return { winner: null, loserIds: [], resolved: activeBids.length };
    }

    // Mark bids: winner = won, rest = lost
    const loserIds = [];
    activeBids.forEach(bid => {
      if (bid.id === winner.id) {
        bid.status = 'won';
      } else {
        bid.status = 'lost';
        loserIds.push(bid.userId);
      }
    });

    // Create winner record for tomorrow's display
    const tomorrow = dateStr(1);
    const { id } = require('../db');
    const winnerProfile = db.profiles.find(p => p.userId === winner.userId);

    // Sponsor payout happens only if alumnus wins and is displayed.
    let sponsorPayout = 0;
    if (winnerProfile) {
      db.sponsorships
        .filter(s => s.profileId === winnerProfile.id && s.status === 'accepted' && !s.paidOutAt)
        .forEach(s => {
          sponsorPayout += (Number(s.offerAmount) || 0);
          s.paidOutAt = new Date().toISOString();
          s.paidOutForDisplayDate = tomorrow;
        });
      winnerProfile.walletBalance = (Number(winnerProfile.walletBalance) || 0) + sponsorPayout - winner.amount;
      winnerProfile.appearanceCount = (Number(winnerProfile.appearanceCount) || 0) + 1;
      winnerProfile.appearanceCountMonth = tomorrow.slice(0, 7);
      winnerProfile.nextFeatureDate = tomorrow;
    }

    addWinner({
      id: id(),
      userId: winner.userId,
      displayDate: tomorrow,
      bidAmount: winner.amount,
      sponsorPayout,
      createdAt: new Date().toISOString(),
    });

    return {
      winner: {
        userId: winner.userId,
        displayDate: tomorrow,
        bidAmount: winner.amount,
        sponsorPayout,
      },
      loserIds,
      resolved: activeBids.length,
    };
  }
}

module.exports = Bid;