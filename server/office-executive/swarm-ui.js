(function () {
  'use strict';

  var API_TOKEN = localStorage.getItem('spawnkit-api-token') || '';
  var pollInterval = null;
  var lastSubagents = [];
  var collapsed = false;

  var CSS = `
.md-swarm-badge{display:flex;align-items:center;gap:8px;padding:8px 16px;border-radius:12px;background:linear-gradient(135deg,rgba(0,122,255,0.08),rgba(48,209,88,0.08));border:1px solid rgba(0,122,255,0.15);font-size:13px;font-weight:500;color:var(--text-secondary,#48484A);cursor:pointer;transition:all 200ms;margin-top:16px}
.md-swarm-badge:hover{border-color:var(--exec-blue,#007AFF);transform:translateY(-1px)}
.md-swarm-pulse{width:8px;height:8px;border-radius:50%;background:#30D158;animation:mdSwarmPulse 1.5s ease-in-out infinite}
@keyframes mdSwarmPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(0.8)}}
.md-swarm-count{font-weight:700;color:var(--exec-blue,#007AFF)}
.md-swarm-panel{margin:0 20px 8px;border-radius:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));background:var(--bg-secondary,#fff);overflow:hidden;transition:all 300ms}
.md-swarm-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-size:12px;font-weight:600;color:var(--text-secondary,#48484A);border-bottom:1px solid var(--border-subtle,rgba(0,0,0,0.06))}
.md-swarm-toggle{background:none;border:none;cursor:pointer;font-size:12px;color:var(--text-tertiary,#636366);transition:transform 200ms}
.md-swarm-toggle.collapsed{transform:rotate(-90deg)}
.md-swarm-list{padding:8px}
.md-swarm-list.collapsed{display:none}
.md-swarm-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;transition:background 200ms}
.md-swarm-item:hover{background:var(--bg-tertiary,#F5F5F7)}
.md-swarm-item-icon{width:28px;height:28px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
.md-swarm-item-icon.active{background:rgba(48,209,88,0.12)}
.md-swarm-item-icon.done{background:rgba(0,122,255,0.12)}
.md-swarm-item-icon.idle{background:rgba(142,142,147,0.12)}
.md-swarm-item-info{flex:1;min-width:0}
.md-swarm-item-name{font-size:13px;font-weight:600;color:var(--text-primary,#1C1C1E);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.md-swarm-item-meta{font-size:11px;color:var(--text-tertiary,#636366);margin-top:2px}
.md-swarm-progress{width:100%;height:4px;border-radius:2px;background:var(--bg-tertiary,#F5F5F7);margin-top:4px;overflow:hidden}
.md-swarm-progress-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,#007AFF,#30D158);transition:width 500ms var(--ease-smooth,ease)}
.md-swarm-empty{padding:16px;text-align:center;font-size:12px;color:var(--text-tertiary,#636366)}
`;

  function getApiUrl() {
    return window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai')
      ? window.location.origin : 'http://127.0.0.1:8222');
  }

  async function fetchSubagents() {
    try {
      var url = getApiUrl() + '/api/oc/sessions';
      var resp;
      if (window.ThemeAuth) {
        resp = await ThemeAuth.fetch(url);
      } else {
        var headers = {};
        if (API_TOKEN) headers['Authorization'] = 'Bearer ' + API_TOKEN;
        resp = await fetch(url, { headers: headers });
      }
      if (!resp.ok) return [];
      var data = await resp.json();
      return (Array.isArray(data) ? data : []).filter(function (s) { return s.kind === 'subagent'; });
    } catch (e) { return []; }
  }

  function timeAgo(ts) {
    if (!ts) return '';
    var diff = Date.now() - ts;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
    return Math.floor(diff / 86400000) + 'd ago';
  }

  function estimateProgress(sa) {
    if (sa.status === 'active') {
      return Math.max(10, Math.min(95, Math.floor((sa.totalTokens || 0) / 500)));
    }
    return 100;
  }

  function renderList(subagents) {
    var list = document.getElementById('mdSwarmList');
    if (!list) return;
    subagents.sort(function (a, b) {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
    var visible = subagents.slice(0, 8);
    if (visible.length === 0) {
      list.innerHTML = '<div class="md-swarm-empty">No sub-agents yet. Start a mission to spawn your swarm.</div>';
      return;
    }
    list.innerHTML = visible.map(function (sa) {
      var isActive = sa.status === 'active';
      var pct = estimateProgress(sa);
      var icon = isActive ? '⚡' : '✅';
      var cls = isActive ? 'active' : 'done';
      var name = sa.label || sa.displayName || (sa.key || '').split(':').pop().slice(0, 8) || 'agent';
      var model = sa.model || 'unknown';
      var tokens = sa.totalTokens ? (sa.totalTokens / 1000).toFixed(1) + 'K tokens' : '';
      var meta = [model, tokens, timeAgo(sa.lastActive)].filter(Boolean).join(' · ');
      return '<div class="md-swarm-item">' +
        '<div class="md-swarm-item-icon ' + cls + '">' + icon + '</div>' +
        '<div class="md-swarm-item-info">' +
          '<div class="md-swarm-item-name">' + name + '</div>' +
          '<div class="md-swarm-item-meta">' + meta + '</div>' +
          (isActive ? '<div class="md-swarm-progress"><div class="md-swarm-progress-bar" style="width:' + pct + '%"></div></div>' : '') +
        '</div></div>';
    }).join('');
  }

  function updateBadge(subagents) {
    var badge = document.getElementById('mdSwarmBadge');
    if (!badge) return;
    var active = subagents.filter(function (s) { return s.status === 'active'; });
    if (active.length > 0) {
      badge.style.display = 'flex';
      badge.querySelector('.md-swarm-count').textContent = active.length;
      badge.querySelector('.md-swarm-count').nextSibling.textContent = ' agents working';
    } else if (subagents.length > 0) {
      badge.style.display = 'flex';
      badge.querySelector('.md-swarm-count').textContent = subagents.length;
      badge.querySelector('.md-swarm-count').nextSibling.textContent = ' completed';
    } else {
      badge.style.display = 'none';
    }
  }

  function updatePanel(subagents) {
    var panel = document.getElementById('mdSwarmPanel');
    if (!panel) return;
    var active = subagents.filter(function (s) { return s.status === 'active'; });
    panel.style.display = subagents.length > 0 ? 'block' : 'none';
    var header = panel.querySelector('.md-swarm-header span');
    if (header) {
      header.textContent = active.length > 0
        ? '⚡ Active Swarm (' + active.length + ' working)'
        : '✅ Swarm Complete (' + subagents.length + ' tasks)';
    }
    renderList(subagents);
  }

  async function poll() {
    var subs = await fetchSubagents();
    lastSubagents = subs;
    updateBadge(subs);
    updatePanel(subs);
  }

  function init() {
    if (!document.querySelector('.exec-container')) return;

    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    var actions = document.getElementById('missionDeskActions');
    if (actions && actions.parentNode) {
      var badge = document.createElement('div');
      badge.className = 'md-swarm-badge';
      badge.id = 'mdSwarmBadge';
      badge.style.display = 'none';
      badge.innerHTML = '<span class="md-swarm-pulse"></span><span class="md-swarm-count">0</span> agents working';
      badge.addEventListener('click', function () {
        if (typeof openMeetingPanel === 'function') { openMeetingPanel(); return; }
        if (window.MissionDesk) window.MissionDesk.activate();
      });
      actions.parentNode.insertBefore(badge, actions.nextSibling);
    }

    var agentBar = document.getElementById('chatAgentBar');
    if (agentBar && agentBar.parentNode) {
      var panel = document.createElement('div');
      panel.className = 'md-swarm-panel';
      panel.id = 'mdSwarmPanel';
      panel.style.display = 'none';
      panel.innerHTML =
        '<div class="md-swarm-header"><span>⚡ Active Swarm</span>' +
        '<button class="md-swarm-toggle" id="mdSwarmToggle">▼</button></div>' +
        '<div class="md-swarm-list" id="mdSwarmList"></div>';
      agentBar.parentNode.insertBefore(panel, agentBar);
      panel.querySelector('#mdSwarmToggle').addEventListener('click', function () {
        collapsed = !collapsed;
        this.classList.toggle('collapsed', collapsed);
        document.getElementById('mdSwarmList').classList.toggle('collapsed', collapsed);
      });
    }

    poll();
    pollInterval = setInterval(poll, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
