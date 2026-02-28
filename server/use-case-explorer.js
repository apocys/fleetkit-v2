(function() {
  'use strict';

  var USE_CASES = [
    { tier: 'beginner', emoji: '💬', title: 'Chat with Your AI Team', desc: 'Send messages to your AI agent via chat. Ask questions, give tasks, get instant responses.', status: 'working', tryCmd: 'Hello! What can you help me with?' },
    { tier: 'beginner', emoji: '🌤️', title: 'Check the Weather', desc: 'Get current weather and forecasts for any location. No API key needed.', status: 'working', tryCmd: '/mr What is the weather in Berlin right now?' },
    { tier: 'beginner', emoji: '📋', title: 'Create & Manage Tasks', desc: 'Use the Kanban board to track missions. Create tasks, assign to agents, drag between columns.', status: 'working', tryCmd: null },
    { tier: 'beginner', emoji: '⏰', title: 'Set Reminders', desc: 'Schedule reminders via cron. Get notified at specific times or intervals.', status: 'working', tryCmd: 'Remind me in 30 minutes to check the deploy status' },
    { tier: 'beginner', emoji: '🔍', title: 'Web Search & Research', desc: 'Search the web and fetch content from URLs. Summarize articles, compare products.', status: 'working', tryCmd: 'Search the web for the latest SpawnKit news' },
    { tier: 'intermediate', emoji: '🐙', title: 'GitHub Integration', desc: 'Create issues, review PRs, check CI runs, manage repos. Full gh CLI access.', status: 'working', tryCmd: '/m List my recent GitHub issues' },
    { tier: 'intermediate', emoji: '🖼️', title: 'Generate Images', desc: 'Create images using AI models (Gemini, OpenAI DALL-E). Describe what you want.', status: 'working', tryCmd: 'Generate an image of a medieval castle at sunset' },
    { tier: 'intermediate', emoji: '🎵', title: 'Transcribe Audio', desc: 'Convert audio files to text using Whisper. Supports MP3, WAV, M4A, and more.', status: 'working', tryCmd: null },
    { tier: 'intermediate', emoji: '🎬', title: 'Extract Video Frames', desc: 'Pull frames or clips from videos using ffmpeg. Analyze video content.', status: 'working', tryCmd: null },
    { tier: 'intermediate', emoji: '🏥', title: 'Security Healthcheck', desc: 'Audit your server security: SSH hardening, firewall, fail2ban, updates. Get a grade.', status: 'working', tryCmd: '/m Run a security healthcheck on this server' },
    { tier: 'intermediate', emoji: '📊', title: 'Data Analysis', desc: 'Process CSV/JSON data, generate charts, calculate statistics. Agent writes and runs code.', status: 'working', tryCmd: null },
    { tier: 'intermediate', emoji: '🗺️', title: 'Find Local Places', desc: 'Search for restaurants, cafes, shops nearby using Google Places API.', status: 'beta', tryCmd: 'Find the best pizza places near Berlin Mitte' },
    { tier: 'advanced', emoji: '🤖', title: 'Sub-Agent Swarm', desc: 'Spawn parallel sub-agents for complex tasks. One agent orchestrates, others execute.', status: 'working', tryCmd: '/mission Build a landing page for a new product' },
    { tier: 'advanced', emoji: '🔧', title: 'Create Custom Skills', desc: 'Build your own skills using the Skill Forge. Package knowledge, scripts, and workflows.', status: 'working', tryCmd: null },
    { tier: 'advanced', emoji: '🏗️', title: 'Build Full Apps', desc: 'Generate multi-file codebases using the large-build methodology. Full-stack apps in minutes.', status: 'working', tryCmd: '/mission Build a todo app with React and Express' },
    { tier: 'advanced', emoji: '🌐', title: 'Browser Automation', desc: 'Control a web browser: navigate, click, fill forms, take screenshots, scrape data.', status: 'working', tryCmd: 'Open browser and navigate to spawnkit.ai, take a screenshot' },
    { tier: 'advanced', emoji: '📱', title: 'Multi-Channel Messaging', desc: 'Connect via Telegram, Discord, Slack, WhatsApp, Signal, iMessage. Same agent, any channel.', status: 'working', tryCmd: null },
    { tier: 'advanced', emoji: '🚀', title: 'One-Click Deploy', desc: 'Deploy your own SpawnKit instance on Hetzner Cloud. Your own subdomain in 90 seconds.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '🎭', title: 'Agent Collaboration', desc: 'Two AI agents (different machines) collaborate on a project. Async messaging, peer review, escalation.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '📡', title: 'Fleet Relay', desc: 'Connect multiple OpenClaw instances across machines. Shared task queue, distributed work.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '🏰', title: 'Themed AI Offices', desc: 'Visualize your AI team in 3D medieval castles, isometric cities, or executive offices.', status: 'working', tryCmd: null },
    { tier: 'expert', emoji: '🧠', title: 'Persistent Memory', desc: 'Agent remembers past conversations, decisions, preferences. MEMORY.md + semantic search.', status: 'working', tryCmd: 'What do you remember about our recent projects?' },
    { tier: 'expert', emoji: '⚡', title: 'Cron Automation', desc: 'Schedule recurring tasks: monitoring, reports, backups, proactive checks. Any interval.', status: 'working', tryCmd: '/m Show me all active cron jobs' },
    { tier: 'expert', emoji: '🎙️', title: 'Voice Pipeline', desc: 'Text-to-speech for responses. Build audio content, podcasts, voiceovers.', status: 'working', tryCmd: 'Say "Welcome to SpawnKit" in speech' },
    { tier: 'intermediate', emoji: '📺', title: 'YouTube Transcripts', desc: 'Extract transcripts from any YouTube video. Summarize, analyze, or quote what was said. Works even from servers blocked by YouTube.', status: 'working', tryCmd: '/m Extract the transcript from https://youtu.be/X3uum6W2xEI' },
    { tier: 'advanced', emoji: '📧', title: 'Email Pipeline', desc: 'Ingest emails, score/classify them with custom rubrics, auto-draft replies, escalate to Telegram. Full inbox automation.', status: 'beta', tryCmd: null },
    { tier: 'advanced', emoji: '📇', title: 'CRM & Contact Intelligence', desc: 'Auto-discover contacts from email/calendar, research companies, track relationships. Natural language queries against your network.', status: 'beta', tryCmd: null },
    { tier: 'advanced', emoji: '🎯', title: 'Meeting Intelligence', desc: 'Ingest meeting transcripts, extract action items, assign to team members, sync to project management tools.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '📰', title: 'Knowledge Base', desc: 'Save articles, posts, videos to a searchable knowledge base. Auto-summarize, embed, and cross-reference with your CRM and projects.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '💰', title: 'Financial Tracking', desc: 'Import transactions from QuickBooks/CSV, query your finances in natural language. Revenue by client, spend by category, trends.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '🛡️', title: 'Security Councils', desc: 'Nightly automated security scans: file permissions, gateway configs, secret leaks, prompt injection defense. Self-healing from logs.', status: 'beta', tryCmd: null },
    { tier: 'expert', emoji: '📊', title: 'LLM Usage Tracking', desc: 'Track which models you use, how many tokens, estimated costs. Query usage by task type, time period, or model.', status: 'working', tryCmd: '/m Show my session status and model usage' }
  ];

  var CSS = [
    '.uce-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;}',
    '.uce-card-container{width:95%;max-width:900px;max-height:85vh;overflow-y:auto;background:rgba(30,30,32,0.98);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:32px;color:#fff;font-family:system-ui;}',
    '.uce-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;}',
    '.uce-header h2{margin:0;font-size:22px;}',
    '.uce-header p{font-size:13px;opacity:0.5;margin:4px 0 0;}',
    '.uce-close{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;opacity:0.5;line-height:1;}',
    '.uce-close:hover{opacity:1;}',
    '.uce-tabs{display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap;}',
    '.uce-tab{padding:8px 16px;border-radius:20px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:rgba(255,255,255,0.6);cursor:pointer;font-size:13px;}',
    '.uce-tab:hover{background:rgba(255,255,255,0.06);}',
    '.uce-tab.active{background:rgba(0,122,255,0.15);border-color:#007AFF;color:#fff;}',
    '.uce-counts{display:flex;gap:16px;margin-bottom:16px;font-size:12px;opacity:0.5;flex-wrap:wrap;}',
    '.uce-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}',
    '@media(max-width:700px){.uce-grid{grid-template-columns:1fr;}}',
    '.uce-item{padding:16px;border-radius:14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);transition:border-color 200ms;}',
    '.uce-item:hover{border-color:rgba(255,255,255,0.15);}',
    '.uce-card-top{display:flex;align-items:center;gap:10px;margin-bottom:8px;}',
    '.uce-card-emoji{font-size:24px;line-height:1;}',
    '.uce-card-title{font-size:14px;font-weight:600;display:block;}',
    '.uce-badge{font-size:10px;padding:2px 8px;border-radius:10px;margin-left:6px;}',
    '.uce-badge-working{background:rgba(74,222,128,0.15);color:#4ade80;}',
    '.uce-badge-beta{background:rgba(251,191,36,0.15);color:#fbbf24;}',
    '.uce-badge-coming{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.4);}',
    '.uce-card-desc{font-size:12px;opacity:0.6;margin:0 0 10px;line-height:1.5;}',
    '.uce-card-footer{display:flex;justify-content:space-between;align-items:center;}',
    '.uce-tier-badge{font-size:10px;padding:3px 10px;border-radius:10px;font-weight:600;}',
    '.uce-tier-beginner{background:rgba(74,222,128,0.1);color:#4ade80;}',
    '.uce-tier-intermediate{background:rgba(251,191,36,0.1);color:#fbbf24;}',
    '.uce-tier-advanced{background:rgba(249,115,22,0.1);color:#f97316;}',
    '.uce-tier-expert{background:rgba(239,68,68,0.1);color:#ef4444;}',
    '.uce-try-btn{padding:6px 14px;border-radius:8px;border:none;background:#007AFF;color:#fff;font-size:12px;font-weight:600;cursor:pointer;}',
    '.uce-try-btn:hover{background:#0066DD;}',
    '.uce-try-btn:disabled{opacity:0.3;cursor:default;background:#007AFF;}'
  ].join('');

  var styleEl = null;
  var overlayEl = null;
  var currentTier = 'all';

  function injectStyles() {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);
  }

  function statusLabel(s) {
    if (s === 'working') return '✅ Working';
    if (s === 'beta') return '🔧 Beta';
    return '🔮 Coming Soon';
  }
  function statusClass(s) {
    if (s === 'working') return 'uce-badge-working';
    if (s === 'beta') return 'uce-badge-beta';
    return 'uce-badge-coming';
  }
  function tierLabel(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function getCounts() {
    var total = USE_CASES.length;
    var working = 0, beta = 0, coming = 0;
    for (var i = 0; i < USE_CASES.length; i++) {
      if (USE_CASES[i].status === 'working') working++;
      else if (USE_CASES[i].status === 'beta') beta++;
      else coming++;
    }
    return { total: total, working: working, beta: beta, coming: coming };
  }

  function tryCommand(cmd) {
    UseCaseExplorer.close();
    if (window.ThemeChat) {
      var chatContainer = document.querySelector('[id$="Chat"]');
      if (chatContainer) chatContainer.style.display = 'block';
      ThemeChat.show();
      setTimeout(function() { ThemeChat.send(cmd); }, 300);
      return;
    }
    var inputs = document.querySelectorAll('input[type="text"], textarea');
    for (var i = 0; i < inputs.length; i++) {
      if (inputs[i].placeholder && inputs[i].placeholder.toLowerCase().indexOf('command') >= 0) {
        inputs[i].value = cmd;
        inputs[i].focus();
        return;
      }
    }
  }

  function renderCards(tier) {
    var grid = overlayEl.querySelector('.uce-grid');
    if (!grid) return;
    grid.innerHTML = '';
    for (var i = 0; i < USE_CASES.length; i++) {
      var uc = USE_CASES[i];
      if (tier !== 'all' && uc.tier !== tier) continue;
      var card = document.createElement('div');
      card.className = 'uce-item';
      var hasCmd = !!uc.tryCmd;
      card.innerHTML =
        '<div class="uce-card-top">' +
          '<span class="uce-card-emoji">' + uc.emoji + '</span>' +
          '<div>' +
            '<span class="uce-card-title">' + uc.title + '</span>' +
            '<span class="uce-badge ' + statusClass(uc.status) + '">' + statusLabel(uc.status) + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="uce-card-desc">' + uc.desc + '</p>' +
        '<div class="uce-card-footer">' +
          '<span class="uce-tier-badge uce-tier-' + uc.tier + '">' + tierLabel(uc.tier) + '</span>' +
          '<button class="uce-try-btn"' + (hasCmd ? '' : ' disabled') + '>▶ Try it</button>' +
        '</div>';
      if (hasCmd) {
        (function(cmd) {
          card.querySelector('.uce-try-btn').addEventListener('click', function() {
            tryCommand(cmd);
          });
        })(uc.tryCmd);
      }
      grid.appendChild(card);
    }
  }

  function buildOverlay() {
    var counts = getCounts();
    var el = document.createElement('div');
    el.className = 'uce-overlay';
    el.innerHTML =
      '<div class="uce-card-container">' +
        '<div class="uce-header">' +
          '<div>' +
            '<h2>🚀 What Can SpawnKit Do?</h2>' +
            '<p>Explore use cases from beginner to expert. Click "Try it" to test directly.</p>' +
          '</div>' +
          '<button class="uce-close" title="Close">×</button>' +
        '</div>' +
        '<div class="uce-tabs">' +
          '<button class="uce-tab active" data-tier="all">All</button>' +
          '<button class="uce-tab" data-tier="beginner">🟢 Beginner</button>' +
          '<button class="uce-tab" data-tier="intermediate">🟡 Intermediate</button>' +
          '<button class="uce-tab" data-tier="advanced">🟠 Advanced</button>' +
          '<button class="uce-tab" data-tier="expert">🔴 Expert</button>' +
        '</div>' +
        '<div class="uce-counts">' +
          '<span>' + counts.total + ' use cases</span>' +
          '<span>✅ ' + counts.working + ' working</span>' +
          '<span>🔧 ' + counts.beta + ' beta</span>' +
          '<span>🔮 ' + counts.coming + ' coming soon</span>' +
        '</div>' +
        '<div class="uce-grid"></div>' +
      '</div>';

    el.querySelector('.uce-close').addEventListener('click', function() {
      UseCaseExplorer.close();
    });

    el.addEventListener('click', function(e) {
      if (e.target === el) UseCaseExplorer.close();
    });

    var tabs = el.querySelectorAll('.uce-tab');
    for (var i = 0; i < tabs.length; i++) {
      (function(tab) {
        tab.addEventListener('click', function() {
          for (var j = 0; j < tabs.length; j++) tabs[j].classList.remove('active');
          tab.classList.add('active');
          currentTier = tab.getAttribute('data-tier');
          renderCards(currentTier);
        });
      })(tabs[i]);
    }

    return el;
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' || e.keyCode === 27) UseCaseExplorer.close();
  }

  window.UseCaseExplorer = {
    open: function() {
      if (overlayEl) return;
      injectStyles();
      currentTier = 'all';
      overlayEl = buildOverlay();
      document.body.appendChild(overlayEl);
      renderCards('all');
      document.addEventListener('keydown', onKeyDown);
    },
    close: function() {
      if (!overlayEl) return;
      document.removeEventListener('keydown', onKeyDown);
      if (overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }
  };

})();
