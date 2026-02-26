(function() {
  'use strict';

  var token = localStorage.getItem('spawnkit-api-token') || '';
  var onAuthCallbacks = [];

  function getApiUrl() {
    if (window.OC_API_URL) return window.OC_API_URL;
    if (window.location.hostname.includes('spawnkit.ai')) return window.location.origin;
    return 'http://127.0.0.1:8765';
  }

  function authFetch(url, options) {
    options = options || {};
    options.headers = options.headers || {};
    if (token) { options.headers['Authorization'] = 'Bearer ' + token; }
    return fetch(url, options);
  }

  function validateToken(t) {
    return fetch(getApiUrl() + '/api/oc/health', {
      headers: { 'Authorization': 'Bearer ' + t }
    }).then(function(resp) {
      return resp.ok;
    }).catch(function() {
      return false;
    });
  }

  function showOverlay() {
    var overlay = document.createElement('div');
    overlay.id = 'skAuthOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);transition:opacity 300ms;';
    overlay.innerHTML = '<div style="background:rgba(30,30,32,0.95);border:1px solid rgba(255,255,255,0.1);border-radius:20px;padding:40px;max-width:400px;width:90%;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.5);">'
      + '<div style="font-size:24px;margin-bottom:4px;">&#9889;</div>'
      + '<h2 style="font-family:system-ui;font-size:20px;font-weight:700;color:#fff;margin:0 0 4px;">SpawnKit</h2>'
      + '<p style="font-family:system-ui;font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 24px;">Enter your access code</p>'
      + '<input id="skAuthInput" type="password" placeholder="Access Code" style="width:100%;padding:12px 16px;border-radius:12px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:15px;font-family:system-ui;outline:none;box-sizing:border-box;margin-bottom:12px;" />'
      + '<div id="skAuthError" style="color:#FF453A;font-size:12px;margin-bottom:8px;display:none;"></div>'
      + '<button id="skAuthBtn" style="width:100%;padding:12px;border-radius:12px;border:none;background:#007AFF;color:#fff;font-size:15px;font-weight:600;cursor:pointer;font-family:system-ui;">Enter</button>'
      + '</div>';
    document.body.appendChild(overlay);

    var input = document.getElementById('skAuthInput');
    var btn = document.getElementById('skAuthBtn');
    var error = document.getElementById('skAuthError');

    function submit() {
      var val = input.value.trim();
      if (!val) return;
      btn.textContent = 'Checking...';
      btn.disabled = true;
      validateToken(val).then(function(valid) {
        if (valid) {
          token = val;
          localStorage.setItem('spawnkit-api-token', token);
          overlay.style.opacity = '0';
          setTimeout(function() { overlay.remove(); }, 300);
          onAuthCallbacks.forEach(function(cb) { cb(token); });
        } else {
          error.textContent = 'Invalid token. Check your access code.';
          error.style.display = 'block';
          btn.textContent = 'Enter';
          btn.disabled = false;
          input.focus();
        }
      });
    }

    btn.addEventListener('click', submit);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') submit(); });
    input.focus();
  }

  function init() {
    if (!token) {
      showOverlay();
    } else {
      validateToken(token).then(function(valid) {
        if (!valid) {
          token = '';
          localStorage.removeItem('spawnkit-api-token');
          showOverlay();
        } else {
          onAuthCallbacks.forEach(function(cb) { cb(token); });
        }
      });
    }
  }

  window.ThemeAuth = {
    init: init,
    getToken: function() { return token; },
    getApiUrl: getApiUrl,
    fetch: authFetch,
    onAuth: function(cb) {
      onAuthCallbacks.push(cb);
      if (token) cb(token);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
