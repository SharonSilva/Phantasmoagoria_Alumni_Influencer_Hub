'use strict';

// Schema designed to 3NF. Each entity is a separate collection (array).
// Foreign keys are stored as IDs (userId, profileId, etc.).
// Structured maps directly to relational tables.

// Collections:
//   users            – Auth credentials + roles
//   sessions         – Active JWT-backed server sessions
//   emailTokens      – One-time email verification tokens
//   passwordResets   – One-time password reset tokens
//   profiles         – Core alumni profile (1-to-1 with users)
//   degrees          – Alumni degree entries (N-to-1 with profiles)
//   certifications   – Professional certifications (N-to-1 with profiles)
//   licences         – Professional licences (N-to-1 with profiles)
//   courses          – Short professional courses (N-to-1 with profiles)
//   employmentHistory– Job history entries (N-to-1 with profiles)
//   sponsors         – Sponsoring organisations
//   sponsorships     – Sponsorship offers (N-to-1 sponsors + profiles)
//   bids             – Daily auction bids (N-to-1 with users)
//   winners          – Historical Alumni-of-the-Day records
//   events           – University alumni events
//   eventAttendees   – Event attendance (junction: events × users)
//   apiKeys          – Developer API keys with usage tracking
//   apiUsageLogs     – Per-request log for key statistics

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// HELPERS

function id() { return uuidv4(); }

function today() {
  return new Date().toISOString().split('T')[0];
}

