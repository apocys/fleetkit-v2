(function() {
'use strict';
var styleId = 'sk-chat-styles';
var css = `
.sk-chat{display:flex;flex-direction:column;height:100%;font-size:14px;}
.sk-chat-messages{flex:1;overflow-y:auto;padding:12px;background:rgba(20,20,22,0.5);}
.sk-chat-msg{margin-bottom:10px;max-width:80%;}
.sk-chat-msg-user{margin-left:auto;text-align:right;}
.sk-chat-msg-assistant{margin-right:auto;text-align:left;}
.sk-chat-msg-user .sk-chat-msg-body{background:rgba(0,122,255,0.15);border-radius:16px 16px 4px 16px;padding:8px 12px;display:inline-block;text-align:left;}
.sk-chat-msg-assistant .sk-chat-msg-body{background:rgba(255,255,255,0.08);border-radius:16px 16px 16px 4px;padding:8px 12px;display:inline-block;}
.sk-chat-msg-label{font-size:11px;opacity:0.5;margin-bottom:2px;}
.sk-chat-msg-time{font-size:10px;opacity:0.35;margin-top:2px;}
.sk-chat-input-bar{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,0.08);border-radius:12px;border:1px solid rgba(255,255,255,0.12);margin:8px;}
.sk-chat-input{flex:1;background:transparent;border:none;outline:none;color:inherit;font-size:14px;}
.sk-chat-send{background:#007AFF;border:none;border-radius:50%;width:32px;height:32px;cursor:pointer;color:#fff;font-size:14px;display:flex;align-items:center;justify-content:center;}
.sk-chat-typing{padding:8px 12px;opacity:0.6;}
.sk-chat-typing span{animation:skTypingDot 1.2s infinite;display:inline-block;margin:0 1px;}
.sk-chat-typing span:nth-child(2){animation-delay:0.2s;}
.sk-chat-typing span:nth-child(3){animation-delay:0.4s;}
@keyframes skTypingDot{0%,80%,100%{transform:scale(1);opacity:0.4;}40%{transform:scale(1.3);opacity:1;}}
.sk-chat.sk-medieval .sk-chat-msg-user .sk-chat-msg-body{background:rgba(62,48,30,0.3);color:#E8D5B0;}
.sk-chat.sk-medieval .sk-chat-msg-assistant .sk-chat-msg-body{background:rgba(30,40,60,0.3);color:#E8D5B0;}
.sk-chat.sk-medieval .sk-chat-input-bar{background:rgba(62,48,30,0.25);border:1px solid rgba(180,150,100,0.3);}
.sk-chat.sk-medieval .sk-chat-send{background:#B8860B;}
.sk-chat.sk-medieval{font-family:'Crimson Text',serif;}
.sk-chat.sk-simcity .sk-chat-msg-user .sk-chat-msg-body{background:rgba(50,200,100,0.1);}
.sk-chat.sk-simcity .sk-chat-msg-assistant .sk-chat-msg-body{background:rgba(20,25,35,0.5);}
.sk-chat.sk-simcity .sk-chat-input-bar{background:rgba(20,25,35,0.5);border:1px solid rgba(50,200,100,0.2);}
.sk-chat.sk-simcity .sk-chat-send{background:#32C864;}
.sk-chat.sk-simcity{font-family:monospace;}
`;

function injectStyles() {
  if (document.getElementById(styleId)) return;
  var s = document.createElement('style');
  s.id = styleId;
  s.textContent = css;
  document.head.appendChild(s);
}

function timeAgo(ts) {
  var diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return Math.floor(diff/86400) + 'd ago';
}

window.ThemeChat = {
  init: function(container, opts) {
    injectStyles();
    var self = this;
    var options = {
      theme: 'executive', maxMessages: 50, pollInterval: 5000,
      placeholder: 'Type a message...', userLabel: 'You', assistantLabel: 'ApoMac'
    };
    for (var k in opts) { if (opts.hasOwnProperty(k)) options[k] = opts[k]; }

    var panel = document.createElement('div');
    panel.className = 'sk-chat' + (options.theme === 'medieval' ? ' sk-medieval' : options.theme === 'simcity' ? ' sk-simcity' : '');

    var msgArea = document.createElement('div');
    msgArea.className = 'sk-chat-messages';

    var inputBar = document.createElement('div');
    inputBar.className = 'sk-chat-input-bar';
    var input = document.createElement('input');
    input.className = 'sk-chat-input';
    input.type = 'text';
    input.placeholder = options.placeholder;
    var btn = document.createElement('button');
    btn.className = 'sk-chat-send';
    btn.innerHTML = '➤';
    inputBar.appendChild(input);
    inputBar.appendChild(btn);
    panel.appendChild(msgArea);
    panel.appendChild(inputBar);
    container.appendChild(panel);

    var typingEl = null;
    var pollTimer = null;
    var callbacks = [];
    var lastTs = 0;
    var visible = true;

    function scrollBottom() { msgArea.scrollTop = msgArea.scrollHeight; }

    function appendMessage(msg) {
      var isUser = msg.role === 'user';
      var content = typeof msg.content === 'string' ? msg.content :
        (msg.content && msg.content[0] && msg.content[0].text) ? msg.content[0].text : '';
      if (content.length > 1000) content = content.substring(0, 1000) + '...';
      content = content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
      var div = document.createElement('div');
      div.className = 'sk-chat-msg ' + (isUser ? 'sk-chat-msg-user' : 'sk-chat-msg-assistant');
      div.innerHTML = '<div class="sk-chat-msg-label">' + (isUser ? options.userLabel : options.assistantLabel) + '</div>' +
        '<div class="sk-chat-msg-body">' + content + '</div>' +
        '<div class="sk-chat-msg-time">' + timeAgo(msg.timestamp || Date.now()) + '</div>';
      while (msgArea.querySelectorAll('.sk-chat-msg').length >= options.maxMessages) {
        var old = msgArea.querySelector('.sk-chat-msg');
        if (old) old.parentNode.removeChild(old);
      }
      if (typingEl && typingEl.parentNode) { msgArea.insertBefore(div, typingEl); }
      else { msgArea.appendChild(div); }
      scrollBottom();
      callbacks.forEach(function(cb) { cb(msg); });
      if (msg.timestamp && msg.timestamp > lastTs) lastTs = msg.timestamp;
    }

    function showTyping() {
      if (typingEl) return;
      typingEl = document.createElement('div');
      typingEl.className = 'sk-chat-typing';
      typingEl.innerHTML = '<span>.</span><span>.</span><span>.</span>';
      msgArea.appendChild(typingEl);
      scrollBottom();
    }

    function hideTyping() {
      if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
      typingEl = null;
    }

    function sendMessage(text) {
      if (!text.trim()) return;
      appendMessage({ role: 'user', content: text, timestamp: Date.now() });
      input.value = '';
      input.focus();
      showTyping();
      ThemeAuth.fetch(ThemeAuth.getApiUrl() + '/api/oc/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      }).then(function(resp) {
        hideTyping();
        if (resp.ok) {
          return resp.json().then(function(data) {
            if (data.reply) appendMessage({ role: 'assistant', content: data.reply, timestamp: Date.now() });
          });
        }
      }).catch(function() {
        hideTyping();
        appendMessage({ role: 'assistant', content: '(Connection lost. Retrying...)', timestamp: Date.now() });
      });
    }

    function poll() {
      ThemeAuth.fetch(ThemeAuth.getApiUrl() + '/api/oc/chat').then(function(r) {
        if (r.ok) return r.json().then(function(d) {
          var msgs = d.messages || d || [];
          if (Array.isArray(msgs)) {
            msgs.forEach(function(m) {
              if ((m.timestamp || 0) > lastTs) appendMessage(m);
            });
          }
        });
      }).catch(function() {});
    }

    function startPoll() { if (!pollTimer) pollTimer = setInterval(poll, options.pollInterval); }
    function stopPoll() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') sendMessage(input.value); });
    btn.addEventListener('click', function() { sendMessage(input.value); });

    poll();
    startPoll();

    self._panel = panel; self._container = container; self._sendMessage = sendMessage;
    self._callbacks = callbacks; self._startPoll = startPoll; self._stopPoll = stopPoll;
  },
  show: function() {
    if (this._panel) this._panel.style.display = '';
    if (this._startPoll) this._startPoll();
  },
  hide: function() {
    if (this._panel) this._panel.style.display = 'none';
    if (this._stopPoll) this._stopPoll();
  },
  send: function(text) { if (this._sendMessage) this._sendMessage(text); },
  onMessage: function(cb) { if (this._callbacks) this._callbacks.push(cb); },
  destroy: function() {
    if (this._stopPoll) this._stopPoll();
    if (this._panel && this._panel.parentNode) this._panel.parentNode.removeChild(this._panel);
    this._panel = null;
  }
};
})();
