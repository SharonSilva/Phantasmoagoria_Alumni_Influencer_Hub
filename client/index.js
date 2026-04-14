'use strict'

/**
 * Express MVC Server - Alumni Analytics Dashboard
 * Part 2: Frontend Dashboard for Alumni Influencers Platform
 */

const express = require('express');
const logger = require('morgan');
const path = require('node:path');
const session = require('express-session');
const methodOverride = require('method-override');

const app = module.exports = express();

// Custom response method for flash messages
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

// Session support (for storing user info, auth tokens)
app.use(session({
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || 'alumni-dashboard-secret'
}));

// Parse request bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Allow overriding HTTP methods (?_method=PUT)
app.use(methodOverride('_method'));

// Make messages available to views
app.use(function(req, res, next) {
  const msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !!msgs.length;
  next();
  req.session.messages = [];
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