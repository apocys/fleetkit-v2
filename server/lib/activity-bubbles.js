(function () {
  'use strict';

  var container = null;
  var bubbles = {};
  var currentTheme = 'executive';
  var styleEl = null;

  var THEMES = {
    executive: {
      bg: 'rgba(30,30,32,0.85)', border: 'rgba(255,255,255,0.12)',
      color: '#F0F0F0', progress: '#4A90E2',
      tail: 'rgba(30,30,32,0.85)', font: 'system-ui, sans-serif'
    },
    medieval: {
      bg: 'rgba(62,48,30,0.92)', border: 'rgba(180,150,100,0.4)',
      color: '#E8D5B0', progress: '#B8860B',
      tail: 'rgba(62,48,30,0.92)', font: 'system-ui, sans-serif'
    },
    simcity: {
      bg: 'rgba(20,25,35,0.9)', border: 'rgba(50,200,100,0.3)',
      color: '#B0FFB0', progress: '#32C864',
      tail: 'rgba(20,25,35,0.9)', font: 'monospace'
    }
  };

  function injectStyles(t) {
    if (styleEl) { styleEl.parentNode.removeChild(styleEl); }
    styleEl = document.createElement('style');
    styleEl.textContent = [
      '@keyframes skBubbleFadeIn{from{opacity:0;transform:translateX(-50%) translateY(-80%)}to{opacity:1;transform:translateX(-50%) translateY(-100%)}}',
      '@keyframes skBubblePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.3)}}',
      '.sk-bubble{position:absolute;pointer-events:none;z-index:9999;min-width:60px;max-width:180px;}',
      '.sk-bubble-content{display:flex;align-items:center;gap:5px;padding:5px 9px;border-radius:14px;',
        'background:' + t.bg + ';border:1px solid ' + t.border + ';',
        'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);',
        'color:' + t.color + ';font-family:' + t.font + ';font-size:12px;white-space:nowrap;',
        'animation:skBubbleFadeIn 200ms ease-out;}',
      '.sk-bubble-emoji{font-size:16px;line-height:1;}',
      '.sk-bubble-text{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
      '.sk-bubble-progress{height:3px;border-radius:2px;margin:2px 9px 4px;',
        'background:rgba(255,255,255,0.1);overflow:hidden;}',
      '.sk-bubble-progress-fill{height:100%;border-radius:2px;background:' + t.progress + ';transition:width 200ms;}',
      '.sk-bubble-tail{width:6px;height:6px;margin:0 auto;margin-top:-1px;',
        'background:' + t.tail + ';transform:rotate(45deg);border-right:1px solid ' + t.border + ';border-bottom:1px solid ' + t.border + ';}'
    ].join('');
    document.head.appendChild(styleEl);
  }

  function truncate(text) {
    return (text && text.length > 25) ? text.slice(0, 24) + '\u2026' : (text || '');
  }

  function createBubbleEl(agentId) {
    var el = document.createElement('div');
    el.className = 'sk-bubble';
    el.setAttribute('data-agent', agentId);
    el.style.transform = 'translateX(-50%) translateY(-100%)';

    var content = document.createElement('div');
    content.className = 'sk-bubble-content';

    var emojiSpan = document.createElement('span');
    emojiSpan.className = 'sk-bubble-emoji';

    var textSpan = document.createElement('span');
    textSpan.className = 'sk-bubble-text';

    content.appendChild(emojiSpan);
    content.appendChild(textSpan);

    var prog = document.createElement('div');
    prog.className = 'sk-bubble-progress';
    prog.style.display = 'none';
    var fill = document.createElement('div');
    fill.className = 'sk-bubble-progress-fill';
    fill.style.width = '0%';
    prog.appendChild(fill);

    var tail = document.createElement('div');
    tail.className = 'sk-bubble-tail';

    el.appendChild(content);
    el.appendChild(prog);
    el.appendChild(tail);
    return { el: el, emojiSpan: emojiSpan, textSpan: textSpan, progEl: prog, fillEl: fill };
  }

  var ActivityBubbles = {
    init: function (c) {
      container = c;
      injectStyles(THEMES[currentTheme] || THEMES.executive);
    },

    setTheme: function (name) {
      currentTheme = name;
      injectStyles(THEMES[name] || THEMES.executive);
    },

    show: function (agentId, text, emoji, options) {
      if (!container) return;
      var b = bubbles[agentId];
      if (!b) {
        var parts = createBubbleEl(agentId);
        container.appendChild(parts.el);
        b = { el: parts.el, emojiSpan: parts.emojiSpan, textSpan: parts.textSpan, progEl: parts.progEl, fillEl: parts.fillEl };
        bubbles[agentId] = b;
      }
      var newEmoji = emoji || '';
      if (b.emojiSpan.textContent !== newEmoji) {
        b.emojiSpan.textContent = newEmoji;
        b.emojiSpan.style.animation = 'none';
        void b.emojiSpan.offsetWidth;
        b.emojiSpan.style.animation = 'skBubblePulse 400ms ease-in-out';
      }
      b.textSpan.textContent = truncate(text);
      b.el.style.opacity = '1';
      b.el.style.transition = '';
    },

    showProgress: function (agentId, percent) {
      var b = bubbles[agentId];
      if (!b) return;
      b.progEl.style.display = 'block';
      b.fillEl.style.width = Math.min(100, Math.max(0, percent || 0)) + '%';
    },

    hideProgress: function (agentId) {
      var b = bubbles[agentId];
      if (b) { b.progEl.style.display = 'none'; }
    },

    hide: function (agentId) {
      var b = bubbles[agentId];
      if (!b) return;
      b.el.style.transition = 'opacity 200ms';
      b.el.style.opacity = '0';
      setTimeout(function () {
        if (b.el.parentNode) { b.el.parentNode.removeChild(b.el); }
        delete bubbles[agentId];
      }, 210);
    },

    updatePosition: function (agentId, x, y) {
      var b = bubbles[agentId];
      if (!b) return;
      b.el.style.left = x + 'px';
      b.el.style.top = (y - 30) + 'px';
    }
  };

  window.ActivityBubbles = ActivityBubbles;
}());
