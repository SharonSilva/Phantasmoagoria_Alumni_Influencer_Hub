const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db, id } = require('../db');

class Token {

   // Generate a cryptographically secure random token string.
  static generate() {
    return crypto.randomBytes(32).toString('hex');
  }

    // Create and store an email verification token.
  // Token is hashed before storage (like passwords)
  static async createEmailToken(userId, expiryHours = 24) {
    const raw = Token.generate();
    const hashed = await bcrypt.hash(raw, 10);
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    db.emailTokens.push({ id: id(), userId, tokenHash: hashed, expiresAt, used: false });
    return raw; // Only the raw token is returned once to the user
  }


    // Find a valid (unused, unexpired) email verification token.
  // Compares the raw token against the stored hash
  static async findValidEmailToken(raw) {
    const record = db.emailTokens.find(t => !t.used);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    
    // Verify token hash
    const match = await bcrypt.compare(raw, record.tokenHash);
    return match ? record : null;
  }

   // Mark an email token as used (single-use enforcement).
  static consumeEmailToken(raw) {
    const record = db.emailTokens.find(t => t.tokenHash && !t.used);
    if (record) record.used = true;
  }


  // Create and store a password reset token.
  // Invalidates any existing active reset tokens for this user first.
  static async createResetToken(userId, expiryMinutes = 30) {
    // Invalidate old tokens
    db.passwordResets
      .filter(r => r.userId === userId && !r.used)
      .forEach(r => { r.used = true; });

    const raw = Token.generate();
    const hashed = await bcrypt.hash(raw, 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    db.passwordResets.push({ id: id(), userId, tokenHash: hashed, expiresAt, used: false });
    return raw; // Only the raw token is returned once
  }


    // Find a valid (unused, unexpired) password reset token.
  // Compares the raw token against the stored hash
  static async findValidResetToken(raw) {
    const record = db.passwordResets.find(r => !r.used);
    if (!record) return null;
    if (new Date(record.expiresAt) < new Date()) return null;
    
    // Verify token hash
    const match = await bcrypt.compare(raw, record.tokenHash);
    return match ? record : null;
  }


    // Mark a reset token as used.
  static consumeResetToken(raw) {
    const record = db.passwordResets.find(r => r.tokenHash && !r.used);
    if (record) record.used = true;
  }
}

module.exports = Token;