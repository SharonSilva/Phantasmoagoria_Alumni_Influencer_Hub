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

  function renderLoadingState(title = 'Loading dashboard...') {
    contentArea.innerHTML = `
      <div class="page-enter">
        <div class="loading-skeleton skeleton-title"></div>
        <p class="insight">${escapeHtml(title)}</p>
        <div class="skeleton-grid" style="margin-top:14px">
          <div class="loading-skeleton skeleton-card"></div>
          <div class="loading-skeleton skeleton-card"></div>
          <div class="loading-skeleton skeleton-card"></div>
          <div class="loading-skeleton skeleton-card"></div>
        </div>
      </div>
    `;
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

  function percent(part, total) {
    if (!total) return 0;
    return Number(((part / total) * 100).toFixed(1));
  }

  function topNEntries(objectMap = {}, count = 3) {
    return Object.entries(objectMap)
      .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0))
      .slice(0, count);
  }

  function computeCurriculumIntelligence({ alumni = [], skillsGap = {}, certifications = {}, biddingTrend = {} } = {}) {
    const totalAlumni = alumni.length;
    const roleKeywords = ['data analyst', 'data analytics', 'business intelligence', 'bi analyst'];
    const businessProgrammes = ['business', 'management', 'mba', 'marketing', 'finance'];
    const cloudKeywords = ['aws', 'azure', 'gcp', 'cloud'];
    const agileKeywords = ['agile', 'scrum'];

    const businessIntoData = alumni.filter(a => {
      const programme = String(a.programme || '').toLowerCase();
      const role = String(a.currentRole || '').toLowerCase();
      const isBusiness = businessProgrammes.some(k => programme.includes(k));
      const isDataRole = roleKeywords.some(k => role.includes(k));
      return isBusiness && isDataRole;
    });

    const certLabels = certifications.labels || [];
    const certData = (certifications.datasets && certifications.datasets[0]?.data) || [];
    const cloudCertCount = certLabels.reduce((sum, label, index) => {
      const normalized = String(label || '').toLowerCase();
      if (cloudKeywords.some(k => normalized.includes(k))) {
        return sum + Number(certData[index] || 0);
      }
      return sum;
    }, 0);
    const totalCertCount = certData.reduce((sum, val) => sum + Number(val || 0), 0);

    const skillsLabels = skillsGap.labels || [];
    const skillsData = (skillsGap.datasets && skillsGap.datasets[0]?.data) || [];
    const topSkills = skillsLabels.map((label, idx) => ({
      label,
      value: Number(skillsData[idx] || 0),
    })).sort((a, b) => b.value - a.value).slice(0, 3);

    const agileCertCount = certLabels.reduce((sum, label, index) => {
      const normalized = String(label || '').toLowerCase();
      if (agileKeywords.some(k => normalized.includes(k))) {
        return sum + Number(certData[index] || 0);
      }
      return sum;
    }, 0);

    const bidValues = (biddingTrend.datasets && biddingTrend.datasets[0]?.data) || [];
    const firstHalf = bidValues.slice(0, Math.max(1, Math.floor(bidValues.length / 2)));
    const secondHalf = bidValues.slice(Math.max(1, Math.floor(bidValues.length / 2)));
    const avg = arr => arr.length ? arr.reduce((s, v) => s + Number(v || 0), 0) / arr.length : 0;
    const momentumPct = firstHalf.length ? percent(avg(secondHalf) - avg(firstHalf), avg(firstHalf) || 1) : 0;

    const recommendations = [
      topSkills[0]
        ? `Integrate "${topSkills[0].label}" learning outcomes into core modules next semester.`
        : 'Introduce structured certification pathways in high-demand technical areas.',
      `Create cross-discipline pathway for business students entering data analytics roles (${percent(businessIntoData.length, totalAlumni)}% observed).`,
      `Embed Agile/Scrum practices in project modules (current related certification volume: ${agileCertCount}).`,
      `Expand cloud labs and practical content; cloud-related certifications represent ${percent(cloudCertCount, totalCertCount)}% of tracked certifications.`,
    ];

    return {
      totalAlumni,
      businessIntoDataCount: businessIntoData.length,
      businessIntoDataPct: percent(businessIntoData.length, totalAlumni),
      cloudCertCount,
      cloudCertPct: percent(cloudCertCount, totalCertCount),
      agileCertCount,
      bidMomentumPct: momentumPct,
      topSkills,
      recommendations,
    };
  }

  async function loadProfile() {
    contentArea.innerHTML = '<h2>My Profile</h2><p>Loading profile...</p>';
    try {
      const profileRes = await backendFetch('/profile');
      const p = profileRes.data || {};
      const totalEntries = profileSections.reduce((sum, section) => sum + ((p[section.key] || []).length), 0);

      contentArea.innerHTML = `
        <h2>My Alumni Profile</h2>
        <p class="insight">Manage your profile, image, and all qualification/employment sections.</p>
        <div class="profile-summary-grid">
          <div class="card profile-summary-card"><h3>Qualification Entries</h3><div class="value">${totalEntries}</div></div>
          <div class="card profile-summary-card"><h3>Current Role</h3><div class="profile-meta-value">${escapeHtml(p.currentRole || 'Not set')}</div></div>
          <div class="card profile-summary-card"><h3>Current Employer</h3><div class="profile-meta-value">${escapeHtml(p.currentEmployer || 'Not set')}</div></div>
          <div class="card profile-summary-card"><h3>Graduation Year</h3><div class="profile-meta-value">${escapeHtml(p.graduationYear || 'Not set')}</div></div>
        </div>

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
          ${p.photoUrl ? `
            <div class="profile-photo-preview-wrap">
              <img
                src="http://localhost:3000${p.photoUrl}?v=${Date.now()}"
                alt="Uploaded profile photo"
                class="profile-photo-preview"
              >
              <p>Current photo: <a href="http://localhost:3000${p.photoUrl}" target="_blank" rel="noreferrer">Open full image</a></p>
            </div>
          ` : '<p style="margin-top:10px;color:#64748b">No profile photo uploaded yet.</p>'}
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
        const body = await backendFetch('/profile/photo', {
          method: 'POST',
          body: fd,
        });
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
            <td class="profile-action-cell">
              <button type="button" class="btn-primary profile-edit-btn" data-section="${section.key}" data-id="${item.id}">Edit</button>
              <button type="button" class="btn-primary btn-danger profile-delete-btn" data-section="${section.key}" data-id="${item.id}">Delete</button>
            </td>
          </tr>`).join('');

        const html = `
          <div class="card profile-section-card" style="margin-bottom:16px">
            <div class="profile-section-header">
              <h3>${section.title}</h3>
              <span class="pill">${items.length} entries</span>
            </div>
            <form class="profile-section-form" data-section="${section.key}" style="display:grid;gap:8px;margin-top:10px">
              <input type="hidden" name="itemId" value="">
              <input type="hidden" name="sectionTitle" value="${section.title}">
              <p class="profile-form-label">Add or update ${section.title.toLowerCase()} details</p>
              ${fieldInputs}
              <div class="profile-form-actions">
                <button type="submit" class="btn-primary">Save ${section.title}</button>
                <button type="button" class="btn-primary btn-secondary profile-cancel-btn" data-section="${section.key}">Cancel Edit</button>
              </div>
            </form>
            <div class="data-table-container" style="margin-top:12px">
              <table class="data-table">
                <thead><tr>${tableHeaders}<th>Actions</th></tr></thead>
                <tbody>${rows || `<tr><td colspan="${section.fields.length + 1}" class="profile-empty-row">No entries yet. Add your first record above.</td></tr>`}</tbody>
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
            form.classList.add('is-editing');
            const helper = form.querySelector('.profile-form-label');
            if (helper) helper.textContent = `Editing ${section.title.slice(0, -1).toLowerCase()} entry`;
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
    renderLoadingState('Loading analytics overview and recent winners...');
    try {
      const [res, alumniRes, skillsRes, certRes, biddingTrendRes] = await Promise.all([
        apiFetch('/dashboard/api'),
        apiFetch('/alumnis?page=1&limit=200'),
        apiFetch('/charts/skillsGap'),
        apiFetch('/charts/certifications'),
        apiFetch('/charts/biddingTrends'),
      ]);
      const m   = res.metrics || {};
      const curriculum = computeCurriculumIntelligence({
        alumni: alumniRes.data || [],
        skillsGap: skillsRes || {},
        certifications: certRes || {},
        biddingTrend: biddingTrendRes || {},
      });
      const topProgrammePairs = topNEntries(res.breakdown?.byProgramme || {}, 3);
      const topIndustryPairs = topNEntries(res.breakdown?.byIndustry || {}, 3);

      contentArea.innerHTML = `
        <h2>Analytics Overview</h2>
        <div class="interactive-panel">
          <span class="pill">Live API Data</span>
          <span class="pill">Interactive Reports</span>
          <span class="pill">Export Ready</span>
        </div>
        <div class="stats-grid">
          <div class="card"><h3>Total Alumni</h3><div class="value">${m.totalAlumni || 0}</div></div>
          <div class="card"><h3>Total Bids</h3><div class="value">${m.totalBids || 0}</div></div>
          <div class="card"><h3>Active Bids</h3><div class="value">${m.activeBids || 0}</div></div>
          <div class="card"><h3>Total Winners</h3><div class="value">${m.totalWinners || 0}</div></div>
          <div class="card"><h3>This Month</h3><div class="value">${m.monthlyWinners || 0}</div></div>
          <div class="card"><h3>Sponsors</h3><div class="value">${m.totalSponsors || 0}</div></div>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>Curriculum Intelligence</h3>
          <p class="insight">Real-time post-graduation intelligence for curriculum and strategic planning decisions.</p>
          <div class="stats-grid" style="margin-top:10px">
            <div class="card"><h3>Business → Data Roles</h3><div class="value">${curriculum.businessIntoDataPct}%</div></div>
            <div class="card"><h3>Cloud Certification Share</h3><div class="value">${curriculum.cloudCertPct}%</div></div>
            <div class="card"><h3>Agile/Scrum Cert Volume</h3><div class="value">${curriculum.agileCertCount}</div></div>
            <div class="card"><h3>Bidding Demand Momentum</h3><div class="value">${curriculum.bidMomentumPct}%</div></div>
          </div>
          <div style="margin-top:10px">
            <h4 style="margin-bottom:6px">Top Skills Gap Signals</h4>
            <ul>
              ${curriculum.topSkills.map(s => `<li><strong>${escapeHtml(s.label)}</strong>: ${escapeHtml(s.value)}</li>`).join('') || '<li>No data available.</li>'}
            </ul>
            <h4 style="margin:8px 0 6px">Top Programme Distribution</h4>
            <ul>
              ${topProgrammePairs.map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`).join('') || '<li>No programme data.</li>'}
            </ul>
            <h4 style="margin:8px 0 6px">Top Industry Distribution</h4>
            <ul>
              ${topIndustryPairs.map(([label, value]) => `<li>${escapeHtml(label)}: ${escapeHtml(value)}</li>`).join('') || '<li>No industry data.</li>'}
            </ul>
            <h4 style="margin:8px 0 6px">Recommended Actions</h4>
            <ul>
              ${curriculum.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
            </ul>
          </div>
        </div>
        <h3 style="margin-top:24px">Recent Winners</h3>
        <table class="data-table">
          <thead><tr><th>Name</th><th>Date</th><th>Bid Amount</th></tr></thead>
          <tbody>
            ${(res.recentWinners || []).map(w =>
              `<tr><td>${w.name}</td><td>${w.displayDate}</td><td>${w.isHigh ? 'High Tier' : 'Standard Tier'}</td></tr>`
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
            <label><input type="checkbox" class="report-metric" value="businessIntoDataPct" checked> Business→Data %</label>
            <label><input type="checkbox" class="report-metric" value="cloudCertPct" checked> Cloud Cert %</label>
            <label><input type="checkbox" class="report-metric" value="agileCertCount" checked> Agile/Scrum Count</label>
            <label><input type="checkbox" class="report-metric" value="bidMomentumPct" checked> Bidding Momentum %</label>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button id="downloadDashboardCsv" class="btn-primary">Download Dashboard CSV</button>
            <button id="downloadDashboardPdf" class="btn-primary">Generate Dashboard PDF</button>
          </div>
        </div>`;

      document.getElementById('downloadDashboardCsv').addEventListener('click', () => {
        const selected = Array.from(document.querySelectorAll('.report-metric:checked')).map(i => i.value);
        const row = {};
        const extraMap = {
          businessIntoDataPct: curriculum.businessIntoDataPct,
          cloudCertPct: curriculum.cloudCertPct,
          agileCertCount: curriculum.agileCertCount,
          bidMomentumPct: curriculum.bidMomentumPct,
        };
        selected.forEach(k => { row[k] = (k in m) ? (m[k] ?? 0) : (extraMap[k] ?? 0); });
        downloadTextFile('dashboard-report.csv', toCsv([row]), 'text/csv');
      });

      document.getElementById('downloadDashboardPdf').addEventListener('click', async () => {
        const selected = Array.from(document.querySelectorAll('.report-metric:checked')).map(i => i.value);
        const generatedAt = new Date().toLocaleString();
        const extraMap = {
          businessIntoDataPct: `${curriculum.businessIntoDataPct}%`,
          cloudCertPct: `${curriculum.cloudCertPct}%`,
          agileCertCount: curriculum.agileCertCount,
          bidMomentumPct: `${curriculum.bidMomentumPct}%`,
        };
        const metricItems = selected.map(k => {
          const value = (k in m) ? (m[k] ?? 0) : (extraMap[k] ?? 0);
          return `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(value)}</li>`;
        }).join('');
        const recommendationItems = curriculum.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('');
        const html = `
          <p><strong>Generated:</strong> ${escapeHtml(generatedAt)}</p>
          <p><strong>Data source:</strong> Alumni live platform APIs</p>
          <h3>Selected Metrics</h3>
          <ul>${metricItems}</ul>
          <h3>Top Skill Signals</h3>
          <ul>
            ${curriculum.topSkills.map(s => `<li>${escapeHtml(s.label)}: ${escapeHtml(s.value)}</li>`).join('') || '<li>No skills data available.</li>'}
          </ul>
          <h3>Curriculum Recommendations</h3>
          <ul>${recommendationItems}</ul>
        `;
        await exportSectionToPdf('Dashboard Report', html);
      });
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Error loading dashboard: ${err.message}</div>`;
    }
  };

  // ─── ALUMNI DIRECTORY ─────────────────────────────────────────────────────

  const loadAlumni = async () => {
    const preset = JSON.parse(localStorage.getItem('alumniFilterPreset') || '{}');
    renderLoadingState('Preparing alumni directory, filters, and export tools...');
    contentArea.innerHTML = `
      <h2>Alumni Directory</h2>
      <div class="interactive-panel">
        <span class="pill">Filter by Programme</span>
        <span class="pill">Filter by Industry</span>
        <span class="pill">Filter by Graduation Year</span>
      </div>
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
    renderLoadingState('Loading chart datasets with insight indicators...');
    contentArea.innerHTML = `
      <h2>Analytics Charts</h2>
      <div class="interactive-panel">
        <span class="pill">Bar + Line + Pie + Radar + Doughnut</span>
        <span class="pill">Color-coded Insights</span>
        <span class="pill">Tooltip Percentages</span>
      </div>
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
    renderLoadingState('Loading API usage logs, scopes, and endpoint analytics...');
    try {
      const [res, endpointStatsRes] = await Promise.all([
        apiFetch('/api-keys/usage'),
        apiFetch('/api-keys/endpointStats'),
      ]);
      const logs = res.data || [];
      const endpointStats = endpointStatsRes?.data?.mostUsedEndpoints || {};

      contentArea.innerHTML = `
        <h2>Security Audit Trail</h2>
        <div class="card" style="margin-bottom:16px">
          <h3>Client Access Scoping</h3>
          <p><strong>Analytics Dashboard key scopes:</strong> <code>read:alumni</code>, <code>read:analytics</code></p>
          <p><strong>Mobile AR key scopes:</strong> <code>read:featured</code>, <code>read:alumni</code>, <code>read:sponsors</code>, <code>read:events</code></p>
          <p class="insight">This dashboard uses the analytics API key only, so mobile-only endpoints are not used here.</p>
        </div>
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
        </table>
        <div class="card" style="margin-top:16px">
          <h3>Most Accessed Endpoints (Usage Statistics)</h3>
          <div class="data-table-container">
            <table class="data-table">
              <thead><tr><th>Endpoint</th><th>Requests</th></tr></thead>
              <tbody>
                ${Object.entries(endpointStats).map(([endpoint, hits]) => `
                  <tr><td>${endpoint}</td><td>${hits}</td></tr>
                `).join('') || '<tr><td colspan="2">No endpoint usage yet.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>`;
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Error loading logs: ${err.message}</div>`;
    }
  };

  // ─── BIDDING ───────────────────────────────────────────────────────────────

  const loadBidding = async () => {
    renderLoadingState('Loading blind bidding status and monthly limits...');
    try {
      const [tomorrowRes, statusRes, monthlyRes, historyRes] = await Promise.all([
        apiFetch('/bids/tomorrow'),
        apiFetch('/bids/status'),
        apiFetch('/bids/monthly'),
        apiFetch('/bids/history'),
      ]);

      const tomorrow = tomorrowRes.data || {};
      const status = statusRes.data || {};
      const monthly = monthlyRes.data || {};
      const history = historyRes.data || [];
      const activeBid = tomorrow.myBidToday || null;

      contentArea.innerHTML = `
        <h2>Blind Bidding</h2>
        <div class="card" style="margin-bottom:16px">
          <h3>Tomorrow's Display Slot</h3>
          <p><strong>Display date:</strong> ${tomorrow.slotDate || 'N/A'}</p>
          <p><strong>Bidding open:</strong> ${tomorrow.biddingOpen ? 'Yes' : 'No'}</p>
          <p><strong>Closing time:</strong> ${tomorrow.biddingClosesAt || 'N/A'}</p>
          <p class="insight">Blind auction mode: highest bid amount is never shown.</p>
        </div>
        <div class="card" style="margin-bottom:16px">
          <h3>Win/Lose Feedback</h3>
          <p>${status.message || 'No status available.'}</p>
          <p><strong>Currently winning:</strong> ${status.isCurrentlyWinning ? 'Yes' : 'No'}</p>
        </div>
        <div class="card" style="margin-bottom:16px">
          <h3>Monthly Limit Status</h3>
          <p>${monthly.message || ''}</p>
          <p><strong>Wins this month:</strong> ${monthly.winsThisMonth ?? 0}</p>
          <p><strong>Max allowed:</strong> ${monthly.maxAllowed ?? 3}</p>
          <p><strong>Slots remaining:</strong> ${monthly.slotsRemaining ?? 0}</p>
        </div>
        <div class="card" style="margin-bottom:16px">
          <h3>Place Bid</h3>
          <form id="placeBidForm" style="display:flex;gap:10px;flex-wrap:wrap">
            <input type="number" min="1" step="0.01" id="bidAmount" placeholder="Bid amount (£)" required style="max-width:240px">
            <button type="submit" class="btn-primary">Submit Blind Bid</button>
          </form>
        </div>
        <div class="card" style="margin-bottom:16px">
          <h3>Update Bid (Increase Only)</h3>
          ${activeBid ? `
            <p>Active bid ID: <code>${activeBid.id}</code></p>
            <form id="updateBidForm" style="display:flex;gap:10px;flex-wrap:wrap">
              <input type="number" min="1" step="0.01" id="updatedBidAmount" placeholder="New higher amount (£)" required style="max-width:240px">
              <button type="submit" class="btn-primary">Increase Bid</button>
            </form>
          ` : '<p>No active bid today. Place a bid first.</p>'}
        </div>
        <h3>My Bid History</h3>
        <div class="data-table-container">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Status</th><th>Submitted At</th></tr></thead>
            <tbody>
              ${history.map(row => `
                <tr>
                  <td>${row.bidDate || 'N/A'}</td>
                  <td>${row.status || 'N/A'}</td>
                  <td>${row.submittedAt ? new Date(row.submittedAt).toLocaleString() : 'N/A'}</td>
                </tr>
              `).join('') || '<tr><td colspan="3">No bids yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      document.getElementById('placeBidForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = parseFloat(document.getElementById('bidAmount').value);
        try {
          const response = await apiFetch('/bids', {
            method: 'POST',
            body: JSON.stringify({ amount }),
          });
          const feedback = response?.data?.feedback?.message || 'Bid submitted.';
          showMessage(feedback, 'success');
          loadBidding();
        } catch (err) {
          showMessage(`Bid failed: ${err.message}`, 'danger');
        }
      });

      document.getElementById('updateBidForm')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const amount = parseFloat(document.getElementById('updatedBidAmount').value);
        try {
          const response = await apiFetch(`/bids/${activeBid.id}`, {
            method: 'PUT',
            body: JSON.stringify({ amount }),
          });
          const feedback = response?.data?.feedback?.message || 'Bid updated.';
          showMessage(feedback, 'success');
          loadBidding();
        } catch (err) {
          showMessage(`Update failed: ${err.message}`, 'danger');
        }
      });
    } catch (err) {
      contentArea.innerHTML = `<div class="error">Failed to load bidding dashboard: ${err.message}</div>`;
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
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">
          <a href="#register">Create account</a>
          <a href="#forgot">Forgot password?</a>
          <a href="#verify">Verify email</a>
          <a href="#reset">Reset password</a>
        </div>
      </div>`;
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
  };

  const showRegisterPage = () => {
    contentArea.innerHTML = `
      <div class="login-container">
        <h2>Register University Account</h2>
        <p>Use your university email domain (e.g. @alumni.eastminster.ac.uk).</p>
        <form id="registerForm">
          <input type="text" id="registerName" placeholder="Full Name" required>
          <input type="email" id="registerEmail" placeholder="University Email" required>
          <input type="password" id="registerPassword" placeholder="Password (8+ chars, upper, number, special)" required>
          <button type="submit" class="btn-primary">Register</button>
        </form>
        <div style="margin-top:12px"><a href="#login">Back to login</a></div>
      </div>`;
    document.getElementById('registerForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const payload = {
        name: document.getElementById('registerName').value.trim(),
        email: document.getElementById('registerEmail').value.trim(),
        password: document.getElementById('registerPassword').value,
      };
      try {
        const response = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showMessage(response.message || 'Registered. Please verify your email.', 'success');
        navigate('#verify');
      } catch (err) {
        showMessage(`Registration failed: ${err.message}`, 'danger');
      }
    });
  };

  const showVerifyPage = () => {
    contentArea.innerHTML = `
      <div class="login-container">
        <h2>Verify Email</h2>
        <p>Paste your verification token from the email link.</p>
        <form id="verifyForm">
          <input type="text" id="verifyToken" placeholder="Verification token" required>
          <button type="submit" class="btn-primary">Verify Email</button>
        </form>
        <div style="margin-top:12px"><a href="#login">Back to login</a></div>
      </div>`;
    document.getElementById('verifyForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const token = document.getElementById('verifyToken').value.trim();
      try {
        const response = await apiFetch(`/auth/verify?token=${encodeURIComponent(token)}`);
        showMessage(response.message || 'Email verified. You can now log in.', 'success');
        navigate('#login');
      } catch (err) {
        showMessage(`Verification failed: ${err.message}`, 'danger');
      }
    });
  };

  const showForgotPasswordPage = () => {
    contentArea.innerHTML = `
      <div class="login-container">
        <h2>Forgot Password</h2>
        <p>Enter your university email to receive a reset link.</p>
        <form id="forgotPasswordForm">
          <input type="email" id="forgotEmail" placeholder="University Email" required>
          <button type="submit" class="btn-primary">Send Reset Link</button>
        </form>
        <div style="margin-top:12px"><a href="#login">Back to login</a></div>
      </div>`;
    document.getElementById('forgotPasswordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const email = document.getElementById('forgotEmail').value.trim();
      try {
        const response = await apiFetch('/auth/forgotPassword', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        showMessage(response.message || 'Reset instructions sent if account exists.', 'success');
      } catch (err) {
        showMessage(`Request failed: ${err.message}`, 'danger');
      }
    });
  };

  const showResetPasswordPage = () => {
    contentArea.innerHTML = `
      <div class="login-container">
        <h2>Reset Password</h2>
        <p>Use token from your reset email.</p>
        <form id="resetPasswordForm">
          <input type="text" id="resetToken" placeholder="Reset token" required>
          <input type="password" id="resetPassword" placeholder="New password" required>
          <button type="submit" class="btn-primary">Reset Password</button>
        </form>
        <div style="margin-top:12px"><a href="#login">Back to login</a></div>
      </div>`;
    document.getElementById('resetPasswordForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const token = document.getElementById('resetToken').value.trim();
      const password = document.getElementById('resetPassword').value;
      try {
        const response = await apiFetch('/auth/resetPassword', {
          method: 'POST',
          body: JSON.stringify({ token, password }),
        });
        showMessage(response.message || 'Password reset complete. Please log in.', 'success');
        navigate('#login');
      } catch (err) {
        showMessage(`Reset failed: ${err.message}`, 'danger');
      }
    });
  };

  // ─── ROUTER ───────────────────────────────────────────────────────────────

  const navigate = async (hash) => {
    const route = hash || '#dashboard';
    const publicRoutes = new Set(['#login', '#register', '#verify', '#forgot', '#reset']);

    // Check session on every navigation (server-side check, not localStorage)
    const loggedIn = await checkAuth();

    if (!loggedIn && !publicRoutes.has(route)) {
      window.location.hash = '#login';
      showLoginPage();
      return;
    }

    navLinks.forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === route);
    });

    contentArea.classList.remove('page-enter');
    // Force reflow so animation restarts on route change.
    void contentArea.offsetWidth;
    contentArea.classList.add('page-enter');

    if (route === '#login')         showLoginPage();
    else if (route === '#register') showRegisterPage();
    else if (route === '#verify')   showVerifyPage();
    else if (route === '#forgot')   showForgotPasswordPage();
    else if (route === '#reset')    showResetPasswordPage();
    else if (route === '#dashboard') loadDashboard();
    else if (route === '#profile')   loadProfile();
    else if (route === '#alumni')    loadAlumni();
    else if (route === '#charts')    loadCharts();
    else if (route === '#bidding')   loadBidding();
    else if (route === '#api-keys')  loadUsageLogs();
    else if (route === '#logout')    handleLogout();
    else                             loadDashboard();
  };

  window.addEventListener('hashchange', () => navigate(window.location.hash));
  navigate(window.location.hash);
});