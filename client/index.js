'use strict';

/**
 * Express MVC Server — Alumni Analytics Dashboard (Client)
 * Part 2: Frontend Dashboard for Alumni Influencers Platform
 */

const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express       = require('express');
const logger        = require('morgan');
const session       = require('express-session');
const methodOverride = require('method-override');

const app = module.exports = express();

// Custom flash message helper
app.response.message = function(msg) {
  const sess = this.req.session;
  sess.messages = sess.messages || [];
  sess.messages.push(msg);
  return this;
};

// Logging
if (!module.parent) app.use(logger('dev'));

// Serve static files (CSS, JS, images)
app.use(express.static(path.join(__dirname, 'public')));

// Session support
// BUG FIX: secret must come from env — never fall back to a hardcoded string in production
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET environment variable must be set in production');
    }
    console.warn('[WARN] SESSION_SECRET not set — using insecure default (dev only)');
    return 'alumni-dashboard-dev-only-secret';
  })(),
  cookie: {
    httpOnly: true,                                      // prevent JS access to cookie
    secure: process.env.NODE_ENV === 'production',       // HTTPS only in production
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,                        // 24 hours
  },
}));

// Parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Allow overriding HTTP methods via ?_method=PUT
app.use(methodOverride('_method'));

// Make flash messages available to all views
app.use(function(req, res, next) {
  const msgs = req.session.messages || [];
  res.locals.messages    = msgs;
  res.locals.hasMessages = !!msgs.length;
  req.session.messages   = [];
  next();
});

// Auth guard middleware — protects all non-auth routes
// Exempts: GET /auth/check, POST /auth/login, static assets
app.use(function(req, res, next) {
  const publicPaths = [
    '/auth/login',
    '/auth/check',
    '/auth/logout', // logout handles its own session check
  ];
  const isPublic = publicPaths.some(p => req.path === p || req.path.startsWith('/public/'));

  // Allow static assets through (they don't have session anyway)
  if (req.path.match(/\.(js|css|png|jpg|ico|woff2?)$/)) return next();

  if (isPublic) return next();

  if (!req.session || !req.session.authToken) {
    return res.status(401).json({ success: false, error: 'Not authenticated', redirectTo: '/auth/login' });
  }

  next();
});

// Auto-load controllers from /controllers directory
require('./lib/boot')(app, { verbose: !module.parent });

// Global error handler
app.use(function(err, req, res, next) {
  if (!module.parent) console.error(err.stack);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use(function(req, res) {
  res.status(404).json({ error: 'Not found', url: req.originalUrl });
});

// Start server
if (!module.parent) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`\n  Alumni Analytics Dashboard →  http://localhost:${PORT}`);
    console.log(`  Backend API →  http://localhost:3000`);
    console.log('  Ready to serve!\n');
  });
}