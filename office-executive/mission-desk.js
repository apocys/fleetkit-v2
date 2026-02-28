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
      (window.__skDemoMode ? '<div class="md-cta-wrapper" style="margin:16px 0 0;text-align:center;">' : '') +
        (window.__skDemoMode ? '<button class="md-action md-cta-primary" data-action="deploy" style="width:100%;padding:14px;font-size:14px;font-weight:600;background:linear-gradient(135deg,var(--exec-blue,#007AFF),#5856D6);color:#fff;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;box-shadow:0 4px 16px rgba(0,122,255,0.3);">' +
          '<span class="md-action-icon" style="margin-right:8px;">🚀</span><span class="md-action-label">Get Started</span>' +
        '</button>' +
      '</div>' +
      '<div class="md-section-label">Connect Anywhere</div>' +
      '<div class="md-channels" id="missionDeskChannels">' +
        '<div class="md-channel" title="Telegram"><span class="md-channel-icon">✈️</span><span class="md-channel-name">Telegram</span><span class="md-channel-status md-channel-on">Connected</span></div>' +
        '<div class="md-channel" title="WhatsApp"><span class="md-channel-icon">💬</span><span class="md-channel-name">WhatsApp</span><span class="md-channel-status md-channel-on">Connected</span></div>' +
        '<div class="md-channel" title="Signal"><span class="md-channel-icon">🔒</span><span class="md-channel-name">Signal</span><span class="md-channel-status md-channel-off">Available</span></div>' +
        '<div class="md-channel" title="Discord"><span class="md-channel-icon">🎮</span><span class="md-channel-name">Discord</span><span class="md-channel-status md-channel-off">Available</span></div>' +
        '<div class="md-channel" title="iMessage"><span class="md-channel-icon">🍎</span><span class="md-channel-name">iMessage</span><span class="md-channel-status md-channel-off">Available</span></div>' +
        '<div class="md-channel" title="Slack"><span class="md-channel-icon">📡</span><span class="md-channel-name">Slack</span><span class="md-channel-status md-channel-off">Available</span></div>' +
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
        if (window.ChannelOnboarding && window.ChannelOnboarding.open) {
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
