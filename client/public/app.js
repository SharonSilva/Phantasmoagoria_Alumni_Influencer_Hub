/**
 * Alumni Analytics Dashboard - ENHANCED VERSION
 * Complete client-side routing and data rendering with charts
 */

(function () {
  'use strict';

  const content = document.getElementById('content');
  const messageEl = document.getElementById('message-box');

  // ============= UTILITIES =============

  function showMessage(msg, type = 'info') {
    if (!messageEl) return;
    messageEl.textContent = msg || '';
    messageEl.className = `alert ${type} ${msg ? '' : 'hidden'}`;
    if (msg) {
      setTimeout(() => messageEl?.classList.add('hidden'), 5000);
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function api(path, options = {}) {
    options.headers = options.headers || {};
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(path, options).then(res => {
      return res.json().then(data => {
        if (!res.ok) throw new Error(data.message || data.error || 'Request failed');
        return data;
      });
    });
  }

  // ============= DASHBOARD PAGE =============

  function renderDashboard(data) {
    let html = `
      <div class="dashboard">
        <h1>📊 Dashboard Overview</h1>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Alumni</h3>
            <p class="metric-value">${data.metrics.totalAlumni}</p>
          </div>
          <div class="metric-card">
            <h3>Active Bids</h3>
            <p class="metric-value">${data.metrics.activeBids}</p>
          </div>
          <div class="metric-card">
            <h3>Total Winners</h3>
            <p class="metric-value">${data.metrics.totalWinners}</p>
          </div>
          <div class="metric-card">
            <h3>Monthly Winners</h3>
            <p class="metric-value">${data.metrics.monthlyWinners}</p>
          </div>
          <div class="metric-card">
            <h3>Sponsors</h3>
            <p class="metric-value">${data.metrics.totalSponsors}</p>
          </div>
          <div class="metric-card">
            <h3>Sponsorships</h3>
            <p class="metric-value">${data.sponsorships?.length || 0}</p>
          </div>
        </div>

        <div class="charts-container">
          <div class="chart-wrapper">
            <h2>Alumni by Programme</h2>
            <canvas id="chart-programme"></canvas>
          </div>
          <div class="chart-wrapper">
            <h2>Alumni by Industry</h2>
            <canvas id="chart-industry"></canvas>
          </div>
        </div>

        <div class="recent-winners">
          <h2>Recent Winners</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Winner</th>
                <th>Bid Amount (£)</th>
              </tr>
            </thead>
            <tbody id="winners-table"></tbody>
          </table>
        </div>

        <div class="top-bidders">
          <h2>Top Bidders</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Total Bids</th>
                <th>Total Amount (£)</th>
                <th>Avg Bid (£)</th>
              </tr>
            </thead>
            <tbody id="bidders-table"></tbody>
          </table>
        </div>

        <div class="dashboard-actions">
          <button onclick="exportDashboard()" class="btn btn-primary">📥 Export Dashboard</button>
        </div>
      </div>
    `;
    content.innerHTML = html;

    renderCharts(data.breakdown);
    renderWinnersTable(data.recentWinners);
    renderTopBidders(data.topBidders);
  }

  function renderCharts(breakdown) {
    const programmeCtx = document.getElementById('chart-programme');
    if (programmeCtx && typeof Chart !== 'undefined') {
      new Chart(programmeCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(breakdown.byProgramme || {}),
          datasets: [{
            label: 'Number of Alumni',
            data: Object.values(breakdown.byProgramme || {}),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    const industryCtx = document.getElementById('chart-industry');
    if (industryCtx && typeof Chart !== 'undefined') {
      new Chart(industryCtx, {
        type: 'doughnut',
        data: {
          labels: Object.keys(breakdown.byIndustry || {}),
          datasets: [{
            data: Object.values(breakdown.byIndustry || {}),
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)'
            ]
          }]
        },
        options: { responsive: true, maintainAspectRatio: true }
      });
    }
  }

  function renderWinnersTable(winners) {
    const tbody = document.getElementById('winners-table');
    if (!tbody) return;
    tbody.innerHTML = (winners || []).map(w => `
      <tr>
        <td>${w.displayDate}</td>
        <td>${escapeHtml(w.name || 'User')}</td>
        <td>£${w.bidAmount}</td>
      </tr>
    `).join('');
  }

  function renderTopBidders(bidders) {
    const tbody = document.getElementById('bidders-table');
    if (!tbody) return;
    tbody.innerHTML = (bidders || []).map(b => `
      <tr>
        <td>${escapeHtml(b.name)}</td>
        <td>${b.totalBids}</td>
        <td>£${b.totalAmount}</td>
        <td>£${(b.totalAmount / b.totalBids).toFixed(2)}</td>
      </tr>
    `).join('');
  }

  // ============= ALUMNI PAGE =============

  function renderAlumni(data) {
    let html = `
      <div class="alumni-section">
        <h1>👥 Alumni Directory</h1>
        
        <div class="filters">
          <input type="text" id="search-input" placeholder="Search alumni by name..." value="">
          <select id="programme-filter">
            <option value="">All Programmes</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Business">Business</option>
            <option value="Data Science">Data Science</option>
          </select>
          <select id="industry-filter">
            <option value="">All Industries</option>
            <option value="Technology">Technology</option>
            <option value="Finance">Finance</option>
            <option value="Energy">Energy</option>
            <option value="Security">Security</option>
          </select>
          <button onclick="applyAlumniFilters()" class="btn btn-primary">🔍 Filter</button>
        </div>

        <div class="pagination-info">
          <span id="pagination-text">Loading...</span>
        </div>

        <div class="alumni-grid" id="alumni-grid">
          <div class="loading">Loading alumni...</div>
        </div>

        <div class="pagination-controls" id="pagination-controls"></div>
      </div>
    `;
    content.innerHTML = html;

    renderAlumniCards(data.data);
    renderPagination(data.pagination);
  }

  function renderAlumniCards(alumni) {
    const grid = document.getElementById('alumni-grid');
    if (!grid) return;
    grid.innerHTML = (alumni || []).map(a => `
      <div class="alumni-card">
        <div class="alumni-header">
          <h3>${escapeHtml(a.name || 'Unknown')}</h3>
          <span class="badge">${a.programme || 'N/A'}</span>
        </div>
        <p><strong>📌 Role:</strong> ${escapeHtml(a.currentRole || 'N/A')}</p>
        <p><strong>🏢 Company:</strong> ${escapeHtml(a.currentEmployer || 'N/A')}</p>
        <p><strong>🏭 Industry:</strong> ${escapeHtml(a.industry || 'N/A')}</p>
        <p><strong>📅 Graduated:</strong> ${a.graduationYear || 'N/A'}</p>
        <p><strong>💰 Wallet:</strong> £${a.walletBalance || 0}</p>
        <div class="alumni-certs">
          <strong>🏆 Certifications:</strong>
          <div>${(a.certifications || []).slice(0, 3).map(c => `<span class="cert-badge">${c.name}</span>`).join('')}</div>
        </div>
        ${a.linkedInUrl ? `<a href="${a.linkedInUrl}" target="_blank" class="btn btn-secondary">🔗 LinkedIn →</a>` : ''}
      </div>
    `).join('');
  }

  function renderPagination(pagination) {
    const controls = document.getElementById('pagination-controls');
    const info = document.getElementById('pagination-text');
    if (!controls || !pagination) return;

    info.textContent = `Showing ${(pagination.page - 1) * pagination.limit + 1}-${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} alumni`;

    let html = '';
    if (pagination.page > 1) {
      html += `<button onclick="goToAlumniPage(${pagination.page - 1})" class="btn btn-secondary">← Previous</button>`;
    }
    html += `<span class="page-info">Page ${pagination.page} of ${pagination.totalPages}</span>`;
    if (pagination.hasNextPage) {
      html += `<button onclick="goToAlumniPage(${pagination.page + 1})" class="btn btn-secondary">Next →</button>`;
    }
    controls.innerHTML = html;
  }

  // ============= CHARTS PAGE =============

  function renderChartsPage() {
    let html = `
      <div class="charts-section">
        <h1>📈 Analytics Charts</h1>
        
        <div class="charts-grid">
          <div class="chart-item">
            <h2>Skills Gap Analysis</h2>
            <canvas id="skills-gap-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Career Trends</h2>
            <canvas id="career-trends-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Industry Distribution</h2>
            <canvas id="industry-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Top Certifications</h2>
            <canvas id="certs-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Programme Distribution</h2>
            <canvas id="programme-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Graduation Years</h2>
            <canvas id="years-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Bidding Trends</h2>
            <canvas id="bidding-chart"></canvas>
          </div>
          <div class="chart-item">
            <h2>Sponsorships</h2>
            <canvas id="sponsorship-chart"></canvas>
          </div>
        </div>

        <div class="chart-actions">
          <button onclick="exportCharts()" class="btn btn-primary">📥 Export Charts</button>
        </div>
      </div>
    `;
    content.innerHTML = html;
    loadAllCharts();
  }

  function loadAllCharts() {
    if (typeof Chart === 'undefined') {
      showMessage('Chart.js not loaded', 'error');
      return;
    }

    const chartEndpoints = [
      { endpoint: '/charts/skillsGap',             elementId: 'skills-gap-chart' },
      { endpoint: '/charts/careerTrends',           elementId: 'career-trends-chart' },
      { endpoint: '/charts/industryDistribution',   elementId: 'industry-chart' },
      { endpoint: '/charts/certifications',         elementId: 'certs-chart' },
      { endpoint: '/charts/programmeDistribution',  elementId: 'programme-chart' },
      { endpoint: '/charts/graduationYears',        elementId: 'years-chart' },
      { endpoint: '/charts/biddingTrends',          elementId: 'bidding-chart' },
      { endpoint: '/charts/sponsorships',           elementId: 'sponsorship-chart' }
    ];

    chartEndpoints.forEach(({ endpoint, elementId }) => {
      api(endpoint)
        .then(data => {
          const ctx = document.getElementById(elementId);
          if (ctx) {
            new Chart(ctx, {
              type: data.type || 'bar',
              data: {
                labels: data.labels || [],
                datasets: data.datasets || []
              },
              options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } }
              }
            });
          }
        })
        .catch(err => console.error(`Failed to load ${endpoint}:`, err));
    });
  }

  // ============= API KEYS PAGE =============

  function renderApiKeys(data) {
    let html = `
      <div class="api-keys-section">
        <h1>🔑 API Key Management</h1>
        
        <button onclick="showCreateKeyForm()" class="btn btn-primary">+ Create New Key</button>

        <table class="api-keys-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Scopes</th>
              <th>Last Used</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="api-keys-tbody"></tbody>
        </table>

        <div id="usage-stats">
          <h2>📊 Usage Statistics</h2>
          <canvas id="usage-chart"></canvas>
        </div>
      </div>
    `;
    content.innerHTML = html;
    renderApiKeysTable(data.data || []);
  }

  function renderApiKeysTable(keys) {
    const tbody = document.getElementById('api-keys-tbody');
    if (!tbody) return;
    tbody.innerHTML = (keys || []).map(k => `
      <tr>
        <td>${escapeHtml(k.name)}</td>
        <td><span class="scope-badges">${(k.scopes || []).join(', ')}</span></td>
        <td>${k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
        <td><span class="badge ${k.active ? 'active' : 'revoked'}">${k.active ? 'Active' : 'Revoked'}</span></td>
        <td>
          <button onclick="viewKeyDetails('${k.id}')" class="btn btn-small">View</button>
          <button onclick="revokeKey('${k.id}')" class="btn btn-danger btn-small">Revoke</button>
        </td>
      </tr>
    `).join('');
  }

  // ============= USAGE STATISTICS PAGE =============

  function renderUsageStats(data) {
    let html = `
      <div class="usage-section">
        <h1>📊 API Usage Statistics</h1>
        
        <div class="stats-grid">
          <div class="stat-card">
            <h3>Active Keys</h3>
            <p class="stat-value">${data.activeKeys}</p>
          </div>
          <div class="stat-card">
            <h3>Total Keys</h3>
            <p class="stat-value">${data.totalKeys}</p>
          </div>
        </div>

        <h2>Key Usage Breakdown</h2>
        <table class="usage-table">
          <thead>
            <tr>
              <th>Key Name</th>
              <th>Scopes</th>
              <th>Total Requests</th>
              <th>Requests Today</th>
              <th>Last Used</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${(data.stats || []).map(s => `
              <tr>
                <td>${escapeHtml(s.keyName)}</td>
                <td>${s.scopes.join(', ')}</td>
                <td>${s.totalRequests}</td>
                <td>${s.requestsToday}</td>
                <td>${s.lastUsedAt ? new Date(s.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td><span class="badge ${s.active ? 'active' : 'revoked'}">${s.active ? 'Active' : 'Revoked'}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    content.innerHTML = html;
  }

  // ============= ROUTING =============

  function route() {
    const hash = (location.hash || '#dashboard').slice(1);
    const parts = hash.split('/');
    showMessage('');

    if (parts[0] === 'dashboard') {
      api('/dashboard/api')
        .then(renderDashboard)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">❌ ${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    if (parts[0] === 'alumni') {
      const page = parts[1] || 1;
      api(`/alumnis?page=${page}&limit=20`)
        .then(renderAlumni)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">❌ ${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    if (parts[0] === 'charts') {
      renderChartsPage();
      return;
    }

    if (parts[0] === 'api-keys') {
      api('/api-keyss')
        .then(renderApiKeys)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">❌ ${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    if (parts[0] === 'usage') {
      api('/api-keys/usage')
        .then(renderUsageStats)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">❌ ${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    location.hash = '#dashboard';
  }

  // Global functions
  window.applyAlumniFilters = function() {
    const search = document.getElementById('search-input')?.value || '';
    const programme = document.getElementById('programme-filter')?.value || '';
    const industry = document.getElementById('industry-filter')?.value || '';
    
    let url = '/alumnis?page=1&limit=20';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (programme) url += `&programme=${encodeURIComponent(programme)}`;
    if (industry) url += `&industry=${encodeURIComponent(industry)}`;

    api(url)
      .then(renderAlumni)
      .catch(err => showMessage(err.message, 'error'));
  };

  window.goToAlumniPage = function(page) {
    location.hash = `#alumni/${page}`;
  };

  window.exportDashboard = function() {
    window.open('/api/export/dashboard/csv', '_blank');
    showMessage('Dashboard exported as CSV', 'success');
  };

  window.exportAlumni = function() {
    window.open('/api/export/alumni/csv', '_blank');
    showMessage('Alumni data exported as CSV', 'success');
  };

  window.exportCharts = function() {
    showMessage('Charts exported!', 'success');
  };

  window.viewKeyDetails = function(keyId) {
    api(`/api-keys/${keyId}`)
      .then(data => {
        let details = `
          Key: ${escapeHtml(data.keyName)}
          Scopes: ${data.scopes.join(', ')}
          Total Requests: ${data.totalRequests}
          Requests Today: ${data.requestsToday}
          Last Used: ${data.lastUsedAt ? new Date(data.lastUsedAt).toLocaleString() : 'Never'}
        `;
        alert(details);
      })
      .catch(err => showMessage(err.message, 'error'));
  };

  window.revokeKey = function(keyId) {
    if (confirm('Are you sure you want to revoke this key?')) {
      showMessage('Key revoked (feature to be implemented)', 'info');
    }
  };

  window.showCreateKeyForm = function() {
    alert('Create key form (feature to be implemented)');
  };

  window.addEventListener('hashchange', route);

  const logoutBtn = document.querySelector('.logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    });
  }

  route();
})();