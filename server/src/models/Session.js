const { db, id } = require('../db');

class Session {
  static idleTimeoutMs() {
    const raw = process.env.SESSION_IDLE_TIMEOUT_MINUTES;
    if (!raw) return null; // disabled unless explicitly configured
    const mins = parseInt(raw, 10);
    if (Number.isNaN(mins) || mins <= 0) return null;
    return mins * 60 * 1000;
  }

  static create({ userId, tokenId, expiresAt }) {
    const now = new Date().toISOString();
    const session = {
      id: id(),
      userId,
      tokenId,
      createdAt: now,
      expiresAt,
      lastSeenAt: now,
      revokedAt: null,
    };
    db.sessions.push(session);
    return session;
  }

  static findActiveByTokenId(tokenId) {
    const session = db.sessions.find(s => s.tokenId === tokenId && !s.revokedAt);
    if (!session) return null;
    const now = new Date();
    if (new Date(session.expiresAt) <= now) return null;

    // Optional inactivity timeout to complement JWT absolute expiry.
    const idleMs = Session.idleTimeoutMs();
    if (idleMs !== null) {
      const lastSeen = new Date(session.lastSeenAt || session.createdAt);
      if ((now.getTime() - lastSeen.getTime()) > idleMs) return null;
    }

    return session;
  }

  static touch(tokenId) {
    const session = db.sessions.find(s => s.tokenId === tokenId && !s.revokedAt);
    if (session) session.lastSeenAt = new Date().toISOString();
  }

  static revokeByTokenId(tokenId) {
    const session = db.sessions.find(s => s.tokenId === tokenId && !s.revokedAt);
    if (!session) return null;
    session.revokedAt = new Date().toISOString();
    return session;
  }
}

module.exports = Session;
