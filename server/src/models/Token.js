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
    //Generate a secure random token (plain/raw version)
    const raw = Token.generate();
    //Hash the token before saving to the database 
    //This ensures the actual token is never stored in plain text
    const hashed = await bcrypt.hash(raw, 10);
    //Calculate token expiration time (24 hrs from now)
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
    //store token record in database 
    db.emailTokens.push({ id: id(), userId, tokenHash: hashed, expiresAt, used: false });
    return raw; // Only raw token returned once — never stored in plain text
  }

  // Find a valid (unused, unexpired) email verification token for a specific user.
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
  static async consumeEmailToken(raw, userId) {
    //Filter the tokens that are :
    //not already used
    //and (if userId is provided) belong to the specifi user
    const records = db.emailTokens.filter(t => !t.used && (!userId || t.userId === userId));
    //Loop through possible matching token records 
    for (const record of records) {
      //Complre the provided raw token with the stored hashed token
      const match = await bcrypt.compare(raw, record.tokenHash);
      //If a match is found, mark the token as used 
      if (match) {
        record.used = true; // Prevent token reuse 
        return; //Exit after consuming the first valid match 
      }
    }
    //If no match is found, function exists silently (no token consumed)
  }

  // Create and store a password reset token.
  // Invalidates any existing active reset tokens for this user first.
  static async createResetToken(userId, expiryMinutes = 30) {
    // Find all actuve reset tokens for this user
    // and mark them as used to prevent multiple valid tokens 
    db.passwordResets
      .filter(r => r.userId === userId && !r.used)
      .forEach(r => { r.used = true; });

    //Generate a new secure random token 
    const raw = Token.generate();
    //Hash the raw token before storing 
    const hashed = await bcrypt.hash(raw, 10);
    //Set expiration time (20 minutes ffrom current time)
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    //store the reset token in the database 
    db.passwordResets.push({
       id: id(),              //Unique token record ID
       userId,                // Associate token with user 
       tokenHash: hashed,     // Store hashed token 
       expiresAt,             // Expiry timestamp 
       used: false });      //Mark as unused initially 
       //return raw token (used to send in reset mail )
    return raw;
  }

  // Find a valid (unused, unexpired) password reset token for a specific user.
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
  // Find by userId + matching hash, not just any unused record.
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