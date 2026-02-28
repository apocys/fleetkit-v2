/* mission-desk.js — Mission Desk controller (IIFE) */
(function () {
  'use strict';

  var AGENTS = [
    { id: 'ceo',      name: 'Sycopa',   role: 'CEO', avatar: '#avatar-ceo',      status: 'active', color: '#007AFF' },
    { id: 'atlas',    name: 'Atlas',    role: 'COO', avatar: '#avatar-atlas',    status: 'idle',   color: '#BF5AF2' },
    { id: 'forge',    name: 'Forge',    role: 'CTO', avatar: '#avatar-forge',    status: 'idle',   color: '#FF9F0A' },
    { id: 'hunter',   name: 'Hunter',   role: 'CRO', avatar: '#avatar-hunter',   status: 'idle',   color: '#FF453A' },
    { id: 'echo',     name: 'Echo',     role: 'CMO', avatar: '#avatar-echo',     status: 'idle',   color: '#0A84FF' },
    { id: 'sentinel', name: 'Sentinel', role: 'QA',  avatar: '#avatar-sentinel', status: 'idle',   color: '#30D158' }
  ];

  /* ── Helpers ────────────────────────────────────────────────────── */

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatMessage(text) {
    var s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function timeNow() {
    var d = new Date();
    return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  }

  /* ── HTML builder ───────────────────────────────────────────────── */

  function getAllAgents() {
    var all = AGENTS.slice();
    try {
      var created = JSON.parse(localStorage.getItem('spawnkit-created-agents') || '[]');
      created.forEach(function(c) {
        all.push({ id: c.id, name: c.emoji + ' ' + c.name, role: c.role || 'Custom', avatar: null, status: 'active', color: '#007AFF' });
      });
    } catch(e) {}
    return all;
  }

  function buildTeamHtml() {
    return getAllAgents().map(function (a) {
      var avatarHtml = a.avatar ?
        '<svg viewBox="0 0 48 48"><use href="' + a.avatar + '"/></svg>' :
        '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:' + (a.color || '#007AFF') + '22;border-radius:50%;">' + escapeHtml(a.name.charAt(0)) + '</div>';
      return '<div class="md-agent" data-agent-id="' + a.id + '" tabindex="0" role="button" aria-label="' + escapeHtml(a.name) + '">' +
        '<div class="md-agent-avatar">' +
          avatarHtml +
          '<span class="md-agent-status' + (a.status === 'active' ? ' md-agent-status--active' : '') + '"></span>' +
        '</div>' +
        '<div class="md-agent-name">' + escapeHtml(a.name) + '</div>' +
        '<div class="md-agent-role">' + escapeHtml(a.role) + '</div>' +
      '</div>';
    }).join('') +
    '<div class="md-agent md-agent--add" tabindex="0" role="button" aria-label="Add Agent">' +
      '<div class="md-agent-avatar"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:24px;border-radius:50%;border:2px dashed rgba(255,255,255,0.3);">+</div></div>' +
      '<div class="md-agent-name">Add Agent</div>' +
      '<div class="md-agent-role">New</div>' +
    '</div>';
  }

  function buildAgentBarHtml() {
    return AGENTS.map(function (a) {
      return '<div class="md-agent-icon" data-agent-id="' + a.id + '" tabindex="0" role="button" aria-label="' + a.name + '" title="' + a.name + ' · ' + a.role + '">' +
        '<svg viewBox="0 0 48 48"><use href="' + a.avatar + '"/></svg>' +
        '<span class="md-agent-status' + (a.status === 'active' ? ' md-agent-status--active' : '') + '"></span>' +
      '</div>';
    }).join('');
  }

  function buildHtml() {
    var sendSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
      '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

    var landing = '<div id="missionDesk" class="md-landing">' +
      '<div class="md-hero">' +
        '<h1>What do we build today?</h1>' +
        '<p>Your AI team is ready. Ask anything or pick a quick action.</p>' +
      '</div>' +
      '<div class="md-input-bar" id="missionDeskInputBar">' +
        '<input type="text" id="missionDeskInput" placeholder="Ask your team anything..." autocomplete="off" spellcheck="false" />' +
        '<button class="md-send-btn" id="missionDeskSend" aria-label="Send">' + sendSvg + '</button>' +
      '</div>' +
      '<div class="md-suggestions" id="missionDeskSuggestions">' +
        '<button class="md-chip" data-prompt="Analyze our current roadmap and priorities">📊 Analyze our roadmap</button>' +
        '<button class="md-chip" data-prompt="Draft a marketing strategy for our product launch">📣 Draft marketing plan</button>' +
        '<button class="md-chip" data-prompt="Review our security posture and find vulnerabilities">🛡️ Security audit</button>' +
        '<button class="md-chip" data-prompt="Brainstorm 5 creative feature ideas for our next sprint">💡 Brainstorm features</button>' +
      '</div>' +
      '<div class="md-section-label">Your Team</div>' +
      '<div class="md-team" id="missionDeskTeam">' + buildTeamHtml() + '</div>' +
      '<div class="md-section-label">Quick Actions</div>' +
      '<div class="md-actions" id="missionDeskActions">' +
        '<button class="md-action" data-action="missions"><span class="md-action-icon">🎯</span><span class="md-action-label">Missions</span></button>' +
        '<button class="md-action" data-action="briefing"><span class="md-action-icon">📋</span><span class="md-action-label">Daily Briefing</span></button>' +
        '<button class="md-action" data-action="boardroom"><span class="md-action-icon">🧠</span><span class="md-action-label">Boardroom</span></button>' +
        '<button class="md-action" data-action="forge"><span class="md-action-icon">🔨</span><span class="md-action-label">Skill Forge</span></button>' +
        '<button class="md-action" data-action="explore"><span class="md-action-icon">🚀</span><span class="md-action-label">Explore</span></button>' +
        '<button class="md-action" data-action="marketplace"><span class="md-action-icon">🏪</span><span class="md-action-label">Marketplace</span></button>' +
        '<button class="md-action" data-action="profile"><span class="md-action-icon">👤</span><span class="md-action-label">Creator Profile</span></button>' +
      '</div>' +
      (window.__skDemoMode ? '<div class="md-cta-wrapper" style="margin:16px 0 0;text-align:center;"><button class="md-action md-cta-primary" data-action="deploy" style="width:100%;padding:14px;font-size:14px;font-weight:600;background:linear-gradient(135deg,var(--exec-blue,#007AFF),#5856D6);color:#fff;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(0,122,255,0.3);"><span class="md-action-icon" style="margin-right:8px;">🚀</span><span class="md-action-label">Get Started</span></button></div>' : '') +





      '<div class="md-section-label">Connect Anywhere</div>' +
      '<div class="md-channels" id="missionDeskChannels">' +
        '<button class="md-channel" title="Telegram" data-connected="1"><span class="md-channel-icon">✈️</span><span class="md-channel-name">Telegram</span><span class="md-channel-status md-channel-on">Connected</span></button>' +
        '<button class="md-channel" title="WhatsApp" data-connected="1"><span class="md-channel-icon">💬</span><span class="md-channel-name">WhatsApp</span><span class="md-channel-status md-channel-on">Connected</span></button>' +
        '<button class="md-channel" title="Signal"><span class="md-channel-icon">🔒</span><span class="md-channel-name">Signal</span><span class="md-channel-status md-channel-off">Available</span></button>' +
        '<button class="md-channel" title="Discord"><span class="md-channel-icon">🎮</span><span class="md-channel-name">Discord</span><span class="md-channel-status md-channel-off">Available</span></button>' +
        '<button class="md-channel" title="iMessage"><span class="md-channel-icon">🍎</span><span class="md-channel-name">iMessage</span><span class="md-channel-status md-channel-off">Available</span></button>' +
        '<button class="md-channel" title="Slack"><span class="md-channel-icon">📡</span><span class="md-channel-name">Slack</span><span class="md-channel-status md-channel-off">Available</span></button>' +
      '</div>' +
    '</div>';

    var chat = '<div id="chatExpanded">' +
      '<div class="md-chat-header">' +
        '<button class="md-back-btn" id="chatBackBtn" aria-label="Back to Mission Desk">←</button>' +
        '<div class="md-chat-title">Mission Chat</div>' +
        '<div class="md-chat-header-spacer"></div>' +
        '<div class="md-chat-status" id="chatStatusDot">' +
          '<span class="md-agent-status md-agent-status--active md-status-dot"></span>' +
          '<span class="md-connected-label">Connected</span>' +
        '</div>' +
      '</div>' +
      '<div class="md-chat-thread" id="mdChatThread"></div>' +
      '<div class="md-agent-bar" id="chatAgentBar">' + buildAgentBarHtml() + '</div>' +
      '<div class="md-chat-input-bar">' +
        '<input type="text" id="mdChatInput" placeholder="Follow up..." autocomplete="off" spellcheck="false" />' +
        '<button class="md-send-btn" id="mdChatSend" aria-label="Send">' + sendSvg + '</button>' +
      '</div>' +
    '</div>';

    var panel = '<div id="mdPanelContainer">' +
      '<div class="md-panel-backdrop" id="mdPanelBackdrop"></div>' +
      '<div class="md-panel" id="mdPanel">' +
        '<div class="md-panel-handle"></div>' +
        '<div class="md-panel-header">' +
          '<h3 id="mdPanelTitle"></h3>' +
          '<button class="md-panel-close" id="mdPanelClose">×</button>' +
        '</div>' +
        '<div class="md-panel-body" id="mdPanelBody"></div>' +
      '</div>' +
    '</div>';

    return landing + chat + panel;
  }

  /* ── Chat rendering ─────────────────────────────────────────────── */

  function renderMdChat(history) {
    var thread = document.getElementById('mdChatThread');
    if (!thread) return;
    thread.innerHTML = history.map(function (m) {
      if (m.role === 'user') {
        return '<div class="md-msg md-msg--user"><div class="md-msg-content">' + escapeHtml(m.text) + '</div></div>';
      }
      var typingClass = m.typing ? ' md-msg--typing' : '';
      var body = m.typing
        ? '<span class="md-typing-dots"><span></span><span></span><span></span></span>'
        : formatMessage(m.text);
      return '<div class="md-msg md-msg--ai' + typingClass + '">' +
        '<div class="md-msg-avatar"><svg viewBox="0 0 48 48"><use href="#avatar-ceo"/></svg></div>' +
        '<div class="md-msg-content">' + body + '</div>' +
      '</div>';
    }).join('');
    thread.scrollTop = thread.scrollHeight;
  }

  /* ── API / send ─────────────────────────────────────────────────── */

  async function sendFromMissionDesk(text) {
    if (!text || !text.trim()) return;
    text = text.trim();
    var t = timeNow();
    var history = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');
    history.push({ role: 'user', text: text, time: t });
    localStorage.setItem('spawnkit-chat-history', JSON.stringify(history.slice(-50)));
    renderMdChat(history.concat([{ role: 'ai', text: '', time: t, typing: true }]));

    try {
      var base = window.OC_API_URL ||
        (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');
      var apiUrl = base + '/api/oc/chat';
      var token = localStorage.getItem('spawnkit-api-token') || '';
      var headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      var resp = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ message: text })
      });

      var reply;
      if (resp.ok) {
        var data = await resp.json();
        reply = data.reply ||
          (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ||
          JSON.stringify(data);
      } else {
        reply = '⚠️ Error: ' + resp.status;
      }
      history.push({ role: 'ai', text: reply, time: t });
    } catch (e) {
      history.push({ role: 'ai', text: '⚠️ ' + e.message, time: t });
    }

    localStorage.setItem('spawnkit-chat-history', JSON.stringify(history.slice(-50)));
    renderMdChat(history);
  }

  /* ── State machine ──────────────────────────────────────────────── */

  function activate(initialMessage) {
    document.body.classList.add('md-transitioning');
    setTimeout(function () {
      document.body.classList.add('md-state-chat');
      document.body.classList.remove('md-state-idle');
    }, 10);
    setTimeout(function () {
      document.body.classList.remove('md-transitioning');
      var chatInput = document.getElementById('mdChatInput');
      if (chatInput) chatInput.focus();
    }, 310);

    if (initialMessage && initialMessage.trim()) {
      var history = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');
      renderMdChat(history);
      sendFromMissionDesk(initialMessage);
    } else {
      var existing = JSON.parse(localStorage.getItem('spawnkit-chat-history') || '[]');
      renderMdChat(existing);
    }
  }

  function deactivate() {
    document.body.classList.add('md-transitioning');
    setTimeout(function () {
      document.body.classList.add('md-state-idle');
      document.body.classList.remove('md-state-chat');
    }, 10);
    setTimeout(function () {
      document.body.classList.remove('md-transitioning');
      var heroInput = document.getElementById('missionDeskInput');
      if (heroInput) heroInput.focus();
    }, 310);
  }

  /* ── Panel system ───────────────────────────────────────────────── */

  function openPanel(name) {
    if (name === 'missions') {
      if (typeof openMissionsPanel === 'function') { openMissionsPanel(); return; }
      var missionsBtn = document.getElementById('missionsBtn');
      if (missionsBtn) missionsBtn.click();
    } else if (name === 'boardroom') {
      if (typeof openMeetingPanel === 'function') { openMeetingPanel(); return; }
      var overlay = document.getElementById('meetingOverlay');
      if (overlay) { overlay.classList.add('open'); return; }
      var meetBtn = document.getElementById('meetingBtn');
      if (meetBtn) meetBtn.click();
    } else if (name === 'skills') {
      if (window.SkillForge) { window.SkillForge.open(); return; }
      var orchBtn = document.getElementById('orchBtn') || document.getElementById('addAgentBtn');
      if (orchBtn) {
        orchBtn.click();
        setTimeout(function () {
          var skillsTab = document.querySelector('[data-tab="skills"]');
          if (skillsTab) skillsTab.click();
        }, 100);
      }
    } else if (name === 'briefing') {
      if (window.openDailyBriefPanel) { window.openDailyBriefPanel(); return; }
    } else if (name === 'profile') {
      if (window.openCreatorProfilePanel) { window.openCreatorProfilePanel(); return; }
    } else if (name === 'forge') {
      if (window.SkillForge) { window.SkillForge.open(); return; }
    } else if (name === 'explore') {
      if (window.UseCaseExplorer) { window.UseCaseExplorer.open(); return; }
    } else if (name === 'deploy') {
      if (window.DeployWizard) { window.DeployWizard.open(); return; }
    } else if (name === 'marketplace') {
      if (window.SkillMarketplace) { window.SkillMarketplace.open(); return; }
      if (typeof openMarketplace === 'function') {
        openMarketplace();
      } else {
        var mktBtn = document.getElementById('addAgentBtn');
        if (mktBtn) mktBtn.click();
      }
    }
  }

  function closePanel() {
    var panel = document.getElementById('mdPanel');
    var backdrop = document.getElementById('mdPanelBackdrop');
    if (panel) panel.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  /* ── Agent tile click ───────────────────────────────────────────── */

  function handleAgentClick(agentId) {
    // Prefer openDetailPanel directly (handles all agents including CEO)
    if (typeof openDetailPanel === 'function') {
      openDetailPanel(agentId);
      return;
    }
    // Fallback: proxy click through exec-room tiles
    var existing = document.querySelector('[data-agent="' + agentId + '"]');
    if (existing && typeof existing.click === 'function') {
      existing.click();
    }
  }

  /* ── Send button visibility ─────────────────────────────────────── */

  function bindSendVisibility(input, btn) {
    function update() {
      btn.classList.toggle('md-send-btn--visible', input.value.length > 0);
    }
    input.addEventListener('input', update);
    update();
  }

  /* ── Init ───────────────────────────────────────────────────────── */

  function init() {
    console.log('[MissionDesk] init() called');
    console.log('[MissionDesk] token:', localStorage.getItem('spawnkit-token') ? 'present' : 'MISSING');
    console.log('[MissionDesk] instance-url:', localStorage.getItem('spawnkit-instance-url') || 'default');
    console.log('[MissionDesk] onboarded:', localStorage.getItem('spawnkit-onboarded') ? 'yes' : 'no');
    /* Onboarding guard removed — always show Mission Desk (Kira 2026-02-28) */

    /* Find container */
    var container = document.querySelector('.exec-container');
    if (!container) return;

    /* Inject HTML before exec-floor */
    var floor = container.querySelector('.exec-floor');
    var wrapper = document.createElement('div');
    wrapper.className = 'md-root';
    wrapper.innerHTML = buildHtml();
    container.insertBefore(wrapper, floor || null);

    /* Hide legacy chrome */
    var toggle = document.querySelector('.exec-view-toggle');
    var statusbar = document.querySelector('.exec-statusbar');
    var gridView = document.getElementById('gridView');
    if (toggle) toggle.classList.add('md-hidden');
    if (statusbar) statusbar.classList.add('md-hidden');
    if (gridView) gridView.classList.add('md-hidden');

    /* Initial state */
    document.body.classList.add('md-state-idle');

    /* Refs */
    var heroInput  = document.getElementById('missionDeskInput');
    var heroSend   = document.getElementById('missionDeskSend');
    var chatInput  = document.getElementById('mdChatInput');
    var chatSend   = document.getElementById('mdChatSend');
    var backBtn    = document.getElementById('chatBackBtn');
    var panelClose = document.getElementById('mdPanelClose');
    var backdrop   = document.getElementById('mdPanelBackdrop');

    /* Send visibility */
    if (heroInput && heroSend) bindSendVisibility(heroInput, heroSend);
    if (chatInput && chatSend) bindSendVisibility(chatInput, chatSend);

    /* Hero input */
    heroInput && heroInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && heroInput.value.trim()) {
        var msg = heroInput.value.trim();
        heroInput.value = '';
        activate(msg);
      }
    });
    heroSend && heroSend.addEventListener('click', function () {
      if (heroInput && heroInput.value.trim()) {
        var msg = heroInput.value.trim();
        heroInput.value = '';
        activate(msg);
      }
    });

    /* Suggestion chips */
    document.querySelectorAll('.md-chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        activate(chip.getAttribute('data-prompt'));
      });
    });

    /* Chat back */
    backBtn && backBtn.addEventListener('click', deactivate);

    /* Chat input */
    chatInput && chatInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && chatInput.value.trim()) {
        var msg = chatInput.value.trim();
        chatInput.value = '';
        chatInput.dispatchEvent(new Event('input'));
        sendFromMissionDesk(msg);
      }
    });
    chatSend && chatSend.addEventListener('click', function () {
      if (chatInput && chatInput.value.trim()) {
        var msg = chatInput.value.trim();
        chatInput.value = '';
        chatInput.dispatchEvent(new Event('input'));
        sendFromMissionDesk(msg);
      }
    });

    /* Quick actions */
    document.querySelectorAll('.md-action').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openPanel(btn.getAttribute('data-action'));
      });
    });

    /* Agent tiles (team row) */
    document.querySelectorAll('#missionDeskTeam .md-agent').forEach(function (tile) {
      if (tile.classList.contains('md-agent--add')) {
        // Add Agent tile → open wizard
        tile.addEventListener('click', function () {
          if (typeof window.openAddAgentWizard === 'function') window.openAddAgentWizard();
        });
        tile.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            if (typeof window.openAddAgentWizard === 'function') window.openAddAgentWizard();
          }
        });
      } else {
        tile.addEventListener('click', function () {
          handleAgentClick(tile.getAttribute('data-agent-id'));
        });
        tile.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') handleAgentClick(tile.getAttribute('data-agent-id'));
        });
      }
    });

    /* Agent icons (chat bar) */
    document.querySelectorAll('#chatAgentBar .md-agent-icon').forEach(function (icon) {
      icon.addEventListener('click', function () {
        handleAgentClick(icon.getAttribute('data-agent-id'));
      });
      icon.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') handleAgentClick(icon.getAttribute('data-agent-id'));
      });
    });

    /* Panel close */
    panelClose && panelClose.addEventListener('click', closePanel);
    backdrop   && backdrop.addEventListener('click', closePanel);

    /* Public API */
    window.MissionDesk = {
      activate:    activate,
      deactivate:  deactivate,
      openPanel:   openPanel,
      closePanel:  closePanel,
      sendMessage: sendFromMissionDesk,
      refreshTeam: function() {
        var teamEl = document.getElementById('missionDeskTeam');
        if (teamEl) teamEl.innerHTML = buildTeamHtml();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());


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

// FIX 4: Daily Brief Panel
window.openDailyBriefPanel = function() {
  var existing = document.getElementById('dailyBriefOverlay');
  if (existing) existing.remove();
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
          '<p style="margin:0;color:var(--text-tertiary,#8E8E93);font-size:13px;">Your daily executive summary</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83c\udfaf Priority Tasks</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">Your top priorities and active missions will appear here when connected to a live relay.</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;margin-bottom:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udcca Fleet Status</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">Agent performance and system health overview.</p>' +
        '</div>' +
        '<div style="background:var(--bg-secondary,rgba(0,0,0,0.02));padding:16px;border-radius:12px;border:1px solid var(--border-subtle,rgba(0,0,0,0.06));">' +
          '<h4 style="margin:0 0 8px;font-size:14px;font-weight:600;">\ud83d\udd2e Today\u2019s Plan</h4>' +
          '<p style="margin:0;color:var(--text-secondary,#636366);font-size:13px;">Upcoming scheduled tasks and automation runs.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(o);
  document.getElementById('dailyBriefClose').onclick = function() { o.remove(); };
  o.querySelector('.cron-backdrop').onclick = function() { o.remove(); };
};

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
