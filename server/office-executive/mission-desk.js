/* mission-desk.js — Mission Desk controller (KISS refactor)
 *
 * HTML is static in index.html. This file only does:
 * 1. Populate dynamic content (user avatar, team grid, agent bar, chat resume)
 * 2. Bind event listeners
 * 3. Manage state transitions (idle ↔ chat)
 * 4. Handle API calls (chat)
 */
(function () {
  'use strict';

  /* ── Config ─────────────────────────────────────────────────────── */

  var AGENTS = [
    { id: 'ceo',      name: 'ApoMac',   role: 'CEO', avatar: '#avatar-ceo',      status: 'active', color: '#007AFF' },
    { id: 'atlas',    name: 'Atlas',    role: 'COO', avatar: '#avatar-atlas',    status: 'idle',   color: '#BF5AF2' },
    { id: 'forge',    name: 'Forge',    role: 'CTO', avatar: '#avatar-forge',    status: 'idle',   color: '#FF9F0A' },
    { id: 'hunter',   name: 'Hunter',   role: 'CRO', avatar: '#avatar-hunter',   status: 'idle',   color: '#FF453A' },
    { id: 'echo',     name: 'Echo',     role: 'CMO', avatar: '#avatar-echo',     status: 'idle',   color: '#0A84FF' },
    { id: 'sentinel', name: 'Sentinel', role: 'QA',  avatar: '#avatar-sentinel', status: 'idle',   color: '#30D158' }
  ];

  /* ── Helpers ─────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmt(text) {
    var s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    return s.replace(/\n/g, '<br>');
  }

  function timeNow() {
    var d = new Date();
    return d.getHours().toString().padStart(2,'0') + ':' + d.getMinutes().toString().padStart(2,'0');
  }

  function $(id) { return document.getElementById(id); }

  /* ── Dynamic content renderers ──────────────────────────────────── */

  function getAllAgents() {
    var all = AGENTS.slice();
    try {
      var created = JSON.parse(localStorage.getItem('spawnkit-created-agents') || '[]');
      created.forEach(function(c) {
        all.push({ id: c.id, name: (c.emoji||'') + ' ' + c.name, role: c.role || 'Custom', avatar: null, status: 'active', color: '#007AFF' });
      });
    } catch(e) {}
    return all;
  }

  function renderTeamGrid(container) {
    if (!container) return;
    container.innerHTML = getAllAgents().map(function(a) {
      var av = a.avatar
        ? '<svg viewBox="0 0 48 48"><use href="' + a.avatar + '"/></svg>'
        : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:' + (a.color||'#007AFF') + '22;border-radius:50%;">' + esc(a.name.charAt(0)) + '</div>';
      return '<button class="md-agent" data-agent-id="' + a.id + '" aria-label="' + esc(a.name) + '">' +
        '<div class="md-agent-avatar">' + av +
          '<span class="md-agent-status' + (a.status==='active' ? ' md-agent-status--active' : '') + '"></span>' +
        '</div>' +
        '<div class="md-agent-name">' + esc(a.name) + '</div>' +
        '<div class="md-agent-role">' + esc(a.role) + '</div>' +
      '</button>';
    }).join('') +
    '<button class="md-agent md-agent--add" aria-label="Add Agent">' +
      '<div class="md-agent-avatar"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;border-radius:50%;border:2px dashed rgba(255,255,255,0.3);">+</div></div>' +
      '<div class="md-agent-name">Add Agent</div>' +
      '<div class="md-agent-role">New</div>' +
    '</button>';
    bindTeamClicks(container);
  }

  function renderAgentBar(container) {
    if (!container) return;
    container.innerHTML = AGENTS.map(function(a) {
      return '<button class="md-agent-icon" data-agent-id="' + a.id + '" aria-label="' + a.name + '" title="' + a.name + ' · ' + a.role + '">' +
        '<svg viewBox="0 0 48 48"><use href="' + a.avatar + '"/></svg>' +
        '<span class="md-agent-status' + (a.status==='active' ? ' md-agent-status--active' : '') + '"></span>' +
      '</button>';
    }).join('');
    container.querySelectorAll('.md-agent-icon').forEach(function(icon) {
      icon.addEventListener('click', function() { handleAgentClick(icon.dataset.agentId); });
    });
  }

  function renderUserAvatar() {
    var el = $('mdUserAvatar');
    if (!el) return;
    var name = localStorage.getItem('spawnkit-user-name') || 'User';
    var img = localStorage.getItem('spawnkit-user-avatar') || '';
    if (img) {
      el.innerHTML = '<img src="' + esc(img) + '" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;" />';
    } else {
      el.textContent = name.charAt(0).toUpperCase();
    }
  }

  function updateChatResumeBtn() {
    var btn = $('mdChatResumeBtn');
    var preview = $('mdChatResumePreview');
    if (!btn) return;
    var history = [];
    try { history = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]'); } catch(e) {}
    if (history.length > 0) {
      btn.style.display = '';
      if (preview) {
        var last = '';
        for (var i = history.length - 1; i >= 0; i--) {
          if (history[i].role === 'ai' && history[i].text) { last = history[i].text; break; }
        }
        preview.textContent = last ? last.substring(0, 40) + (last.length > 40 ? '...' : '') : 'Continue chat';
      }
    } else {
      btn.style.display = 'none';
    }
  }

  /* ── Chat rendering ─────────────────────────────────────────────── */

  function renderChat(history) {
    var thread = $('mdChatThread');
    if (!thread) return;
    thread.innerHTML = history.map(function(m) {
      if (m.role === 'user') {
        return '<div class="md-msg md-msg--user"><div class="md-msg-content">' + esc(m.text) + '</div></div>';
      }
      var body = m.typing
        ? '<span class="md-typing-dots"><span></span><span></span><span></span></span>'
        : fmt(m.text);
      return '<div class="md-msg md-msg--ai' + (m.typing ? ' md-msg--typing' : '') + '">' +
        '<div class="md-msg-avatar"><svg viewBox="0 0 48 48"><use href="#avatar-ceo"/></svg></div>' +
        '<div class="md-msg-content">' + body + '</div></div>';
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  /* ── API ─────────────────────────────────────────────────────────── */

  async function sendMessage(text) {
    if (!text || !text.trim()) return;
    text = text.trim();
    var t = timeNow();
    var history = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');
    history.push({ role: 'user', text: text, time: t });
    localStorage.setItem('spawnkit-chat-history', JSON.stringify(history.slice(-50)));
    renderChat(history.concat([{ role: 'ai', text: '', time: t, typing: true }]));

    try {
      var base = window.OC_API_URL || window.location.origin;
      var token = localStorage.getItem('spawnkit-api-token') || '';
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      var resp = await fetch(base + '/api/oc/chat', {
        method: 'POST', headers: headers,
        body: JSON.stringify({ message: text })
      });

      var reply;
      if (resp.ok) {
        var data = await resp.json();
        reply = data.reply || (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || JSON.stringify(data);
      } else {
        reply = '⚠️ Error: ' + resp.status;
      }
      history.push({ role: 'ai', text: reply, time: t });
    } catch(e) {
      history.push({ role: 'ai', text: '⚠️ ' + e.message, time: t });
    }

    localStorage.setItem('spawnkit-chat-history', JSON.stringify(history.slice(-50)));
    renderChat(history);
  }

  /* ── State transitions ──────────────────────────────────────────── */

  function activate(initialMessage) {
    document.body.classList.add('md-transitioning');
    setTimeout(function() {
      document.body.classList.add('md-state-chat');
      document.body.classList.remove('md-state-idle');
    }, 10);
    setTimeout(function() {
      document.body.classList.remove('md-transitioning');
      var input = $('mdChatInput');
      if (input) input.focus();
    }, 310);

    var history = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');
    renderChat(history);
    if (initialMessage && initialMessage.trim()) sendMessage(initialMessage);
  }

  function deactivate() {
    document.body.classList.add('md-transitioning');
    setTimeout(function() {
      document.body.classList.add('md-state-idle');
      document.body.classList.remove('md-state-chat');
    }, 10);
    setTimeout(function() {
      document.body.classList.remove('md-transitioning');
      var input = $('missionDeskInput');
      if (input) input.focus();
    }, 310);
    updateChatResumeBtn();
  }

  /* ── Panel routing ──────────────────────────────────────────────── */

  var panelRoutes = {
    missions: function() {
      var b = $('orchestrationBtn'); if (b) { b.click(); setTimeout(function() { var t = document.querySelector('.orch-tab[data-tab="missions"]'); if (t) t.click(); }, 160); return; }
      if (typeof openMissionsPanel === 'function') { openMissionsPanel(); return; }
      var m = $('missionsBtn'); if (m) m.click();
    },
    boardroom: function() {
      if (typeof openMeetingPanel === 'function') { openMeetingPanel(); return; }
      var o = $('meetingOverlay'); if (o) { o.classList.add('open'); return; }
    },
    forge: function() { if (window.SkillForge) window.SkillForge.open(); },
    explore: function() { if (window.UseCaseExplorer) window.UseCaseExplorer.open(); },
    briefing: function() { if (window.openDailyBriefPanel) window.openDailyBriefPanel(); },
    profile: function() { if (window.openCreatorProfilePanel) window.openCreatorProfilePanel(); },
    communications: function() {
      if (typeof window.openMailbox === 'function') { window.openMailbox('messages'); return; }
      var b = $('mailboxBtn'); if (b) b.click();
    },
    deploy: function() { if (window.DeployWizard) window.DeployWizard.open(); },
    marketplace: function() {
      if (window.SkillMarketplace) { window.SkillMarketplace.open(); return; }
      if (typeof openMarketplace === 'function') { openMarketplace(); return; }
      var b = $('addAgentBtn'); if (b) b.click();
    }
  };

  function openPanel(name) { if (panelRoutes[name]) panelRoutes[name](); }

  /* ── Agent click ────────────────────────────────────────────────── */

  function handleAgentClick(agentId) {
    if (agentId === 'ceo' && typeof window.openMissionControl === 'function') { window.openMissionControl(); return; }
    if (typeof window.openDetailPanel === 'function') { window.openDetailPanel(agentId); return; }
    var el = document.querySelector('[data-agent="' + agentId + '"]');
    if (el) el.click();
  }

  function bindTeamClicks(container) {
    container.querySelectorAll('.md-agent').forEach(function(tile) {
      if (tile.classList.contains('md-agent--add')) {
        tile.addEventListener('click', function() { if (typeof window.openAddAgentWizard === 'function') window.openAddAgentWizard(); });
      } else {
        tile.addEventListener('click', function() { handleAgentClick(tile.dataset.agentId); });
      }
    });
  }

  /* ── Send button visibility ─────────────────────────────────────── */

  function bindSendVisibility(input, btn) {
    if (!input || !btn) return;
    function update() { btn.classList.toggle('md-send-btn--visible', input.value.length > 0); }
    input.addEventListener('input', update);
    update();
  }

  /* ── User menu dropdown ─────────────────────────────────────────── */

  function showUserMenu(btnEl) {
    var existing = $('mdUserDropdown');
    if (existing) { existing.remove(); return; }

    var rect = btnEl.getBoundingClientRect();
    var dd = document.createElement('div');
    dd.id = 'mdUserDropdown';
    dd.style.cssText = 'position:fixed;top:' + (rect.bottom+6) + 'px;right:' + (window.innerWidth-rect.right) + 'px;background:var(--bg-primary,#fff);border:1px solid var(--border-subtle,rgba(0,0,0,0.1));border-radius:12px;padding:4px;min-width:180px;box-shadow:0 8px 32px rgba(0,0,0,0.12);z-index:10010;';
    dd.innerHTML = [
      { icon: '🎨', label: 'Change Theme', action: 'theme' },
      { icon: '⚙️', label: 'Settings', action: 'settings' },
      { icon: '🚪', label: 'Logout', action: 'logout' }
    ].map(function(it) {
      return '<div class="md-dropdown-item" data-action="' + it.action + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;border-radius:8px;cursor:pointer;color:var(--text-primary,#1c1c1e);">' +
        '<span>' + it.icon + '</span><span>' + it.label + '</span></div>';
    }).join('');

    document.body.appendChild(dd);

    dd.addEventListener('click', function(ev) {
      var item = ev.target.closest('[data-action]');
      if (!item) return;
      dd.remove();
      var act = item.dataset.action;
      if (act === 'theme') {
        var tp = $('themePickerOverlay');
        if (tp) tp.classList.add('open');
      } else if (act === 'settings') {
        var sb = $('settingsBtn'); if (sb) sb.click();
      } else if (act === 'logout') {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i);
          if (k && k.indexOf('spawnkit') === 0) keys.push(k);
        }
        keys.forEach(function(k) { localStorage.removeItem(k); });
        sessionStorage.clear();
        window.location.reload();
      }
    });

    setTimeout(function() {
      document.addEventListener('click', function close() {
        var d = $('mdUserDropdown'); if (d) d.remove();
        document.removeEventListener('click', close);
      });
    }, 10);
  }

  /* ── Connectivity check ─────────────────────────────────────────── */

  function checkConnectivity() {
    setTimeout(function() {
      var base = window.OC_API_URL || window.location.origin;
      (window.skFetch || fetch)(base + '/api/oc/sessions').then(function(r) {
        if (!r.ok) throw new Error('');
        return r.json();
      }).then(function() {
        var b = $('mdConnectBanner'); if (b) b.style.display = 'none';
      }).catch(function() {
        var b = $('mdConnectBanner'); if (b) b.style.display = 'flex';
      });
    }, 1500);
  }

  /* ── Init ────────────────────────────────────────────────────────── */

  function init() {
    console.log('[MissionDesk] init (KISS)');

    // Hide legacy elements
    ['exec-view-toggle', 'exec-statusbar'].forEach(function(cls) {
      var el = document.querySelector('.' + cls);
      if (el) el.classList.add('md-hidden');
    });
    var gv = $('gridView'); if (gv) gv.classList.add('md-hidden');

    // Set initial state
    document.body.classList.add('md-state-idle');

    // Populate dynamic content
    renderUserAvatar();
    renderTeamGrid($('missionDeskTeam'));
    renderAgentBar($('chatAgentBar'));
    updateChatResumeBtn();
    checkConnectivity();

    // Demo mode CTA — only show if NOT connected to a real instance
    var isConnected = !!localStorage.getItem('spawnkit-token') || localStorage.getItem('spawnkit-connected-once') === '1';
    if (window.__skDemoMode && !isConnected) {
      var actions = $('missionDeskActions');
      if (actions) {
        var cta = document.createElement('div');
        cta.style.cssText = 'margin:16px 0 0;text-align:center;';
        cta.innerHTML = '<button class="md-action md-cta-primary" data-action="deploy" style="width:100%;padding:14px;font-size:14px;font-weight:600;background:linear-gradient(135deg,var(--exec-blue,#007AFF),#5856D6);color:#fff;border:none;border-radius:12px;cursor:pointer;box-shadow:0 4px 16px rgba(0,122,255,0.3);">🚀 Get Started</button>';
        actions.parentNode.insertBefore(cta, actions.nextSibling);
      }
    }

    // Connect button
    var connectBtn = $('mdConnectBtn');
    if (connectBtn) connectBtn.addEventListener('click', function() { if (typeof window.openSettingsPanel === 'function') window.openSettingsPanel(); });

    // Refs
    var heroInput = $('missionDeskInput'), heroSend = $('missionDeskSend');
    var chatInput = $('mdChatInput'), chatSend = $('mdChatSend');

    // Send button visibility
    bindSendVisibility(heroInput, heroSend);
    bindSendVisibility(chatInput, chatSend);

    // Chat resume
    var resumeBtn = $('mdChatResumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', function() { activate(); });

    // Hero input
    if (heroInput) heroInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && heroInput.value.trim()) { var msg = heroInput.value.trim(); heroInput.value = ''; activate(msg); }
    });
    if (heroSend) heroSend.addEventListener('click', function() {
      if (heroInput && heroInput.value.trim()) { var msg = heroInput.value.trim(); heroInput.value = ''; activate(msg); }
    });

    // Suggestion chips
    document.querySelectorAll('.md-chip').forEach(function(chip) {
      chip.addEventListener('click', function() {
        if (chip.dataset.prompt && heroInput) { heroInput.value = chip.dataset.prompt; heroInput.dispatchEvent(new Event('input')); heroInput.focus(); }
      });
    });

    // Chat back
    var backBtn = $('chatBackBtn');
    if (backBtn) backBtn.addEventListener('click', deactivate);

    // Chat send
    if (chatInput) chatInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && chatInput.value.trim()) { var msg = chatInput.value.trim(); chatInput.value = ''; chatInput.dispatchEvent(new Event('input')); sendMessage(msg); }
    });
    if (chatSend) chatSend.addEventListener('click', function() {
      if (chatInput && chatInput.value.trim()) { var msg = chatInput.value.trim(); chatInput.value = ''; chatInput.dispatchEvent(new Event('input')); sendMessage(msg); }
    });

    // Quick actions
    document.querySelectorAll('.md-action').forEach(function(btn) {
      btn.addEventListener('click', function() { openPanel(btn.dataset.action); });
    });

    // Panel close
    var panelClose = $('mdPanelClose'), backdrop = $('mdPanelBackdrop');
    function closePanel() { var p = $('mdPanel'); if (p) p.classList.remove('open'); var b = $('mdPanelBackdrop'); if (b) b.classList.remove('open'); }
    if (panelClose) panelClose.addEventListener('click', closePanel);
    if (backdrop) backdrop.addEventListener('click', closePanel);

    // User menu
    var userMenu = $('mdUserMenu');
    if (userMenu) userMenu.addEventListener('click', function(e) { e.stopPropagation(); showUserMenu(userMenu); });

    // Public API
    window.MissionDesk = { activate: activate, deactivate: deactivate, openPanel: openPanel, sendMessage: sendMessage, refreshTeam: function() { renderTeamGrid($('missionDeskTeam')); } };
    window.refreshMissionDeskTeam = function() { renderTeamGrid($('missionDeskTeam')); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
// ═══ Kira Fixes 2026-02-28 ═══


// Channel Status Panel — Awwward-quality Channel Card
window.openChannelStatusPanel = function(channelId, displayName) {
  var existing = document.getElementById('channelStatusOverlay');
  if (existing) existing.remove();

  var themes = {
    telegram:  { icon:'\u2708\uFE0F', grad:'linear-gradient(135deg, #0088cc 0%, #29b6f6 100%)', accent:'#0088cc', label:'Telegram Bot' },
    whatsapp:  { icon:'\uD83D\uDCAC', grad:'linear-gradient(135deg, #128c7e 0%, #25d366 100%)', accent:'#25d366', label:'WhatsApp Bridge' },
    signal:    { icon:'\uD83D\uDD12', grad:'linear-gradient(135deg, #2c6bed 0%, #6b9aff 100%)', accent:'#2c6bed', label:'Signal Bridge' },
    discord:   { icon:'\uD83C\uDFAE', grad:'linear-gradient(135deg, #5865F2 0%, #7983F5 100%)', accent:'#5865F2', label:'Discord Bot' },
    imessage:  { icon:'\uD83C\uDF4E', grad:'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)', accent:'#007AFF', label:'iMessage Bridge' },
    slack:     { icon:'\uD83D\uDCE1', grad:'linear-gradient(135deg, #4A154B 0%, #611f69 100%)', accent:'#611f69', label:'Slack App' }
  };
  var t = themes[channelId] || { icon:'\uD83D\uDCE1', grad:'linear-gradient(135deg, #667 0%, #999 100%)', accent:'#667', label:'Channel' };

  var o = document.createElement('div');
  o.id = 'channelStatusOverlay';
  o.style.cssText = 'position:fixed;inset:0;z-index:10002;display:flex;align-items:center;justify-content:center;animation:chCardFadeIn .2s ease';
  o.innerHTML =
    '<style>' +
      '@keyframes chCardFadeIn{from{opacity:0}to{opacity:1}}' +
      '@keyframes chCardSlideUp{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}' +
      '@keyframes chPulse{0%,100%{opacity:1}50%{opacity:.5}}' +
      '.ch-card-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.45);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}' +
      '.ch-card{position:relative;width:420px;max-width:92vw;max-height:85vh;border-radius:20px;overflow:hidden;background:var(--bg-primary,#fff);box-shadow:0 25px 80px rgba(0,0,0,.25),0 0 0 1px rgba(255,255,255,.1);animation:chCardSlideUp .3s cubic-bezier(.2,.9,.3,1)}' +
      '.ch-hero{padding:28px 24px 22px;color:#fff;position:relative;overflow:hidden}' +
      '.ch-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(circle at 80% 20%,rgba(255,255,255,.15) 0%,transparent 60%)}' +
      '.ch-hero-row{display:flex;align-items:center;gap:16px;position:relative;z-index:1}' +
      '.ch-hero-icon{font-size:40px;width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.2);border-radius:16px;backdrop-filter:blur(10px)}' +
      '.ch-hero-info h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-.3px}' +
      '.ch-hero-info p{margin:2px 0 0;font-size:13px;opacity:.85;font-weight:500}' +
      '.ch-status-pill{display:inline-flex;align-items:center;gap:6px;margin-top:12px;padding:5px 12px;border-radius:20px;background:rgba(255,255,255,.2);backdrop-filter:blur(10px);font-size:12px;font-weight:600;color:#fff;position:relative;z-index:1}' +
      '.ch-status-dot{width:8px;height:8px;border-radius:50%;background:#4ade80;animation:chPulse 2s ease-in-out infinite;box-shadow:0 0 8px rgba(74,222,128,.6)}' +
      '.ch-body{padding:20px 20px 24px}' +
      '.ch-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}' +
      '.ch-stat{background:var(--bg-secondary,rgba(0,0,0,.03));border-radius:14px;padding:14px 12px;text-align:center;border:1px solid var(--border-subtle,rgba(0,0,0,.05))}' +
      '.ch-stat-val{font-size:20px;font-weight:700;color:var(--text-primary,#1D1D1F);letter-spacing:-.3px}' +
      '.ch-stat-label{font-size:11px;font-weight:600;color:var(--text-tertiary,#8E8E93);text-transform:uppercase;letter-spacing:.5px;margin-top:2px}' +
      '.ch-activity{margin-bottom:16px}' +
      '.ch-activity-title{font-size:12px;font-weight:600;color:var(--text-tertiary,#8E8E93);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}' +
      '.ch-msg{display:flex;gap:10px;padding:10px 12px;border-radius:12px;background:var(--bg-secondary,rgba(0,0,0,.03));margin-bottom:6px;border:1px solid var(--border-subtle,rgba(0,0,0,.04))}' +
      '.ch-msg-dot{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;color:#fff;font-weight:700}' +
      '.ch-msg-body{flex:1;min-width:0}' +
      '.ch-msg-text{font-size:13px;color:var(--text-primary,#1D1D1F);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.ch-msg-time{font-size:11px;color:var(--text-tertiary,#8E8E93);margin-top:1px}' +
      '.ch-config{border-top:1px solid var(--border-subtle,rgba(0,0,0,.06));margin-top:4px;padding-top:12px}' +
      '.ch-config-toggle{display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:6px 0;font-size:13px;font-weight:600;color:var(--text-secondary,#636366);background:none;border:none;width:100%;text-align:left}' +
      '.ch-config-toggle:hover{color:var(--text-primary,#1D1D1F)}' +
      '.ch-config-body{display:none;padding:10px 0 0}' +
      '.ch-config-body.open{display:block}' +
      '.ch-config-row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;border-bottom:1px solid var(--border-subtle,rgba(0,0,0,.03))}' +
      '.ch-config-row:last-child{border:none}' +
      '.ch-config-key{color:var(--text-tertiary,#8E8E93)}' +
      '.ch-config-val{font-weight:500;color:var(--text-primary,#1D1D1F);max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
      '.ch-actions{display:flex;gap:8px;margin-top:16px}' +
      '.ch-btn-primary{flex:1;padding:13px;font-size:14px;font-weight:600;color:#fff;border:none;border-radius:12px;cursor:pointer;transition:all .2s;box-shadow:0 4px 12px rgba(0,0,0,.15)}' +
      '.ch-btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.2)}' +
      '.ch-btn-ghost{flex:1;padding:13px;font-size:14px;font-weight:600;color:var(--text-primary,#1D1D1F);background:var(--bg-secondary,rgba(0,0,0,.04));border:1px solid var(--border-subtle,rgba(0,0,0,.08));border-radius:12px;cursor:pointer;transition:all .2s}' +
      '.ch-btn-ghost:hover{background:var(--bg-tertiary,rgba(0,0,0,.08))}' +
    '</style>' +
    '<div class="ch-card-backdrop"></div>' +
    '<div class="ch-card">' +
      '<div class="ch-hero" style="background:' + t.grad + '">' +
        '<div class="ch-hero-row">' +
          '<div class="ch-hero-icon">' + t.icon + '</div>' +
          '<div class="ch-hero-info">' +
            '<h2>' + displayName + '</h2>' +
            '<p>' + t.label + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="ch-status-pill"><span class="ch-status-dot"></span> Connected & Active</div>' +
      '</div>' +
      '<div class="ch-body" id="channelCardBody">' +
        '<div class="ch-stats">' +
          '<div class="ch-stat"><div class="ch-stat-val">\u2014</div><div class="ch-stat-label">Messages</div></div>' +
          '<div class="ch-stat"><div class="ch-stat-val">\u2714</div><div class="ch-stat-label">Status</div></div>' +
          '<div class="ch-stat"><div class="ch-stat-val">\u2014</div><div class="ch-stat-label">Policy</div></div>' +
        '</div>' +
        '<div class="ch-activity">' +
          '<div class="ch-activity-title">Loading\u2026</div>' +
        '</div>' +
      '</div>' +
    '</div>';

  document.body.appendChild(o);
  o.querySelector('.ch-card-backdrop').onclick = function() { o.remove(); };

  // Fetch real config
  fetch('/api/oc/config').then(function(r) { return r.json(); }).then(function(config) {
    var ch = (config.channels || {})[channelId] || {};
    var body = document.getElementById('channelCardBody');
    if (!body) return;

    var policyShort = ch.dmPolicy === 'open' ? 'Open' : ch.dmPolicy === 'allowlist' ? 'Private' : 'Default';

    // Update stats
    var stats = body.querySelectorAll('.ch-stat');
    if (stats[0]) { stats[0].querySelector('.ch-stat-val').textContent = 'Live'; }
    if (stats[1]) { stats[1].querySelector('.ch-stat-val').textContent = '\u2705'; stats[1].querySelector('.ch-stat-label').textContent = 'Healthy'; }
    if (stats[2]) { stats[2].querySelector('.ch-stat-val').textContent = policyShort; stats[2].querySelector('.ch-stat-label').textContent = 'Access'; }

    // Build config details
    var configRows = '';
    if (channelId === 'telegram') {
      configRows += '<div class="ch-config-row"><span class="ch-config-key">Bot</span><span class="ch-config-val">@Apocys_bot</span></div>';
      configRows += '<div class="ch-config-row"><span class="ch-config-key">Streaming</span><span class="ch-config-val">' + (ch.streaming || 'Off') + '</span></div>';
    }
    if (channelId === 'whatsapp') {
      configRows += '<div class="ch-config-row"><span class="ch-config-key">Self-chat</span><span class="ch-config-val">' + (ch.selfChatMode ? 'Enabled' : 'Disabled') + '</span></div>';
      configRows += '<div class="ch-config-row"><span class="ch-config-key">Max media</span><span class="ch-config-val">' + (ch.mediaMaxMb || '?') + ' MB</span></div>';
    }
    configRows += '<div class="ch-config-row"><span class="ch-config-key">DM Policy</span><span class="ch-config-val">' + (ch.dmPolicy || 'default') + '</span></div>';
    configRows += '<div class="ch-config-row"><span class="ch-config-key">Group Policy</span><span class="ch-config-val">' + (ch.groupPolicy || 'default') + '</span></div>';
    var allowed = (ch.allowFrom || []).join(', ') || '\u2014';
    configRows += '<div class="ch-config-row"><span class="ch-config-key">Allow list</span><span class="ch-config-val" title="' + allowed + '">' + allowed + '</span></div>';

    // Recent activity placeholder
    var activityHtml = '<div class="ch-activity">' +
      '<div class="ch-activity-title">Recent Activity</div>' +
      '<div class="ch-msg"><div class="ch-msg-dot" style="background:' + t.accent + '">' + t.icon + '</div><div class="ch-msg-body"><div class="ch-msg-text">Channel active \u2014 receiving messages</div><div class="ch-msg-time">Just now</div></div></div>' +
    '</div>';

    // Config accordion
    var configHtml = '<div class="ch-config">' +
      '<button class="ch-config-toggle" id="chConfigToggle">\u2699\uFE0F Configuration <span id="chConfigArrow">\u203A</span></button>' +
      '<div class="ch-config-body" id="chConfigBody">' + configRows + '</div>' +
    '</div>';

    // Actions
    var actionsHtml = '<div class="ch-actions">' +
      '<button class="ch-btn-primary" style="background:' + t.grad + '" onclick="document.getElementById(\'channelStatusOverlay\').remove()">\uD83D\uDCAC Open Chat</button>' +
      '<button class="ch-btn-ghost" onclick="if(window.ChannelOnboarding&&window.ChannelOnboarding.open){document.getElementById(\'channelStatusOverlay\').remove();window.ChannelOnboarding.open(\'' + channelId + '\');}">\u2699\uFE0F Configure</button>' +
    '</div>';

    body.innerHTML = body.querySelector('.ch-stats').outerHTML + activityHtml + configHtml + actionsHtml;

    // Toggle config accordion
    document.getElementById('chConfigToggle').onclick = function() {
      var b = document.getElementById('chConfigBody');
      var a = document.getElementById('chConfigArrow');
      b.classList.toggle('open');
      a.textContent = b.classList.contains('open') ? '\u2039' : '\u203A';
    };
  }).catch(function() {
    var body = document.getElementById('channelCardBody');
    if (!body) return;
    var act = body.querySelector('.ch-activity');
    if (act) act.innerHTML = '<div class="ch-activity-title">Could not load config</div>';
  });
};

// FIX 3: Channel button click handlers
(function() {
  function attachChannelClicks() {
    var channels = document.querySelectorAll('#missionDeskChannels .md-channel');
    channels.forEach(function(ch) {
      if (ch.dataset.clickBound) return;
      ch.dataset.clickBound = '1';
      ch.style.cursor = 'pointer';
      ch.addEventListener('click', function() {
        var name = ch.getAttribute('title');
        if (!name) return;
        var channelId = name.toLowerCase();
        console.log('[MissionDesk] Channel click:', channelId);
        var isConnected = ch.hasAttribute('data-connected');
        if (isConnected) {
          if (window.openChannelStatusPanel) window.openChannelStatusPanel(channelId, name);
        } else if (window.ChannelOnboarding && window.ChannelOnboarding.open) {
          window.ChannelOnboarding.open(channelId);
        }
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(attachChannelClicks, 1000); });
  } else {
    setTimeout(attachChannelClicks, 1000);
  }
  new MutationObserver(function() { attachChannelClicks(); }).observe(document.body, { childList: true, subtree: true });
})();

// FIX 4: Daily Brief Panel — wired to live data
window.openDailyBriefPanel = function() {
  var existing = document.getElementById('dailyBriefOverlay');
  if (existing) existing.remove();

  var data = window.SpawnKit && window.SpawnKit.data || {};
  var todoRaw = data.todo || '';
  var sessions = data.sessions || [];
  var crons = data.crons || [];
  var agents = data.agents || [];
  var memory = data.memory || [];

  // Build priority tasks from TODO.md
  var taskHtml = '';
  if (todoRaw) {
    var todoLines = todoRaw.split('\n');
    var tasks = [];
    var inActive = false;
    for (var i = 0; i < todoLines.length; i++) {
      var line = todoLines[i];
      if (/^## /.test(line) && /Active/i.test(line)) { inActive = true; continue; }
      if (/^## /.test(line) && inActive) break;
      if (inActive && /^\s*[-*]/.test(line)) {
        var isDone = line.indexOf('\u2705') >= 0;
        var text = line.replace(/^\s*[-*]\s*/, '').replace(/[\u2705\u2B1C]/g, '').replace(/\*\*/g, '').trim();
        if (text && text.length > 2) {
          tasks.push({done: isDone, text: text.substring(0, 80)});
        }
      }
    }
    taskHtml = tasks.length > 0 ? tasks.slice(0, 10).map(function(t) {
      return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,0.06));">' +
        '<span style="font-size:14px;">' + (t.done ? '\u2705' : '\u2B1C') + '</span>' +
        '<span style="font-size:13px;color:var(--text-primary,#fff);' + (t.done ? 'opacity:0.5;text-decoration:line-through;' : '') + '">' + _esc(t.text) + '</span></div>';
    }).join('') : '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">No active tasks.</p>';
  } else {
    taskHtml = '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">Connect to see tasks.</p>';
  }

  // Build crons summary
  var cronHtml = '';
  if (crons.length > 0) {
    cronHtml = crons.slice(0, 6).map(function(c) {
      var name = c.label || c.schedule || 'Cron';
      var sched = c.schedule || c.cron || '';
      var status = c.enabled === false ? '⏸' : '✅';
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border-subtle,rgba(255,255,255,0.06));">' +
        '<span style="font-size:13px;">' + status + ' ' + _esc(name) + '</span>' +
        '<span style="font-size:11px;color:var(--text-tertiary,#8E8E93);">' + _esc(sched) + '</span></div>';
    }).join('');
  } else {
    cronHtml = '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">No scheduled jobs.</p>';
  }

  // Build fleet status
  var fleetHtml = '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;text-align:center;">' +
    '<div style="padding:12px;background:rgba(52,199,89,0.1);border-radius:10px;"><div style="font-size:24px;font-weight:700;color:#34C759;">' + agents.length + '</div><div style="font-size:11px;color:var(--text-tertiary,#8E8E93);">Agents</div></div>' +
    '<div style="padding:12px;background:rgba(0,122,255,0.1);border-radius:10px;"><div style="font-size:24px;font-weight:700;color:#007AFF;">' + sessions.length + '</div><div style="font-size:11px;color:var(--text-tertiary,#8E8E93);">Sessions</div></div>' +
    '<div style="padding:12px;background:rgba(255,159,10,0.1);border-radius:10px;"><div style="font-size:24px;font-weight:700;color:#FF9F0A;">' + crons.length + '</div><div style="font-size:11px;color:var(--text-tertiary,#8E8E93);">Cron Jobs</div></div>' +
  '</div>';

  var o = document.createElement('div');
  o.id = 'dailyBriefOverlay';
  o.className = 'cron-overlay open';
  o.style.zIndex = '10002';
  o.innerHTML =
    '<div class="cron-backdrop"></div>' +
    '<div class="cron-panel" style="max-width:600px;max-height:80vh;">' +
      '<div class="cron-header">' +
        '<div class="cron-title"><span>\ud83d\udccb</span> Daily Brief</div>' +
        '<button class="cron-close" id="dailyBriefClose">\u00d7</button>' +
      '</div>' +
      '<div class="cron-body" style="padding:24px;max-height:60vh;overflow-y:auto;">' +
        '<div style="margin-bottom:20px;">' +
          '<h3 style="margin:0 0 4px;font-size:18px;font-weight:700;">Today\u2019s Focus</h3>' +
          '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">Live executive summary \u2014 ' + new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'}) + '</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udcca Fleet Status</h4>' +
          fleetHtml +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83c\udfaf Priority Tasks</h4>' +
          taskHtml +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udd2e Scheduled Jobs</h4>' +
          cronHtml +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(o);
  document.getElementById('dailyBriefClose').onclick = function() { o.remove(); };
  o.querySelector('.cron-backdrop').onclick = function() { o.remove(); };
};

function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function _timeAgo(ts) {
  var d = new Date(ts); var now = Date.now(); var diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now'; if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago'; return Math.floor(diff/86400) + 'd ago';
}

// FIX 5: Creator Profile Panel
window.openCreatorProfilePanel = function() {
  var existing = document.getElementById('creatorProfileOverlay');
  if (existing) existing.remove();
  var o = document.createElement('div');
  o.id = 'creatorProfileOverlay';
  o.className = 'cron-overlay open';
  o.style.zIndex = '10002';
  o.innerHTML =
    '<div class="cron-backdrop"></div>' +
    '<div class="cron-panel" style="max-width:600px;max-height:80vh;">' +
      '<div class="cron-header">' +
        '<div class="cron-title"><span>\ud83d\udc64</span> Creator Profile</div>' +
        '<button class="cron-close" id="creatorProfileClose">\u00d7</button>' +
      '</div>' +
      '<div class="cron-body" style="padding:24px;max-height:60vh;overflow-y:auto;">' +
        '<div style="text-align:center;margin-bottom:24px;">' +
          '<div style="width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,var(--exec-blue,#007AFF),#5856D6);margin:0 auto 12px;display:flex;align-items:center;justify-content:center;font-size:32px;color:white;">\ud83c\udfe2</div>' +
          '<h3 style="margin:0 0 4px;font-size:20px;font-weight:700;">Executive Officer</h3>' +
          '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">SpawnKit Creator</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\u26a1 Workspace Settings</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">Configure your fleet preferences and defaults.</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udd27 Fleet Configuration</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">Manage your agents, skills, and automation rules.</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udcca Analytics & Usage</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">View your productivity metrics and fleet insights.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(o);
  document.getElementById('creatorProfileClose').onclick = function() { o.remove(); };
  o.querySelector('.cron-backdrop').onclick = function() { o.remove(); };
};
