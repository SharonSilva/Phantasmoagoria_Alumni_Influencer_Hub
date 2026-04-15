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
    return raw; // Only raw token returned once — never stored in plain text
  }

  // Find a valid (unused, unexpired) email verification token for a specific user.
  // BUG FIX: Must filter by userId first, otherwise any user's valid token matches any request.
  static async findValidEmailToken(raw, userId) {
    const records = db.emailTokens.filter(t => !t.used && (!userId || t.userId === userId));
    for (const record of records) {
      if (new Date(record.expiresAt) < new Date()) continue; // skip expired
      const match = await bcrypt.compare(raw, record.tokenHash);
      if (match) return record;
    }
    return null;
  }

  // Mark the matching email token as used (single-use enforcement).
  // BUG FIX: Must find the correct record by userId + matching hash, not just any unused record.
  static async consumeEmailToken(raw, userId) {
    const records = db.emailTokens.filter(t => !t.used && (!userId || t.userId === userId));
    for (const record of records) {
      const match = await bcrypt.compare(raw, record.tokenHash);
      if (match) {
        record.used = true;
        return;
      }
    }
  }

  // Create and store a password reset token.
  // Invalidates any existing active reset tokens for this user first.
  static async createResetToken(userId, expiryMinutes = 30) {
    // Invalidate old tokens for this user
    db.passwordResets
      .filter(r => r.userId === userId && !r.used)
      .forEach(r => { r.used = true; });

    const raw = Token.generate();
    const hashed = await bcrypt.hash(raw, 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    db.passwordResets.push({ id: id(), userId, tokenHash: hashed, expiresAt, used: false });
    return raw;
  }

  // Find a valid (unused, unexpired) password reset token for a specific user.
  // BUG FIX: Same fix as findValidEmailToken — filter by userId before comparing hash.
  static async findValidResetToken(raw, userId) {
    const records = db.passwordResets.filter(r => !r.used && (!userId || r.userId === userId));
    for (const record of records) {
      if (new Date(record.expiresAt) < new Date()) continue;
      const match = await bcrypt.compare(raw, record.tokenHash);
      if (match) return record;
    }
    return null;
  }

  // Mark a reset token as used.
  // BUG FIX: Find by userId + matching hash, not just any unused record.
  static async consumeResetToken(raw, userId) {
    const records = db.passwordResets.filter(r => !r.used && (!userId || r.userId === userId));
    for (const record of records) {
      const match = await bcrypt.compare(raw, record.tokenHash);
      if (match) {
        record.used = true;
        return;
      }
    }
  }
}

module.exports = Token;