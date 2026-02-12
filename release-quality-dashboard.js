class ReleaseQualityDashboard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.projects = [];
    this.environments = [];
    this.deployments = [];
    this.deploymentsStats = null;
    this.selectedProject = '';
    this.selectedEnvironment = '';
    this.selectedClusterId = '';
    this.isLoadingProjects = false;
    this.isLoadingEnvironments = false;
    this.isLoadingDeployments = false;
    this.error = null;
    this.filterStatus = 'ALL';
    this.filterType = 'ALL';
    this.currentPage = 0;
    this.pageSize = 15;

    this.render();
  }

  connectedCallback() {
    this.setupEventListeners();
    this.fetchProjects();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: #1e293b;
          --primary: #6366f1;
          --primary-light: #818cf8;
          --success: #10b981;
          --danger: #ef4444;
          --warning: #f59e0b;
          --info: #3b82f6;
          --muted: #94a3b8;
          --border: #e2e8f0;
          --bg: #f8fafc;
          --bg-card: #ffffff;
          --text: #1e293b;
          --text-secondary: #64748b;
          --radius: 8px;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .dashboard { max-width: 100%; padding: 1.5rem; background: var(--bg); min-height: 100vh; }
        .header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; }
        .header h1 { font-size: 1.5rem; font-weight: 700; color: var(--text); }
        .selectors { display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center; }
        .select-group { display: flex; flex-direction: column; gap: 0.25rem; }
        .select-group label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.05em; }
        select {
          padding: 0.5rem 2rem 0.5rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius);
          font-size: 0.875rem; background: var(--bg-card); color: var(--text); cursor: pointer; min-width: 180px;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 0.75rem center;
        }
        select:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        select:disabled { opacity: 0.5; cursor: not-allowed; }
        .error-banner { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: 0.75rem 1rem; border-radius: var(--radius); margin-bottom: 1rem; font-size: 0.875rem; }
        .empty-state { text-align: center; padding: 4rem 2rem; color: var(--text-secondary); }
        .empty-state svg { width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.4; }
        .empty-state p { font-size: 0.95rem; }
        .loading-spinner { display: inline-block; width: 20px; height: 20px; border: 2px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.6s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .loading-row { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem; color: var(--text-secondary); }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .stat-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem; transition: box-shadow 0.2s; }
        .stat-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .stat-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); }
        .stat-value { font-size: 1.75rem; font-weight: 700; }
        .stat-value.success { color: var(--success); }
        .stat-value.danger { color: var(--danger); }
        .stat-value.info { color: var(--info); }
        .stat-value.primary { color: var(--primary); }
        .stat-sub { font-size: 0.8rem; color: var(--text-secondary); }
        .charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
        .chart-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; display: flex; flex-direction: column; }
        .chart-title { font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; color: var(--text); }
        .chart-container { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 220px; position: relative; }
        canvas { max-width: 100%; }
        .filters-bar { display: flex; gap: 0.75rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem; padding: 0.75rem 1rem; background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); }
        .filter-label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; }
        .table-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
        .table-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .table-header h3 { font-size: 0.95rem; font-weight: 600; }
        .table-count { font-size: 0.8rem; color: var(--text-secondary); }
        .table-scroll { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        thead th { text-align: left; padding: 0.75rem 1rem; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-secondary); background: var(--bg); border-bottom: 1px solid var(--border); white-space: nowrap; }
        tbody td { padding: 0.75rem 1rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
        tbody tr:hover { background: #f1f5f9; }
        tbody tr:last-child td { border-bottom: none; }
        .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; }
        .badge-succeeded { background: #d1fae5; color: #065f46; }
        .badge-failed, .badge-fault { background: #fee2e2; color: #991b1b; }
        .badge-in_progress, .badge-started, .badge-queued { background: #dbeafe; color: #1e40af; }
        .badge-stopped, .badge-aborted { background: #fef3c7; color: #92400e; }
        .badge-pending_approval, .badge-approved { background: #e0e7ff; color: #3730a3; }
        .badge-timed_out { background: #fce7f3; color: #9d174d; }
        .badge-unknown, .badge-invalid, .badge-rejected { background: #f1f5f9; color: #475569; }
        .type-badge { display: inline-block; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 600; background: #f1f5f9; color: #475569; }
        .type-release { background: #ede9fe; color: #5b21b6; }
        .type-hotfix { background: #fef3c7; color: #92400e; }
        .type-launch { background: #d1fae5; color: #065f46; }
        .type-destroy { background: #fee2e2; color: #991b1b; }
        .type-plan, .type-hotfix_plan, .type-apply_plan, .type-apply_hotfix_plan { background: #dbeafe; color: #1e40af; }
        .type-custom { background: #e0e7ff; color: #3730a3; }
        .type-rollback_plan, .type-apply_rollback_plan { background: #fce7f3; color: #9d174d; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 0.5rem; padding: 1rem; border-top: 1px solid var(--border); }
        .pagination button { padding: 0.4rem 0.75rem; border: 1px solid var(--border); border-radius: var(--radius); background: var(--bg-card); color: var(--text); font-size: 0.8rem; cursor: pointer; }
        .pagination button:hover:not(:disabled) { background: var(--bg); border-color: var(--primary); }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
        .pagination span { font-size: 0.8rem; color: var(--text-secondary); }
        .legend { display: flex; flex-wrap: wrap; gap: 0.5rem 1rem; margin-top: 0.75rem; justify-content: center; }
        .legend-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; color: var(--text-secondary); }
        .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
      </style>
      <div class="dashboard">
        <div class="header">
          <h1>Release Quality Dashboard</h1>
          <div class="selectors">
            <div class="select-group">
              <label>Project</label>
              <select id="project-select" disabled><option>Loading projects...</option></select>
            </div>
            <div class="select-group">
              <label>Environment</label>
              <select id="env-select" disabled><option>Select project first</option></select>
            </div>
          </div>
        </div>
        <div id="error-banner" class="error-banner" style="display:none;"></div>
        <div id="content-area">
          <div class="empty-state" id="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p>Select a project and environment to view release data.</p>
          </div>
        </div>
      </div>
    `;
  }

  setupEventListeners() {
    this.shadowRoot.getElementById('project-select').addEventListener('change', (e) => {
      this.selectedProject = e.target.value;
      this.selectedEnvironment = '';
      this.selectedClusterId = '';
      this.deployments = [];
      this.deploymentsStats = null;
      this.clearDashboard();
      if (this.selectedProject) {
        this.fetchEnvironments(this.selectedProject);
      } else {
        this.environments = [];
        this.updateEnvDropdown();
      }
    });
    this.shadowRoot.getElementById('env-select').addEventListener('change', (e) => {
      var val = e.target.value;
      if (!val) return;
      var env = this.environments.find(function(c) {
        var name = (c.cluster && c.cluster.name) || c.clusterName || c.name;
        return name === val || c.id === val;
      });
      if (env) {
        this.selectedEnvironment = val;
        this.selectedClusterId = (env.cluster && env.cluster.id) || env.clusterId || env.id;
        this.fetchDeployments(this.selectedClusterId);
      }
    });
  }

  async fetchProjects() {
    this.isLoadingProjects = true;
    var sel = this.shadowRoot.getElementById('project-select');
    sel.innerHTML = '<option value="">Loading...</option>';
    sel.disabled = true;
    try {
      var res = await fetch('/cc-ui/v1/stacks/');
      if (!res.ok) throw new Error('Failed to load projects (' + res.status + ')');
      var data = await res.json();
      this.projects = Array.isArray(data) ? data : (data.stacks || []);
      sel.innerHTML = '<option value="">-- Select Project --</option>' + this.projects.map(function(p) { return '<option value="' + p.name + '">' + p.name + '</option>'; }).join('');
      sel.disabled = false;
    } catch (err) {
      this.showError(err.message);
      sel.innerHTML = '<option value="">Error loading projects</option>';
    } finally {
      this.isLoadingProjects = false;
    }
  }

  async fetchEnvironments(stackName) {
    this.isLoadingEnvironments = true;
    var sel = this.shadowRoot.getElementById('env-select');
    sel.innerHTML = '<option value="">Loading...</option>';
    sel.disabled = true;
    try {
      var res = await fetch('/cc-ui/v1/stacks/' + encodeURIComponent(stackName) + '/clusters-overview');
      if (!res.ok) throw new Error('Failed to load environments (' + res.status + ')');
      var data = await res.json();
      this.environments = Array.isArray(data) ? data : (data.clusters || []);
      this.updateEnvDropdown();
    } catch (err) {
      this.showError(err.message);
      sel.innerHTML = '<option value="">Error loading environments</option>';
    } finally {
      this.isLoadingEnvironments = false;
    }
  }

  updateEnvDropdown() {
    var sel = this.shadowRoot.getElementById('env-select');
    if (this.environments.length === 0) {
      sel.innerHTML = '<option value="">No environments found</option>';
      sel.disabled = true;
      return;
    }
    sel.innerHTML = '<option value="">-- Select Environment --</option>' + this.environments.map(function(e) {
      var name = (e.cluster && e.cluster.name) || e.clusterName || e.name || e.id;
      return '<option value="' + name + '">' + name + '</option>';
    }).join('');
    sel.disabled = false;
  }

  async fetchDeployments(clusterId) {
    this.isLoadingDeployments = true;
    this.showLoading();
    this.hideError();
    try {
      var res = await fetch('/cc-ui/v1/clusters/' + encodeURIComponent(clusterId) + '/deployments');
      if (!res.ok) throw new Error('Failed to load releases (' + res.status + ')');
      var data = await res.json();
      this.deployments = data.deployments || [];
      this.deploymentsStats = data.deploymentsStats || null;
      this.filterStatus = 'ALL';
      this.filterType = 'ALL';
      this.currentPage = 0;
      this.buildDashboard();
    } catch (err) {
      this.showError(err.message);
      this.clearDashboard();
    } finally {
      this.isLoadingDeployments = false;
    }
  }

  clearDashboard() {
    var content = this.shadowRoot.getElementById('content-area');
    content.innerHTML = '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.4;"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><p>Select a project and environment to view release data.</p></div>';
  }

  showLoading() {
    var content = this.shadowRoot.getElementById('content-area');
    content.innerHTML = '<div class="loading-row"><span class="loading-spinner"></span> Loading release data...</div>';
  }

  buildDashboard() {
    var content = this.shadowRoot.getElementById('content-area');
    if (this.deployments.length === 0) {
      content.innerHTML = '<div class="empty-state"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:48px;height:48px;opacity:0.4;"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg><p>No releases found for this environment.</p></div>';
      return;
    }

    var stats = this.computeStats();
    var statusCounts = this.computeStatusCounts();
    var typeCounts = this.computeTypeCounts();
    var statusOptions = Object.keys(statusCounts).sort().map(function(s) { return '<option value="' + s + '">' + s + '</option>'; }).join('');
    var typeOptions = Object.keys(typeCounts).sort().map(function(t) { return '<option value="' + t + '">' + t + '</option>'; }).join('');

    content.innerHTML =
      '<div class="stats-grid">' +
        '<div class="stat-card"><span class="stat-label">Total Releases</span><span class="stat-value primary">' + stats.total + '</span><span class="stat-sub">' + this.selectedEnvironment + '</span></div>' +
        '<div class="stat-card"><span class="stat-label">Success Rate</span><span class="stat-value success">' + stats.successRate + '%</span><span class="stat-sub">' + stats.succeeded + ' of ' + stats.total + ' succeeded</span></div>' +
        '<div class="stat-card"><span class="stat-label">Failed Releases</span><span class="stat-value danger">' + stats.failed + '</span><span class="stat-sub">' + stats.failRate + '% failure rate</span></div>' +
        '<div class="stat-card"><span class="stat-label">Avg Duration</span><span class="stat-value info">' + stats.avgDuration + '</span><span class="stat-sub">Across completed releases</span></div>' +
      '</div>' +
      '<div class="charts-row">' +
        '<div class="chart-card"><div class="chart-title">Status Distribution</div><div class="chart-container"><canvas id="status-chart" width="260" height="220"></canvas></div><div class="legend" id="status-legend"></div></div>' +
        '<div class="chart-card"><div class="chart-title">Releases by Type</div><div class="chart-container"><canvas id="type-chart" width="400" height="220"></canvas></div></div>' +
        '<div class="chart-card"><div class="chart-title">Duration Trend (Last 20)</div><div class="chart-container"><canvas id="duration-chart" width="400" height="220"></canvas></div></div>' +
      '</div>' +
      '<div class="filters-bar">' +
        '<span class="filter-label">Filter:</span>' +
        '<div class="select-group"><label>Status</label><select id="filter-status"><option value="ALL">All Statuses</option>' + statusOptions + '</select></div>' +
        '<div class="select-group"><label>Type</label><select id="filter-type"><option value="ALL">All Types</option>' + typeOptions + '</select></div>' +
      '</div>' +
      '<div class="table-card">' +
        '<div class="table-header"><h3>Release History</h3><span class="table-count" id="table-count"></span></div>' +
        '<div class="table-scroll"><table><thead><tr><th>Date</th><th>Type</th><th>Status</th><th>Duration</th><th>Triggered By</th><th>Changes</th></tr></thead><tbody id="table-body"></tbody></table></div>' +
        '<div class="pagination"><button id="prev-btn" disabled>&larr; Previous</button><span id="page-info">Page 1</span><button id="next-btn" disabled>Next &rarr;</button></div>' +
      '</div>';

    this.setupDashboardListeners();
    this.updateTable();
    this.drawStatusChart(statusCounts);
    this.drawTypeChart(typeCounts);
    this.drawDurationChart();
  }

  setupDashboardListeners() {
    var self = this;
    var filterStatus = this.shadowRoot.getElementById('filter-status');
    var filterType = this.shadowRoot.getElementById('filter-type');
    var prevBtn = this.shadowRoot.getElementById('prev-btn');
    var nextBtn = this.shadowRoot.getElementById('next-btn');
    if (filterStatus) filterStatus.addEventListener('change', function(e) { self.filterStatus = e.target.value; self.currentPage = 0; self.updateTable(); });
    if (filterType) filterType.addEventListener('change', function(e) { self.filterType = e.target.value; self.currentPage = 0; self.updateTable(); });
    if (prevBtn) prevBtn.addEventListener('click', function() { if (self.currentPage > 0) { self.currentPage--; self.updateTable(); } });
    if (nextBtn) nextBtn.addEventListener('click', function() { self.currentPage++; self.updateTable(); });
  }

  computeStats() {
    var deps = this.deployments;
    var total = deps.length;
    var succeeded = deps.filter(function(d) { return d.status === 'SUCCEEDED'; }).length;
    var failed = deps.filter(function(d) { return ['FAILED', 'FAULT', 'TIMED_OUT'].indexOf(d.status) !== -1; }).length;
    var durations = deps.filter(function(d) { return d.timeTakenInSeconds > 0; }).map(function(d) { return d.timeTakenInSeconds; });
    var avgSec = durations.length > 0 ? Math.round(durations.reduce(function(a, b) { return a + b; }, 0) / durations.length) : 0;
    return {
      total: total,
      succeeded: succeeded,
      failed: failed,
      successRate: total > 0 ? Math.round((succeeded / total) * 100) : 0,
      failRate: total > 0 ? Math.round((failed / total) * 100) : 0,
      avgDuration: this.formatDuration(avgSec)
    };
  }

  computeStatusCounts() {
    var counts = {};
    this.deployments.forEach(function(d) { var s = d.status || 'UNKNOWN'; counts[s] = (counts[s] || 0) + 1; });
    return counts;
  }

  computeTypeCounts() {
    var counts = {};
    this.deployments.forEach(function(d) { var t = d.releaseType || 'UNKNOWN'; counts[t] = (counts[t] || 0) + 1; });
    return counts;
  }

  getFilteredDeployments() {
    var self = this;
    return this.deployments.filter(function(d) {
      if (self.filterStatus !== 'ALL' && d.status !== self.filterStatus) return false;
      if (self.filterType !== 'ALL' && d.releaseType !== self.filterType) return false;
      return true;
    });
  }

  updateTable() {
    var tbody = this.shadowRoot.getElementById('table-body');
    var pageInfo = this.shadowRoot.getElementById('page-info');
    var prevBtn = this.shadowRoot.getElementById('prev-btn');
    var nextBtn = this.shadowRoot.getElementById('next-btn');
    var countEl = this.shadowRoot.getElementById('table-count');
    if (!tbody) return;

    var filtered = this.getFilteredDeployments();
    var totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));
    if (this.currentPage >= totalPages) this.currentPage = totalPages - 1;
    var start = this.currentPage * this.pageSize;
    var page = filtered.slice(start, start + this.pageSize);
    var self = this;

    if (countEl) countEl.textContent = filtered.length + ' release' + (filtered.length !== 1 ? 's' : '');

    if (page.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:2rem;color:#94a3b8;">No matching releases.</td></tr>';
    } else {
      tbody.innerHTML = page.map(function(d) {
        var changes = d.changesApplied || [];
        return '<tr>' +
          '<td>' + self.formatDate(d.createdOn) + '</td>' +
          '<td><span class="type-badge type-' + (d.releaseType || '').toLowerCase() + '">' + (d.releaseType || '-') + '</span></td>' +
          '<td><span class="badge badge-' + (d.status || '').toLowerCase() + '">' + (d.status || '-') + '</span></td>' +
          '<td>' + (d.timeTakenInSeconds > 0 ? self.formatDuration(d.timeTakenInSeconds) : '-') + '</td>' +
          '<td>' + (d.triggeredBy || '-') + '</td>' +
          '<td>' + changes.length + ' change' + (changes.length !== 1 ? 's' : '') + '</td>' +
        '</tr>';
      }).join('');
    }

    if (pageInfo) pageInfo.textContent = 'Page ' + (this.currentPage + 1) + ' of ' + totalPages;
    if (prevBtn) prevBtn.disabled = this.currentPage === 0;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages - 1;
  }

  drawStatusChart(counts) {
    var canvas = this.shadowRoot.getElementById('status-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = 260 * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '260px';
    canvas.style.height = '220px';

    var colorMap = {
      SUCCEEDED: '#10b981', FAILED: '#ef4444', FAULT: '#f97316',
      TIMED_OUT: '#ec4899', IN_PROGRESS: '#3b82f6', STARTED: '#60a5fa',
      STOPPED: '#f59e0b', ABORTED: '#d97706', QUEUED: '#8b5cf6',
      PENDING_APPROVAL: '#a78bfa', APPROVED: '#6366f1',
      UNKNOWN: '#94a3b8', INVALID: '#cbd5e1', REJECTED: '#9ca3af'
    };

    var entries = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
    var total = entries.reduce(function(s, e) { return s + e[1]; }, 0);
    if (total === 0) return;

    var cx = 130, cy = 95, outerR = 80, innerR = 50;
    var startAngle = -Math.PI / 2;

    entries.forEach(function(entry) {
      var status = entry[0], count = entry[1];
      var sliceAngle = (count / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sliceAngle);
      ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colorMap[status] || '#94a3b8';
      ctx.fill();
      startAngle += sliceAngle;
    });

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 22px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(total.toString(), cx, cy - 6);
    ctx.font = '11px -apple-system, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Total', cx, cy + 12);

    var legend = this.shadowRoot.getElementById('status-legend');
    if (legend) {
      legend.innerHTML = entries.map(function(entry) {
        return '<span class="legend-item"><span class="legend-dot" style="background:' + (colorMap[entry[0]] || '#94a3b8') + '"></span>' + entry[0] + ' (' + entry[1] + ')</span>';
      }).join('');
    }
  }

  drawTypeChart(counts) {
    var canvas = this.shadowRoot.getElementById('type-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '400px';
    canvas.style.height = '220px';

    var typeColors = {
      RELEASE: '#6366f1', HOTFIX: '#f59e0b', LAUNCH: '#10b981',
      DESTROY: '#ef4444', CUSTOM: '#8b5cf6', PLAN: '#3b82f6',
      HOTFIX_PLAN: '#d97706', APPLY_PLAN: '#2563eb', APPLY_HOTFIX_PLAN: '#b45309',
      SCALE_UP: '#059669', SCALE_DOWN: '#dc2626', MAINTENANCE: '#64748b',
      UNLOCK_STATE: '#94a3b8', TERRAFORM_EXPORT: '#475569',
      ROLLBACK_PLAN: '#ec4899', APPLY_ROLLBACK_PLAN: '#be185d'
    };

    var entries = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });
    if (entries.length === 0) return;

    var padding = { top: 15, right: 15, bottom: 40, left: 40 };
    var w = 400 - padding.left - padding.right;
    var h = 220 - padding.top - padding.bottom;
    var maxVal = Math.max.apply(null, entries.map(function(e) { return e[1]; }));
    var barWidth = Math.min(30, (w / entries.length) * 0.65);
    var gap = w / entries.length;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    var ySteps = 4;
    for (var i = 0; i <= ySteps; i++) {
      var y = padding.top + (h / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(400 - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(maxVal - (maxVal / ySteps) * i).toString(), padding.left - 6, y);
    }

    entries.forEach(function(entry, i) {
      var type = entry[0], count = entry[1];
      var x = padding.left + gap * i + (gap - barWidth) / 2;
      var barH = maxVal > 0 ? (count / maxVal) * h : 0;
      var yPos = padding.top + h - barH;
      var r = Math.min(4, barWidth / 2);

      ctx.beginPath();
      ctx.moveTo(x, yPos + r);
      ctx.arcTo(x, yPos, x + r, yPos, r);
      ctx.arcTo(x + barWidth, yPos, x + barWidth, yPos + r, r);
      ctx.lineTo(x + barWidth, padding.top + h);
      ctx.lineTo(x, padding.top + h);
      ctx.closePath();
      ctx.fillStyle = typeColors[type] || '#94a3b8';
      ctx.fill();

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(count.toString(), x + barWidth / 2, yPos - 3);

      ctx.save();
      ctx.translate(x + barWidth / 2, padding.top + h + 6);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(type, 0, 0);
      ctx.restore();
    });
  }

  drawDurationChart() {
    var canvas = this.shadowRoot.getElementById('duration-chart');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = 400 * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = '400px';
    canvas.style.height = '220px';

    var completed = this.deployments
      .filter(function(d) { return d.timeTakenInSeconds > 0 && d.createdOn; })
      .sort(function(a, b) { return new Date(a.createdOn) - new Date(b.createdOn); })
      .slice(-20);

    if (completed.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '13px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No duration data available', 200, 110);
      return;
    }

    var padding = { top: 15, right: 15, bottom: 40, left: 50 };
    var w = 400 - padding.left - padding.right;
    var h = 220 - padding.top - padding.bottom;
    var durations = completed.map(function(d) { return d.timeTakenInSeconds; });
    var maxDur = Math.max.apply(null, durations);
    var self = this;

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    var ySteps = 4;
    for (var i = 0; i <= ySteps; i++) {
      var y = padding.top + (h / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(400 - padding.right, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px -apple-system, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      var val = maxDur - (maxDur / ySteps) * i;
      ctx.fillText(self.formatDuration(Math.round(val)), padding.left - 6, y);
    }

    var stepX = completed.length > 1 ? w / (completed.length - 1) : w;
    var points = completed.map(function(d, i) {
      return {
        x: padding.left + stepX * i,
        y: padding.top + h - (maxDur > 0 ? (d.timeTakenInSeconds / maxDur) * h : 0)
      };
    });

    // Area
    ctx.beginPath();
    ctx.moveTo(points[0].x, padding.top + h);
    points.forEach(function(p) { ctx.lineTo(p.x, p.y); });
    ctx.lineTo(points[points.length - 1].x, padding.top + h);
    ctx.closePath();
    var grad = ctx.createLinearGradient(0, padding.top, 0, padding.top + h);
    grad.addColorStop(0, 'rgba(99,102,241,0.15)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    points.forEach(function(p, i) { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Dots
    var statusColors = { SUCCEEDED: '#10b981', FAILED: '#ef4444', FAULT: '#f97316' };
    points.forEach(function(p, i) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = statusColors[completed[i].status] || '#6366f1';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });

    // X labels
    var labelEvery = Math.max(1, Math.ceil(completed.length / 8));
    completed.forEach(function(d, i) {
      if (i % labelEvery !== 0 && i !== completed.length - 1) return;
      ctx.save();
      ctx.translate(points[i].x, padding.top + h + 6);
      ctx.rotate(Math.PI / 5);
      ctx.fillStyle = '#64748b';
      ctx.font = '9px -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(self.formatDateShort(d.createdOn), 0, 0);
      ctx.restore();
    });
  }

  formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '-';
    if (seconds < 60) return seconds + 's';
    if (seconds < 3600) return Math.floor(seconds / 60) + 'm ' + (seconds % 60) + 's';
    var hr = Math.floor(seconds / 3600);
    var mn = Math.floor((seconds % 3600) / 60);
    return hr + 'h ' + mn + 'm';
  }

  formatDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  formatDateShort(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  showError(msg) {
    var el = this.shadowRoot.getElementById('error-banner');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  }

  hideError() {
    var el = this.shadowRoot.getElementById('error-banner');
    if (el) el.style.display = 'none';
  }
}

customElements.define('release-quality-dashboard', ReleaseQualityDashboard);
