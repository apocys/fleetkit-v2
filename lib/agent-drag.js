(function (global) {
  'use strict';
  var AGENTS = {
    'ApoMac':   { emoji: '👑', name: 'ApoMac' },
    'Forge':    { emoji: '🔨', name: 'Forge' },
    'Atlas':    { emoji: '📊', name: 'Atlas' },
    'Hunter':   { emoji: '💰', name: 'Hunter' },
    'Echo':     { emoji: '📢', name: 'Echo' },
    'Sentinel': { emoji: '🛡️', name: 'Sentinel' },
    'Mystic':   { emoji: '🔮', name: 'Mystic' },
    'Smith':    { emoji: '⚒️', name: 'Smith' }
  };
  var CSS = '.sk-drag-ghost{position:fixed;pointer-events:none;z-index:10000;display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:12px;font-family:system-ui,sans-serif;font-size:13px;font-weight:600;opacity:0.9;transform:translate(-50%,-50%) scale(1.05);transition:opacity 150ms;box-shadow:0 8px 24px rgba(0,0,0,0.3)}'
    + '.sk-drag-ghost-emoji{font-size:20px}'
    + '.sk-drag-ghost.sk-medieval{background:rgba(62,48,30,0.95);border:1px solid rgba(180,150,100,0.5);color:#E8D5B0}'
    + '.sk-drag-ghost.sk-simcity{background:rgba(20,25,35,0.95);border:1px solid rgba(50,200,100,0.4);color:#B0FFB0;font-family:monospace}'
    + '.sk-drag-ghost.sk-executive{background:rgba(30,30,32,0.95);border:1px solid rgba(255,255,255,0.15);color:#fff;backdrop-filter:blur(12px)}'
    + '.sk-drop-zone-active{outline:2px dashed rgba(255,200,0,0.5);outline-offset:-2px}';
  var ST = { IDLE: 0, PENDING: 1, DRAGGING: 2 };
  var _opts, _enabled, _state, _agent, _startX, _startY, _ghost, _styleEl, _dropCbs, _clickCbs, _listeners;

  function _reset() {
    _enabled = false; _state = ST.IDLE; _agent = null;
    _startX = 0; _startY = 0; _ghost = null; _styleEl = null;
    _dropCbs = []; _clickCbs = []; _listeners = [];
  }
  function _injectCSS() {
    if (_styleEl) return;
    _styleEl = document.createElement('style');
    _styleEl.textContent = CSS;
    document.head.appendChild(_styleEl);
  }
  function _createGhost(id) {
    var info = AGENTS[id] || { emoji: '🤖', name: id };
    var el = document.createElement('div');
    el.className = 'sk-drag-ghost sk-' + (_opts.theme || 'executive');
    var e = document.createElement('div'); e.className = 'sk-drag-ghost-emoji'; e.textContent = info.emoji;
    var n = document.createElement('div'); n.className = 'sk-drag-ghost-name'; n.textContent = info.name;
    el.appendChild(e); el.appendChild(n);
    document.body.appendChild(el);
    return el;
  }
  function _moveGhost(x, y) {
    if (!_ghost) return;
    _ghost.style.left = x + 'px'; _ghost.style.top = y + 'px';
  }
  function _removeGhost() {
    if (_ghost && _ghost.parentNode) { _ghost.parentNode.removeChild(_ghost); }
    _ghost = null;
  }
  function _cancel() { _removeGhost(); _state = ST.IDLE; _agent = null; }
  function _coords(e) {
    if (e.touches && e.touches.length) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches.length) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }
  function _onDown(e) {
    if (!_enabled) return;
    if (e.button !== undefined && e.button !== 0) return;
    var c = _coords(e);
    var id = _opts.getAgentAtPoint(c.x, c.y);
    if (!id) return;
    e.preventDefault();
    _state = ST.PENDING; _agent = id; _startX = c.x; _startY = c.y;
  }
  function _onMove(e) {
    if (!_enabled || _state === ST.IDLE) return;
    var c = _coords(e);
    if (_state === ST.PENDING) {
      var dx = c.x - _startX, dy = c.y - _startY;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        _state = ST.DRAGGING; _ghost = _createGhost(_agent); _moveGhost(c.x, c.y);
      }
    } else if (_state === ST.DRAGGING) { e.preventDefault(); _moveGhost(c.x, c.y); }
  }
  function _onUp(e) {
    if (!_enabled || _state === ST.IDLE) return;
    var c = _coords(e);
    if (_state === ST.PENDING) {
      var id = _agent; _state = ST.IDLE; _agent = null;
      for (var i = 0; i < _clickCbs.length; i++) { _clickCbs[i](id); }
    } else if (_state === ST.DRAGGING) {
      var aid = _agent, pos = { x: c.x, y: c.y };
      var bld = _opts.getBuildingAtPoint ? _opts.getBuildingAtPoint(c.x, c.y) : null;
      _removeGhost(); _state = ST.IDLE; _agent = null;
      for (var j = 0; j < _dropCbs.length; j++) { _dropCbs[j](aid, pos, bld); }
    }
  }
  function _onKey(e) { if (e.key === 'Escape' && _state === ST.DRAGGING) { _cancel(); } }
  function _onCtx(e) { if (_state === ST.DRAGGING) { e.preventDefault(); _cancel(); } }
  function _on(el, type, fn, opts) {
    el.addEventListener(type, fn, opts || false);
    _listeners.push({ el: el, type: type, fn: fn, opts: opts || false });
  }
  function _bind() {
    var c = _opts.container;
    _on(c, 'mousedown', _onDown); _on(c, 'mousemove', _onMove); _on(c, 'mouseup', _onUp); _on(c, 'contextmenu', _onCtx);
    _on(document, 'keydown', _onKey);
    _on(c, 'touchstart', _onDown, { passive: false }); _on(c, 'touchmove', _onMove, { passive: false }); _on(c, 'touchend', _onUp);
  }
  function _unbind() {
    for (var i = 0; i < _listeners.length; i++) { var l = _listeners[i]; l.el.removeEventListener(l.type, l.fn, l.opts); }
    _listeners = [];
  }

  global.AgentDrag = {
    init: function (options) {
      _reset(); _opts = options || {}; _opts.theme = _opts.theme || 'executive';
      _enabled = true; _injectCSS(); _bind();
    },
    enable: function () { _enabled = true; },
    disable: function () { _enabled = false; _cancel(); },
    onDrop: function (cb) { _dropCbs.push(cb); },
    onClick: function (cb) { _clickCbs.push(cb); },
    destroy: function () {
      _cancel(); _unbind();
      if (_styleEl && _styleEl.parentNode) { _styleEl.parentNode.removeChild(_styleEl); }
      _reset();
    }
  };
}(window));
