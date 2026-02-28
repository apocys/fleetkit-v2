(function () {
  'use strict';

  var API_URL = window.OC_API_URL || (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8222');

  function skF(url, opts) {
    return (window.skFetch || fetch)(url, opts);
  }

  function escMc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ─── SVG helpers ─────────────────────────────────────────────────────────────

  function svgDone() {
    return '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="#34A853"/><path d="M6 10.5L8.5 13L14 7" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function svgActive() {
    return '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="none" stroke="#FF9500" stroke-width="1.5"/><circle cx="10" cy="10" r="3" fill="#FF9500"/></svg>';
  }

  function svgTodo() {
    return '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="none" stroke="rgba(0,0,0,0.15)" stroke-width="1.5"/></svg>';
  }

  // ─── File icon helper ─────────────────────────────────────────────────────────

  function fileIcon(name) {
    var n = String(name || '').toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(n)) return '🖼';
    if (/\.(csv|xlsx|xls|json|parquet)$/.test(n)) return '📊';
    return '📄';
  }

  // ─── Collapse / Expand ────────────────────────────────────────────────────────

  function makeToggle(header, itemsEl, stateObj, key) {
    header.addEventListener('click', function () {
      stateObj[key] = !stateObj[key];
      var collapsed = stateObj[key];
      itemsEl.style.display = collapsed ? 'none' : 'block';
      var chevron = header.querySelector('.mc-sr-chevron');
      if (chevron) {
        chevron.style.transform = collapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
        chevron.style.transition = 'transform 0.2s';
      }
    });
  }

  // ─── Section builder helpers ──────────────────────────────────────────────────

  function buildHeader(title) {
    var header = document.createElement('div');
    header.className = 'mc-sr-header';
    header.style.cssText = 'display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:10px 14px;user-select:none;';
    var titleEl = document.createElement('span');
    titleEl.className = 'mc-sr-title';
    titleEl.textContent = title;
    var chevron = document.createElement('span');
    chevron.className = 'mc-sr-chevron';
    chevron.textContent = '▾';
    chevron.style.transition = 'transform 0.2s';
    header.appendChild(titleEl);
    header.appendChild(chevron);
    return header;
  }

  function buildItemsWrapper() {
    var el = document.createElement('div');
    el.className = 'mc-sr-items';
    el.style.display = 'block';
    return el;
  }

  // ─── Section 1: Progression ───────────────────────────────────────────────────

  function renderProgression(container, tasks, collapseState) {
    container.innerHTML = '';

    var header = buildHeader('Progression');
    var items = buildItemsWrapper();

    makeToggle(header, items, collapseState, 'progression');
    container.appendChild(header);
    container.appendChild(items);

    function renderTasks(taskList) {
      items.innerHTML = '';
      if (!taskList || taskList.length === 0) {
        var empty = document.createElement('div');
        empty.className = 'mc-sr-empty';
        empty.textContent = 'No tasks yet.';
        items.appendChild(empty);
        return;
      }
      for (var i = 0; i < taskList.length; i++) {
        var t = taskList[i];
        var status = t.status || 'todo';
        var text = t.title || t.name || t.text || String(t);

        var row = document.createElement('div');
        row.className = 'mc-check-item';
        row.style.cssText = 'display:flex;align-items:flex-start;gap:8px;padding:6px 14px;';

        var iconWrap = document.createElement('div');
        iconWrap.style.cssText = 'flex-shrink:0;margin-top:1px;';
        if (status === 'done' || status === 'completed') {
          iconWrap.innerHTML = svgDone();
        } else if (status === 'active' || status === 'in_progress' || status === 'running') {
          iconWrap.innerHTML = svgActive();
        } else {
          iconWrap.innerHTML = svgTodo();
        }

        var textEl = document.createElement('span');
        textEl.className = 'mc-check-text' + ((status === 'done' || status === 'completed') ? ' done' : '');
        textEl.textContent = text;

        row.appendChild(iconWrap);
        row.appendChild(textEl);
        items.appendChild(row);
      }
    }

    // Build progression from active sub-agents (real-time from sessions)
    // Sub-agents spawned during current work = progression items
    skF(API_URL + '/api/oc/sessions')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (sessions) {
        if (!Array.isArray(sessions)) sessions = [];
        var progressItems = [];
        for (var i = 0; i < sessions.length; i++) {
          var s = sessions[i];
          var key = s.key || '';
          if (key.indexOf('subagent') === -1) continue;
          if (!s.label) continue;
          var isActive = (s.status === 'active' || s.status === 'running');
          var isDone = !isActive;
          progressItems.push({
            text: s.label,
            status: isActive ? 'active' : 'done'
          });
        }
        // Sort: active first, then done (newest first within each group)
        progressItems.sort(function(a, b) {
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (b.status === 'active' && a.status !== 'active') return 1;
          return 0;
        });
        // Limit to 10 most recent
        renderTasks(progressItems.slice(0, 10));
      })
      .catch(function () {
        renderTasks([]);
      });
  }

  // ─── Section 2: Files ─────────────────────────────────────────────────────────

  function renderFiles(container, tasks, collapseState) {
    container.innerHTML = '';

    var header = buildHeader('Files');
    var items = buildItemsWrapper();

    makeToggle(header, items, collapseState, 'files');
    container.appendChild(header);
    container.appendChild(items);

    var desc = document.createElement('div');
    desc.className = 'mc-sr-empty';
    desc.textContent = 'View files created during this mission.';
    items.appendChild(desc);

    function renderFileList(fileList) {
      if (!fileList || fileList.length === 0) return;
      // Remove default desc
      desc.style.display = 'none';
      for (var i = 0; i < fileList.length; i++) {
        var f = fileList[i];
        var fname = typeof f === 'string' ? f : (f.name || f.filename || String(f));
        var row = document.createElement('div');
        row.className = 'mc-file-item';
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:5px 14px;cursor:pointer;border-radius:6px;transition:background 0.15s;';
        row.title = 'Click to open';
        var icon = document.createElement('span');
        icon.style.fontSize = '15px';
        icon.textContent = fileIcon(fname);
        var name = document.createElement('span');
        name.style.cssText = 'font-size:13px;color:#636366;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
        name.textContent = escMc(fname);
        row.appendChild(icon);
        row.appendChild(name);
        (function (file) {
          row.addEventListener('mouseenter', function () { row.style.background = 'rgba(0,0,0,0.04)'; });
          row.addEventListener('mouseleave', function () { row.style.background = ''; });
          row.addEventListener('click', function () {
            var url = typeof file === 'object' && file.url ? file.url : null;
            if (url) window.open(url, '_blank');
          });
        })(f);
        items.appendChild(row);
      }
    }

    skF(API_URL + '/api/tasks')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        var files = [];
        if (data && data.files) {
          files = data.files;
        } else if (Array.isArray(data)) {
          for (var i = 0; i < data.length; i++) {
            if (data[i].files) files = files.concat(data[i].files);
          }
        }
        renderFileList(files);
      })
      .catch(function () {
        var files = [];
        if (tasks && Array.isArray(tasks)) {
          for (var i = 0; i < tasks.length; i++) {
            if (tasks[i].files) files = files.concat(tasks[i].files);
          }
        }
        renderFileList(files);
      });
  }

  // ─── Section 3: Context ───────────────────────────────────────────────────────

  function renderContext(container, sessions, collapseState) {
    container.innerHTML = '';

    var header = buildHeader('Context');
    var items = buildItemsWrapper();

    makeToggle(header, items, collapseState, 'context');
    container.appendChild(header);
    container.appendChild(items);

    var label = document.createElement('div');
    label.className = 'mc-ctx-label';
    label.style.cssText = 'padding:6px 14px 4px;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#AEAEB2;font-weight:600;';
    label.textContent = 'Connectors';
    items.appendChild(label);

    function makeConnectorItem(icon, name, detail, expandContent) {
      var row = document.createElement('div');
      row.className = 'mc-ctx-item';
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;border-radius:6px;position:relative;transition:background 0.15s;';

      var iconEl = document.createElement('div');
      iconEl.className = 'mc-ctx-icon';
      iconEl.style.cssText = 'font-size:16px;flex-shrink:0;';
      iconEl.textContent = icon;

      var nameEl = document.createElement('span');
      nameEl.className = 'mc-ctx-name';
      nameEl.style.cssText = 'font-size:13px;color:#1C1C1E;flex:1;';
      nameEl.textContent = name;

      var detailEl = document.createElement('span');
      detailEl.style.cssText = 'font-size:11px;color:#AEAEB2;margin-left:auto;';
      detailEl.textContent = detail || '';

      row.appendChild(iconEl);
      row.appendChild(nameEl);
      row.appendChild(detailEl);

      var expanded = false;
      var expandEl = null;
      if (expandContent) {
        row.addEventListener('mouseenter', function () { row.style.background = 'rgba(0,0,0,0.04)'; });
        row.addEventListener('mouseleave', function () { row.style.background = ''; });
        row.addEventListener('click', function () {
          expanded = !expanded;
          if (expanded) {
            if (!expandEl) {
              expandEl = document.createElement('div');
              expandEl.style.cssText = 'padding:6px 14px 8px 38px;font-size:12px;color:#636366;border-top:1px solid rgba(0,0,0,0.06);';
              expandEl.textContent = expandContent;
            }
            row.parentNode.insertBefore(expandEl, row.nextSibling);
          } else {
            if (expandEl && expandEl.parentNode) expandEl.parentNode.removeChild(expandEl);
          }
        });
      }
      return row;
    }

    // Dynamic channel connectors — clickable → opens wizard
    var channelMap = {
      telegram:  { icon: '📱', name: 'Telegram' },
      discord:   { icon: '🎮', name: 'Discord' },
      whatsapp:  { icon: '💚', name: 'WhatsApp' },
      signal:    { icon: '🔒', name: 'Signal' },
      imessage:  { icon: '💬', name: 'iMessage' },
      slack:     { icon: '💼', name: 'Slack' },
      github:    { icon: '🐙', name: 'GitHub' }
    };

    var connectedChannels = {};
    if (window.ChannelOnboarding && window.ChannelOnboarding.getConnectedChannels) {
      window.ChannelOnboarding.getConnectedChannels().forEach(function(ch) { connectedChannels[ch.id] = ch; });
    }

    Object.keys(channelMap).forEach(function(chId) {
      var ch = channelMap[chId];
      var isConn = !!connectedChannels[chId];

      // Build row directly (don't use makeConnectorItem — its click expands text, we want to open wizard)
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 14px;cursor:pointer;border-radius:6px;transition:background 0.15s;';

      var iconEl = document.createElement('div');
      iconEl.style.cssText = 'font-size:16px;flex-shrink:0;';
      iconEl.textContent = ch.icon;

      var nameEl = document.createElement('span');
      nameEl.style.cssText = 'font-size:13px;color:#1C1C1E;flex:1;';
      nameEl.textContent = ch.name;

      var statusEl = document.createElement('span');
      statusEl.style.cssText = 'font-size:11px;margin-left:auto;color:' + (isConn ? '#34C759' : '#AEAEB2') + ';';
      statusEl.textContent = isConn ? '✓ connected' : 'connect →';

      row.appendChild(iconEl);
      row.appendChild(nameEl);
      row.appendChild(statusEl);

      row.addEventListener('mouseenter', function () { row.style.background = 'rgba(0,0,0,0.04)'; });
      row.addEventListener('mouseleave', function () { row.style.background = ''; });
      row.addEventListener('click', function () {
        if (window.ChannelOnboarding) window.ChannelOnboarding.open(chId);
      });

      items.appendChild(row);
    });

    // Fleet relay (non-channel, keep static)
    items.appendChild(makeConnectorItem('🔗', 'Fleet Relay', 'active', 'Remote relay connection for multi-node fleet coordination.'));

    // Load skills from API
    skF(API_URL + '/api/oc/skills')
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (data) {
        var skills = Array.isArray(data) ? data : (data.skills || data.items || []);
        var shown = Math.min(skills.length, 5);
        for (var i = 0; i < shown; i++) {
          var s = skills[i];
          var sname = s.name || s.title || String(s);
          var sdesc = s.description || s.desc || 'Click to see details';
          items.appendChild(makeConnectorItem('⚡', escMc(sname), '', sdesc));
        }
        if (skills.length === 0) {
          items.appendChild(makeConnectorItem('⚡', 'Web search', '', 'Brave Search API connector.'));
        }
      })
      .catch(function () {
        items.appendChild(makeConnectorItem('⚡', 'Web search', '', 'Brave Search API connector.'));
      });
  }

  // ─── Main render ─────────────────────────────────────────────────────────────

  var collapseState = {
    progression: false,
    files: false,
    context: false
  };

  function render(sessions, tasks) {
    var progEl = document.getElementById('mcProgression');
    var filesEl = document.getElementById('mcFiles');
    var ctxEl = document.getElementById('mcContext');

    if (progEl) renderProgression(progEl, tasks, collapseState);
    if (filesEl) renderFiles(filesEl, tasks, collapseState);
    if (ctxEl) renderContext(ctxEl, sessions, collapseState);
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  window.McSidebarRight = {
    render: render
  };

}());
