/**
 * Advanced Rate Limiting Middleware
 * Per-user and per-endpoint rate limiting
 */

const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // 10 attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts, try again later' }
});

// Bidding limiter
const bidLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 bids per minute
  message: { success: false, message: 'Too many bid attempts' }
});

module.exports = {
  apiLimiter,
  authLimiter,
  bidLimiter
};