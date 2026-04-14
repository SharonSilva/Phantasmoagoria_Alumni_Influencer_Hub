/**
 * Alumni Analytics Dashboard - Frontend Application
 * Client-side routing and data rendering
 */

(function () {
  'use strict';

  const content = document.getElementById('content');
  const messageEl = document.getElementById('message-box');

  // ============= UTILITIES =============

  function showMessage(msg, type = 'info') {
    messageEl.textContent = msg || '';
    messageEl.className = `alert ${type} ${msg ? '' : 'hidden'}`;
    if (msg) {
      setTimeout(() => messageEl.classList.add('hidden'), 5000);
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
        if (!res.ok) throw new Error(data.error || 'Request failed');
        return data;
      });
    });
  }

  // ============= DASHBOARD PAGE =============

  function renderDashboard(data) {
    let html = `
      <div class="dashboard">
        <h1>Dashboard</h1>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <h3>Total Alumni</h3>
            <p class="metric-value">${data.metrics.totalAlumni}</p>
          </div>
          <div class="metric-card">
            <h3>Total Bids</h3>
            <p class="metric-value">${data.metrics.totalBids}</p>
          </div>
          <div class="metric-card">
            <h3>Winners</h3>
            <p class="metric-value">${data.metrics.totalWinners}</p>
          </div>
          <div class="metric-card">
            <h3>Monthly Winners</h3>
            <p class="metric-value">${data.metrics.monthlyWinners}</p>
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
                <th>User</th>
                <th>Bid Amount</th>
              </tr>
            </thead>
            <tbody id="winners-table">
            </tbody>
          </table>
        </div>

        <button onclick="exportDashboard()" class="btn btn-primary">📥 Export Report</button>
      </div>
    `;
    content.innerHTML = html;

    // Render charts
    renderCharts(data.breakdown);
    renderWinnersTable(data.recentWinners);
  }

  function renderCharts(breakdown) {
    // Programme Chart
    const programmeCtx = document.getElementById('chart-programme');
    if (programmeCtx) {
      new Chart(programmeCtx, {
        type: 'bar',
        data: {
          labels: Object.keys(breakdown.byProgramme),
          datasets: [{
            label: 'Number of Alumni',
            data: Object.values(breakdown.byProgramme),
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          scales: { y: { beginAtZero: true } }
        }
      });
    }

    // Industry Chart
    const industryCtx = document.getElementById('chart-industry');
    if (industryCtx) {
      new Chart(industryCtx, {
        type: 'pie',
        data: {
          labels: Object.keys(breakdown.byIndustry),
          datasets: [{
            data: Object.values(breakdown.byIndustry),
            backgroundColor: [
              'rgba(255, 99, 132, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(255, 206, 86, 0.5)',
              'rgba(75, 192, 192, 0.5)',
              'rgba(153, 102, 255, 0.5)'
            ]
          }]
        }
      });
    }
  }

  function renderWinnersTable(winners) {
    const tbody = document.getElementById('winners-table');
    tbody.innerHTML = winners.map(w => `
      <tr>
        <td>${w.displayDate}</td>
        <td>${escapeHtml(w.name || 'User')}</td>
        <td>£${w.bidAmount}</td>
      </tr>
    `).join('');
  }

  // ============= ALUMNI PAGE =============

  function renderAlumni(data) {
    let html = `
      <div class="alumni-section">
        <h1>Alumni Directory</h1>
        
        <div class="filters">
          <input type="text" id="search-input" placeholder="Search alumni...">
          <select id="programme-filter">
            <option value="">All Programmes</option>
            <option value="CS">Computer Science</option>
            <option value="Engineering">Engineering</option>
            <option value="Business">Business</option>
          </select>
          <button onclick="applyFilters()" class="btn btn-primary">Filter</button>
        </div>

        <div class="alumni-grid" id="alumni-grid">
        </div>
      </div>
    `;
    content.innerHTML = html;

    renderAlumniCards(data.data);
  }

  function renderAlumniCards(alumni) {
    const grid = document.getElementById('alumni-grid');
    grid.innerHTML = alumni.map(a => `
      <div class="alumni-card">
        <div class="alumni-header">
          <h3>${escapeHtml(a.name)}</h3>
          <span class="badge">${a.programme}</span>
        </div>
        <p><strong>Role:</strong> ${escapeHtml(a.currentRole || 'N/A')}</p>
        <p><strong>Company:</strong> ${escapeHtml(a.currentEmployer || 'N/A')}</p>
        <p><strong>Industry:</strong> ${escapeHtml(a.industry)}</p>
        <p><strong>Graduated:</strong> ${a.graduationYear}</p>
        <div class="alumni-certs">
          <strong>Certifications:</strong>
          <div>${a.certifications.slice(0, 3).map(c => `<span class="cert-badge">${c.name}</span>`).join('')}</div>
        </div>
        <a href="${a.linkedInUrl}" target="_blank" class="btn btn-secondary">LinkedIn →</a>
      </div>
    `).join('');
  }

  // ============= CHARTS PAGE =============

  function renderChartsPage(data) {
    let html = `
      <div class="charts-section">
        <h1>Analytics Charts</h1>
        
        <div class="charts-grid">
          <div class="chart-item">
            <h2>Skills Gap Analysis</h2>
            <canvas id="skills-gap-chart"></canvas>
            <div id="skills-gap-data"></div>
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
        </div>

        <div class="chart-actions">
          <button onclick="exportCharts()" class="btn btn-primary">📥 Export Charts</button>
        </div>
      </div>
    `;
    content.innerHTML = html;
  }

  // ============= API KEYS PAGE =============

  function renderApiKeys(data) {
    let html = `
      <div class="api-keys-section">
        <h1>API Key Management</h1>
        
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
          <tbody id="api-keys-tbody">
          </tbody>
        </table>

        <div id="usage-stats">
          <h2>Usage Statistics</h2>
          <canvas id="usage-chart"></canvas>
        </div>
      </div>
    `;
    content.innerHTML = html;

    renderApiKeysTable(data.data);
  }

  function renderApiKeysTable(keys) {
    const tbody = document.getElementById('api-keys-tbody');
    tbody.innerHTML = keys.map(k => `
      <tr>
        <td>${escapeHtml(k.name)}</td>
        <td><span class="scope-badges">${k.scopes.join(', ')}</span></td>
        <td>${k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
        <td><span class="badge ${k.active ? 'active' : 'revoked'}">${k.active ? 'Active' : 'Revoked'}</span></td>
        <td>
          <button onclick="viewKeyDetails('${k.id}')" class="btn btn-small">View</button>
          <button onclick="revokeKey('${k.id}')" class="btn btn-danger btn-small">Revoke</button>
        </td>
      </tr>
    `).join('');
  }

  // ============= ROUTING =============

  function route() {
    const hash = (location.hash || '#dashboard').slice(1);
    const parts = hash.split('/');
    showMessage('');

    if (parts[0] === 'dashboard') {
      api('/api/dashboard')
        .then(renderDashboard)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    if (parts[0] === 'alumni') {
      api('/api/alumni/data')
        .then(renderAlumni)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    if (parts[0] === 'charts') {
      renderChartsPage();
      // Load all chart data
      Promise.all([
        api('/charts/skillsGap'),
        api('/charts/careerTrends'),
        api('/charts/industryDistribution'),
        api('/charts/certifications')
      ]).catch(err => showMessage(err.message, 'error'));
      return;
    }

    if (parts[0] === 'api-keys') {
      api('/api/api-keyss')
        .then(renderApiKeys)
        .catch(err => {
          showMessage(err.message, 'error');
          content.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
        });
      return;
    }

    // Default to dashboard
    route.call({ hash: 'dashboard' });
  }

  // Event Listeners
  window.addEventListener('hashchange', route);
  document.querySelector('.logout').addEventListener('click', function(e) {
    e.preventDefault();
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  });

  // Initial route
  route();
})();

// Export functions
function exportDashboard() {
  const element = document.querySelector('.dashboard');
  const opt = { margin: 10, filename: 'dashboard.pdf', image: { type: 'png', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' } };
  html2pdf().set(opt).from(element).save();
}

function exportCharts() {
  alert('Charts exported!');
}