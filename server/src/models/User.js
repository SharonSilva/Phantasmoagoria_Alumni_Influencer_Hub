const bcrypt = require('bcryptjs');
const { db, id, addUser, addProfile, query } = require('../db');
const SALT_ROUNDS = 12;               //module constant - 12 means 2^12 ehich means 4096 iterations

class User {
  static findById(userId) {
    return query.getUserById(userId);
  }
  static findByEmail(email) {
    return query.getUserByEmail(email);
  }
  //Registration
  static async create({ email, password, name, role = 'alumni' }) {
    //Hash the raw password before storing it 
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);  //raw password newver stored, it's hashed immediately 
    //capture current timestamp (used for audit field)
    const now = new Date().toISOString();
    //Build the user object with default fields
    const newUser = { id: id(),   //Generate unique user ID 
                     email,       // User email 
                     password: hashed,  //Store hashed passwords 
                     name,              //User name 
                     role,              // Role (default: alumni, or admin if assigned earlier)
                     emailVerified: false,    // email must be verified User
                     createdAt: now,        // Record creation time
                     updatedAt: now };      //Record last update time 
    addUser(newUser);         //Add user to in memory database
    if (role === 'alumni') {      //If the user is an alumni, create a linked profile record
      addProfile({ id: id(),                      //unique profile ID
                   userId: newUser.id,          //link profile to user
                   graduationYear: null,        // default: not set
                   bio: '',                     //Empty bio at start 
                   linkedInUrl: '',             // Optional Linkedin profile
                   photoUrl: null,          //Profile photo empty initially
                   currentRole: '',         //current job role
                   currentEmployer: '',     //current employer 
                   location: '',            //User location
                   walletBalance: 0,        //Initial wallet balance 
                   appearanceCount: 0,      //Tracking feature usage 
                   appearanceCountMonth: now.slice(0, 7),       //Store current year-month
                   isActiveToday: false,                    // Activity tracking flag
                   profileCompleted: false,                 // Profile completion status 
                   createdAt: now });                       //Profile creation time 
    }
    return newUser;
  }
  static emailExists(email) { return db.users.some(u => u.email === email); }
  static async verifyPassword(plain, hashed) { return bcrypt.compare(plain, hashed); }
  static markEmailVerified(userId) {
    const user = User.findById(userId);
    if (user) { user.emailVerified = true; user.updatedAt = new Date().toISOString(); }
  }

  //update a user's password securely 
  static async updatePassword(userId, newPassword) {
    //Find the user by their ID
    const user = User.findById(userId);
    //if the user exist proceed with the update 
    if (user) 
      {
        //hash new password before storing 
        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS); 
        //update timestamp to reflect the password change
        user.updatedAt = new Date().toISOString(); }
  }
  //in every response, password is structurally removed 
  static toPublic(user) { const { password, ...safe } = user; return safe; } //destructing removes password field and returned object has no password propoerty
}
module.exports = User;

