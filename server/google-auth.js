/**
 * google-auth.js — Google Identity Services integration for SpawnKit
 * Handles: GSI init, sign-in callback, user icon in header, logout
 */
(function () {
  'use strict';

  var GOOGLE_CLIENT_ID = '1001032049963-7or701jbmegurbhn6d15hor1j326fgh3.apps.googleusercontent.com'; // Set via window.SPAWNKIT_GOOGLE_CLIENT_ID or localStorage
  var API_BASE = window.OC_API_URL ||
    (window.location.hostname.includes('spawnkit.ai') ? window.location.origin : 'http://127.0.0.1:8765');

  /* ── State ─────────────────────────────────────────────── */
  var currentUser = null;

  /* ── Helpers ────────────────────────────────────────────── */
  function storeUser(user) {
    currentUser = user;
    try {
      localStorage.setItem('spawnkit-user-name', user.name || user.email);
      localStorage.setItem('spawnkit-user-avatar', user.picture || '');
      localStorage.setItem('spawnkit-user-email', user.email || '');
    } catch (e) {}
  }

  function clearUser() {
    currentUser = null;
    try {
      localStorage.removeItem('spawnkit-user-name');
      localStorage.removeItem('spawnkit-user-avatar');
      localStorage.removeItem('spawnkit-user-email');
    } catch (e) {}
  }

  /* ── User icon in statusbar ──────────────────────────────── */
  function renderUserIcon(user) {
    var existing = document.getElementById('skUserBtn');
    if (existing) existing.remove();

    var statusbar = document.querySelector('.exec-statusbar');
    if (!statusbar) return;

    var btn = document.createElement('button');
    btn.id = 'skUserBtn';
    btn.setAttribute('aria-label', 'User menu — ' + (user ? user.name : 'Not signed in'));
    btn.style.cssText = 'display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:10px;transition:background 0.15s;margin-left:auto;';
    btn.onmouseover = function () { btn.style.background = 'rgba(0,0,0,0.05)'; };
    btn.onmouseout = function () { btn.style.background = 'none'; };

    if (user) {
      var img = user.picture
        ? '<img src="' + escHtml(user.picture) + '" alt="" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:2px solid rgba(0,122,255,0.2);" referrerpolicy="no-referrer" />'
        : '<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#007AFF,#5856D6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:600;">' + escHtml(user.name.charAt(0).toUpperCase()) + '</div>';
      btn.innerHTML = img + '<span style="font-size:13px;font-weight:500;color:var(--text-primary,#1c1c1e);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escHtml(user.name) + '</span>';
    } else {
      btn.innerHTML = '<div style="width:28px;height:28px;border-radius:50%;background:rgba(0,0,0,0.08);display:flex;align-items:center;justify-content:center;">👤</div>';
    }

    statusbar.appendChild(btn);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      openUserMenu(btn, user);
    });
  }

  function openUserMenu(anchor, user) {
    var existing = document.getElementById('skUserDropdown');
    if (existing) { existing.remove(); return; }

    var dd = document.createElement('div');
    dd.id = 'skUserDropdown';
    dd.style.cssText = 'position:fixed;top:48px;right:16px;background:var(--bg-primary,#fff);border:1px solid var(--border-subtle,rgba(0,0,0,0.1));border-radius:14px;padding:4px;min-width:200px;box-shadow:0 8px 32px rgba(0,0,0,0.14);z-index:10020;';

    var userInfo = user
      ? '<div style="padding:12px 14px;border-bottom:1px solid var(--border-subtle,rgba(0,0,0,0.06));margin-bottom:4px;">' +
          '<div style="font-size:13px;font-weight:600;color:var(--text-primary,#1c1c1e);">' + escHtml(user.name) + '</div>' +
          '<div style="font-size:11px;color:var(--text-tertiary,#8E8E93);margin-top:2px;">' + escHtml(user.email) + '</div>' +
        '</div>'
      : '<div style="padding:12px 14px;border-bottom:1px solid var(--border-subtle,rgba(0,0,0,0.06));margin-bottom:4px;">' +
          '<div style="font-size:13px;color:var(--text-secondary,#636366);">Not signed in</div>' +
        '</div>';

    var menuItems = [];
    if (user) {
      menuItems = [
        { icon: '🎨', label: 'Change Theme', action: 'theme' },
        { icon: '⚙️', label: 'Settings', action: 'settings' },
        { icon: '🚪', label: 'Sign out', action: 'logout', danger: true }
      ];
    } else {
      menuItems = [
        { icon: '🔑', label: 'Sign in with Google', action: 'signin' },
        { icon: '🎨', label: 'Change Theme', action: 'theme' },
        { icon: '⚙️', label: 'Settings', action: 'settings' }
      ];
    }

    dd.innerHTML = userInfo + menuItems.map(function (it) {
      var color = it.danger ? 'color:#FF453A;' : 'color:var(--text-primary,#1c1c1e);';
      return '<div class="sk-dd-item" data-action="' + it.action + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;font-size:13px;border-radius:10px;cursor:pointer;' + color + '" ' +
        'onmouseover="this.style.background=\'var(--bg-secondary,rgba(0,0,0,0.04))\'" onmouseout="this.style.background=\'transparent\'">' +
        '<span>' + it.icon + '</span><span>' + it.label + '</span></div>';
    }).join('');

    document.body.appendChild(dd);

    dd.addEventListener('click', function (ev) {
      var item = ev.target.closest('[data-action]');
      if (!item) return;
      dd.remove();
      handleMenuAction(item.dataset.action);
    });

    setTimeout(function () {
      document.addEventListener('click', function closeDD() {
        var d = document.getElementById('skUserDropdown');
        if (d) d.remove();
        document.removeEventListener('click', closeDD);
      });
    }, 10);
  }

  function handleMenuAction(action) {
    if (action === 'theme') {
      var tp = document.getElementById('themePicker');
      if (tp) { tp.classList.add('open'); }
      else if (window.ThemePicker) { window.ThemePicker.open(); }
    } else if (action === 'settings') {
      var settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) { settingsBtn.click(); }
    } else if (action === 'signin') {
      showGoogleSignIn();
    } else if (action === 'logout') {
      logout();
    }
  }

  /* ── Google Sign-In ─────────────────────────────────────── */
  function handleCredentialResponse(response) {
    var credential = response && response.credential;
    if (!credential) return;

    var token = localStorage.getItem('spawnkit-api-token') || '';
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(API_BASE + '/api/auth/google', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ credential: credential })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.ok && data.user) {
          storeUser(data.user);
          renderUserIcon(data.user);
          hideGoogleOverlay();
          showToast('Signed in as ' + data.user.name);
        } else {
          console.error('[GoogleAuth] Sign-in failed:', data.error);
          showToast('Sign-in failed: ' + (data.error || 'unknown error'));
        }
      })
      .catch(function (e) {
        console.error('[GoogleAuth] Fetch error:', e);
        showToast('Sign-in failed: network error');
      });
  }

  function showGoogleSignIn() {
    var overlay = document.getElementById('googleAuthOverlay');
    if (overlay) overlay.style.display = 'flex';
    initGSI();
  }

  function hideGoogleOverlay() {
    var overlay = document.getElementById('googleAuthOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function logout() {
    var token = localStorage.getItem('spawnkit-api-token') || '';
    var headers = {};
    if (token) headers['Authorization'] = 'Bearer ' + token;
    fetch(API_BASE + '/api/auth/logout', { method: 'POST', headers: headers }).catch(function () {});
    clearUser();
    renderUserIcon(null);
    showToast('Signed out');
  }

  function showToast(msg) {
    if (typeof window.showToast === 'function') { window.showToast(msg); return; }
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1c1c1e;color:#fff;padding:10px 20px;border-radius:10px;font-size:13px;z-index:99999;pointer-events:none;';
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2500);
  }

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── GSI Initialisation ─────────────────────────────────── */
  function initGSI() {
    var clientId = window.SPAWNKIT_GOOGLE_CLIENT_ID || localStorage.getItem('spawnkit-google-client-id') || GOOGLE_CLIENT_ID;
    if (!clientId) {
      // No client ID — show config prompt
      var btn = document.getElementById('googleSignInBtn');
      if (btn) btn.innerHTML = '<p style="font-size:12px;color:#8E8E93;">Google Sign-In requires a Client ID.<br>Set <code>SPAWNKIT_GOOGLE_CLIENT_ID</code>.</p>';
      return;
    }

    if (!window.google || !window.google.accounts) {
      // GSI not loaded yet — retry
      setTimeout(initGSI, 500);
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    var btnEl = document.getElementById('googleSignInBtn');
    if (btnEl) {
      window.google.accounts.id.renderButton(btnEl, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: 280
      });
    }
  }

  /* ── Bootstrap ──────────────────────────────────────────── */
  function bootstrap() {
    // Always init GSI eagerly so the button is ready when overlay shows
    initGSI();

    // Check for stored user profile from localStorage
    var name = localStorage.getItem('spawnkit-user-name');
    var avatar = localStorage.getItem('spawnkit-user-avatar');
    var email = localStorage.getItem('spawnkit-user-email');

    if (name) {
      currentUser = { name: name, picture: avatar || '', email: email || '' };
      renderUserIcon(currentUser);
    } else {
      // Try to get from server
      var token = localStorage.getItem('spawnkit-api-token') || '';
      var headers = {};
      if (token) headers['Authorization'] = 'Bearer ' + token;
      fetch(API_BASE + '/api/auth/user', { headers: headers })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.ok && data.user) {
            storeUser(data.user);
            renderUserIcon(data.user);
          } else {
            renderUserIcon(null);
            showGoogleSignIn();
          }
        })
        .catch(function () { renderUserIcon(null); showGoogleSignIn(); });
    }

    // Expose public API
    window.GoogleAuth = {
      signIn: showGoogleSignIn,
      logout: logout,
      getUser: function () { return currentUser; },
      renderUserIcon: renderUserIcon
    };

    // Expose overlay toggle for token button
    window.__skShowTokenOverlay = function () {
      var overlay = document.getElementById('sk-auth-overlay');
      if (overlay) overlay.classList.add('open');
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
