/**
 * SpawnKit — Overlay Manager
 * Ensures only one overlay is open at a time.
 * Bridges the `hidden` attribute (accessibility) with the `.open` class (CSS visibility).
 * Drop-in: all existing open/close functions are monkey-patched.
 */
(function () {
  'use strict';

  // All managed overlay IDs
  var OVERLAY_IDS = [
    'mailboxOverlay', 'todoOverlay', 'meetingOverlay', 'detailOverlay',
    'chatOverlay', 'cronOverlay', 'memoryOverlay', 'missionsOverlay',
    'settingsOverlay', 'remoteOverlay', 'chatHistoryOverlay',
    'addAgentOverlay', 'orchestrationOverlay', 'themePickerOverlay',
    'missionControlOverlay', 'activateAgentModal'
  ];

  // ── Show an overlay (remove hidden, add .open) ──
  function showOverlay(id) {
    // Close all others first
    OVERLAY_IDS.forEach(function (oid) {
      if (oid !== id) hideOverlay(oid);
    });
    var el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute('hidden');
    el.removeAttribute('aria-hidden');
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  // ── Hide an overlay (add hidden, remove .open) ──
  function hideOverlay(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    el.setAttribute('hidden', '');
    el.setAttribute('aria-hidden', 'true');
  }

  // ── Close all overlays ──
  function hideAll() {
    OVERLAY_IDS.forEach(hideOverlay);
    document.body.style.overflow = '';
  }

  // ── MutationObserver: catch any JS that adds .open without removing hidden ──
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      if (m.type === 'attributes' && m.attributeName === 'class') {
        var el = m.target;
        if (el.classList.contains('open') && el.hasAttribute('hidden')) {
          el.removeAttribute('hidden');
          el.removeAttribute('aria-hidden');
        }
      }
    });
  });

  // Observe all overlays for class changes
  function observeOverlays() {
    OVERLAY_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    });
  }

  // ── Patch closeAllPanels to also set hidden ──
  var _origCloseAll = window.closeAllPanels;
  window.closeAllPanels = function () {
    if (typeof _origCloseAll === 'function') _origCloseAll();
    hideAll();
  };

  // ── Expose global API ──
  window.OverlayManager = {
    show: showOverlay,
    hide: hideOverlay,
    hideAll: hideAll,
    OVERLAY_IDS: OVERLAY_IDS
  };

  // Init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeOverlays);
  } else {
    observeOverlays();
  }
})();
