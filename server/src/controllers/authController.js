const jwt  = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User  = require('../models/User');
const Token = require('../models/Token');
const Session = require('../models/Session');
const { JWT_SECRET, generateCsrfToken } = require('../middleware/Auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Helper 
function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

function resolveExpiryDate(expiresIn) {
  if (typeof expiresIn === 'number') {
    return new Date(Date.now() + (expiresIn * 1000)).toISOString();
  }
  const match = String(expiresIn).trim().match(/^(\d+)([smhd])$/i);
  if (!match) return new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString();
  const amount = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return new Date(Date.now() + (amount * unitMs[unit])).toISOString();
}

// register 
async function register(req, res) {
  //validate first (domain, password strength , name )
  if (!handleValidation(req, res)) return;

  const { email, password, name } = req.body;
  // duplicate email check 
  if (User.emailExists(email)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  //only reaches if both checks pass
  const ADMIN_DOMAIN = 'eastminster.ac.uk';
  const role = email.endsWith(`@${ADMIN_DOMAIN}`) && !email.includes('alumni') ? 'admin' : 'alumni';

  const newUser  = await User.create({ email, password, name, role });
  const rawToken = await Token.createEmailToken(newUser.id, 24);
  await sendVerificationEmail(email, rawToken);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data:    { userId: newUser.id },
  });
}

// verifyEmail 
async function verifyEmail(req, res) {
  if (!handleValidation(req, res)) return;

  const { token } = req.query;

  // Step 1: find the record without userId filter (we don't know it yet)
  const record = await Token.findValidEmailToken(token, null);
  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  // Step 2: re-validate scoped to the found userId — prevents cross-user token abuse
  const scopedRecord = await Token.findValidEmailToken(token, record.userId);
  if (!scopedRecord) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  await Token.consumeEmailToken(token, record.userId);
  User.markEmailVerified(record.userId);

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
}

// login 
async function login(req, res) {
  if (!handleValidation(req, res)) return;

  const { email, password } = req.body;
  const GENERIC = 'Invalid email or password';

  const user = User.findByEmail(email);
  if (!user) return res.status(401).json({ success: false, message: GENERIC });

  const match = await User.verifyPassword(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: GENERIC });

  if (!user.emailVerified) {
    return res.status(401).json({ success: false, message: 'Email not verified. Please check your inbox for the verification link.' });
  }

  const tokenId = crypto.randomUUID();
  const token = jwt.sign({ userId: user.id, role: user.role, tokenId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  Session.create({
    userId: user.id,
    tokenId,
    expiresAt: resolveExpiryDate(JWT_EXPIRES_IN),
  });
  const csrfToken = generateCsrfToken(user.id);
  res.json({ success: true, data: { user: User.toPublic(user), token, csrfToken } });
}

// logout 
function logout(req, res) {
  if (process.env.NODE_ENV !== 'test' && req.auth?.tokenId) {
    Session.revokeByTokenId(req.auth.tokenId);
  }
  console.log(`[LOGOUT] User ${req.user.id} at ${new Date().toISOString()}`);
  res.json({ success: true, message: 'Logged out successfully.' });
}

// forgotPassword 
async function forgotPassword(req, res) {
  if (!handleValidation(req, res)) return;

  const GENERIC = 'If that email is registered, a reset link has been sent.';
  const user = User.findByEmail(req.body.email);

  // Always 200  never reveal whether email exists
  if (!user) return res.json({ success: true, message: GENERIC });

  const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '30');
  const rawToken = await Token.createResetToken(user.id, expiryMinutes);
  await sendPasswordResetEmail(user.email, rawToken);

  res.json({ success: true, message: GENERIC });
}

//reset password
async function resetPassword(req, res) {
  if (!handleValidation(req, res)) return;

  const { token, password } = req.body;
  const record = await Token.findValidResetToken(token, null);

  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  await Token.consumeResetToken(token, record.userId);
  await User.updatePassword(record.userId, password);

  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
}

function getMe(req, res) {
  res.json({ success: true, data: User.toPublic(req.user) });
}

module.exports = { register, verifyEmail, login, logout, forgotPassword, resetPassword, getMe };