(function () {
  'use strict';

  /* ── API & Auth ─────────────────────────────────────────────────── */
  var API_URL = window.OC_API_URL ||
    (window.location.hostname.includes('spawnkit.ai')
      ? window.location.origin
      : 'http://127.0.0.1:8222');

  function skF(url, opts) {
    return (window.skFetch || fetch)(url, opts);
  }

  /* ── Helpers ────────────────────────────────────────────────────── */
  function escMc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function mdToHtml(text) {
    if (!text) return '';
    var s = escMc(text);
    // code blocks first (triple backtick)
    s = s.replace(/```([\s\S]*?)```/g, function (_, c) {
      return '<pre class="mc-code-block"><code>' + c + '</code></pre>';
    });
    // inline code
    s = s.replace(/`([^`]+)`/g, '<code class="mc-inline-code">$1</code>');
    // bold
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // links [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // unordered list lines starting with "- "
    s = s.replace(/((?:^|\n)- .+)+/g, function (block) {
      var items = block.split('\n').filter(function (l) { return l.trim().indexOf('- ') === 0; });
      var lis = items.map(function (l) { return '<li>' + l.trim().slice(2) + '</li>'; }).join('');
      return '<ul class="mc-msg-list">' + lis + '</ul>';
    });
    // paragraph breaks
    s = s.replace(/\n\n/g, '<br><br>');
    s = s.replace(/\n/g, '<br>');
    return s;
  }

  function fmtTokens(n) {
    if (!n) return '';
    return Number(n).toLocaleString() + ' tokens';
  }

  function fmtTime(ts) {
    if (!ts) return '';
    try {
      var d = new Date(ts);
      var now = new Date();
      var diff = (now - d) / 1000;
      if (diff < 60) return 'just now';
      if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
      if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
      return d.toLocaleDateString();
    } catch (e) { return ''; }
  }

  function scrollToBottom(el) {
    if (el) el.scrollTop = el.scrollHeight;
  }

  /* ── DOM refs ───────────────────────────────────────────────────── */
  var elCenter    = document.getElementById('mcCenter');
  var elTabs      = document.getElementById('mcCenterTabs');
  var elTitle     = document.getElementById('mcCenterTitle');
  var elBody      = document.getElementById('mcCenterBody');
  var elInput     = document.getElementById('mcCenterInput');
  var elTextarea  = document.getElementById('mcChatInput');
  var elSend      = document.getElementById('mcSend');
  var elModelLabel = document.getElementById('mcModelLabel');

  if (!elBody) return; // guard: panel not in DOM

  /* ── State ──────────────────────────────────────────────────────── */
  var currentTab = 'chat';
  var currentMission = null;
  var currentAgent = null; // { id, name, avatar } — null means main session
  var isSending = false;

  /* ── Agent chat routing ─────────────────────────────────────────── */
  var AGENT_DEFS = {
    ceo:      { name: 'Sycopa',   avatar: '#avatar-ceo',      role: 'CEO' },
    sycopa:   { name: 'Sycopa',   avatar: '#avatar-ceo',      role: 'CEO' },
    atlas:    { name: 'Atlas',    avatar: '#avatar-atlas',    role: 'Navigator' },
    forge:    { name: 'Forge',    avatar: '#avatar-forge',    role: 'Builder' },
    hunter:   { name: 'Hunter',   avatar: '#avatar-hunter',   role: 'Scout' },
    echo:     { name: 'Echo',     avatar: '#avatar-echo',     role: 'Communicator' },
    sentinel: { name: 'Sentinel', avatar: '#avatar-sentinel', role: 'Guardian' }
  };

  function selectAgent(agentId) {
    if (!agentId || agentId === 'main') {
      currentAgent = null;
      if (elTitle) elTitle.innerHTML = 'Mission Control <span class="mc-chevron">⌄</span>';
    } else {
      var def = AGENT_DEFS[agentId];
      if (!def) return;
      currentAgent = { id: agentId, name: def.name, avatar: def.avatar, role: def.role };
      if (elTitle) {
        elTitle.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;">' +
          '<svg width="20" height="20" viewBox="0 0 48 48" style="flex-shrink:0;"><use href="' + escMc(def.avatar) + '"/></svg>' +
          escMc(def.name) + '</span> <span class="mc-chevron">⌄</span>';
      }
    }
    setTab('chat');
  }

  // Listen for agent selection events from detail panel / mission desk
  document.addEventListener('mc:select-agent', function (e) {
    if (e.detail && e.detail.id) selectAgent(e.detail.id);
  });

  // Expose for other scripts
  window.McSelectAgent = selectAgent;

  /* ── Model label ────────────────────────────────────────────────── */
  function updateModelLabel() {
    if (!elModelLabel) return;
    var model = localStorage.getItem('spawnkit-model') || 'Opus 4.6';
    elModelLabel.textContent = model;
  }
  updateModelLabel();

  /* ── Scroll-to-bottom button ────────────────────────────────────── */
  var scrollBtn = document.createElement('button');
  scrollBtn.className = 'mc-scroll-bottom';
  scrollBtn.title = 'Scroll to bottom';
  scrollBtn.innerHTML = '&#8595;';
  scrollBtn.style.display = 'none';
  if (elCenter) elCenter.appendChild(scrollBtn);

  scrollBtn.addEventListener('click', function () {
    scrollToBottom(elBody);
  });

  if (elBody) {
    elBody.addEventListener('scroll', function () {
      var atBottom = elBody.scrollTop + elBody.clientHeight >= elBody.scrollHeight - 40;
      scrollBtn.style.display = atBottom ? 'none' : 'flex';
    });
  }

  /* ── Tab switching ──────────────────────────────────────────────── */
  function setTab(tab) {
    currentTab = tab;
    // update tab bar classes
    if (elTabs) {
      var tabs = elTabs.querySelectorAll('.mc-tab');
      for (var i = 0; i < tabs.length; i++) {
        var t = tabs[i];
        if (t.dataset.tab === tab) {
          t.classList.add('active');
        } else {
          t.classList.remove('active');
        }
      }
    }
    // show/hide input area
    if (elInput) {
      elInput.style.display = (tab === 'chat') ? '' : 'none';
    }
    // load content
    if (tab === 'chat') loadChat();
    else if (tab === 'orchestration') loadOrchestration();
    else if (tab === 'remote') loadRemote();
  }

  if (elTabs) {
    elTabs.addEventListener('click', function (e) {
      var tab = e.target && e.target.dataset && e.target.dataset.tab;
      if (tab) setTab(tab);
    });
  }

  /* ── Loading / error states ─────────────────────────────────────── */
  function showLoading() {
    elBody.innerHTML = '<div class="mc-loading"><span class="mc-spinner"></span> Loading…</div>';
  }

  function showError(msg) {
    elBody.innerHTML = '<div class="mc-error">' + escMc(msg) + '</div>';
  }

  /* ── Per-Mission Chat Storage ─────────────────────────────────── */
  var CHAT_STORE_KEY = 'mc-chats';

  function getMissionMessages(missionId) {
    try {
      var store = JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '{}');
      return store[missionId || 'current'] || [];
    } catch (e) { return []; }
  }

  function saveMissionMessage(missionId, role, content) {
    try {
      var store = JSON.parse(localStorage.getItem(CHAT_STORE_KEY) || '{}');
      var id = missionId || 'current';
      if (!store[id]) store[id] = [];
      store[id].push({ role: role, content: content, ts: Date.now() });
      // Keep max 200 messages per mission
      if (store[id].length > 200) store[id] = store[id].slice(-200);
      localStorage.setItem(CHAT_STORE_KEY, JSON.stringify(store));
    } catch (e) { console.warn('[MC] Save failed:', e); }
  }

  /* ── Chat Tab ───────────────────────────────────────────────────── */
  function isSystemMessage(m) {
    // Filter out heartbeats, system prompts, internal signals
    if (!m) return false;
    var role = String(m.role || '').toLowerCase();
    if (role === 'system') return true;
    var content = m.content || '';
    if (Array.isArray(content)) content = content.map(function(c){ return c.text || c.content || ''; }).join(' ');
    var c = String(content).trim();
    if (!c) return true;
    var systemPatterns = [
      'HEARTBEAT_OK', 'NO_REPLY', 'Read HEARTBEAT.md',
      '[System Message]', 'A scheduled reminder has been triggered',
      'STATUS UPDATE FOR KIRA', 'STALL CHECK', 'MANDATORY CHECKS',
      'Handle this reminder internally', 'cron-event'
    ];
    for (var i = 0; i < systemPatterns.length; i++) {
      if (c.indexOf(systemPatterns[i]) !== -1) return true;
    }
    return false;
  }

  function renderMessages(messages) {
    if (!messages || !messages.length) {
      elBody.innerHTML = '<div class="mc-empty" style="padding:48px 24px;">' +
        '<div style="font-size:24px;margin-bottom:8px;">💬</div>' +
        'Start a conversation.<br>' +
        '<span style="font-size:12px;color:var(--mc-text-dim);">Type a message below or use /mission for a guided flow.</span></div>';
      return;
    }
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      if (isSystemMessage(m)) continue;
      var role = String(m.role || 'assistant').toUpperCase();
      var content = m.content || '';
      if (Array.isArray(content)) {
        content = content.map(function (c) { return c.text || c.content || ''; }).join('\n');
      }
      var roleClass = role === 'USER' ? 'mc-msg--user' : 'mc-msg--assistant';
      html += '<div class="mc-msg ' + roleClass + '">' +
        '<div class="mc-msg-role mc-role-' + role.toLowerCase() + '">' + escMc(role) + '</div>' +
        '<div class="mc-msg-content">' + mdToHtml(content) + '</div>' +
        '</div>';
    }
    if (!html) {
      elBody.innerHTML = '<div class="mc-empty" style="padding:48px 24px;">' +
        '<div style="font-size:24px;margin-bottom:8px;">💬</div>' +
        'Start a conversation.<br>' +
        '<span style="font-size:12px;color:var(--mc-text-dim);">Type a message below or use /mission for a guided flow.</span></div>';
      return;
    }
    elBody.innerHTML = html;
    scrollToBottom(elBody);
  }

  function loadChat() {
    var missionId = currentMission ? currentMission.id : 'current';

    // First: load local messages for this mission
    var localMsgs = getMissionMessages(missionId);

    if (missionId === 'current' && localMsgs.length === 0) {
      // For "Current Session", also try to load from API (main session transcript)
      showLoading();
      skF(API_URL + '/api/oc/chat')
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (data) {
          var msgs = data && data.messages ? data.messages : (Array.isArray(data) ? data : []);
          if (msgs.length > 0) {
            renderMessages(msgs);
          } else {
            renderMessages([]);
          }
        })
        .catch(function () {
          renderMessages([]);
        });
    } else {
      // Per-mission: show local messages
      renderMessages(localMsgs);
    }
  }

  /* ── Orchestration Tab ──────────────────────────────────────────── */
  var agentEmoji = { main: '🎭', agent: '🛡️', subagent: '🔧', default: '🤖' };

  function agentIcon(s) {
    return agentEmoji[s && s.type] || agentEmoji.default;
  }

  function statusBadge(status) {
    var cls = 'mc-badge mc-badge--' + (status || 'idle').toLowerCase();
    return '<span class="' + cls + '">' + escMc(status || 'idle') + '</span>';
  }

  function renderAgentTree(sessions) {
    if (!sessions || !sessions.length) {
      return '<div class="mc-empty" style="padding:24px;text-align:center;color:var(--mc-text-muted);">No agents running.</div>';
    }

    // Parse OpenClaw session keys: agent:main:main, agent:main:subagent:uuid
    var mainSession = null;
    var subAgents = [];
    var otherAgents = [];

    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i];
      var key = s.key || '';
      if (key === 'agent:main:main') {
        mainSession = s;
      } else if (key.indexOf('subagent') !== -1) {
        subAgents.push(s);
      } else if (key.indexOf('agent:') === 0) {
        otherAgents.push(s);
      }
      // Skip crons, whatsapp groups, etc.
    }

    // Sort sub-agents by last active (newest first)
    subAgents.sort(function(a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });

    function fmtTok(n) { return n ? n.toLocaleString() : '0'; }

    function renderRow(s, isSub) {
      var name = s.label || s.displayName || s.key || 'unknown';
      // Clean up name: remove "telegram:g-agent-main-" prefix
      name = name.replace(/^telegram:g-/, '').replace(/^agent-main-/, '');
      var status = s.status || (s.abortedLastRun ? 'aborted' : 'idle');
      var tokens = s.totalTokens || 0;
      var model = s.model || '';
      var channel = s.lastChannel || s.channel || '';

      var html = '<div class="mc-agent-item' + (isSub ? ' mc-agent-sub' : '') + '" data-session-key="' + escMc(s.key || '') + '">';
      html += '<span class="mc-agent-emoji">' + (isSub ? '🔧' : '🎭') + '</span>';
      html += '<span class="mc-agent-name">' + escMc(name) + '</span>';
      html += statusBadge(status);
      if (tokens > 0) html += '<span class="mc-agent-tokens">' + fmtTok(tokens) + ' tok</span>';
      html += '</div>';

      // Detail row
      if (model || channel) {
        html += '<div style="margin-left:' + (isSub ? '52px' : '32px') + ';font-size:11px;color:var(--mc-text-muted);margin-bottom:4px;">';
        if (model) html += escMc(model.split('/').pop());
        if (model && channel) html += ' · ';
        if (channel) html += escMc(channel);
        if (s.updatedAt) html += ' · ' + timeAgo(s.updatedAt);
        html += '</div>';
      }
      return html;
    }

    var out = '<div class="mc-agent-tree">';

    // Main session
    if (mainSession) {
      out += renderRow(mainSession, false);
    }

    // Sub-agents (limit to 20 most recent)
    if (subAgents.length > 0) {
      out += '<div style="margin:12px 0 6px 0;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--mc-text-muted);letter-spacing:0.5px;">Sub-Agents (' + subAgents.length + ')</div>';
      var limit = Math.min(subAgents.length, 20);
      for (var j = 0; j < limit; j++) {
        out += renderRow(subAgents[j], true);
      }
      if (subAgents.length > 20) {
        out += '<div style="padding:8px 32px;font-size:12px;color:var(--mc-text-muted);">+ ' + (subAgents.length - 20) + ' more</div>';
      }
    }

    // Other named agents
    if (otherAgents.length > 0) {
      out += '<div style="margin:12px 0 6px 0;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--mc-text-muted);letter-spacing:0.5px;">Other Agents</div>';
      for (var k = 0; k < otherAgents.length; k++) {
        out += renderRow(otherAgents[k], false);
      }
    }

    out += '</div>';
    return out;
  }

  function loadOrchestration() {
    showLoading();
    skF(API_URL + '/api/oc/sessions')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var sessions = data.sessions || data || [];
        elBody.innerHTML = renderAgentTree(sessions);
        // agent click → load sub-transcript
        var rows = elBody.querySelectorAll('.mc-agent-item');
        for (var i = 0; i < rows.length; i++) {
          rows[i].addEventListener('click', function () {
            var sid = this.dataset.sessionId;
            if (sid) loadAgentTranscript(sid);
          });
        }
      })
      .catch(function (err) {
        showError('Could not load sessions: ' + err.message);
      });
  }

  function loadAgentTranscript(sessionId) {
    var prev = elBody.innerHTML;
    elBody.innerHTML = '<div class="mc-subview">' +
      '<button class="mc-back-btn" id="mcBackBtn">← Back</button>' +
      '<div class="mc-subview-body" id="mcSubBody"><div class="mc-loading"><span class="mc-spinner"></span> Loading…</div></div>' +
      '</div>';
    document.getElementById('mcBackBtn').addEventListener('click', function () {
      elBody.innerHTML = prev;
    });
    var subBody = document.getElementById('mcSubBody');
    skF(API_URL + '/api/oc/transcript?session=' + encodeURIComponent(sessionId))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var msgs = data.messages || [];
        if (!msgs.length) {
          subBody.innerHTML = '<div class="mc-empty">No messages.</div>';
          return;
        }
        var html = '';
        for (var i = 0; i < msgs.length; i++) {
          var m = msgs[i];
          var role = String(m.role || 'assistant').toUpperCase();
          var content = Array.isArray(m.content)
            ? m.content.map(function (c) { return c.text || ''; }).join('\n')
            : (m.content || '');
          html += '<div class="mc-msg mc-msg--' + role.toLowerCase() + '">' +
            '<div class="mc-msg-role">' + escMc(role) + '</div>' +
            '<div class="mc-msg-content">' + mdToHtml(content) + '</div></div>';
        }
        subBody.innerHTML = html;
        scrollToBottom(subBody);
      })
      .catch(function () {
        subBody.innerHTML = '<div class="mc-error">Could not load transcript.</div>';
      });
  }

  /* ── Remote Tab ─────────────────────────────────────────────────── */
  function loadRemote() {
    showLoading();
    // Fetch both fleet status and mailbox in parallel
    Promise.all([
      skF(API_URL + '/api/fleet/status').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      skF(API_URL + '/api/fleet/mailbox?limit=20').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (results) {
      var statusData = results[0];
      var mailboxData = results[1];
      var instances = statusData ? (statusData.instances || []) : [];
      var messages = mailboxData ? (mailboxData.messages || []) : [];

      if (!instances.length && !messages.length) {
        elBody.innerHTML = '<div class="mc-empty mc-empty--placeholder" style="padding:48px 24px;text-align:center;">' +
          '<div style="font-size:40px;margin-bottom:16px;">🌐</div>' +
          '<div style="font-size:15px;font-weight:600;color:var(--mc-text-primary,#1c1c1e);margin-bottom:8px;">No remote offices connected</div>' +
          '<div style="font-size:13px;color:var(--mc-text-dim,#8e8e93);line-height:1.6;max-width:280px;margin:0 auto 20px;">' +
          'Set up Fleet Relay to connect remote OpenClaw instances and collaborate across machines.' +
          '</div>' +
          '<a href="https://docs.openclaw.ai/fleet-relay" target="_blank" rel="noopener" ' +
          'style="display:inline-block;padding:8px 18px;background:rgba(0,122,255,0.1);border:1px solid rgba(0,122,255,0.25);' +
          'border-radius:8px;color:#007aff;font-size:13px;font-weight:500;text-decoration:none;">' +
          '📖 Fleet Relay Setup Guide</a></div>';
        return;
      }

      var html = '';

      // Connected offices
      if (instances.length) {
        html += '<div class="mc-section-label" style="padding:8px 12px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--mc-text-muted);letter-spacing:0.5px;">Connected Offices</div>';
        html += '<div class="mc-remote-list">';
        for (var i = 0; i < instances.length; i++) {
          var inst = instances[i];
          var status = inst.status || 'unknown';
          var dotClass = status === 'online' ? 'mc-dot--online' : 'mc-dot--offline';
          html += '<div class="mc-remote-row">' +
            '<span class="mc-dot ' + dotClass + '"></span> ' +
            '<span class="mc-remote-name">' + escMc(inst.name || inst.id || 'Instance') + '</span>' +
            (inst.lastSeen ? ' <span class="mc-remote-time">' + fmtTime(inst.lastSeen) + '</span>' : '') +
            '</div>';
        }
        html += '</div>';
      }

      // Relay messages
      if (messages.length) {
        html += '<div class="mc-section-label" style="padding:12px 12px 8px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--mc-text-muted);letter-spacing:0.5px;">Recent Messages (' + messages.length + ')</div>';
        html += '<div class="mc-remote-messages">';
        for (var j = 0; j < messages.length; j++) {
          var msg = messages[j];
          var isUnread = !msg.read;
          var from = escMc(msg.from || msg.fromAgent || 'unknown');
          var body = escMc(String(msg.text || msg.body || '').substring(0, 200));
          var time = fmtTime(msg.timestamp);
          html += '<div class="mc-remote-msg-row' + (isUnread ? ' mc-remote-msg--unread' : '') + '" style="padding:10px 12px;border-bottom:1px solid var(--mc-border,rgba(0,0,0,0.06));">' +
            '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
              '<span style="font-weight:600;font-size:13px;color:var(--mc-text-primary);">' + from + '</span>' +
              (isUnread ? '<span style="width:6px;height:6px;border-radius:50%;background:#007AFF;flex-shrink:0;"></span>' : '') +
              '<span style="margin-left:auto;font-size:11px;color:var(--mc-text-muted);">' + time + '</span>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--mc-text-dim);line-height:1.4;">' + body + '</div>' +
          '</div>';
        }
        html += '</div>';
      }

      elBody.innerHTML = html;
    });
  }

  /* ── Input Area ─────────────────────────────────────────────────── */
  if (elTextarea) {
    elTextarea.addEventListener('input', function () {
      this.style.height = 'auto';
      var h = Math.min(this.scrollHeight, 120);
      this.style.height = h + 'px';
    });

    elTextarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  if (elSend) {
    elSend.addEventListener('click', function () { sendMessage(); });
  }

  function appendMessage(role, content) {
    var roleClass = role.toUpperCase() === 'USER' ? 'mc-msg--user' : 'mc-msg--assistant';
    var el = document.createElement('div');
    el.className = 'mc-msg ' + roleClass;
    el.innerHTML = '<div class="mc-msg-role">' + escMc(role.toUpperCase()) + '</div>' +
      '<div class="mc-msg-content">' + (role.toUpperCase() === 'USER' ? escMc(content) : mdToHtml(content)) + '</div>';
    elBody.appendChild(el);
    scrollToBottom(elBody);
    return el;
  }

  function sendMessage() {
    if (isSending || !elTextarea) return;
    var text = elTextarea.value.trim();
    if (!text) return;
    isSending = true;
    if (elSend) elSend.disabled = true;

    elTextarea.value = '';
    elTextarea.style.height = 'auto';

    var missionId = currentMission ? currentMission.id : 'current';

    // Prefix with agent persona if chatting with specific agent
    if (currentAgent) {
      text = '[Speaking to ' + currentAgent.name + '] ' + text;
    }

    // Check if this is a /mission command — create new mission
    var isMissionCmd = /^\/m(ission)?\s+/i.test(text);
    if (isMissionCmd) {
      var missionText = text.replace(/^\/m(ission)?\s+/i, '').trim();
      var newMission = {
        id: 'mission-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
        name: missionText.substring(0, 50) + (missionText.length > 50 ? '…' : ''),
        createdAt: Date.now(),
        status: 'active'
      };
      // Save to localStorage missions list
      try {
        var state = JSON.parse(localStorage.getItem('fleetkit_state') || '{}');
        if (!Array.isArray(state.missions)) state.missions = [];
        state.missions.unshift(newMission);
        localStorage.setItem('fleetkit_state', JSON.stringify(state));
      } catch (e) {}
      // Switch to new mission
      missionId = newMission.id;
      currentMission = { id: newMission.id, name: newMission.name };
      if (elTitle) elTitle.innerHTML = escMc(newMission.name) + ' <span class="mc-chevron">⌄</span>';
      // Refresh sidebar
      if (window.McSidebarLeft) window.McSidebarLeft.render([]);
      // Clear chat for new mission
      elBody.innerHTML = '';
      // Prepend /mission prefix for the agent
      text = '🚀 MISSION: ' + missionText;
    }

    // Save user message locally
    saveMissionMessage(missionId, 'user', text);
    appendMessage('user', text);

    // Create streaming response container
    var responseEl = document.createElement('div');
    responseEl.className = 'mc-msg mc-msg--assistant';
    responseEl.innerHTML = '<div class="mc-msg-role mc-role-assistant">ASSISTANT</div>' +
      '<div class="mc-msg-content"><span class="mc-spinner"></span> Thinking…</div>';
    elBody.appendChild(responseEl);
    scrollToBottom(elBody);
    var contentEl = responseEl.querySelector('.mc-msg-content');

    // Try streaming first (fetch + ReadableStream), fallback to regular POST
    var token = localStorage.getItem('spawnkit-token') || '';
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(API_URL + '/api/oc/chat', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ message: text, stream: true })
    }).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      var ct = resp.headers.get('content-type') || '';

      // Check if server supports streaming (text/event-stream or ndjson)
      if (ct.indexOf('text/event-stream') !== -1 || ct.indexOf('ndjson') !== -1) {
        // SSE / ndjson streaming
        var reader = resp.body.getReader();
        var decoder = new TextDecoder();
        var fullText = '';

        function readChunk() {
          reader.read().then(function (result) {
            if (result.done) {
              contentEl.innerHTML = mdToHtml(fullText);
              saveMissionMessage(missionId, 'assistant', fullText);
              scrollToBottom(elBody);
              isSending = false;
              if (elSend) elSend.disabled = false;
              return;
            }
            var chunk = decoder.decode(result.value, { stream: true });
            // Parse SSE or ndjson lines
            var lines = chunk.split('\n');
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].trim();
              if (!line || line === 'data: [DONE]') continue;
              if (line.indexOf('data: ') === 0) line = line.substring(6);
              try {
                var d = JSON.parse(line);
                var delta = d.delta || d.content || d.text || d.chunk || '';
                if (delta) fullText += delta;
              } catch (e) {
                // Plain text chunk
                if (line.length > 0 && line.indexOf('{') === -1) fullText += line;
              }
            }
            // Live update with word-by-word rendering
            contentEl.innerHTML = mdToHtml(fullText) + '<span class="mc-cursor">▊</span>';
            scrollToBottom(elBody);
            readChunk();
          });
        }
        readChunk();
      } else {
        // Regular JSON response — simulate word-by-word streaming
        resp.json().then(function (data) {
          var reply = data.reply || data.message || data.content || '';
          if (!reply) reply = data.ok ? '✅ Message sent to agent.' : '⚠️ No response received.';

          // Save full response
          saveMissionMessage(missionId, 'assistant', reply);

          // Simulate word-by-word streaming for UX
          var words = reply.split(/(\s+)/);
          var rendered = '';
          var idx = 0;
          var streamInterval = setInterval(function () {
            if (idx >= words.length) {
              clearInterval(streamInterval);
              contentEl.innerHTML = mdToHtml(reply);
              scrollToBottom(elBody);
              isSending = false;
              if (elSend) elSend.disabled = false;
              return;
            }
            // Add 3-5 words per tick for natural speed
            var batch = Math.min(idx + 3 + Math.floor(Math.random() * 3), words.length);
            while (idx < batch) {
              rendered += words[idx];
              idx++;
            }
            contentEl.innerHTML = mdToHtml(rendered) + '<span class="mc-cursor">▊</span>';
            scrollToBottom(elBody);
          }, 30);
        });
      }
    }).catch(function (err) {
      contentEl.innerHTML = '⚠️ ' + escMc(err.message);
      saveMissionMessage(missionId, 'assistant', '⚠️ Error: ' + err.message);
      isSending = false;
      if (elSend) elSend.disabled = false;
    });
  }

  /* ── Mission select event ───────────────────────────────────────── */
  document.addEventListener('mc:select-mission', function (e) {
    currentMission = e.detail || null;
    if (elTitle && currentMission) {
      var name = currentMission.title || currentMission.name || 'Mission Control';
      elTitle.innerHTML = escMc(name) + ' <span class="mc-chevron">⌄</span>';
    }
    // Always switch to chat when selecting a mission
    setTab('chat');
  });

  /* ── Global API ─────────────────────────────────────────────────── */
  window.McCenter = {
    render: function (sessions) {
      if (currentTab === 'orchestration') {
        elBody.innerHTML = renderAgentTree(sessions);
      }
    },
    setTab: function (tab) {
      setTab(tab);
    }
  };

  /* ── Init ───────────────────────────────────────────────────────── */
  if (elTitle) elTitle.innerHTML = 'Mission Control <span class="mc-chevron">⌄</span>';
  setTab('chat');

})();
