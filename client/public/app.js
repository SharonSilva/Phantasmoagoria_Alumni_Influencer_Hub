'use strict';

/**
 * Alumni Analytics Dashboard — Frontend App
 * 
 * Architecture: this JS runs in the browser and calls the CLIENT server (port 3001),
 * NOT the backend directly. The client server handles API key injection and session auth.
 * 
 * BUG FIX: previous version hardcoded the mobile AR API key (east_mobile_v2_def456uvw)
 * which only has read:alumni_of_day scope — analytics endpoints need read:analytics.
 * API keys are now injected server-side; the browser never sends X-API-Key directly.
 * 
 * BUG FIX: chart rendering was using data.values which doesn't exist.
 * Backend returns { type, labels, datasets } — must use data.datasets.
 */

const CLIENT_BASE = ''; // same origin — client server at port 3001
const BACKEND_API_BASE = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
  const contentArea = document.getElementById('content');
  const navLinks    = document.querySelectorAll('.nav-link');
  let   csrfToken   = null; // stored after login, sent with state-changing requests
  let   authToken   = null; // in-memory JWT for alumni profile management calls
  const chartInstances = new Map();

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  // All fetch calls go to the client server (port 3001), NOT the backend directly.
  // The client server injects the correct API key and forwards the request.
  async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

    const res = await fetch(`${CLIENT_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${res.status}`);
    }
    return res.json();
  }

  async function backendFetch(path, options = {}) {
    if (!authToken) throw new Error('No active token. Please login again.');
    const method = (options.method || 'GET').toUpperCase();
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    const headers = { ...(options.headers || {}), Authorization: `Bearer ${authToken}` };

    // Backend CSRF tokens are single-use, so obtain a fresh one for each
    // state-changing request made directly to backend routes.
    if (isStateChanging) {
      const csrfRes = await fetch(`${BACKEND_API_BASE}/csrf-token`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const csrfBody = await csrfRes.json().catch(() => ({}));
      if (!csrfRes.ok || !csrfBody?.data?.csrfToken) {
        throw new Error(csrfBody?.message || 'Could not obtain CSRF token');
      }
      csrfToken = csrfBody.data.csrfToken;
      headers['X-CSRF-Token'] = csrfToken;
    } else if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    const res = await fetch(`${BACKEND_API_BASE}${path}`, { ...options, headers });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = body.message || body.error || `HTTP ${res.status}`;
      throw new Error(message);
    }
    return body;
  }

  function showMessage(msg, type = 'info') {
    const box = document.getElementById('message-box');
    if (!box) return;
    box.textContent = msg;
    box.className   = `alert alert-${type}`;
    box.classList.remove('hidden');
    setTimeout(() => box.classList.add('hidden'), 4000);
  }

  function toCsv(rows) {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(escape).join(','),
      ...rows.map(r => headers.map(h => escape(r[h])).join(',')),
    ];
    return lines.join('\n');
  }

  function downloadTextFile(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportSectionToPdf(title, html) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<h2>${escapeHtml(title)}</h2>${html}`;
    await html2pdf().from(wrapper).set({
      margin: 10,
      filename: `${title.toLowerCase().replace(/\s+/g, '-')}.pdf`,
      html2canvas: { scale: 2 },
    }).save();
  }

  // ─── AUTH ──────────────────────────────────────────────────────────────────

  async function checkAuth() {
    try {
      const data = await apiFetch('/auth/check');
      if (data.loggedIn && data.token) authToken = data.token;
      return data.loggedIn;
    } catch {
      return false;
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault();
    const email    = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (data.success) {
        // Store CSRF token in memory only (not localStorage) — used for state-changing requests
        csrfToken = data.csrfToken;
        authToken = data.token || null;
        showMessage(`Welcome back, ${data.user?.name || 'Staff'}!`, 'success');
        navigate('#dashboard');
      }
    } catch (err) {
      showMessage('Login failed: ' + err.message, 'danger');
    }
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    csrfToken = null;
    authToken = null;
    navigate('#login');
  };

  const profileSections = [
    {
      key: 'degrees',
      title: 'Degrees',
      endpoint: '/profile/degrees',
      fields: [
        { name: 'title', label: 'Degree Title', type: 'text', required: true },
        { name: 'institution', label: 'Institution', type: 'text', required: true },
        { name: 'url', label: 'Official Degree URL', type: 'url' },
        { name: 'completedDate', label: 'Completion Date', type: 'date' },
      ],
    },
    {
      key: 'certifications',
      title: 'Certifications',
      endpoint: '/profile/certifications',
      fields: [
        { name: 'name', label: 'Certification Name', type: 'text', required: true },
        { name: 'issuer', label: 'Issuer', type: 'text', required: true },
        { name: 'url', label: 'Course URL', type: 'url' },
        { name: 'completedDate', label: 'Completion Date', type: 'date' },
      ],
    },
    {
      key: 'licences',
      title: 'Licences',
      endpoint: '/profile/licences',
      fields: [
        { name: 'name', label: 'Licence Name', type: 'text', required: true },
        { name: 'awardingBody', label: 'Awarding Body', type: 'text', required: true },
        { name: 'url', label: 'Awarding Body URL', type: 'url' },
        { name: 'completedDate', label: 'Completion Date', type: 'date' },
      ],
    },
    {
      key: 'courses',
      title: 'Short Courses',
      endpoint: '/profile/courses',
      fields: [
        { name: 'name', label: 'Course Name', type: 'text', required: true },
        { name: 'provider', label: 'Provider', type: 'text', required: true },
        { name: 'url', label: 'Course URL', type: 'url' },
        { name: 'completedDate', label: 'Completion Date', type: 'date' },
      ],
    },
    {
      key: 'employmentHistory',
      title: 'Employment History',
      endpoint: '/profile/employment',
      fields: [
        { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
        { name: 'employer', label: 'Employer', type: 'text', required: true },
        { name: 'startDate', label: 'Start Date', type: 'date', required: true },
        { name: 'endDate', label: 'End Date', type: 'date' },
      ],
    },
  ];

  function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  }

  function insightLegendHtml(insights = []) {
    if (!insights.length) return '';
    const unique = [...new Set(insights)];
    const label = {
      critical: 'Critical',
      significant: 'Significant',
      emerging: 'Emerging',
    };
    return `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
      ${unique.map(i => `<span class="insight-badge insight-${i}">${label[i] || i}</span>`).join('')}
    </div>`;
  }

  async function loadProfile() {
    contentArea.innerHTML = '<h2>My Profile</h2><p>Loading profile...</p>';
    try {
      const profileRes = await backendFetch('/profile');
      const p = profileRes.data || {};

      contentArea.innerHTML = `
        <h2>My Alumni Profile</h2>
        <p class="insight">Manage your profile, image, and all qualification/employment sections.</p>

        <div class="card" style="margin-bottom:16px">
          <h3>Core Profile</h3>
          <form id="coreProfileForm" style="display:grid;gap:10px;margin-top:10px">
            <textarea name="bio" rows="4" placeholder="Professional biography">${escapeHtml(p.bio || '')}</textarea>
            <input type="url" name="linkedInUrl" placeholder="LinkedIn URL" value="${escapeHtml(p.linkedInUrl || '')}">
            <input type="text" name="currentRole" placeholder="Current Role" value="${escapeHtml(p.currentRole || '')}">
            <input type="text" name="currentEmployer" placeholder="Current Employer" value="${escapeHtml(p.currentEmployer || '')}">
            <input type="text" name="location" placeholder="Location" value="${escapeHtml(p.location || '')}">
            <input type="number" name="graduationYear" placeholder="Graduation Year" value="${escapeHtml(p.graduationYear || '')}" min="1950" max="2100">
            <button type="submit" class="btn-primary">Save Core Profile</button>
          </form>
        </div>

        <div class="card" style="margin-bottom:16px">
          <h3>Profile Photo</h3>
          <form id="photoForm" enctype="multipart/form-data" style="display:flex;gap:10px;align-items:center;margin-top:10px">
            <input type="file" name="photo" accept=".jpg,.jpeg,.png,.webp" required>
            <button type="submit" class="btn-primary">Upload Photo</button>
          </form>
          ${p.photoUrl ? `<p style="margin-top:10px">Current photo: <a href="http://localhost:3000${p.photoUrl}" target="_blank" rel="noreferrer">View image</a></p>` : ''}
        </div>

        <div id="profileSections"></div>
      `;

      document.getElementById('coreProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const payload = Object.fromEntries(fd.entries());
        if (!payload.graduationYear) delete payload.graduationYear;
        await backendFetch('/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        showMessage('Core profile updated.', 'success');
        loadProfile();
      });

      document.getElementById('photoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const res = await fetch(`${BACKEND_API_BASE}/profile/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
          body: fd,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.message || `HTTP ${res.status}`);
        showMessage('Photo uploaded successfully.', 'success');
        loadProfile();
      });

      const sectionsEl = document.getElementById('profileSections');
      for (const section of profileSections) {
        const items = p[section.key] || [];
        const fieldInputs = section.fields.map(f => `
          <input
            name="${f.name}"
            type="${f.type}"
            placeholder="${f.label}"
            ${f.required ? 'required' : ''}
          >`).join('');
        const tableHeaders = section.fields.map(f => `<th>${f.label}</th>`).join('');
        const rows = items.map(item => `
          <tr>
            ${section.fields.map(f => `<td>${escapeHtml(item[f.name] || '')}</td>`).join('')}
            <td>
              <button type="button" class="btn-primary profile-edit-btn" data-section="${section.key}" data-id="${item.id}">Edit</button>
              <button type="button" class="btn-primary profile-delete-btn" data-section="${section.key}" data-id="${item.id}" style="background:#f93e3e;margin-left:6px">Delete</button>
            </td>
          </tr>`).join('');

        const html = `
          <div class="card" style="margin-bottom:16px">
            <h3>${section.title}</h3>
            <form class="profile-section-form" data-section="${section.key}" style="display:grid;gap:8px;margin-top:10px">
              <input type="hidden" name="itemId" value="">
              ${fieldInputs}
              <div style="display:flex;gap:8px">
                <button type="submit" class="btn-primary">Save ${section.title}</button>
                <button type="button" class="btn-primary profile-cancel-btn" data-section="${section.key}" style="background:#64748b">Cancel Edit</button>
              </div>
            </form>
            <div class="data-table-container" style="margin-top:12px">
              <table class="data-table">
                <thead><tr>${tableHeaders}<th>Actions</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="${section.fields.length + 1}">No entries yet.</td></tr>`}</tbody>
              </table>
            </div>
          </div>
        `;
        sectionsEl.insertAdjacentHTML('beforeend', html);
      }

      document.querySelectorAll('.profile-section-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const sectionKey = form.dataset.section;
          const section = profileSections.find(s => s.key === sectionKey);
          const fd = new FormData(form);
          const itemId = fd.get('itemId');
          const payload = {};
          section.fields.forEach(f => {
            const val = fd.get(f.name);
            if (val !== null && val !== '') payload[f.name] = val;
          });
          if (sectionKey === 'employmentHistory') {
            payload.current = !payload.endDate;
          }

          const target = itemId ? `${section.endpoint}/${itemId}` : section.endpoint;
          await backendFetch(target, {
            method: itemId ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          showMessage(`${section.title} saved.`, 'success');
          loadProfile();
        });
      });

      // Use event delegation so actions remain reliable after dynamic rerenders.
      sectionsEl.addEventListener('click', async (event) => {
        const deleteBtn = event.target.closest('.profile-delete-btn');
        const editBtn = event.target.closest('.profile-edit-btn');
        const cancelBtn = event.target.closest('.profile-cancel-btn');

        if (cancelBtn) {
          loadProfile();
          return;
        }

        if (deleteBtn) {
          try {
            const section = profileSections.find(s => s.key === deleteBtn.dataset.section);
            if (!section) throw new Error('Unknown profile section');
            if (!confirm(`Delete this ${section.title.slice(0, -1).toLowerCase()} entry?`)) return;
            await backendFetch(`${section.endpoint}/${deleteBtn.dataset.id}`, { method: 'DELETE' });
            showMessage(`${section.title} entry deleted.`, 'success');
            loadProfile();
          } catch (err) {
            showMessage(`Delete failed: ${err.message}`, 'danger');
          }
          return;
        }

        if (editBtn) {
          try {
            const section = profileSections.find(s => s.key === editBtn.dataset.section);
            if (!section) throw new Error('Unknown profile section');
            const listRes = await backendFetch(section.endpoint);
            const item = (listRes.data || []).find(i => i.id === editBtn.dataset.id);
            if (!item) throw new Error('Entry no longer exists');
            const form = document.querySelector(`form[data-section="${editBtn.dataset.section}"]`);
            form.querySelector('input[name="itemId"]').value = item.id;
            section.fields.forEach(f => {
              const field = form.querySelector(`[name="${f.name}"]`);
              if (field) field.value = item[f.name] || '';
            });
            form.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (err) {
            showMessage(`Edit load failed: ${err.message}`, 'danger');
          }
        }
      });
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Failed to load profile manager: ${err.message}</div>`;
    }
  }

  // ─── DASHBOARD ────────────────────────────────────────────────────────────

  const loadDashboard = async () => {
    contentArea.innerHTML = '<h2>Dashboard</h2><p>Loading stats...</p>';
    try {
      const res = await apiFetch('/dashboard/api');
      const m   = res.metrics || {};

      contentArea.innerHTML = `
        <h2>Analytics Overview</h2>
        <div class="stats-grid">
          <div class="card"><h3>Total Alumni</h3><div class="value">${m.totalAlumni || 0}</div></div>
          <div class="card"><h3>Total Bids</h3><div class="value">${m.totalBids || 0}</div></div>
          <div class="card"><h3>Active Bids</h3><div class="value">${m.activeBids || 0}</div></div>
          <div class="card"><h3>Total Winners</h3><div class="value">${m.totalWinners || 0}</div></div>
          <div class="card"><h3>This Month</h3><div class="value">${m.monthlyWinners || 0}</div></div>
          <div class="card"><h3>Sponsors</h3><div class="value">${m.totalSponsors || 0}</div></div>
        </div>
        <h3 style="margin-top:24px">Recent Winners</h3>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Date</th><th>Bid Amount</th></tr></thead>
          <tbody>
            ${(res.recentWinners || []).map(w =>
              `<tr><td>${w.name}</td><td>${w.displayDate}</td><td>£${w.bidAmount}</td></tr>`
            ).join('')}
          </tbody>
        </table>
        <div class="card" style="margin-top:16px">
          <h3>Custom Report Generator</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin:10px 0">
            <label><input type="checkbox" class="report-metric" value="totalAlumni" checked> Total Alumni</label>
            <label><input type="checkbox" class="report-metric" value="totalBids" checked> Total Bids</label>
            <label><input type="checkbox" class="report-metric" value="activeBids" checked> Active Bids</label>
            <label><input type="checkbox" class="report-metric" value="totalWinners" checked> Winners</label>
            <label><input type="checkbox" class="report-metric" value="monthlyWinners" checked> Monthly Winners</label>
            <label><input type="checkbox" class="report-metric" value="totalSponsors" checked> Sponsors</label>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button id="downloadDashboardCsv" class="btn-primary">Download Dashboard CSV</button>
            <button id="downloadDashboardPdf" class="btn-primary">Generate Dashboard PDF</button>
          </div>
        </div>`;

      document.getElementById('downloadDashboardCsv').addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.report-metric:checked')).map(i => i.value);
        const row = {};
        selected.forEach(k => { row[k] = m[k] ?? 0; });
        downloadTextFile('dashboard-report.csv', toCsv([row]), 'text/csv');
      });

      document.getElementById('downloadDashboardPdf').addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.report-metric:checked')).map(i => i.value);
        const html = `<ul>${selected.map(k => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(m[k] ?? 0)}</li>`).join('')}</ul>`;
        await exportSectionToPdf('Dashboard Report', html);
      });
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Error loading dashboard: ${err.message}</div>`;
    }
  };

  // ─── ALUMNI DIRECTORY ─────────────────────────────────────────────────────

  const loadAlumni = async () => {
    const preset = JSON.parse(localStorage.getItem('alumniFilterPreset') || '{}');
    contentArea.innerHTML = `
      <h2>Alumni Directory</h2>
      <div style="display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap">
        <input type="text" id="alumniSearch" placeholder="Search name, role..." style="flex:1;padding:8px" value="${escapeHtml(preset.search || '')}">
        <input type="text" id="filterProgramme" placeholder="Programme" style="padding:8px" value="${escapeHtml(preset.programme || '')}">
        <input type="number" id="filterYear" placeholder="Graduation Year" style="padding:8px;width:170px" value="${escapeHtml(preset.year || '')}">
        <input type="text" id="filterIndustry" placeholder="Industry" style="padding:8px" value="${escapeHtml(preset.industry || '')}">
        <button id="applyAlumniFilters" class="btn-primary">Apply</button>
        <button id="saveAlumniPreset" class="btn-primary">Save Preset</button>
        <button id="loadAlumniPreset" class="btn-primary">Load Preset</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:15px;flex-wrap:wrap">
        <button id="exportAlumniCsv" class="btn-primary">Export Filtered CSV</button>
        <button id="exportAlumniPdf" class="btn-primary">Export Filtered PDF</button>
      </div>
      <div id="alumniResults"><p>Loading...</p></div>`;

    let lastData = [];

    async function runQuery() {
      const query = new URLSearchParams({
        search: document.getElementById('alumniSearch').value || '',
        programme: document.getElementById('filterProgramme').value || '',
        year: document.getElementById('filterYear').value || '',
        industry: document.getElementById('filterIndustry').value || '',
      });
      const res = await apiFetch(`/alumnis?${query.toString()}`);
      const alumni = res.data || [];
      lastData = alumni;
      document.getElementById('alumniResults').innerHTML = `
        <div class="data-table-container">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Programme</th><th>Role</th><th>Employer</th><th>Industry</th><th>Year</th></tr></thead>
            <tbody>
              ${alumni.map(a => `
                <tr>
                  <td>${a.name || 'N/A'}</td>
                  <td>${a.programme || 'N/A'}</td>
                  <td>${a.currentRole || 'N/A'}</td>
                  <td>${a.currentEmployer || 'N/A'}</td>
                  <td>${a.industry || 'N/A'}</td>
                  <td>${a.graduationYear || 'N/A'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    try {
      await runQuery();
    } catch (err) {
      document.getElementById('alumniResults').innerHTML = `<div class="error">Failed to load alumni: ${err.message}</div>`;
    }

    document.getElementById('applyAlumniFilters').addEventListener('click', async () => {
      try { await runQuery(); } catch (err) { showMessage(err.message, 'danger'); }
    });

    document.getElementById('saveAlumniPreset').addEventListener('click', () => {
      const payload = {
        search: document.getElementById('alumniSearch').value || '',
        programme: document.getElementById('filterProgramme').value || '',
        year: document.getElementById('filterYear').value || '',
        industry: document.getElementById('filterIndustry').value || '',
      };
      localStorage.setItem('alumniFilterPreset', JSON.stringify(payload));
      showMessage('Filter preset saved.', 'success');
    });

    document.getElementById('loadAlumniPreset').addEventListener('click', async () => {
      const p = JSON.parse(localStorage.getItem('alumniFilterPreset') || '{}');
      document.getElementById('alumniSearch').value = p.search || '';
      document.getElementById('filterProgramme').value = p.programme || '';
      document.getElementById('filterYear').value = p.year || '';
      document.getElementById('filterIndustry').value = p.industry || '';
      try { await runQuery(); } catch (err) { showMessage(err.message, 'danger'); }
    });

    document.getElementById('exportAlumniCsv').addEventListener('click', () => {
      const rows = lastData.map(a => ({
        name: a.name,
        programme: a.programme,
        role: a.currentRole,
        employer: a.currentEmployer,
        industry: a.industry,
        graduationYear: a.graduationYear,
      }));
      downloadTextFile('filtered-alumni.csv', toCsv(rows), 'text/csv');
    });

    document.getElementById('exportAlumniPdf').addEventListener('click', async () => {
      const html = document.getElementById('alumniResults').innerHTML;
      await exportSectionToPdf('Filtered Alumni', html);
    });
  };

  // ─── CHARTS ───────────────────────────────────────────────────────────────

  const loadCharts = async () => {
    chartInstances.forEach(c => c.destroy());
    chartInstances.clear();
    contentArea.innerHTML = `
      <h2>Analytics Charts</h2>
      <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <button id="downloadAllCharts" class="btn-primary">Download Chart Images</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div><h3>Skills Gap</h3><canvas id="skillsChart" style="max-height:300px"></canvas></div>
        <div><h3>Industry Distribution</h3><canvas id="industryChart" style="max-height:300px"></canvas></div>
        <div><h3>Industry Distribution (Pie)</h3><canvas id="industryPieChart" style="max-height:300px"></canvas></div>
        <div><h3>Programme Distribution</h3><canvas id="programmeChart" style="max-height:300px"></canvas></div>
        <div><h3>Graduation Years</h3><canvas id="yearsChart" style="max-height:300px"></canvas></div>
        <div><h3>Bidding Trends</h3><canvas id="biddingChart" style="max-height:300px"></canvas></div>
        <div><h3>Sponsorships</h3><canvas id="sponsorChart" style="max-height:300px"></canvas></div>
        <div><h3>Career Trends</h3><canvas id="careerChart" style="max-height:300px"></canvas></div>
        <div><h3>Top Certifications (Radar)</h3><canvas id="certChart" style="max-height:300px"></canvas></div>
      </div>`;

    async function renderChart(canvasId, endpoint, overrideType = null) {
      try {
        // BUG FIX: backend returns { type, labels, datasets } — use datasets directly,
        // NOT data.values (which never existed)
        const data = await apiFetch(`/charts/${endpoint}`);
        const ctx  = document.getElementById(canvasId)?.getContext('2d');
        if (!ctx) return;
        const percentages = data.percentages || [];
        const insights = data.insights || [];
        const chart = new Chart(ctx, {
          type: overrideType || data.type || 'bar',
          data: {
            labels:   data.labels   || [],
            datasets: data.datasets || [],
          },
          options: {
            responsive: true,
            animation: { duration: 700 },
            scales: {
              x: { title: { display: true, text: 'Category / Time' } },
              y: { title: { display: true, text: 'Value' }, beginAtZero: true },
            },
            plugins: {
              legend: { position: 'bottom' },
              tooltip: {
                enabled: true,
                callbacks: {
                  label(context) {
                    const value = context.raw;
                    const pct = percentages[context.dataIndex];
                    if (pct === undefined) return `${context.dataset.label || 'Value'}: ${value}`;
                    return `${context.dataset.label || 'Value'}: ${value} (${pct}%)`;
                  },
                },
              },
            },
          },
        });
        chartInstances.set(canvasId, chart);
        const canvas = document.getElementById(canvasId);
        if (canvas && insights.length) {
          const wrapper = canvas.closest('div');
          if (wrapper) wrapper.insertAdjacentHTML('beforeend', insightLegendHtml(insights));
        }
      } catch (err) {
        const el = document.getElementById(canvasId);
        if (el) el.parentElement.innerHTML += `<p class="error">${err.message}</p>`;
      }
    }

    await Promise.all([
      renderChart('skillsChart',    'skillsGap'),
      renderChart('industryChart',  'industryDistribution'),
      renderChart('industryPieChart', 'industryDistribution', 'pie'),
      renderChart('programmeChart', 'programmeDistribution'),
      renderChart('yearsChart',     'graduationYears'),
      renderChart('biddingChart',   'biddingTrends'),
      renderChart('sponsorChart',   'sponsorships'),
      renderChart('careerChart',    'careerTrends'),
      renderChart('certChart',      'certifications'),
    ]);

    document.getElementById('downloadAllCharts').addEventListener('click', () => {
      chartInstances.forEach((chart, id) => {
        const a = document.createElement('a');
        a.href = chart.toBase64Image();
        a.download = `${id}.png`;
        a.click();
      });
    });
  };

  // ─── API KEY USAGE LOGS ───────────────────────────────────────────────────

  const loadUsageLogs = async () => {
    contentArea.innerHTML = '<h2>API Key Usage</h2><p>Loading...</p>';
    try {
      const res  = await apiFetch('/api-keys/usage');
      const logs = res.data || [];

      contentArea.innerHTML = `
        <h2>Security Audit Trail</h2>
        <table class="data-table">
          <thead><tr><th>Key Name</th><th>Scopes</th><th>Total Requests</th><th>Today</th><th>Last Used</th><th>Active</th></tr></thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td>${l.keyName || l.name || 'N/A'}</td>
                <td>${(l.scopes || []).join(', ')}</td>
                <td>${l.totalRequests || 0}</td>
                <td>${l.requestsToday || 0}</td>
                <td>${l.lastUsedAt ? new Date(l.lastUsedAt).toLocaleString() : 'Never'}</td>
                <td>${l.active ? '✓' : '✗'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Error loading logs: ${err.message}</div>`;
    }
  };

  // ─── LOGIN PAGE ───────────────────────────────────────────────────────────

  const showLoginPage = () => {
    contentArea.innerHTML = `
      <div class="login-container">
        <h2>University Staff Login</h2>
        <p>Sign in with your university account to access the analytics dashboard.</p>
        <form id="loginForm">
          <input type="email" id="loginEmail" placeholder="University Email" required>
          <input type="password" id="loginPassword" placeholder="Password" required>
          <button type="submit" class="btn-primary">Login</button>
        </form>
      </div>`;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  };

  // ─── ROUTER ───────────────────────────────────────────────────────────────

  const navigate = async (hash) => {
    const route = hash || '#dashboard';

    // Check session on every navigation (server-side check, not localStorage)
    const loggedIn = await checkAuth();

    if (!loggedIn && route !== '#login') {
      window.location.hash = '#login';
      showLoginPage();
      return;
    }

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === route);
    });

    if (route === '#login')    showLoginPage();
    else if (route === '#dashboard') loadDashboard();
    else if (route === '#profile')   loadProfile();
    else if (route === '#alumni')    loadAlumni();
    else if (route === '#charts')    loadCharts();
    else if (route === '#api-keys')  loadUsageLogs();
    else if (route === '#logout')    handleLogout();
    else                             loadDashboard();
  };

  window.addEventListener('hashchange', () => navigate(window.location.hash));
  navigate(window.location.hash);
});