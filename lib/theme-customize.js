(function() {
  'use strict';
  var opts = {}, config = {}, updateCallbacks = [], panel = null, backdrop = null, debounceTimer = null;
  var COLORS = ['#e94560','#007AFF','#4ade80','#fbbf24','#c084fc','#f97316','#14b8a6','#ec4899'];

  function injectCSS() {
    var s = document.createElement('style');
    s.textContent = '.sk-custom{position:fixed;right:-400px;top:0;width:380px;height:100vh;z-index:200;overflow-y:auto;transition:right 300ms cubic-bezier(0.4,0,0.2,1);padding:20px;box-sizing:border-box;background:rgba(20,20,22,0.98);border-left:1px solid rgba(255,255,255,0.08);color:#fff}.sk-custom.sk-custom-open{right:0}.sk-custom.sk-medieval{background:rgba(30,25,18,0.98);border-left:1px solid rgba(180,150,100,0.3);color:#E8D5B0;font-family:"Crimson Text",serif}.sk-custom.sk-medieval .sk-custom-slider{accent-color:#B8860B}.sk-custom.sk-medieval .sk-custom-agent-name,.sk-custom.sk-medieval select{border-color:rgba(180,150,100,0.2);background:rgba(62,48,30,0.3)}.sk-custom.sk-simcity{background:rgba(10,15,25,0.98);border-left:1px solid rgba(50,200,100,0.2);color:#B0FFB0;font-family:monospace}.sk-custom.sk-simcity .sk-custom-slider{accent-color:#32C864}.sk-custom-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px}.sk-custom-header h2{margin:0;font-size:18px}.sk-custom-close{background:none;border:none;font-size:24px;cursor:pointer;opacity:0.5;color:inherit}.sk-custom-close:hover{opacity:1}.sk-custom-section{margin-bottom:20px}.sk-custom-section-title{font-size:13px;font-weight:700;margin:0 0 10px;text-transform:uppercase;letter-spacing:0.5px;opacity:0.6}.sk-custom-agent-row,.sk-custom-assign-row,.sk-custom-color-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}.sk-custom-agent-emoji{font-size:18px;width:28px;text-align:center}.sk-custom-agent-name{flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:inherit;font-size:13px}.sk-custom-agent-role{font-size:11px;opacity:0.4;width:40px}.sk-custom-assign-row select{flex:1;padding:6px 10px;border-radius:6px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.06);color:inherit;font-size:13px}.sk-custom-color-options{display:flex;gap:4px}.sk-custom-color-dot{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform 150ms}.sk-custom-color-dot:hover{transform:scale(1.2)}.sk-custom-color-dot.active{border-color:#fff;transform:scale(1.15)}.sk-custom-slider{flex:1;accent-color:#007AFF}.sk-custom-slider-row{display:flex;align-items:center;gap:12px}.sk-custom-slider-val{font-size:13px;min-width:50px}.sk-custom-reset{width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.12);background:transparent;color:inherit;cursor:pointer;font-size:13px}.sk-custom-reset:hover{background:rgba(255,255,255,0.05)}.sk-custom-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.3);z-index:199;display:none}.sk-custom-backdrop.active{display:block}';
    document.head.appendChild(s);
  }

  function loadConfig() {
    var def = { agentNames: {}, agentColors: {}, agentBuildings: {}, dayCycleMinutes: 12 };
    try { var s = localStorage.getItem(opts.storageKey); if (s) return JSON.parse(s); } catch(e) {}
    return def;
  }

  function saveConfig() {
    try { localStorage.setItem(opts.storageKey, JSON.stringify(config)); } catch(e) {}
    for (var i = 0; i < updateCallbacks.length; i++) updateCallbacks[i](JSON.parse(JSON.stringify(config)));
  }

  function buildPanel() {
    backdrop = document.createElement('div');
    backdrop.className = 'sk-custom-backdrop';
    backdrop.addEventListener('click', function() { ThemeCustomize.hide(); });
    document.body.appendChild(backdrop);

    panel = document.createElement('div');
    panel.className = 'sk-custom' + (opts.theme === 'medieval' ? ' sk-medieval' : opts.theme === 'simcity' ? ' sk-simcity' : '');
    panel.id = 'skCustomPanel';

    var header = '<div class="sk-custom-header"><h2>⚙️ Customize</h2><button class="sk-custom-close">×</button></div>';
    var body = '<div class="sk-custom-body">';

    // Section 1: Agent Names
    body += '<div class="sk-custom-section"><h3 class="sk-custom-section-title">🏷️ Agent Names</h3><div class="sk-custom-agents">';
    for (var i = 0; i < opts.agents.length; i++) {
      var a = opts.agents[i], val = config.agentNames[a.id] || a.name;
      body += '<div class="sk-custom-agent-row"><span class="sk-custom-agent-emoji">' + a.emoji + '</span>' +
        '<input class="sk-custom-agent-name" value="' + val + '" data-agent="' + a.id + '" />' +
        '<span class="sk-custom-agent-role">' + a.role + '</span></div>';
    }
    body += '</div></div>';

    // Section 2: Assignments
    body += '<div class="sk-custom-section"><h3 class="sk-custom-section-title">🏠 Assignments</h3><div class="sk-custom-assignments">';
    for (var j = 0; j < opts.agents.length; j++) {
      var ag = opts.agents[j], cur = config.agentBuildings[ag.id] || '';
      var label = config.agentNames[ag.id] || ag.name;
      body += '<div class="sk-custom-assign-row"><span>' + ag.emoji + ' ' + label + '</span><select data-agent="' + ag.id + '"><option value="">Unassigned</option>';
      for (var k = 0; k < opts.buildings.length; k++) {
        var b = opts.buildings[k];
        body += '<option value="' + b.id + '"' + (cur === b.id ? ' selected' : '') + '>' + b.name + '</option>';
      }
      body += '</select></div>';
    }
    body += '</div></div>';

    // Section 3: Colors
    body += '<div class="sk-custom-section"><h3 class="sk-custom-section-title">🎨 Colors</h3><div class="sk-custom-colors">';
    for (var m = 0; m < opts.agents.length; m++) {
      var ac = opts.agents[m], activecol = config.agentColors[ac.id] || '';
      var lbl = config.agentNames[ac.id] || ac.name;
      body += '<div class="sk-custom-color-row"><span>' + ac.emoji + ' ' + lbl + '</span><div class="sk-custom-color-options">';
      for (var n = 0; n < COLORS.length; n++) {
        var cl = COLORS[n], isActive = activecol === cl ? ' active' : '';
        body += '<button class="sk-custom-color-dot' + isActive + '" data-agent="' + ac.id + '" data-color="' + cl + '" style="background:' + cl + '"></button>';
      }
      body += '</div></div>';
    }
    body += '</div></div>';

    // Section 4: Day Cycle
    body += '<div class="sk-custom-section"><h3 class="sk-custom-section-title">🌅 Day Cycle Speed</h3>' +
      '<div class="sk-custom-slider-row"><input type="range" class="sk-custom-slider" min="1" max="30" value="' + config.dayCycleMinutes + '" />' +
      '<span class="sk-custom-slider-val">' + config.dayCycleMinutes + ' min</span></div></div>';

    // Section 5: Reset
    body += '<div class="sk-custom-section"><button class="sk-custom-reset">🔄 Reset to Defaults</button></div>';
    body += '</div>';

    panel.innerHTML = header + body;
    document.body.appendChild(panel);
    bindEvents();
  }

  function bindEvents() {
    panel.querySelector('.sk-custom-close').addEventListener('click', function() { ThemeCustomize.hide(); });

    var nameInputs = panel.querySelectorAll('.sk-custom-agent-name');
    for (var i = 0; i < nameInputs.length; i++) {
      nameInputs[i].addEventListener('input', function(e) {
        var id = e.target.getAttribute('data-agent'), val = e.target.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function() {
          config.agentNames[id] = val;
          saveConfig();
        }, 300);
      });
    }

    var selects = panel.querySelectorAll('.sk-custom-assign-row select');
    for (var j = 0; j < selects.length; j++) {
      selects[j].addEventListener('change', function(e) {
        config.agentBuildings[e.target.getAttribute('data-agent')] = e.target.value;
        saveConfig();
      });
    }

    var dots = panel.querySelectorAll('.sk-custom-color-dot');
    for (var k = 0; k < dots.length; k++) {
      dots[k].addEventListener('click', function(e) {
        var id = e.target.getAttribute('data-agent'), color = e.target.getAttribute('data-color');
        var siblings = panel.querySelectorAll('.sk-custom-color-dot[data-agent="' + id + '"]');
        for (var x = 0; x < siblings.length; x++) siblings[x].classList.remove('active');
        e.target.classList.add('active');
        config.agentColors[id] = color;
        saveConfig();
      });
    }

    var slider = panel.querySelector('.sk-custom-slider');
    var sliderVal = panel.querySelector('.sk-custom-slider-val');
    slider.addEventListener('input', function(e) {
      var v = parseInt(e.target.value, 10);
      sliderVal.textContent = v + ' min';
      config.dayCycleMinutes = v;
      saveConfig();
    });

    panel.querySelector('.sk-custom-reset').addEventListener('click', function() {
      if (!confirm('Reset all customizations to defaults?')) return;
      try { localStorage.removeItem(opts.storageKey); } catch(e) {}
      config = { agentNames: {}, agentColors: {}, agentBuildings: {}, dayCycleMinutes: 12 };
      panel.remove();
      backdrop.remove();
      panel = null; backdrop = null;
      buildPanel();
      saveConfig();
    });

    document.addEventListener('keydown', onEsc);
  }

  function onEsc(e) { if (e.key === 'Escape') ThemeCustomize.hide(); }

  var ThemeCustomize = {
    init: function(options) {
      opts = { theme: 'executive', agents: [], buildings: [], characters: [], storageKey: 'spawnkit-customize' };
      for (var k in options) if (options.hasOwnProperty(k)) opts[k] = options[k];
      config = loadConfig();
      injectCSS();
      buildPanel();
    },
    show: function() {
      if (!panel) return;
      panel.classList.add('sk-custom-open');
      backdrop.classList.add('active');
    },
    hide: function() {
      if (!panel) return;
      panel.classList.remove('sk-custom-open');
      backdrop.classList.remove('active');
    },
    toggle: function() {
      if (!panel) return;
      panel.classList.contains('sk-custom-open') ? ThemeCustomize.hide() : ThemeCustomize.show();
    },
    getConfig: function() { return JSON.parse(JSON.stringify(config)); },
    onUpdate: function(cb) { updateCallbacks.push(cb); },
    destroy: function() {
      document.removeEventListener('keydown', onEsc);
      if (panel) { panel.remove(); panel = null; }
      if (backdrop) { backdrop.remove(); backdrop = null; }
      updateCallbacks = [];
    }
  };

  window.ThemeCustomize = ThemeCustomize;
})();