function dateStr(daysOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

// COLLECTIONS

const db = {
  users:             [],
  sessions:          [],   // { id, userId, tokenId, createdAt, expiresAt, lastSeenAt, revokedAt }
  emailTokens:       [],   // { id, userId, tokenHash, expiresAt, used }
  passwordResets:    [],   // { id, userId, tokenHash, expiresAt, used }
  profiles:          [],   // core profile data
  degrees:           [],   // { id, profileId, title, institution, url, completedDate }
  certifications:    [],   // { id, profileId, name, issuer, url, completedDate }
  licences:          [],   // { id, profileId, name, awardingBody, url, completedDate }
  courses:           [],   // { id, profileId, name, provider, url, completedDate }
  employmentHistory: [],   // { id, profileId, jobTitle, employer, startDate, endDate, current }
  sponsors:          [],
  sponsorships:      [],
  bids:              [],
  winners:           [],
  events:            [],
  eventAttendees:    [],
  apiKeys:           [],   // { id, name, key, ownerId, scopes, active, createdAt, lastUsedAt }
  apiUsageLogs:      [],   // { id, apiKeyId, endpoint, method, timestamp, statusCode }
};

//IN-MEMORY INDEXES 
// Faster lookups on hot paths — O(1) vs O(n) linear scan

const indexes = {
  usersById:        new Map(),
  usersByEmail:     new Map(),
  profilesById:     new Map(),
  profilesByUserId: new Map(),
  bidsById:         new Map(),
  bidsByUserId:     new Map(),   // userId  -> bid[]
  bidsByDate:       new Map(),   // bidDate -> bid[]
  winnersByDate:    new Map(),   // displayDate -> winner
  winnersByUser:    new Map(),   // userId -> winner[]
  apiKeysById:      new Map(),
  apiKeysByKey:     new Map(),
};

function rebuildIndexes() {
  indexes.usersById.clear();
  indexes.usersByEmail.clear();
  db.users.forEach(u => {
    indexes.usersById.set(u.id, u);
    indexes.usersByEmail.set(u.email, u);
  });

  indexes.profilesById.clear();
  indexes.profilesByUserId.clear();
  db.profiles.forEach(p => {
    indexes.profilesById.set(p.id, p);
    indexes.profilesByUserId.set(p.userId, p);
  });

  indexes.bidsById.clear();
  indexes.bidsByUserId.clear();
  indexes.bidsByDate.clear();
  db.bids.forEach(b => {
    indexes.bidsById.set(b.id, b);
    if (!indexes.bidsByUserId.has(b.userId)) indexes.bidsByUserId.set(b.userId, []);
    indexes.bidsByUserId.get(b.userId).push(b);
    if (!indexes.bidsByDate.has(b.bidDate)) indexes.bidsByDate.set(b.bidDate, []);
    indexes.bidsByDate.get(b.bidDate).push(b);
  });

  indexes.winnersByDate.clear();
  indexes.winnersByUser.clear();
  db.winners.forEach(w => {
    indexes.winnersByDate.set(w.displayDate, w);
    if (!indexes.winnersByUser.has(w.userId)) indexes.winnersByUser.set(w.userId, []);
    indexes.winnersByUser.get(w.userId).push(w);
  });

  indexes.apiKeysById.clear();
  indexes.apiKeysByKey.clear();
  db.apiKeys.forEach(k => {
    indexes.apiKeysById.set(k.id, k);
    indexes.apiKeysByKey.set(k.key, k);
  });
}

// MUTATORS

function addUser(user) {
  db.users.push(user);
  indexes.usersById.set(user.id, user);
  indexes.usersByEmail.set(user.email, user);
}

function addProfile(profile) {
  db.profiles.push(profile);
  indexes.profilesById.set(profile.id, profile);
  indexes.profilesByUserId.set(profile.userId, profile);
}

function addBid(bid) {
  db.bids.push(bid);
  indexes.bidsById.set(bid.id, bid);
  if (!indexes.bidsByUserId.has(bid.userId)) indexes.bidsByUserId.set(bid.userId, []);
  indexes.bidsByUserId.get(bid.userId).push(bid);
  if (!indexes.bidsByDate.has(bid.bidDate)) indexes.bidsByDate.set(bid.bidDate, []);
  indexes.bidsByDate.get(bid.bidDate).push(bid);
}

function addWinner(winner) {
  db.winners.push(winner);
  indexes.winnersByDate.set(winner.displayDate, winner);
  if (!indexes.winnersByUser.has(winner.userId)) indexes.winnersByUser.set(winner.userId, []);
  indexes.winnersByUser.get(winner.userId).push(winner);
}

function addApiKey(apiKey) {
  db.apiKeys.push(apiKey);
  indexes.apiKeysById.set(apiKey.id, apiKey);
  indexes.apiKeysByKey.set(apiKey.key, apiKey);
}

// QUERY HELPERS 

const query = {
  getUserById(userId)             { return indexes.usersById.get(userId)           || null; },
  getUserByEmail(email)           { return indexes.usersByEmail.get(email)          || null; },
  getProfileById(profileId)       { return indexes.profilesById.get(profileId)      || null; },
  getProfileByUserId(userId)      { return indexes.profilesByUserId.get(userId)     || null; },
  getBidById(bidId)               { return indexes.bidsById.get(bidId)              || null; },
  getBidsByUserId(userId)         { return indexes.bidsByUserId.get(userId)         || [];   },
  getBidsByDate(bidDate)          { return indexes.bidsByDate.get(bidDate)          || [];   },
  getWinnerByDisplayDate(date)    { return indexes.winnersByDate.get(date)          || null; },
  getWinnersByUserId(userId)      { return indexes.winnersByUser.get(userId)        || [];   },
  getApiKeyById(idVal)            { return indexes.apiKeysById.get(idVal)           || null; },
  getApiKeyByKey(keyVal)          { return indexes.apiKeysByKey.get(keyVal)         || null; },
};

// SEED 

async function seed() {
  const password = await bcrypt.hash('Password1!', 12);
  const ym = today().slice(0, 7); // current year-month e.g. "2026-04"

  // USERS
  // u1–u7 are original seed users

  const users = [
    { id: 'u1',  email: 'priya.sharma@alumni.eastminster.ac.uk',     password, name: 'Priya Sharma',     role: 'alumni', emailVerified: true,  createdAt: '2024-01-10T10:00:00Z', updatedAt: '2024-01-10T10:00:00Z' },
    { id: 'u2',  email: 'james.okafor@alumni.eastminster.ac.uk',     password, name: 'James Okafor',     role: 'alumni', emailVerified: true,  createdAt: '2024-01-11T10:00:00Z', updatedAt: '2024-01-11T10:00:00Z' },
    { id: 'u3',  email: 'sofia.martinez@alumni.eastminster.ac.uk',   password, name: 'Sofia Martinez',   role: 'alumni', emailVerified: true,  createdAt: '2024-01-12T10:00:00Z', updatedAt: '2024-01-12T10:00:00Z' },
    { id: 'u4',  email: 'liam.chen@alumni.eastminster.ac.uk',        password, name: 'Liam Chen',        role: 'alumni', emailVerified: true,  createdAt: '2024-01-13T10:00:00Z', updatedAt: '2024-01-13T10:00:00Z' },
    { id: 'u5',  email: 'amara.nwosu@alumni.eastminster.ac.uk',      password, name: 'Amara Nwosu',      role: 'alumni', emailVerified: true,  createdAt: '2024-01-14T10:00:00Z', updatedAt: '2024-01-14T10:00:00Z' },
    { id: 'u6',  email: 'unverified@alumni.eastminster.ac.uk',       password, name: 'Unverified User',  role: 'alumni', emailVerified: false, createdAt: '2024-03-01T10:00:00Z', updatedAt: '2024-03-01T10:00:00Z' },
    { id: 'u7',  email: 'admin@eastminster.ac.uk',                   password, name: 'Admin User',       role: 'admin',  emailVerified: true,  createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-01T10:00:00Z' },
    { id: 'u8',  email: 'daniel.wright@alumni.eastminster.ac.uk',    password, name: 'Daniel Wright',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-01T10:00:00Z', updatedAt: '2024-02-01T10:00:00Z' },
    { id: 'u9',  email: 'fatima.al-hassan@alumni.eastminster.ac.uk', password, name: 'Fatima Al-Hassan', role: 'alumni', emailVerified: true,  createdAt: '2024-02-02T10:00:00Z', updatedAt: '2024-02-02T10:00:00Z' },
    { id: 'u10', email: 'marcus.johnson@alumni.eastminster.ac.uk',   password, name: 'Marcus Johnson',   role: 'alumni', emailVerified: true,  createdAt: '2024-02-03T10:00:00Z', updatedAt: '2024-02-03T10:00:00Z' },
    { id: 'u11', email: 'yuki.tanaka@alumni.eastminster.ac.uk',      password, name: 'Yuki Tanaka',      role: 'alumni', emailVerified: true,  createdAt: '2024-02-04T10:00:00Z', updatedAt: '2024-02-04T10:00:00Z' },
    { id: 'u12', email: 'chloe.bernard@alumni.eastminster.ac.uk',    password, name: 'Chloe Bernard',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-05T10:00:00Z', updatedAt: '2024-02-05T10:00:00Z' },
    { id: 'u13', email: 'ravi.patel@alumni.eastminster.ac.uk',       password, name: 'Ravi Patel',       role: 'alumni', emailVerified: true,  createdAt: '2024-02-06T10:00:00Z', updatedAt: '2024-02-06T10:00:00Z' },
    { id: 'u14', email: 'grace.okonkwo@alumni.eastminster.ac.uk',    password, name: 'Grace Okonkwo',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-07T10:00:00Z', updatedAt: '2024-02-07T10:00:00Z' },
    { id: 'u15', email: 'tom.henderson@alumni.eastminster.ac.uk',    password, name: 'Tom Henderson',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-08T10:00:00Z', updatedAt: '2024-02-08T10:00:00Z' },
    { id: 'u16', email: 'aisha.rahman@alumni.eastminster.ac.uk',     password, name: 'Aisha Rahman',     role: 'alumni', emailVerified: true,  createdAt: '2024-02-09T10:00:00Z', updatedAt: '2024-02-09T10:00:00Z' },
    { id: 'u17', email: 'oliver.schmidt@alumni.eastminster.ac.uk',   password, name: 'Oliver Schmidt',   role: 'alumni', emailVerified: true,  createdAt: '2024-02-10T10:00:00Z', updatedAt: '2024-02-10T10:00:00Z' },
    { id: 'u18', email: 'nina.kowalski@alumni.eastminster.ac.uk',    password, name: 'Nina Kowalski',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-11T10:00:00Z', updatedAt: '2024-02-11T10:00:00Z' },
    { id: 'u19', email: 'carlos.mendez@alumni.eastminster.ac.uk',    password, name: 'Carlos Mendez',    role: 'alumni', emailVerified: true,  createdAt: '2024-02-12T10:00:00Z', updatedAt: '2024-02-12T10:00:00Z' },
    { id: 'u20', email: 'sara.lindqvist@alumni.eastminster.ac.uk',   password, name: 'Sara Lindqvist',   role: 'alumni', emailVerified: true,  createdAt: '2024-02-13T10:00:00Z', updatedAt: '2024-02-13T10:00:00Z' },
  ];
  db.users.push(...users);

  // PROFILES 
  // All profiles include programme + industry for chart data.
  // Wallet balances set directly in the object — no separate override block needed.

  const profiles = [
    { id: 'p1',  userId: 'u1',  graduationYear: 2018, bio: 'Passionate about AI/ML and building scalable systems.',                      linkedInUrl: 'https://linkedin.com/in/priya-sharma-dev',     photoUrl: null, currentRole: 'Senior Software Engineer',    currentEmployer: 'Google DeepMind',       location: 'London, UK',       programme: 'BSc Computer Science',       industry: 'Technology',           walletBalance: 500, appearanceCount: 2, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-01-10T10:00:00Z' },
    { id: 'p2',  userId: 'u2',  graduationYear: 2019, bio: 'Specialising in renewable energy systems and smart grids.',                  linkedInUrl: 'https://linkedin.com/in/james-okafor-eng',     photoUrl: null, currentRole: 'Lead Electrical Engineer',    currentEmployer: 'Siemens Energy',        location: 'Manchester, UK',   programme: 'BEng Electrical Engineering', industry: 'Energy & Utilities',   walletBalance: 0,   appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-01-11T10:00:00Z' },
    { id: 'p3',  userId: 'u3',  graduationYear: 2020, bio: 'Turning financial data into actionable insights for global banks.',          linkedInUrl: 'https://linkedin.com/in/sofia-martinez-data',  photoUrl: null, currentRole: 'Data Science Manager',       currentEmployer: 'HSBC',                  location: 'London, UK',       programme: 'BSc Data Science',           industry: 'Financial Services',   walletBalance: 0,   appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-01-12T10:00:00Z' },
    { id: 'p4',  userId: 'u4',  graduationYear: 2017, bio: 'Protecting critical national infrastructure from advanced cyber threats.',   linkedInUrl: 'https://linkedin.com/in/liam-chen-security',   photoUrl: null, currentRole: 'Principal Security Architect', currentEmployer: 'GCHQ',                 location: 'Cheltenham, UK',   programme: 'MSc Cyber Security',         industry: 'Government & Defence', walletBalance: 750, appearanceCount: 3, appearanceCountMonth: ym, isActiveToday: true,  profileCompleted: true, createdAt: '2024-01-13T10:00:00Z' },
    { id: 'p5',  userId: 'u5',  graduationYear: 2021, bio: 'Serial entrepreneur building the next generation of consulting platforms.',  linkedInUrl: 'https://linkedin.com/in/amara-nwosu-ceo',      photoUrl: null, currentRole: 'Founder & CEO',              currentEmployer: 'NovaBridge Consulting', location: 'Birmingham, UK',   programme: 'BA Business Management',     industry: 'Consulting',           walletBalance: 0,   appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-01-14T10:00:00Z' },
    { id: 'p8',  userId: 'u8',  graduationYear: 2019, bio: 'Full-stack developer focused on cloud-native applications and DevOps.',      linkedInUrl: 'https://linkedin.com/in/daniel-wright-dev',    photoUrl: null, currentRole: 'Cloud Solutions Architect',   currentEmployer: 'Amazon Web Services',   location: 'Edinburgh, UK',    programme: 'BSc Computer Science',       industry: 'Technology',           walletBalance: 300, appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-01T10:00:00Z' },
    { id: 'p9',  userId: 'u9',  graduationYear: 2020, bio: 'Healthcare data analyst driving evidence-based decisions in NHS trusts.',    linkedInUrl: 'https://linkedin.com/in/fatima-al-hassan',     photoUrl: null, currentRole: 'Senior Data Analyst',        currentEmployer: 'NHS Digital',           location: 'Leeds, UK',        programme: 'BSc Data Science',           industry: 'Healthcare',           walletBalance: 150, appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-02T10:00:00Z' },
    { id: 'p10', userId: 'u10', graduationYear: 2018, bio: 'Fintech product manager bridging engineering and business strategy.',        linkedInUrl: 'https://linkedin.com/in/marcus-johnson-pm',    photoUrl: null, currentRole: 'Senior Product Manager',     currentEmployer: 'Revolut',               location: 'London, UK',       programme: 'BA Business Management',     industry: 'Financial Services',   walletBalance: 200, appearanceCount: 2, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-03T10:00:00Z' },
    { id: 'p11', userId: 'u11', graduationYear: 2022, bio: 'Machine learning engineer specialising in NLP and large language models.',   linkedInUrl: 'https://linkedin.com/in/yuki-tanaka-ml',       photoUrl: null, currentRole: 'ML Engineer',                currentEmployer: 'DeepMind',              location: 'London, UK',       programme: 'BSc Artificial Intelligence', industry: 'Technology',          walletBalance: 400, appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-04T10:00:00Z' },
    { id: 'p12', userId: 'u12', graduationYear: 2019, bio: 'UX researcher and designer creating human-centred digital products.',        linkedInUrl: 'https://linkedin.com/in/chloe-bernard-ux',     photoUrl: null, currentRole: 'Lead UX Designer',           currentEmployer: 'BBC',                   location: 'London, UK',       programme: 'BSc Computer Science',       industry: 'Media & Entertainment', walletBalance: 100, appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-05T10:00:00Z' },
    { id: 'p13', userId: 'u13', graduationYear: 2021, bio: 'DevOps engineer automating infrastructure and building resilient pipelines.', linkedInUrl: 'https://linkedin.com/in/ravi-patel-devops',    photoUrl: null, currentRole: 'DevOps Engineer',            currentEmployer: 'Thoughtworks',          location: 'London, UK',       programme: 'BEng Software Engineering',  industry: 'Technology',           walletBalance: 250, appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-06T10:00:00Z' },
    { id: 'p14', userId: 'u14', graduationYear: 2020, bio: 'Sustainability consultant helping organisations reduce carbon footprints.',  linkedInUrl: 'https://linkedin.com/in/grace-okonkwo',        photoUrl: null, currentRole: 'ESG Consultant',             currentEmployer: 'Deloitte',              location: 'London, UK',       programme: 'BA Business Management',     industry: 'Consulting',           walletBalance: 0,   appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-07T10:00:00Z' },
    { id: 'p15', userId: 'u15', graduationYear: 2016, bio: 'Cybersecurity consultant specialising in penetration testing and red teams.', linkedInUrl: 'https://linkedin.com/in/tom-henderson-sec',    photoUrl: null, currentRole: 'Penetration Testing Lead',    currentEmployer: 'PwC',                   location: 'Bristol, UK',      programme: 'MSc Cyber Security',         industry: 'Consulting',           walletBalance: 600, appearanceCount: 2, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-08T10:00:00Z' },
    { id: 'p16', userId: 'u16', graduationYear: 2023, bio: 'Data engineer building real-time analytics pipelines at retail scale.',     linkedInUrl: 'https://linkedin.com/in/aisha-rahman-data',    photoUrl: null, currentRole: 'Data Engineer',              currentEmployer: 'Ocado Technology',      location: 'Hatfield, UK',     programme: 'BSc Data Science',           industry: 'Retail & E-commerce',  walletBalance: 50,  appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-09T10:00:00Z' },
    { id: 'p17', userId: 'u17', graduationYear: 2017, bio: 'Mechanical engineer transitioning into robotics and autonomous systems.',   linkedInUrl: 'https://linkedin.com/in/oliver-schmidt-robotics', photoUrl: null, currentRole: 'Robotics Engineer',         currentEmployer: 'Boston Dynamics',       location: 'Cambridge, UK',    programme: 'BEng Mechanical Engineering', industry: 'Manufacturing',       walletBalance: 350, appearanceCount: 1, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-10T10:00:00Z' },
    { id: 'p18', userId: 'u18', graduationYear: 2021, bio: 'Healthcare software developer building clinical decision support systems.',  linkedInUrl: 'https://linkedin.com/in/nina-kowalski-health', photoUrl: null, currentRole: 'Software Developer',         currentEmployer: 'Babylon Health',        location: 'London, UK',       programme: 'BSc Computer Science',       industry: 'Healthcare',           walletBalance: 180, appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-11T10:00:00Z' },
    { id: 'p19', userId: 'u19', graduationYear: 2018, bio: 'Financial analyst turned quant developer building algorithmic trading systems.', linkedInUrl: 'https://linkedin.com/in/carlos-mendez-quant', photoUrl: null, currentRole: 'Quantitative Developer',    currentEmployer: 'Goldman Sachs',         location: 'London, UK',       programme: 'BSc Data Science',           industry: 'Financial Services',   walletBalance: 800, appearanceCount: 3, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-12T10:00:00Z' },
    { id: 'p20', userId: 'u20', graduationYear: 2022, bio: 'EdTech entrepreneur building adaptive learning platforms for STEM students.', linkedInUrl: 'https://linkedin.com/in/sara-lindqvist-edtech', photoUrl: null, currentRole: 'CTO & Co-Founder',          currentEmployer: 'LearnBridge Ltd',       location: 'Oxford, UK',       programme: 'BSc Artificial Intelligence', industry: 'Education',           walletBalance: 120, appearanceCount: 0, appearanceCountMonth: ym, isActiveToday: false, profileCompleted: true, createdAt: '2024-02-13T10:00:00Z' },
  ];
  db.profiles.push(...profiles);

  // DEGREES 
  // Every profile has at least one degree 

  db.degrees.push(
    // original
    { id: id(), profileId: 'p1',  title: 'BSc Computer Science',         institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-cs',    completedDate: '2018-06-15' },
    { id: id(), profileId: 'p2',  title: 'BEng Electrical Engineering',  institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/beng-ee',   completedDate: '2019-06-14' },
    { id: id(), profileId: 'p3',  title: 'BSc Data Science',             institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ds',    completedDate: '2020-06-12' },
    { id: id(), profileId: 'p4',  title: 'MSc Cyber Security',           institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/msc-cyber', completedDate: '2017-09-10' },
    { id: id(), profileId: 'p5',  title: 'BA Business Management',       institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/ba-bm',     completedDate: '2021-06-18' },
    // new p8–p20
    { id: id(), profileId: 'p8',  title: 'BSc Computer Science',         institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-cs',    completedDate: '2019-06-15' },
    { id: id(), profileId: 'p9',  title: 'BSc Data Science',             institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ds',    completedDate: '2020-06-12' },
    { id: id(), profileId: 'p10', title: 'BA Business Management',       institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/ba-bm',     completedDate: '2018-06-20' },
    { id: id(), profileId: 'p11', title: 'BSc Artificial Intelligence',  institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ai',    completedDate: '2022-06-10' },
    { id: id(), profileId: 'p12', title: 'BSc Computer Science',         institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-cs',    completedDate: '2019-06-15' },
    { id: id(), profileId: 'p13', title: 'BEng Software Engineering',    institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/beng-se',   completedDate: '2021-06-18' },
    { id: id(), profileId: 'p14', title: 'BA Business Management',       institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/ba-bm',     completedDate: '2020-06-12' },
    { id: id(), profileId: 'p15', title: 'MSc Cyber Security',           institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/msc-cyber', completedDate: '2016-09-10' },
    { id: id(), profileId: 'p16', title: 'BSc Data Science',             institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ds',    completedDate: '2023-06-14' },
    { id: id(), profileId: 'p17', title: 'BEng Mechanical Engineering',  institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/beng-me',   completedDate: '2017-06-15' },
    { id: id(), profileId: 'p18', title: 'BSc Computer Science',         institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-cs',    completedDate: '2021-06-18' },
    { id: id(), profileId: 'p19', title: 'BSc Data Science',             institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ds',    completedDate: '2018-06-15' },
    { id: id(), profileId: 'p20', title: 'BSc Artificial Intelligence',  institution: 'University of Eastminster', url: 'https://eastminster.ac.uk/courses/bsc-ai',    completedDate: '2022-06-10' },
  );

  // CERTIFICATIONS 
  // Rich dataset covering cloud, security, data analytics, agile, and ML.
  // Drives: skills gap chart, certifications radar, curriculum intelligence.

  db.certifications.push(
    //  Cloud certifications 
    { id: id(), profileId: 'p1',  name: 'AWS Solutions Architect',           issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate', completedDate: '2022-03-10' },
    { id: id(), profileId: 'p1',  name: 'Kubernetes Administrator (CKA)',    issuer: 'CNCF',                url: 'https://www.cncf.io/certification/cka',                                        completedDate: '2023-09-05' },
    { id: id(), profileId: 'p8',  name: 'AWS Solutions Architect',           issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification',                                         completedDate: '2022-06-15' },
    { id: id(), profileId: 'p8',  name: 'Kubernetes Administrator (CKA)',    issuer: 'CNCF',                url: 'https://www.cncf.io/certification/cka',                                        completedDate: '2023-01-20' },
    { id: id(), profileId: 'p8',  name: 'Docker Certified Associate',        issuer: 'Docker',              url: 'https://training.mirantis.com/certification/dca',                              completedDate: '2023-04-10' },
    { id: id(), profileId: 'p11', name: 'Google Cloud Professional ML',      issuer: 'Google Cloud',        url: 'https://cloud.google.com/certification/machine-learning-engineer',              completedDate: '2023-08-15' },
    { id: id(), profileId: 'p11', name: 'AWS Machine Learning Specialty',    issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification/certified-machine-learning-specialty',     completedDate: '2023-11-10' },
    { id: id(), profileId: 'p13', name: 'Kubernetes Administrator (CKA)',    issuer: 'CNCF',                url: 'https://www.cncf.io/certification/cka',                                        completedDate: '2022-09-05' },
    { id: id(), profileId: 'p13', name: 'Azure DevOps Engineer',             issuer: 'Microsoft',           url: 'https://learn.microsoft.com/certifications/devops-engineer',                   completedDate: '2023-03-22' },
    { id: id(), profileId: 'p13', name: 'Docker Certified Associate',        issuer: 'Docker',              url: 'https://training.mirantis.com/certification/dca',                              completedDate: '2023-07-18' },
    { id: id(), profileId: 'p17', name: 'Azure Solutions Architect',         issuer: 'Microsoft',           url: 'https://learn.microsoft.com/certifications/azure-solutions-architect',          completedDate: '2022-12-01' },
    { id: id(), profileId: 'p18', name: 'AWS Solutions Architect',           issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification',                                         completedDate: '2023-06-20' },
    { id: id(), profileId: 'p19', name: 'AWS Solutions Architect',           issuer: 'Amazon Web Services', url: 'https://aws.amazon.com/certification',                                         completedDate: '2023-05-14' },
    // AI / ML certifications 
    { id: id(), profileId: 'p1',  name: 'TensorFlow Developer Certificate',  issuer: 'Google',              url: 'https://www.tensorflow.org/certificate',                                       completedDate: '2023-05-20' },
    { id: id(), profileId: 'p20', name: 'TensorFlow Developer Certificate',  issuer: 'Google',              url: 'https://www.tensorflow.org/certificate',                                       completedDate: '2023-07-22' },
    { id: id(), profileId: 'p18', name: 'Azure Developer Associate',         issuer: 'Microsoft',           url: 'https://learn.microsoft.com/certifications/azure-developer',                   completedDate: '2022-11-10' },
    //  Security certifications 
    { id: id(), profileId: 'p4',  name: 'CISSP',                             issuer: 'ISC²',                url: 'https://www.isc2.org/Certifications/CISSP',                                    completedDate: '2020-08-01' },
    { id: id(), profileId: 'p4',  name: 'OSCP',                              issuer: 'Offensive Security',  url: 'https://www.offsec.com/courses/pen-200',                                       completedDate: '2022-11-05' },
    { id: id(), profileId: 'p15', name: 'CISSP',                             issuer: 'ISC²',                url: 'https://www.isc2.org/Certifications/CISSP',                                    completedDate: '2019-06-01' },
    { id: id(), profileId: 'p15', name: 'OSCP',                             issuer: 'Offensive Security',   url: 'https://www.offsec.com/courses/pen-200',                                       completedDate: '2021-03-15' },
    { id: id(), profileId: 'p15', name: 'CEH',                               issuer: 'EC-Council',          url: 'https://www.eccouncil.org/programs/certified-ethical-hacker-ceh',               completedDate: '2018-09-20' },
    //  Data analytics certifications 
    { id: id(), profileId: 'p3',  name: 'Google Data Analytics',             issuer: 'Google',              url: 'https://grow.google/certificates/data-analytics',                              completedDate: '2023-01-15' },
    { id: id(), profileId: 'p3',  name: 'Tableau Desktop Specialist',        issuer: 'Tableau',             url: 'https://www.tableau.com/learn/certification',                                  completedDate: '2023-06-10' },
    { id: id(), profileId: 'p9',  name: 'Google Data Analytics',             issuer: 'Google',              url: 'https://grow.google/certificates/data-analytics',                              completedDate: '2022-11-20' },
    { id: id(), profileId: 'p9',  name: 'Power BI Data Analyst',             issuer: 'Microsoft',           url: 'https://learn.microsoft.com/certifications/power-bi-data-analyst-associate',    completedDate: '2023-04-05' },
    { id: id(), profileId: 'p10', name: 'Google Data Analytics',             issuer: 'Google',              url: 'https://grow.google/certificates/data-analytics',                              completedDate: '2022-07-12' },
    { id: id(), profileId: 'p16', name: 'Google Data Analytics',             issuer: 'Google',              url: 'https://grow.google/certificates/data-analytics',                              completedDate: '2023-09-10' },
    { id: id(), profileId: 'p16', name: 'Apache Spark Developer',            issuer: 'Databricks',          url: 'https://www.databricks.com/learn/certification',                               completedDate: '2024-01-15' },
    { id: id(), profileId: 'p19', name: 'Tableau Desktop Specialist',        issuer: 'Tableau',             url: 'https://www.tableau.com/learn/certification',                                  completedDate: '2022-08-20' },
    // ── Agile / Scrum certifications (Scenario 4: agile surge) ──
    { id: id(), profileId: 'p5',  name: 'Agile Scrum Master (CSM)',          issuer: 'Scrum Alliance',      url: 'https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster', completedDate: '2022-04-20' },
    { id: id(), profileId: 'p10', name: 'Agile Scrum Master (CSM)',          issuer: 'Scrum Alliance',      url: 'https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster', completedDate: '2021-11-15' },
    { id: id(), profileId: 'p12', name: 'Agile Scrum Master (CSM)',          issuer: 'Scrum Alliance',      url: 'https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster', completedDate: '2022-09-08' },
    { id: id(), profileId: 'p14', name: 'Agile Scrum Master (CSM)',          issuer: 'Scrum Alliance',      url: 'https://www.scrumalliance.org/get-certified/scrum-master-track/certified-scrummaster', completedDate: '2022-02-10' },
    { id: id(), profileId: 'p20', name: 'SAFe Agile Practitioner',           issuer: 'Scaled Agile',        url: 'https://scaledagile.com/training/safe-agilist',                                completedDate: '2023-03-15' },
    // ── Project management certifications ──
    { id: id(), profileId: 'p5',  name: 'PMP Certification',                 issuer: 'PMI',                 url: 'https://www.pmi.org/certifications/project-management-pmp',                    completedDate: '2022-08-01' },
    { id: id(), profileId: 'p14', name: 'PMP Certification',                 issuer: 'PMI',                 url: 'https://www.pmi.org/certifications/project-management-pmp',                    completedDate: '2023-01-20' },
  );

  // LICENCES 

  db.licences.push(
    { id: id(), profileId: 'p2',  name: 'Chartered Engineer (CEng)',                    awardingBody: 'Engineering Council UK',                    url: 'https://www.engc.org.uk/ceng',                       completedDate: '2021-06-01' },
    { id: id(), profileId: 'p2',  name: 'MIET',                                         awardingBody: 'Institution of Engineering and Technology', url: 'https://www.theiet.org',                             completedDate: '2020-01-15' },
    { id: id(), profileId: 'p17', name: 'Chartered Engineer (CEng)',                    awardingBody: 'Engineering Council UK',                    url: 'https://www.engc.org.uk/ceng',                       completedDate: '2022-03-01' },
    { id: id(), profileId: 'p4',  name: 'Certified Information Security Manager (CISM)', awardingBody: 'ISACA',                                   url: 'https://www.isaca.org/credentialing/cism',            completedDate: '2021-09-10' },
    { id: id(), profileId: 'p15', name: 'Certified Information Security Manager (CISM)', awardingBody: 'ISACA',                                   url: 'https://www.isaca.org/credentialing/cism',            completedDate: '2020-05-15' },
    { id: id(), profileId: 'p19', name: 'Chartered Financial Analyst (CFA)',            awardingBody: 'CFA Institute',                             url: 'https://www.cfainstitute.org/credentials/cfa',        completedDate: '2021-11-01' },
  );

  // SHORT COURSES 
  // Shows post-graduation independent upskilling 

  db.courses.push(
    { id: id(), profileId: 'p3',  name: 'Applied Machine Learning',       provider: 'Coursera',        url: 'https://coursera.org/learn/applied-ml',                         completedDate: '2022-09-01' },
    { id: id(), profileId: 'p5',  name: 'Lean Six Sigma Green Belt',      provider: 'ASQ',             url: 'https://asq.org/cert/six-sigma-green-belt',                     completedDate: '2022-04-20' },
    { id: id(), profileId: 'p8',  name: 'Terraform Infrastructure as Code', provider: 'HashiCorp',     url: 'https://developer.hashicorp.com/terraform/tutorials',            completedDate: '2023-06-01' },
    { id: id(), profileId: 'p9',  name: 'Applied Machine Learning',       provider: 'Coursera',        url: 'https://coursera.org/learn/applied-ml',                         completedDate: '2022-03-10' },
    { id: id(), profileId: 'p10', name: 'Python for Data Science',         provider: 'Coursera',        url: 'https://coursera.org/learn/python-for-applied-data-science',   completedDate: '2021-08-15' },
    { id: id(), profileId: 'p10', name: 'SQL for Data Analytics',          provider: 'Udemy',           url: 'https://udemy.com/course/sql-analytics',                        completedDate: '2021-10-20' },
    { id: id(), profileId: 'p11', name: 'Deep Learning Specialisation',    provider: 'DeepLearning.AI', url: 'https://deeplearning.ai/programs/deep-learning-specialization', completedDate: '2023-02-14' },
    { id: id(), profileId: 'p12', name: 'Design Systems Fundamentals',     provider: 'Nielsen Norman',  url: 'https://nngroup.com/courses/design-systems',                    completedDate: '2022-01-15' },
    { id: id(), profileId: 'p14', name: 'ESG Investing and Reporting',     provider: 'CFA Institute',   url: 'https://cfainstitute.org/courses/esg',                          completedDate: '2022-06-10' },
    { id: id(), profileId: 'p16', name: 'dbt Analytics Engineering',       provider: 'dbt Labs',        url: 'https://courses.getdbt.com',                                    completedDate: '2023-11-05' },
    { id: id(), profileId: 'p18', name: 'React & Node.js Full Stack',      provider: 'Udemy',           url: 'https://udemy.com/course/react-nodejs',                         completedDate: '2022-08-22' },
    { id: id(), profileId: 'p20', name: 'Generative AI for Developers',    provider: 'DeepLearning.AI', url: 'https://deeplearning.ai/courses/generative-ai',                 completedDate: '2024-01-20' },
  );

  // EMPLOYMENT HISTORY

  db.employmentHistory.push(
    // original
    { id: id(), profileId: 'p1',  jobTitle: 'Software Engineer',              employer: 'Accenture',             startDate: '2018-09-01', endDate: '2021-12-31', current: false },
    { id: id(), profileId: 'p1',  jobTitle: 'Senior Software Engineer',       employer: 'Google DeepMind',       startDate: '2022-01-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p4',  jobTitle: 'Security Analyst',               employer: 'Deloitte',              startDate: '2017-10-01', endDate: '2020-07-31', current: false },
    { id: id(), profileId: 'p4',  jobTitle: 'Principal Security Architect',   employer: 'GCHQ',                  startDate: '2020-08-01', endDate: null,         current: true  },
    // new
    { id: id(), profileId: 'p2',  jobTitle: 'Graduate Electrical Engineer',   employer: 'National Grid',         startDate: '2019-09-01', endDate: '2021-05-31', current: false },
    { id: id(), profileId: 'p2',  jobTitle: 'Lead Electrical Engineer',       employer: 'Siemens Energy',        startDate: '2021-06-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p3',  jobTitle: 'Data Analyst',                   employer: 'Barclays',              startDate: '2020-09-01', endDate: '2022-06-30', current: false },
    { id: id(), profileId: 'p3',  jobTitle: 'Data Science Manager',           employer: 'HSBC',                  startDate: '2022-07-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p5',  jobTitle: 'Strategy Consultant',            employer: 'BCG',                   startDate: '2021-09-01', endDate: '2022-12-31', current: false },
    { id: id(), profileId: 'p5',  jobTitle: 'Founder & CEO',                  employer: 'NovaBridge Consulting', startDate: '2023-01-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p8',  jobTitle: 'Backend Developer',              employer: 'Sky',                   startDate: '2019-09-01', endDate: '2021-06-30', current: false },
    { id: id(), profileId: 'p8',  jobTitle: 'Cloud Solutions Architect',      employer: 'Amazon Web Services',   startDate: '2021-07-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p9',  jobTitle: 'Junior Data Analyst',            employer: 'Public Health England', startDate: '2020-09-01', endDate: '2022-03-31', current: false },
    { id: id(), profileId: 'p9',  jobTitle: 'Senior Data Analyst',            employer: 'NHS Digital',           startDate: '2022-04-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p10', jobTitle: 'Business Analyst',               employer: 'Barclays',              startDate: '2018-09-01', endDate: '2020-11-30', current: false },
    { id: id(), profileId: 'p10', jobTitle: 'Senior Product Manager',         employer: 'Revolut',               startDate: '2021-01-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p11', jobTitle: 'Junior ML Engineer',             employer: 'Onfido',                startDate: '2022-09-01', endDate: '2023-06-30', current: false },
    { id: id(), profileId: 'p11', jobTitle: 'ML Engineer',                    employer: 'DeepMind',              startDate: '2023-07-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p12', jobTitle: 'UX Designer',                    employer: 'IDEO',                  startDate: '2019-09-01', endDate: '2022-01-31', current: false },
    { id: id(), profileId: 'p12', jobTitle: 'Lead UX Designer',               employer: 'BBC',                   startDate: '2022-02-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p13', jobTitle: 'Software Developer',             employer: 'IBM',                   startDate: '2021-09-01', endDate: '2022-08-31', current: false },
    { id: id(), profileId: 'p13', jobTitle: 'DevOps Engineer',                employer: 'Thoughtworks',          startDate: '2022-09-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p14', jobTitle: 'Graduate Consultant',            employer: 'McKinsey',              startDate: '2020-09-01', endDate: '2022-06-30', current: false },
    { id: id(), profileId: 'p14', jobTitle: 'ESG Consultant',                 employer: 'Deloitte',              startDate: '2022-07-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p15', jobTitle: 'Security Consultant',            employer: 'KPMG',                  startDate: '2016-10-01', endDate: '2019-09-30', current: false },
    { id: id(), profileId: 'p15', jobTitle: 'Penetration Testing Lead',       employer: 'PwC',                   startDate: '2019-10-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p16', jobTitle: 'Junior Data Engineer',           employer: 'Sainsburys Tech',       startDate: '2023-09-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p17', jobTitle: 'Mechanical Engineer',            employer: 'Rolls-Royce',           startDate: '2017-09-01', endDate: '2020-12-31', current: false },
    { id: id(), profileId: 'p17', jobTitle: 'Robotics Engineer',              employer: 'Boston Dynamics',       startDate: '2021-01-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p18', jobTitle: 'Software Developer',             employer: 'Babylon Health',        startDate: '2021-09-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p19', jobTitle: 'Analyst',                        employer: 'JPMorgan',              startDate: '2018-09-01', endDate: '2021-03-31', current: false },
    { id: id(), profileId: 'p19', jobTitle: 'Quantitative Developer',         employer: 'Goldman Sachs',         startDate: '2021-04-01', endDate: null,         current: true  },
    { id: id(), profileId: 'p20', jobTitle: 'CTO & Co-Founder',               employer: 'LearnBridge Ltd',       startDate: '2022-09-01', endDate: null,         current: true  },
  );

  // SPONSORS 


  db.sponsors.push(
    { id: 's1', name: 'Amazon Web Services', category: 'Cloud Certification',    description: 'AWS cloud platform certifications' },
    { id: 's2', name: 'Google',              category: 'Cloud Certification',    description: 'Google Cloud and TensorFlow certifications' },
    { id: 's3', name: 'ISC²',               category: 'Security Certification', description: 'CISSP and information security credentials' },
    { id: 's4', name: 'Offensive Security',  category: 'Security Certification', description: 'OSCP penetration testing certification' },
    { id: 's5', name: 'Microsoft',           category: 'Cloud Certification',    description: 'Azure and Microsoft platform certifications' },
    { id: 's6', name: 'Scrum Alliance',      category: 'Agile Certification',    description: 'Certified Scrum Master and agile credentials' },
    { id: 's7', name: 'CNCF',               category: 'Cloud Certification',    description: 'Kubernetes and cloud-native certifications' },
    { id: 's8', name: 'PMI',                category: 'Project Management',     description: 'PMP and project management certifications' },
  );

  // SPONSORSHIPS 
  db.sponsorships.push(
    { id: 'sp1', sponsorId: 's1', profileId: 'p1',  certificationName: 'AWS Solutions Architect',           offerAmount: 200, status: 'accepted', createdAt: dateStr(-5), paidOutAt: dateStr(-4) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-3) },
    { id: 'sp2', sponsorId: 's2', profileId: 'p1',  certificationName: 'TensorFlow Developer Certificate',  offerAmount: 300, status: 'accepted', createdAt: dateStr(-4), paidOutAt: dateStr(-4) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-3) },
    { id: 'sp3', sponsorId: 's3', profileId: 'p4',  certificationName: 'CISSP',                             offerAmount: 400, status: 'accepted', createdAt: dateStr(-3), paidOutAt: dateStr(-2) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-1) },
    { id: 'sp4', sponsorId: 's4', profileId: 'p4',  certificationName: 'OSCP',                              offerAmount: 350, status: 'accepted', createdAt: dateStr(-3), paidOutAt: dateStr(-2) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-1) },
    { id: 'sp5', sponsorId: 's1', profileId: 'p8',  certificationName: 'AWS Solutions Architect',           offerAmount: 250, status: 'accepted', createdAt: dateStr(-6), paidOutAt: dateStr(-5) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-4) },
    { id: 'sp6', sponsorId: 's7', profileId: 'p8',  certificationName: 'Kubernetes Administrator (CKA)',    offerAmount: 180, status: 'accepted', createdAt: dateStr(-5), paidOutAt: dateStr(-4) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-3) },
    { id: 'sp7', sponsorId: 's5', profileId: 'p13', certificationName: 'Azure DevOps Engineer',             offerAmount: 220, status: 'accepted', createdAt: dateStr(-4), paidOutAt: dateStr(-3) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-2) },
    { id: 'sp8', sponsorId: 's6', profileId: 'p5',  certificationName: 'Agile Scrum Master (CSM)',          offerAmount: 150, status: 'accepted', createdAt: dateStr(-7), paidOutAt: dateStr(-6) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-5) },
    { id: 'sp9', sponsorId: 's8', profileId: 'p14', certificationName: 'PMP Certification',                 offerAmount: 275, status: 'accepted', createdAt: dateStr(-8), paidOutAt: dateStr(-7) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-6) },
    { id: 'sp10',sponsorId: 's2', profileId: 'p11', certificationName: 'Google Cloud Professional ML',      offerAmount: 320, status: 'accepted', createdAt: dateStr(-6), paidOutAt: dateStr(-5) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-4) },
    { id: 'sp11',sponsorId: 's3', profileId: 'p15', certificationName: 'CISSP',                             offerAmount: 400, status: 'accepted', createdAt: dateStr(-9), paidOutAt: dateStr(-8) + 'T00:00:00Z', paidOutForDisplayDate: dateStr(-7) },
    { id: 'sp12',sponsorId: 's1', profileId: 'p19', certificationName: 'AWS Solutions Architect',           offerAmount: 200, status: 'pending',  createdAt: dateStr(-1) },
    { id: 'sp13',sponsorId: 's5', profileId: 'p17', certificationName: 'Azure Solutions Architect',         offerAmount: 260, status: 'pending',  createdAt: dateStr(-2) },
  );

  // BIDS
 

  db.bids.push(
    // today's active bids
    { id: 'b1',  userId: 'u1',  bidDate: today(),      amount: 250, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b2',  userId: 'u4',  bidDate: today(),      amount: 380, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b3',  userId: 'u8',  bidDate: today(),      amount: 300, status: 'active', submittedAt: new Date().toISOString() },
    { id: 'b4',  userId: 'u19', bidDate: today(),      amount: 420, status: 'active', submittedAt: new Date().toISOString() },
    // yesterday
    { id: 'b5',  userId: 'u4',  bidDate: dateStr(-1),  amount: 310, status: 'won',    submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b6',  userId: 'u1',  bidDate: dateStr(-1),  amount: 220, status: 'lost',   submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b7',  userId: 'u3',  bidDate: dateStr(-1),  amount: 150, status: 'lost',   submittedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'b8',  userId: 'u11', bidDate: dateStr(-1),  amount: 290, status: 'lost',   submittedAt: new Date(Date.now() - 86400000).toISOString() },
    // 2 days ago
    { id: 'b9',  userId: 'u15', bidDate: dateStr(-2),  amount: 340, status: 'won',    submittedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'b10', userId: 'u8',  bidDate: dateStr(-2),  amount: 280, status: 'lost',   submittedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'b11', userId: 'u10', bidDate: dateStr(-2),  amount: 190, status: 'lost',   submittedAt: new Date(Date.now() - 172800000).toISOString() },
    // 3 days ago
    { id: 'b12', userId: 'u1',  bidDate: dateStr(-3),  amount: 280, status: 'won',    submittedAt: new Date(Date.now() - 259200000).toISOString() },
    { id: 'b13', userId: 'u19', bidDate: dateStr(-3),  amount: 260, status: 'lost',   submittedAt: new Date(Date.now() - 259200000).toISOString() },
    // 4 days ago
    { id: 'b14', userId: 'u4',  bidDate: dateStr(-4),  amount: 290, status: 'won',    submittedAt: new Date(Date.now() - 345600000).toISOString() },
    { id: 'b15', userId: 'u13', bidDate: dateStr(-4),  amount: 210, status: 'lost',   submittedAt: new Date(Date.now() - 345600000).toISOString() },
    { id: 'b16', userId: 'u20', bidDate: dateStr(-4),  amount: 180, status: 'lost',   submittedAt: new Date(Date.now() - 345600000).toISOString() },
    // 5 days ago
    { id: 'b17', userId: 'u3',  bidDate: dateStr(-5),  amount: 195, status: 'won',    submittedAt: new Date(Date.now() - 432000000).toISOString() },
    { id: 'b18', userId: 'u8',  bidDate: dateStr(-5),  amount: 175, status: 'lost',   submittedAt: new Date(Date.now() - 432000000).toISOString() },
    // 6 days ago
    { id: 'b19', userId: 'u15', bidDate: dateStr(-6),  amount: 320, status: 'won',    submittedAt: new Date(Date.now() - 518400000).toISOString() },
    { id: 'b20', userId: 'u1',  bidDate: dateStr(-6),  amount: 240, status: 'lost',   submittedAt: new Date(Date.now() - 518400000).toISOString() },
    { id: 'b21', userId: 'u9',  bidDate: dateStr(-6),  amount: 200, status: 'lost',   submittedAt: new Date(Date.now() - 518400000).toISOString() },
  );

  // WINNERS

  db.winners.push(
    { id: 'w1', userId: 'u1',  displayDate: dateStr(-3), bidAmount: 280, createdAt: dateStr(-4) },
    { id: 'w2', userId: 'u3',  displayDate: dateStr(-2), bidAmount: 195, createdAt: dateStr(-3) },
    { id: 'w3', userId: 'u4',  displayDate: dateStr(-1), bidAmount: 310, createdAt: dateStr(-2) },
    { id: 'w4', userId: 'u4',  displayDate: dateStr(-4), bidAmount: 290, createdAt: dateStr(-5) },
    { id: 'w5', userId: 'u15', displayDate: dateStr(-5), bidAmount: 340, createdAt: dateStr(-6) },
    { id: 'w6', userId: 'u15', displayDate: dateStr(-6), bidAmount: 320, createdAt: dateStr(-7) },
  );

  // Add today's winner from highest active bid
  const topBid = db.bids
    .filter(b => b.bidDate === today() && b.status === 'active')
    .sort((a, b) => b.amount - a.amount)[0];

  if (topBid) {
    addWinner({
      id: 'w7',
      userId: topBid.userId,
      displayDate: today(),
      bidAmount: topBid.amount,
      createdAt: new Date().toISOString(),
    });
  }

  // EVENTS 

  db.events.push(
    { id: 'e1', title: 'Eastminster Careers Fair 2025',    date: dateStr(-10), location: 'Main Campus, London',  description: 'Annual networking fair.',             unlocksExtraBid: true  },
    { id: 'e2', title: 'Tech Alumni Networking Evening',   date: dateStr(-5),  location: 'London Tech Hub',       description: 'CS and Engineering alumni mixer.',    unlocksExtraBid: true  },
    { id: 'e3', title: 'Business Leadership Forum',        date: dateStr(5),   location: 'Online',                description: 'Entrepreneurship and leadership panel.', unlocksExtraBid: true },
    { id: 'e4', title: 'Data Science & AI Summit',         date: dateStr(14),  location: 'London Campus',         description: 'ML and data science alumni showcase.', unlocksExtraBid: true },
  );

  db.eventAttendees.push(
    { id: id(), eventId: 'e1', userId: 'u1',  registeredAt: dateStr(-15) },
    { id: id(), eventId: 'e1', userId: 'u8',  registeredAt: dateStr(-12) },
    { id: id(), eventId: 'e2', userId: 'u4',  registeredAt: dateStr(-7)  },
    { id: id(), eventId: 'e2', userId: 'u11', registeredAt: dateStr(-6)  },
    { id: id(), eventId: 'e2', userId: 'u13', registeredAt: dateStr(-5)  },
  );

  //API KEYS

  db.apiKeys.push(
    // AR client — read:featured only (cannot access analytics endpoints)
    { id: 'k1', name: 'AR Client (Production)',  key: 'east_arkey_prod_abc123xyz',    ownerId: 'u7', scopes: ['read:featured', 'read:alumni_of_day'],                                              active: true,  createdAt: dateStr(-30), lastUsedAt: dateStr(-1)  },
    // Mobile app — read:featured + alumni + sponsors + events (no analytics)
    { id: 'k2', name: 'Mobile App v2',           key: 'east_mobile_v2_def456uvw',     ownerId: 'u7', scopes: ['read:featured', 'read:alumni', 'read:alumni_of_day', 'read:sponsors', 'read:events', 'read:donations'], active: true, createdAt: dateStr(-15), lastUsedAt: today()      },
    // Revoked key — demonstrates token revocation functionality
    { id: 'k3', name: 'Revoked Test Key',         key: 'east_revoked_ghi789rst',       ownerId: 'u7', scopes: ['read:featured'],                                              active: false, createdAt: dateStr(-60), lastUsedAt: dateStr(-20) },
    // Analytics dashboard — read:alumni + read:analytics (no AR endpoints)
    { id: 'k4', name: 'Analytics Dashboard',      key: 'east_analytics_dashboard_k4', ownerId: 'u7', scopes: ['read:alumni', 'read:analytics'],                              active: true,  createdAt: dateStr(-1),  lastUsedAt: null         },
  );

  // API USAGE LOGS 

  db.apiUsageLogs.push(
    { id: id(), apiKeyId: 'k1', endpoint: '/api/public/featured', method: 'GET', timestamp: new Date(Date.now() - 3600000).toISOString(),  statusCode: 200 },
    { id: id(), apiKeyId: 'k1', endpoint: '/api/public/featured', method: 'GET', timestamp: new Date(Date.now() - 7200000).toISOString(),  statusCode: 200 },
    { id: id(), apiKeyId: 'k1', endpoint: '/api/public/featured', method: 'GET', timestamp: new Date(Date.now() - 10800000).toISOString(), statusCode: 200 },
    { id: id(), apiKeyId: 'k2', endpoint: '/api/public/alumni',   method: 'GET', timestamp: new Date().toISOString(),                      statusCode: 200 },
    { id: id(), apiKeyId: 'k2', endpoint: '/api/public/sponsors', method: 'GET', timestamp: new Date(Date.now() - 1800000).toISOString(),  statusCode: 200 },
    { id: id(), apiKeyId: 'k4', endpoint: '/api/alumni',          method: 'GET', timestamp: new Date(Date.now() - 900000).toISOString(),   statusCode: 200 },
    { id: id(), apiKeyId: 'k4', endpoint: '/api/charts/skills-gap', method: 'GET', timestamp: new Date(Date.now() - 600000).toISOString(), statusCode: 200 },
  );

  rebuildIndexes();
  console.log('  Database seeded — 16 alumni, 37 certifications, 34 employment records');
}

module.exports = {
  db,
  seed,
  id,
  today,
  dateStr,
  indexes,
  rebuildIndexes,
  addUser,
  addProfile,
  addBid,
  addWinner,
  addApiKey,
  query,
};