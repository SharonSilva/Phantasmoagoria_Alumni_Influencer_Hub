const bcrypt = require('bcryptjs');
const { db, id } = require('../db');
const SALT_ROUNDS = 12;               //module constant - 12 means 2^12 ehich means 4096 iterations

class User {
  static findById(userId) {
    return db.users.find(u => u.id === userId) || null;
  }
  static findByEmail(email) {
    return db.users.find(u => u.email === email) || null;
  }
  //Registration
  static async create({ email, password, name, role = 'alumni' }) {
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);  //raw password newver stored, it's hashed immediately 
    const now = new Date().toISOString();
    const newUser = { id: id(),
                     email,
                     password: hashed,
                     name,
                     role,
                     emailVerified: false,
                     createdAt: now,
                     updatedAt: now };
    db.users.push(newUser);
    if (role === 'alumni') {
      db.profiles.push({ id: id(),
                         userId: newUser.id,
                         graduationYear: null,
                         bio: '', 
                         linkedInUrl: '',
                         photoUrl: null,
                         currentRole: '',
                         currentEmployer: '',
                         location: '',
                         walletBalance: 0,
                         appearanceCount: 0,
                         appearanceCountMonth: now.slice(0, 7),
                         isActiveToday: false,
                         profileCompleted: false,
                         createdAt: now });
    }
    return newUser;
  }
  static emailExists(email) { return db.users.some(u => u.email === email); }
  static async verifyPassword(plain, hashed) { return bcrypt.compare(plain, hashed); }
  static markEmailVerified(userId) {
    const user = User.findById(userId);
    if (user) { user.emailVerified = true; user.updatedAt = new Date().toISOString(); }
  }
  static async updatePassword(userId, newPassword) {
    const user = User.findById(userId);
    if (user) { user.password = await bcrypt.hash(newPassword, SALT_ROUNDS); user.updatedAt = new Date().toISOString(); }
  }
  //in every response, password is structurally removed 
  static toPublic(user) { const { password, ...safe } = user; return safe; } //destructing removes password field and returned object has no password propoerty
}
module.exports = User;