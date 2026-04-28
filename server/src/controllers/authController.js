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
  // Run validation checks (email domain, password strength, name,etc.)
  // If validation fails, response is already sent inside handlevalidation
  if (!handleValidation(req, res)) return;

  //Extract user input from request body
  const { email, password, name } = req.body;
  // duplicate email check 
  if (User.emailExists(email)) {
    return res.status(409).json({ success: false, message: 'Email already registered' });
  }

  //Determines user role based on email domain 
  //If email belongs to main university domain (not alumni), assign 'admin'
  //otherwise, assign 'alumni'
  const ADMIN_DOMAIN = 'eastminster.ac.uk';
  const role = email.endsWith(`@${ADMIN_DOMAIN}`) && !email.includes('alumni') ? 'admin' : 'alumni';

  // Create new user record in the database 
  const newUser  = await User.create({ email, password, name, role });
  // Generate a verification token valid for 24 hours
  const rawToken = await Token.createEmailToken(newUser.id, 24);
  //send verification email to user with the token 
  await sendVerificationEmail(email, rawToken);

  //Send success response back to client 
  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data:    { userId: newUser.id }, //Return newly created user ID
  });
}

// verify users email using a token sent via email 
async function verifyEmail(req, res) {
  //Run validation (eg: check token exist in query )
  //If validation fails, response is already handled 
  if (!handleValidation(req, res)) return;
  //Extract token from query parmeters 
  const { token } = req.query;

  // Step 1: find the record without userId filter (we don't know it yet)
  //At this point, we dont know which user the token belongs to 
  const record = await Token.findValidEmailToken(token, null);
  if (!record) {
    //If no matching or validate token is found , return error 
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  // Step 2: re-validate scoped to the found userId — prevents cross-user token abuse
  //This prevents cross-user tokenn abuse (extra security layer )
  const scopedRecord = await Token.findValidEmailToken(token, record.userId);
  if (!scopedRecord) {
    return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
  }

  await Token.consumeEmailToken(token, record.userId);
  User.markEmailVerified(record.userId);

  res.json({ success: true, message: 'Email verified successfully. You can now log in.' });
}

// login : authenticate user and issues JWT +session
//If validation fails, response is already handled 
async function login(req, res) {
  if (!handleValidation(req, res)) return;

  //Extract credentials from request body
  const { email, password } = req.body;
  //Generic error message (prevents leaking which field was incorrect)
  const GENERIC = 'Invalid email or password';

  //Look up user by email
  const user = User.findByEmail(email);
  //If user not found, return generic authentication error 
  if (!user) return res.status(401).json({ success: false, message: GENERIC });

  //Compare provided password with stored hashed password
  const match = await User.verifyPassword(password, user.password);
  //If password doesn't match, return generic error 
  if (!match) return res.status(401).json({ success: false, message: GENERIC });
  //Ensure user has verified their email before allowing login 
  if (!user.emailVerified) {
    return res.status(401).json({ success: false, message: 'Email not verified. Please check your inbox for the verification link.' });
  }
//Generate a unique token ID for session tracking  
  const tokenId = crypto.randomUUID();
  //Create JWT constaining user ID, role, and token ID
  const token = jwt.sign({ userId: user.id, role: user.role, tokenId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  //Store session details (user for token tracking)
  Session.create({
    userId: user.id,
    tokenId,
    expiresAt: resolveExpiryDate(JWT_EXPIRES_IN), // Convert expiry to timestamp
  });
  //Generate CSRF token for additional request Protection
  const csrfToken = generateCsrfToken(user.id);
  //Send successful login response with user data and tokens 
  res.json({ success: true,
     data: { 
     user: User.toPublic(user), //Return safe/public user data only
     token,                     // JWT for authentication
     csrfToken                  // CSRF token for secure requests 
    } 
  });
}

// logout : invalidates the current session
function logout(req, res) {
  // If not running in test mode and a valid tokenId exists in the request 
  //revoke (invalidate) the session so the token can no longer be used 
  if (process.env.NODE_ENV !== 'test' && req.auth?.tokenId) {
    Session.revokeByTokenId(req.auth.tokenId);
  }
  //Log logout event with user ID and timestamp (useful for auditing)
  console.log(`[LOGOUT] User ${req.user.id} at ${new Date().toISOString()}`);
  //Send seccess response
  res.json({ success: true, message: 'Logged out successfully.' });
}

// forgotPassword generates and sends a password reset token 
async function forgotPassword(req, res) {
  //run validation (eg: check email format)
  if (!handleValidation(req, res)) return;

  //Generic message to avoid revealing whether the email exist
  const GENERIC = 'If that email is registered, a reset link has been sent.';
  //Attempt to find user by email
  const user = User.findByEmail(req.body.email);

  // Always 200  never reveal whether email exists
  if (!user) return res.json({ success: true, message: GENERIC });

  const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRES_MINUTES || '30');
  const rawToken = await Token.createResetToken(user.id, expiryMinutes);
  await sendPasswordResetEmail(user.email, rawToken);

  res.json({ success: true, message: GENERIC });
}

//reset password verifies token and updates user's password 
async function resetPassword(req, res) {
  //Run validation (eg: check token and new password format) 
  if (!handleValidation(req, res)) return;

  //Extract reset token and new password from request body 
  const { token, password } = req.body;
  //Find a valid (not expired, not used) reset token 
  // userId is unknown at this stage so passess null
  const record = await Token.findValidResetToken(token, null);
  
  // if no valid token is found , return error 
  if (!record) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
  }

  // Mark the reset token as used (prevents reuse)
  await Token.consumeResetToken(token, record.userId);
  //Update the user's password (should be hashed inside this method)
  await User.updatePassword(record.userId, password);
  // Send success response 
  res.json({ success: true, message: 'Password reset successfully. You can now log in.' });
}
//Get current authenticated user's details 
function getMe(req, res) {
  //req.user is set by authentication middleware 
  //Return only safe/public user data 
  res.json({ 
    success: true, 
    data: User.toPublic(req.user) 
  });
}
//export all authentication related controller functions 
module.exports = { 
  register,             // Handle user registration
  verifyEmail,          // Handle email verification
  login,                //Handle user login 
  logout,               // Handle logout/session invalidation
  forgotPassword,       //Handle password reset request
  resetPassword,        // handle password reset completion 
  getMe };              // Fetch current logged in user infor 