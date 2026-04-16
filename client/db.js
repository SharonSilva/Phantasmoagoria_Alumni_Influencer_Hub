/**
 * Frontend Database Reference
 * 
 * It's just a reference to help with client-side data management.
 * All actual data comes from the backend API.
 */

// Mock/cache for client-side data
const clientCache = {
  currentUser: null,      // Logged-in user
  authToken: null,        // JWT token
  alumni: [],             // Cached alumni list
  charts: {},             // Cached chart data
  apiKeys: [],            // User's API keys
  lastSync: null          // When we last synced with backend
};

/**
 * Get current user from session/localStorage
 */
function getCurrentUser() {
  return clientCache.currentUser || JSON.parse(localStorage.getItem('currentUser'));
}

/**
 * Get auth token
 */
function getAuthToken() {
  return clientCache.authToken || localStorage.getItem('authToken');
}

/**
 * Set auth token
 */
function setAuthToken(token) {
  clientCache.authToken = token;
  localStorage.setItem('authToken', token);
}

/**
 * Cache alumni data
 */
function cacheAlumni(alumni) {
  clientCache.alumni = alumni;
  clientCache.lastSync = new Date().toISOString();
}

/**
 * Get cached alumni
 */
function getCachedAlumni() {
  return clientCache.alumni;
}

/**
 * Clear all cache on logout
 */
function clearCache() {
  clientCache.currentUser = null;
  clientCache.authToken = null;
  clientCache.alumni = [];
  clientCache.charts = {};
  clientCache.apiKeys = [];
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
}

module.exports = {
  clientCache,
  getCurrentUser,
  getAuthToken,
  setAuthToken,
  cacheAlumni,
  getCachedAlumni,
  clearCache
};