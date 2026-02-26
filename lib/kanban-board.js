(function() {
'use strict';
var _container, _opts, _missions, _actionCb, _styleEl;
var COLS = [
  {id:'backlog',     label:'📋 Backlog'},
  {id:'in_progress', label:'⚡ In Progress'},
  {id:'review',      label:'🔍 Review'},
  {id:'done',        label:'✅ Done'}
];
var CSS = '.sk-kanban{display:flex;flex-direction:column;height:100%;font-family:system-ui;color:#fff}' +
'.sk-kanban-header{display:flex;justify-content:space-between;align-items:center;padding:16px}' +
'.sk-kanban-title{margin:0;font-size:18px;font-weight:700}' +
'.sk-kanban-columns{display:flex;gap:12px;flex:1;overflow-x:auto;padding:0 16px 16px}' +
'.sk-kanban-col{flex:1;min-width:200px;display:flex;flex-direction:column;border-radius:12px;background:rgba(255,255,255,0.04)}' +
'.sk-kanban-col-header{display:flex;justify-content:space-between;padding:10px 12px;font-weight:600;font-size:13px}' +
'.sk-kanban-col-count{background:rgba(255,255,255,0.12);border-radius:10px;padding:1px 7px;font-size:12px}' +
'.sk-kanban-col-body{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;min-height:60px}' +
'.sk-kanban-card{padding:12px;border-radius:10px;cursor:grab;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.08)}' +
'.sk-kanban-card:hover{border-color:rgba(255,255,255,0.2)}' +
'.sk-kanban-card[draggable]:active{cursor:grabbing;opacity:0.7}' +
'.sk-kanban-card-header{display:flex;align-items:center;gap:6px;margin-bottom:6px}' +
'.sk-kanban-card-title{font-size:13px;font-weight:600}' +
'.sk-kanban-card-priority{width:8px;height:8px;border-radius:50%;flex-shrink:0}' +
'.sk-priority-low{background:#4ade80}.sk-priority-medium{background:#fbbf24}.sk-priority-high{background:#ef4444}' +
'.sk-kanban-card-agent{font-size:11px;opacity:0.7}' +
'.sk-kanban-card-footer{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:10px;opacity:0.5}' +
'.sk-kanban-card-delete{background:none;border:none;cursor:pointer;font-size:16px;opacity:0.4;padding:0 4px;color:inherit}' +
'.sk-kanban-card-delete:hover{opacity:1;color:#ef4444}' +
'.sk-kanban-add{background:#007AFF;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer}' +
'.sk-kanban-col-body.sk-drop-over{background:rgba(255,200,0,0.08);outline:2px dashed rgba(255,200,0,0.3);border-radius:8px}' +
'.sk-kanban.sk-medieval{color:#E8D5B0;font-family:"Crimson Text",serif}' +
'.sk-kanban.sk-medieval .sk-kanban-col{background:rgba(62,48,30,0.3)}' +
'.sk-kanban.sk-medieval .sk-kanban-card{background:rgba(62,48,30,0.5);border:1px solid rgba(180,150,100,0.2)}' +
'.sk-kanban.sk-medieval .sk-kanban-add{background:#B8860B}' +
'.sk-kanban.sk-medieval .sk-kanban-col-header{border-bottom:1px solid rgba(180,150,100,0.2)}' +
'.sk-kanban.sk-simcity{color:#B0FFB0;font-family:monospace}' +
'.sk-kanban.sk-simcity .sk-kanban-col{background:rgba(20,25,35,0.4)}' +
'.sk-kanban.sk-simcity .sk-kanban-card{background:rgba(20,25,35,0.6);border:1px solid rgba(50,200,100,0.15)}' +
'.sk-kanban.sk-simcity .sk-kanban-add{background:#32C864;color:#000}' +
'.sk-kanban-modal{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)}' +
'.sk-kanban-modal-inner{width:90%;max-width:400px;padding:24px;border-radius:16px;background:rgba(30,30,32,0.95);border:1px solid rgba(255,255,255,0.1);color:#fff}' +
'.sk-kanban-modal-inner h3{margin:0 0 16px;font-size:16px}' +
'.sk-kanban-input,.sk-kanban-textarea,.sk-kanban-select{width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:inherit;font-size:14px;margin:6px 0;box-sizing:border-box}' +
'.sk-kanban-field{margin:10px 0}' +
'.sk-kanban-field label{font-size:12px;opacity:0.7;display:block;margin-bottom:4px}' +
'.sk-kanban-priorities{display:flex;gap:8px;margin:6px 0}' +
'.sk-priority-btn{padding:6px 14px;border-radius:6px;border:1px solid rgba(255,255,255,0.15);background:transparent;color:inherit;cursor:pointer;font-size:12px}' +
'.sk-priority-btn.active{background:rgba(255,255,255,0.15)}' +
'.sk-kanban-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:16px}' +
'.sk-kanban-cancel{background:transparent;border:1px solid rgba(255,255,255,0.15);color:inherit;padding:8px 16px;border-radius:8px;cursor:pointer}' +
'.sk-kanban-submit{background:#007AFF;color:#fff;border:none;padding:8px 20px;border-radius:8px;cursor:pointer;font-weight:600}';

function timeAgo(ts) {
  var diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}
function save() { try { localStorage.setItem(_opts.storageKey, JSON.stringify(_missions)); } catch(e) {} }
function load() {
  try { var d = localStorage.getItem(_opts.storageKey); return d ? JSON.parse(d) : []; } catch(e) { return []; }
}
function fire(action, mission) { if (_actionCb) _actionCb(action, mission); }
function getAgent(id) {
  if (!id) return null;
  var agents = _opts.agents || [];
  for (var i=0; i<agents.length; i++) { if (agents[i].id === id) return agents[i]; }
  return null;
}
function buildCard(m) {
  var card = document.createElement('div');
  card.className = 'sk-kanban-card';
  card.setAttribute('data-id', m.id);
  card.setAttribute('draggable', 'true');
  var agent = getAgent(m.agentId);
  var agentHtml = agent ? '<div class="sk-kanban-card-agent"><span>'+agent.emoji+'</span> '+agent.name+'</div>' : '';
  card.innerHTML = '<div class="sk-kanban-card-header">' +
    '<span class="sk-kanban-card-priority sk-priority-'+m.priority+'"></span>' +
    '<span class="sk-kanban-card-title">'+escHtml(m.title)+'</span>' +
    '</div>' + agentHtml +
    '<div class="sk-kanban-card-footer">' +
    '<span class="sk-kanban-card-time">'+timeAgo(m.created)+'</span>' +
    '<button class="sk-kanban-card-delete" title="Delete">\xd7</button>' +
    '</div>';
  card.addEventListener('dragstart', function(e) {
    e.dataTransfer.setData('text/plain', m.id);
    e.dataTransfer.effectAllowed = 'move';
  });
  card.querySelector('.sk-kanban-card-delete').addEventListener('click', function(e) {
    e.stopPropagation();
    if (confirm('Delete mission "' + m.title + '"?')) {
      _missions = _missions.filter(function(x) { return x.id !== m.id; });
      save(); render(); fire('delete', m);
    }
  });
  return card;
}
function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function updateCounts() {
  COLS.forEach(function(col) {
    var countEl = _container.querySelector('[data-col="'+col.id+'"] .sk-kanban-col-count');
    if (countEl) countEl.textContent = _missions.filter(function(m) { return m.column === col.id; }).length;
  });
}
function render() {
  COLS.forEach(function(col) {
    var body = _container.querySelector('[data-col="'+col.id+'"] .sk-kanban-col-body');
    if (!body) return;
    body.innerHTML = '';
    _missions.filter(function(m) { return m.column === col.id; })
      .forEach(function(m) { body.appendChild(buildCard(m)); });
  });
  updateCounts();
}
function showModal() {
  var modal = document.createElement('div');
  modal.className = 'sk-kanban-modal';
  var agentOpts = '<option value="">Unassigned</option>';
  (_opts.agents || []).forEach(function(a) { agentOpts += '<option value="'+a.id+'">'+a.emoji+' '+a.name+'</option>'; });
  modal.innerHTML = '<div class="sk-kanban-modal-inner"><h3>New Mission</h3>' +
    '<input class="sk-kanban-input" placeholder="Mission title" />' +
    '<textarea class="sk-kanban-textarea" placeholder="Description (optional)" rows="3"></textarea>' +
    '<div class="sk-kanban-field"><label>Assign to:</label><select class="sk-kanban-select">'+agentOpts+'</select></div>' +
    '<div class="sk-kanban-field"><label>Priority:</label><div class="sk-kanban-priorities">' +
    '<button class="sk-priority-btn" data-p="low">Low</button>' +
    '<button class="sk-priority-btn active" data-p="medium">Medium</button>' +
    '<button class="sk-priority-btn" data-p="high">High</button>' +
    '</div></div>' +
    '<div class="sk-kanban-modal-actions"><button class="sk-kanban-cancel">Cancel</button><button class="sk-kanban-submit">Create</button></div>' +
    '</div>';
  var priority = 'medium';
  modal.querySelectorAll('.sk-priority-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      modal.querySelectorAll('.sk-priority-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      priority = btn.getAttribute('data-p');
    });
  });
  modal.querySelector('.sk-kanban-cancel').addEventListener('click', function() { document.body.removeChild(modal); });
  modal.querySelector('.sk-kanban-submit').addEventListener('click', function() {
    var title = modal.querySelector('.sk-kanban-input').value.trim();
    if (!title) { modal.querySelector('.sk-kanban-input').focus(); return; }
    var m = {
      id: Date.now() + Math.random(),
      title: title,
      description: modal.querySelector('.sk-kanban-textarea').value.trim(),
      column: 'backlog', priority: priority,
      agentId: modal.querySelector('.sk-kanban-select').value,
      created: Date.now(), updated: Date.now()
    };
    _missions.push(m); save(); render();
    document.body.removeChild(modal);
  });
  document.body.appendChild(modal);
  modal.querySelector('.sk-kanban-input').focus();
}
function buildBoard() {
  var themeClass = _opts.theme === 'medieval' ? ' sk-medieval' : _opts.theme === 'simcity' ? ' sk-simcity' : '';
  var colsHtml = COLS.map(function(col) {
    return '<div class="sk-kanban-col" data-col="'+col.id+'">' +
      '<div class="sk-kanban-col-header"><span class="sk-kanban-col-title">'+col.label+'</span>' +
      '<span class="sk-kanban-col-count">0</span></div>' +
      '<div class="sk-kanban-col-body"></div></div>';
  }).join('');
  _container.innerHTML = '<div class="sk-kanban'+themeClass+'">' +
    '<div class="sk-kanban-header"><h2 class="sk-kanban-title">Mission Board</h2>' +
    '<button class="sk-kanban-add">+ New Mission</button></div>' +
    '<div class="sk-kanban-columns">'+colsHtml+'</div></div>';
  _container.querySelector('.sk-kanban-add').addEventListener('click', showModal);
  _container.querySelectorAll('.sk-kanban-col-body').forEach(function(body) {
    var colId = body.parentElement.getAttribute('data-col');
    body.addEventListener('dragover', function(e) { e.preventDefault(); body.classList.add('sk-drop-over'); });
    body.addEventListener('dragleave', function() { body.classList.remove('sk-drop-over'); });
    body.addEventListener('drop', function(e) {
      e.preventDefault(); body.classList.remove('sk-drop-over');
      var id = parseFloat(e.dataTransfer.getData('text/plain'));
      var m = null;
      for (var i=0; i<_missions.length; i++) { if (_missions[i].id === id) { m = _missions[i]; break; } }
      if (!m || m.column === colId) return;
      m.column = colId; m.updated = Date.now();
      save(); render();
      if (colId === 'in_progress') fire('start', m);
      else if (colId === 'done') fire('complete', m);
    });
  });
}
window.KanbanBoard = {
  init: function(container, options) {
    _container = container;
    _opts = options || {};
    _opts.storageKey = _opts.storageKey || 'spawnkit-missions';
    _opts.agents = _opts.agents || [];
    _missions = load();
    if (!_styleEl) {
      _styleEl = document.createElement('style');
      _styleEl.textContent = CSS;
      document.head.appendChild(_styleEl);
    }
    buildBoard(); render();
  },
  show: function() { if (_container) _container.style.display = ''; },
  hide: function() { if (_container) _container.style.display = 'none'; },
  addMission: function(m) {
    var mission = { id: Date.now()+Math.random(), title: m.title||'Untitled', description: m.description||'',
      column: m.column||'backlog', priority: m.priority||'medium', agentId: m.agentId||'',
      created: m.created||Date.now(), updated: Date.now() };
    _missions.push(mission); save(); render();
  },
  getMissions: function() { return _missions ? _missions.slice() : []; },
  onAction: function(cb) { _actionCb = cb; },
  destroy: function() {
    if (_container) _container.innerHTML = '';
    if (_styleEl && _styleEl.parentNode) { _styleEl.parentNode.removeChild(_styleEl); _styleEl = null; }
    _container = null; _missions = []; _actionCb = null;
  }
};
})();
