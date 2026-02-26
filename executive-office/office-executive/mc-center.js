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
  var isSending = false;

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
      scrollBtn.style.display = atBottom ? 'none' : '';
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

  /* ── Chat Tab ───────────────────────────────────────────────────── */
  function renderMessages(messages) {
    if (!messages || !messages.length) {
      elBody.innerHTML = '<div class="mc-empty">No messages yet.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < messages.length; i++) {
      var m = messages[i];
      var role = String(m.role || 'assistant').toUpperCase();
      var content = m.content || '';
      // content may be array (OpenAI-style) or string
      if (Array.isArray(content)) {
        content = content.map(function (c) { return c.text || c.content || ''; }).join('\n');
      }
      var roleClass = role === 'USER' ? 'mc-msg--user' : 'mc-msg--assistant';
      html += '<div class="mc-msg ' + roleClass + '">' +
        '<div class="mc-msg-role">' + escMc(role) + '</div>' +
        '<div class="mc-msg-content">' + mdToHtml(content) + '</div>' +
        '</div>';
    }
    elBody.innerHTML = html;
    scrollToBottom(elBody);
  }

  function loadChat() {
    showLoading();
    // Use /api/oc/chat which returns { messages: [...] }
    skF(API_URL + '/api/oc/chat')
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var msgs = data && data.messages ? data.messages : (Array.isArray(data) ? data : []);
        if (msgs.length > 0) {
          renderMessages(msgs);
        } else {
          // fallback: try sessions for transcript data
          return skF(API_URL + '/api/oc/sessions')
            .then(function (r) { return r.json(); })
            .then(function (sd) {
              var sessions = sd.sessions || sd || [];
              var main = null;
              for (var i = 0; i < sessions.length; i++) {
                if (sessions[i].key === 'agent:main:main' || sessions[i].type === 'main' || i === 0) {
                  main = sessions[i];
                  break;
                }
              }
              var msgs2 = (main && (main.messages || main.transcript)) || [];
              renderMessages(msgs2);
            });
        }
      })
      .catch(function (err) {
        showError('Could not load transcript: ' + err.message);
      });
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
        var rows = elBody.querySelectorAll('.mc-agent-row');
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
      '<button class="mc-btn mc-btn--back" id="mcBackBtn">← Back</button>' +
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
    skF(API_URL + '/api/fleet/status')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var instances = data.instances || data.connections || data || [];
        if (!Array.isArray(instances) || !instances.length) {
          elBody.innerHTML = '<div class="mc-empty">No remote instances connected.</div>';
          return;
        }
        var html = '<div class="mc-remote-list">';
        for (var i = 0; i < instances.length; i++) {
          var inst = instances[i];
          var status = inst.status || 'unknown';
          var dotClass = status === 'online' ? 'mc-dot--online' : 'mc-dot--offline';
          html += '<div class="mc-remote-row">' +
            '<span class="mc-dot ' + dotClass + '"></span> ' +
            '<span class="mc-remote-name">' + escMc(inst.name || inst.id || 'Instance') + '</span>' +
            (inst.lastSeen ? ' <span class="mc-remote-time">' + fmtTime(inst.lastSeen) + '</span>' : '') +
            '</div>';
          if (inst.inbox && inst.inbox.length) {
            html += '<div class="mc-remote-inbox">';
            for (var j = 0; j < inst.inbox.length; j++) {
              html += '<div class="mc-remote-msg">' + escMc(inst.inbox[j]) + '</div>';
            }
            html += '</div>';
          }
        }
        html += '</div>';
        elBody.innerHTML = html;
      })
      .catch(function () {
        elBody.innerHTML = '<div class="mc-empty mc-empty--placeholder">' +
          '<span class="mc-remote-icon">📡</span><br>' +
          'Fleet relay not reachable.<br>' +
          '<small>Start fleet-relay to see remote connections.</small></div>';
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

    appendMessage('user', text);

    // loading bubble
    var loadingEl = document.createElement('div');
    loadingEl.className = 'mc-msg mc-msg--assistant mc-msg--loading';
    loadingEl.innerHTML = '<div class="mc-msg-role">ASSISTANT</div>' +
      '<div class="mc-msg-content"><span class="mc-spinner"></span></div>';
    elBody.appendChild(loadingEl);
    scrollToBottom(elBody);

    skF(API_URL + '/api/oc/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        var reply = data.reply || data.message || data.content || '';
        if (!reply) reply = data.ok ? '✅ Message sent to agent.' : '⚠️ No response received.';
        appendMessage('assistant', reply);
        document.dispatchEvent(new CustomEvent('mc:message-sent', { detail: { message: text, reply: reply } }));
      })
      .catch(function (err) {
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        appendMessage('assistant', '⚠️ Error: ' + err.message);
      })
      .then(function () {
        isSending = false;
        if (elSend) elSend.disabled = false;
      });
  }

  /* ── Mission select event ───────────────────────────────────────── */
  document.addEventListener('mc:select-mission', function (e) {
    currentMission = e.detail || null;
    if (elTitle && currentMission) {
      elTitle.textContent = currentMission.title || currentMission.name || 'Mission Control';
    }
    if (currentTab === 'chat') loadChat();
    else if (currentTab === 'orchestration') loadOrchestration();
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
  setTab('chat');

})();
