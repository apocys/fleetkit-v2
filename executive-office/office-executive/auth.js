/**
 * SpawnKit Auth Gate
 * - Checks localStorage for token on load
 * - Shows login overlay if missing
 * - Provides window.skFetch() helper that injects Authorization header
 * - Handles 401 responses by clearing token and re-showing overlay
 */
(function() {
  var STORAGE_KEY = 'spawnkit-token';

  // ── Global fetch helper ───────────────────────────────────────────────────
  window.skFetch = function(url, opts) {
    opts = opts || {};
    opts.headers = opts.headers || {};
    var token = localStorage.getItem(STORAGE_KEY) || '';
    opts.headers['Authorization'] = 'Bearer ' + token;
    return fetch(url, opts).then(function(resp) {
      if (resp.status === 401) {
        localStorage.removeItem(STORAGE_KEY);
        showOverlay();
        return Promise.reject(new Error('Unauthorized'));
      }
      return resp;
    });
  };

  // ── Overlay HTML ──────────────────────────────────────────────────────────
  function createOverlay() {
    var el = document.createElement('div');
    el.id = 'sk-auth-overlay';
    el.innerHTML = [
      '<style>',
      '#sk-auth-overlay {',
      '  position: fixed; inset: 0; z-index: 99999;',
      '  background: rgba(10,10,20,0.97);',
      '  display: flex; align-items: center; justify-content: center;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
      '}',
      '#sk-auth-card {',
      '  background: #13131f; border: 1px solid #2a2a3f;',
      '  border-radius: 16px; padding: 40px 48px;',
      '  width: 340px; text-align: center;',
      '  box-shadow: 0 8px 40px rgba(0,0,0,0.6);',
      '}',
      '#sk-auth-card .sk-logo {',
      '  font-size: 2rem; margin-bottom: 4px;',
      '}',
      '#sk-auth-card h2 {',
      '  color: #e8e8f0; margin: 0 0 4px; font-size: 1.3rem; font-weight: 600;',
      '}',
      '#sk-auth-card p {',
      '  color: #666; font-size: 0.85rem; margin: 0 0 28px;',
      '}',
      '#sk-auth-input {',
      '  width: 100%; box-sizing: border-box;',
      '  background: #0d0d1a; border: 1px solid #2a2a3f;',
      '  color: #e8e8f0; border-radius: 8px;',
      '  padding: 12px 14px; font-size: 1rem;',
      '  outline: none; transition: border-color 0.2s;',
      '  letter-spacing: 0.05em;',
      '}',
      '#sk-auth-input:focus { border-color: #5b5bf0; }',
      '#sk-auth-btn {',
      '  width: 100%; margin-top: 12px;',
      '  background: #5b5bf0; color: #fff;',
      '  border: none; border-radius: 8px;',
      '  padding: 12px; font-size: 1rem; font-weight: 600;',
      '  cursor: pointer; transition: background 0.2s;',
      '}',
      '#sk-auth-btn:hover { background: #4a4ad8; }',
      '#sk-auth-btn:disabled { opacity: 0.6; cursor: not-allowed; }',
      '#sk-auth-error {',
      '  color: #ff6b6b; font-size: 0.82rem;',
      '  margin-top: 10px; min-height: 18px;',
      '}',
      '@keyframes sk-shake {',
      '  0%,100%{transform:translateX(0)}',
      '  20%{transform:translateX(-8px)}',
      '  40%{transform:translateX(8px)}',
      '  60%{transform:translateX(-5px)}',
      '  80%{transform:translateX(5px)}',
      '}',
      '.sk-shake { animation: sk-shake 0.4s ease; }',
      '</style>',
      '<div id="sk-auth-card">',
      '  <div class="sk-logo">⚡</div>',
      '  <h2>SpawnKit</h2>',
      '  <p>Executive Office</p>',
      '  <input id="sk-auth-input" type="password" placeholder="Access Code" autocomplete="current-password" />',
      '  <button id="sk-auth-btn">Enter</button>',
      '  <div id="sk-auth-error"></div>',
      '</div>'
    ].join('\n');
    return el;
  }

  function showOverlay() {
    // Use Deploy Wizard instead of old auth popup if available
    if (window.DeployWizard) {
      window.DeployWizard.open();
      return;
    }
    if (document.getElementById('sk-auth-overlay')) return;
    var overlay = createOverlay();
    document.body.appendChild(overlay);

    var input = document.getElementById('sk-auth-input');
    var btn = document.getElementById('sk-auth-btn');
    var errEl = document.getElementById('sk-auth-error');

    function attempt() {
      var code = input.value.trim();
      if (!code) return;
      btn.disabled = true;
      errEl.textContent = '';
      fetch('/api/oc/health', { headers: { 'Authorization': 'Bearer ' + code } })
        .then(function(resp) {
          if (resp.ok) {
            localStorage.setItem(STORAGE_KEY, code);
            overlay.remove();
            // Trigger app init if it's waiting
            if (typeof window.__skAuthResolve === 'function') {
              window.__skAuthResolve();
            }
          } else {
            errEl.textContent = 'Invalid access code';
            input.classList.remove('sk-shake');
            // Force reflow to restart animation
            void input.offsetWidth;
            input.classList.add('sk-shake');
            btn.disabled = false;
            input.select();
          }
        })
        .catch(function() {
          errEl.textContent = 'Connection error. Try again.';
          btn.disabled = false;
        });
    }

    btn.addEventListener('click', attempt);
    input.addEventListener('keydown', function(e) { if (e.key === 'Enter') attempt(); });
    setTimeout(function() { input.focus(); }, 50);
  }

  // ── Auth gate: called on page load ───────────────────────────────────────
  window.skAuthReady = function(callback) {
    var token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      // Verify token is actually valid against a real endpoint
      console.log('[Auth] Verifying token...');
      var apiUrl = localStorage.getItem('spawnkit-instance-url') || '';
      var healthUrl = (apiUrl || '') + '/api/oc/sessions';
      fetch(healthUrl, { headers: { 'Authorization': 'Bearer ' + token }, signal: AbortSignal.timeout(5000) })
        .then(function(resp) {
          console.log('[Auth] Health check:', resp.status);
          if (resp.ok) {
            return resp.json().then(function(data) {
              if (Array.isArray(data)) {
                console.log('[Auth] ✅ Verified — ' + data.length + ' sessions');
                callback();
              } else {
                console.error('[Auth] Invalid response, not an array');
                throw new Error('invalid');
              }
            });
          } else {
            console.warn('[Auth] Token rejected:', resp.status);
            localStorage.removeItem(STORAGE_KEY);
            window.__skAuthResolve = callback;
            showOverlay();
          }
        })
        .catch(function(err) {
          console.error('[Auth] Connection failed:', err.message || err);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('spawnkit-instance-url');
          localStorage.removeItem('spawnkit-api-token');
          window.__skAuthResolve = callback;
          showOverlay();
        });
    } else {
      console.log('[Auth] No token found, showing overlay');
      window.__skAuthResolve = callback;
      showOverlay();
    }
  };

})();
