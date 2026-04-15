'use strict';

// Fixed BACKEND_URL to include /api as per your server.js line: app.use('/api', apiLimiter);
const BACKEND_URL = 'http://localhost:3000/api';

/**
 * Requirement 4: Bearer Tokens Header Helper
 * Uses 'token' to match your second app.js state
 */
const getAuthHeader = () => {
    const token = localStorage.getItem('alumni_token');
    return {
        headers: {
            'Authorization': `Bearer ${token}`,
            // This key exists in your db.js and has 'read:alumni' scope
            'X-API-Key': 'east_mobile_v2_def456uvw', 
            'Content-Type': 'application/json'
        }
    };
};

document.addEventListener('DOMContentLoaded', () => {
    const contentArea = document.getElementById('content');
    const navLinks = document.querySelectorAll('.nav-link');

    // --- AUTHENTICATION HANDLERS ---
    const handleLogin = async (event) => {
        event.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        try {
            // Correct Path: http://localhost:3000/api/auth/login
            const response = await axios.post(`${BACKEND_URL}/auth/login`, { email, password });

            // Your server uses a responseHandler, data is usually in response.data.data
            const result = response.data.data || response.data;

            localStorage.setItem('alumni_token', result.token);
            localStorage.setItem('user_name', result.user?.name || 'Staff');

            alert(`Welcome back, ${result.user?.name || 'Staff'}!`);
            window.location.hash = '#dashboard';
            location.reload(); 
        } catch (err) {
            console.error("Login Error:", err.response);
            alert('Login failed: ' + (err.response?.data?.message || 'Unauthorized'));
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        window.location.hash = '#login';
        location.reload();
    };

    // --- FEATURE 2: ALUMNI DIRECTORY ---
    const loadAlumni = async () => {
        contentArea.innerHTML = '<h2>Alumni Directory</h2><p>Loading...</p>';
        try {
            // Server route: app.use('/api/alumni', alumniRouter);
            const response = await axios.get(`${BACKEND_URL}/alumni`, getAuthHeader());
            const alumni = response.data.data || response.data;

            contentArea.innerHTML = `
                <h2>Alumni Directory</h2>
                <input type="text" id="alumniSearch" placeholder="Search by name or industry..." style="width: 100%; padding: 10px; margin-bottom: 15px;">
                <div class="data-table-container">
                    <table class="data-table">
                        <thead><tr><th>Name</th><th>Role</th><th>Employer</th><th>Location</th></tr></thead>
                        <tbody id="alumniTableBody">
                            ${alumni.map(a => `
                                <tr class="alumni-row">
                                    <td class="name-cell">${a.name}</td>
                                    <td>${a.profile?.currentRole || 'N/A'}</td>
                                    <td>${a.profile?.currentEmployer || 'N/A'}</td>
                                    <td class="industry-cell">${a.profile?.location || 'N/A'}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
            
            // Search Logic
            document.getElementById('alumniSearch').addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.alumni-row').forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(term) ? '' : 'none';
                });
            });
        } catch (err) {
            contentArea.innerHTML = `<div class="error">Failed to load alumni data.</div>`;
        }
    };

    // --- REQUIREMENT 2: ANALYTICS ---
    const loadCharts = async () => {
        contentArea.innerHTML = '<h2>Industry Analytics</h2><canvas id="skillsChart" style="max-height:400px;"></canvas>';
        try {
            // Server route: app.use('/api/charts', chartsRouter);
            const res = await axios.get(`${BACKEND_URL}/charts/skillsGap`, getAuthHeader());
            const data = res.data.data || res.data;
            const ctx = document.getElementById('skillsChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.labels || [],
                    datasets: [{ label: 'Demand %', data: data.values || [], backgroundColor: '#3498db' }]
                }
            });
        } catch (err) { contentArea.innerHTML = 'Chart failed to load.'; }
    };

    // --- FEATURE 4: DASHBOARD ---
    const loadDashboard = async () => {
        contentArea.innerHTML = '<h2>Dashboard</h2><p>Loading stats...</p>';
        try {
            // Server route: app.use('/api/dashboard', dashboardRouter);
            const response = await axios.get(`${BACKEND_URL}/dashboard`, getAuthHeader());
            const s = response.data.data || response.data;
            contentArea.innerHTML = `<h2>Overview</h2>
                <div class="stats-grid">
                    <div class="card"><h3>Total Alumni</h3><div class="value">${s.totalAlumni || 0}</div></div>
                    <div class="card"><h3>Active Bids</h3><div class="value">${s.activeBids || 0}</div></div>
                </div>`;
        } catch (err) { contentArea.innerHTML = 'Error loading dashboard.'; }
    };

    // --- SECURITY LOGS ---
    const loadUsageLogs = async () => {
        contentArea.innerHTML = '<h2>System Usage Logs</h2><p>Loading...</p>';
        try {
            // Server route: app.use('/api/usage', usageRouter);
            const res = await axios.get(`${BACKEND_URL}/usage`, getAuthHeader());
            const logs = res.data.data || res.data;
            contentArea.innerHTML = `
                <h2>Security Audit Trail</h2>
                <table class="data-table">
                    <thead><tr><th>Time</th><th>Action</th><th>Method</th></tr></thead>
                    <tbody>${logs.map(l => `<tr><td>${new Date(l.timestamp).toLocaleString()}</td><td>${l.endpoint}</td><td>${l.method}</td></tr>`).join('')}</tbody>
                </table>`;
        } catch (err) { contentArea.innerHTML = 'Error loading logs.'; }
    };

    // --- LOGIN PAGE RENDERER ---
    const showLoginPage = () => {
        contentArea.innerHTML = `
            <div class="login-container">
                <h2>Staff Login</h2>
                <form id="loginForm">
                    <input type="email" id="loginEmail" placeholder="Email" required>
                    <input type="password" id="loginPassword" placeholder="Password" required>
                    <button type="submit" class="btn-primary">Login</button>
                </form>
            </div>`;
        document.getElementById('loginForm').addEventListener('submit', handleLogin);
    };

    // --- ROUTER ---
    const navigate = (hash) => {
        const route = hash || '#dashboard';
        const token = localStorage.getItem('alumni_token');

        if (!token && route !== '#login') {
            window.location.hash = '#login';
            return;
        }

        // UI active state for nav links
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === route);
        });

        if (route === '#login') showLoginPage();
        else if (route === '#dashboard') loadDashboard();
        else if (route === '#alumni') loadAlumni();
        else if (route === '#charts') loadCharts();
        else if (route === '#api-keys') loadUsageLogs();
        else if (route === '#logout') handleLogout();
    };

    window.addEventListener('hashchange', () => navigate(window.location.hash));
    navigate(window.location.hash);
});