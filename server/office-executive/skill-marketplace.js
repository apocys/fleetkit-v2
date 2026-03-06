(function() {
  var CATEGORIES = {
    'messaging':   { emoji: '💬', label: 'Messaging',    keywords: ['message','chat','discord','slack','telegram','whatsapp','imsg','imessage','bluebubble','wacli'] },
    'productivity':{ emoji: '📋', label: 'Productivity', keywords: ['note','remind','things','trello','notion','obsidian','todo','task'] },
    'media':       { emoji: '🎨', label: 'Media',        keywords: ['image','video','audio','tts','speech','whisper','gif','pdf','song','spotify','banana'] },
    'development': { emoji: '💻', label: 'Development',  keywords: ['code','github','coding','build','large-build','skill-creator'] },
    'smart-home':  { emoji: '🏠', label: 'Smart Home',   keywords: ['hue','sonos','eight','camera','cam'] },
    'data':        { emoji: '📊', label: 'Data & Search',keywords: ['search','weather','places','blog','summarize','oracle','gemini','model-usage','session'] },
    'security':    { emoji: '🔒', label: 'Security',     keywords: ['health','password','1password','security'] },
    'automation':  { emoji: '⚡', label: 'Automation',   keywords: ['cron','tmux','food','order','mcp','voice-call'] },
    'email':       { emoji: '📧', label: 'Email',        keywords: ['mail','gmail','himalaya','gog'] }
  };
  var OTHER_CAT = { emoji: '📦', label: 'Other' };

  var overlay = null, allSkills = [], currentCat = 'all', searchQuery = '', debounceTimer = null;

  function injectStyles() {
    if (document.getElementById('skm-styles')) return;
    var s = document.createElement('style');
    s.id = 'skm-styles';
    s.textContent = '.skm-overlay{position:fixed;inset:0;z-index:500;background:rgba(0,0,0,.7);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center}.skm-container{width:95%;max-width:950px;max-height:85vh;overflow-y:auto;background:rgba(30,30,32,.98);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:32px;color:#fff;font-family:system-ui}.skm-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px}.skm-header h2{margin:0;font-size:22px}.skm-subtitle{font-size:13px;opacity:.5;margin:4px 0 0}.skm-close{background:none;border:none;color:#fff;font-size:24px;cursor:pointer;opacity:.5}.skm-close:hover{opacity:1}.skm-search{margin-bottom:16px}.skm-search-input{width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.06);color:#fff;font-size:14px;box-sizing:border-box}.skm-search-input::placeholder{color:rgba(255,255,255,.3)}.skm-categories{display:flex;gap:4px;margin-bottom:20px;flex-wrap:wrap}.skm-cat{padding:6px 14px;border-radius:20px;border:1px solid rgba(255,255,255,.1);background:transparent;color:rgba(255,255,255,.5);cursor:pointer;font-size:12px;white-space:nowrap}.skm-cat:hover{background:rgba(255,255,255,.06)}.skm-cat.active{background:rgba(0,122,255,.15);border-color:#007AFF;color:#fff}.skm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}.skm-card{padding:16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);transition:border-color 200ms}.skm-card:hover{border-color:rgba(255,255,255,.15)}.skm-card-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}.skm-card-icon{font-size:24px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);border-radius:10px}.skm-card-name{font-size:14px;font-weight:600}.skm-card-cat{font-size:10px;opacity:.4}.skm-card-desc{font-size:12px;opacity:.6;margin:0 0 10px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.skm-card-footer{display:flex;justify-content:space-between;align-items:center}.skm-card-status{font-size:11px;color:#4ade80}.skm-loading{text-align:center;padding:40px;opacity:.4;font-size:14px}.skm-empty{text-align:center;padding:40px;opacity:.3;font-size:14px}.skm-count{font-size:11px;opacity:.3;margin-left:4px}';
    document.head.appendChild(s);
  }

  function classifySkill(skill) {
    var haystack = (skill.id + ' ' + (skill.description || '')).toLowerCase();
    for (var catKey in CATEGORIES) {
      var kws = CATEGORIES[catKey].keywords;
      for (var i = 0; i < kws.length; i++) {
        if (haystack.indexOf(kws[i]) !== -1) return catKey;
      }
    }
    return 'other';
  }

  function getCatInfo(catKey) {
    return CATEGORIES[catKey] || OTHER_CAT;
  }

  function buildOverlay() {
    var el = document.createElement('div');
    el.className = 'skm-overlay';
    el.innerHTML = '<div class="skm-container">' +
      '<div class="skm-header"><div><h2>🏪 Skill Marketplace</h2><p class="skm-subtitle" id="skmSubtitle">Loading skills...</p></div><button class="skm-close" id="skmClose">×</button></div>' +
      '<div class="skm-search"><input class="skm-search-input" id="skmSearch" placeholder="Search skills..." /></div>' +
      '<div class="skm-categories" id="skmCats"></div>' +
      '<div class="skm-grid" id="skmGrid"><div class="skm-loading">⏳ Loading skills...</div></div>' +
      '</div>';
    document.body.appendChild(el);
    overlay = el;

    document.getElementById('skmClose').onclick = close;
    document.getElementById('skmSearch').oninput = function() {
      var val = this.value;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() { searchQuery = val; renderGrid(); }, 150);
    };
    el.addEventListener('click', function(e) { if (e.target === el) close(); });
    document.addEventListener('keydown', onKeyDown);
  }

  function onKeyDown(e) { if (e.key === 'Escape') close(); }

  function buildCategoryTabs(skills) {
    var usedCats = {};
    for (var i = 0; i < skills.length; i++) {
      var ck = classifySkill(skills[i]);
      usedCats[ck] = (usedCats[ck] || 0) + 1;
    }
    var catsEl = document.getElementById('skmCats');
    catsEl.innerHTML = '';
    var allBtn = document.createElement('button');
    allBtn.className = 'skm-cat active';
    allBtn.setAttribute('data-cat', 'all');
    allBtn.innerHTML = 'All <span class="skm-count">' + skills.length + '</span>';
    allBtn.onclick = function() { setCat('all'); };
    catsEl.appendChild(allBtn);

    var orderedKeys = Object.keys(CATEGORIES).concat(['other']);
    for (var k = 0; k < orderedKeys.length; k++) {
      var key = orderedKeys[k];
      if (!usedCats[key]) continue;
      var info = getCatInfo(key);
      var btn = document.createElement('button');
      btn.className = 'skm-cat';
      btn.setAttribute('data-cat', key);
      btn.innerHTML = info.emoji + ' ' + info.label + ' <span class="skm-count">' + usedCats[key] + '</span>';
      (function(k2) { btn.onclick = function() { setCat(k2); }; })(key);
      catsEl.appendChild(btn);
    }
  }

  function setCat(cat) {
    currentCat = cat;
    var btns = document.querySelectorAll('.skm-cat');
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = 'skm-cat' + (btns[i].getAttribute('data-cat') === cat ? ' active' : '');
    }
    renderGrid();
  }

  function renderGrid() {
    var grid = document.getElementById('skmGrid');
    if (!grid) return;
    var q = searchQuery.toLowerCase();
    var visible = [];
    for (var i = 0; i < allSkills.length; i++) {
      var sk = allSkills[i];
      var catKey = classifySkill(sk);
      if (currentCat !== 'all' && catKey !== currentCat) continue;
      if (q && (sk.id + ' ' + (sk.description || '')).toLowerCase().indexOf(q) === -1) continue;
      visible.push(sk);
    }
    if (visible.length === 0) {
      grid.innerHTML = '<div class="skm-empty">No skills found.</div>';
      return;
    }
    var html = '';
    for (var j = 0; j < visible.length; j++) {
      var skill = visible[j];
      var ck = classifySkill(skill);
      var info = getCatInfo(ck);
      var desc = skill.description || 'No description available.';
      html += '<div class="skm-card">' +
        '<div class="skm-card-header">' +
          '<span class="skm-card-icon">' + info.emoji + '</span>' +
          '<div><div class="skm-card-name">' + escHtml(skill.name || skill.id) + '</div>' +
          '<span class="skm-card-cat">' + info.label + '</span></div>' +
        '</div>' +
        '<p class="skm-card-desc">' + escHtml(desc) + '</p>' +
        '<div class="skm-card-footer"><span class="skm-card-status">✅ Installed</span></div>' +
        '</div>';
    }
    grid.innerHTML = html;
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function loadSkills() {
    var base = (typeof API_URL !== 'undefined' ? API_URL : '');
    var url = base + '/api/oc/skills';
    var promise = (typeof ThemeAuth !== 'undefined' && ThemeAuth && typeof ThemeAuth.fetch === 'function')
      ? ThemeAuth.fetch(url)
      : fetch(url);
    promise.then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function(data) {
      allSkills = Array.isArray(data) ? data : (data && data.skills ? data.skills : []);
      var subtitle = document.getElementById('skmSubtitle');
      if (subtitle) subtitle.textContent = allSkills.length + ' skills installed \u2022 Browse, search, or install new ones';
      buildCategoryTabs(allSkills);
      renderGrid();
    }).catch(function() {
      var grid = document.getElementById('skmGrid');
      if (grid) grid.innerHTML = '<div class="skm-empty">Could not load skills. Check API connection.</div>';
      var subtitle = document.getElementById('skmSubtitle');
      if (subtitle) subtitle.textContent = 'Error loading skills';
    });
  }

  function open() {
    if (overlay) return;
    injectStyles();
    currentCat = 'all';
    searchQuery = '';
    allSkills = [];
    buildOverlay();
    loadSkills();
  }

  function close() {
    if (!overlay) return;
    document.removeEventListener('keydown', onKeyDown);
    overlay.parentNode && overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  window.SkillMarketplace = { open: open, close: close };
})();
