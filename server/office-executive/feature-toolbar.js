/**
 * SpawnKit — Feature Toolbar
 * Exposes all hidden features with Awwwards-level action cards
 * Auto-injects into the dashboard on load
 */
(function() {
  'use strict';

  // ── Style ──────────────────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = '\
/* Feature Toolbar */\n\
.sk-ft { margin: 0 0 24px; }\n\
.sk-ft-title {\n\
  font-size: 11px; font-weight: 700; text-transform: uppercase;\n\
  letter-spacing: 1px; color: var(--text-tertiary, #8E8E93);\n\
  margin: 0 0 10px; padding: 0 4px;\n\
}\n\
.sk-ft-grid {\n\
  display: flex; gap: 8px; flex-wrap: wrap;\n\
}\n\
.sk-ft-card {\n\
  display: flex; align-items: center; gap: 8px;\n\
  padding: 10px 16px; border-radius: 12px;\n\
  background: var(--bg-secondary, rgba(255,255,255,0.04));\n\
  border: 1px solid var(--border-subtle, rgba(0,0,0,0.06));\n\
  cursor: pointer; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);\n\
  font-family: inherit; font-size: 13px; font-weight: 500;\n\
  color: var(--text-primary, #1C1C1E);\n\
  -webkit-tap-highlight-color: transparent;\n\
  user-select: none; white-space: nowrap;\n\
}\n\
.sk-ft-card:hover {\n\
  background: var(--bg-hover, rgba(0,122,255,0.06));\n\
  border-color: var(--exec-blue, #007AFF);\n\
  transform: translateY(-1px);\n\
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);\n\
}\n\
.sk-ft-card:active {\n\
  transform: scale(0.97);\n\
}\n\
.sk-ft-icon {\n\
  font-size: 16px; flex-shrink: 0;\n\
  width: 28px; height: 28px; display: flex;\n\
  align-items: center; justify-content: center;\n\
  border-radius: 8px;\n\
}\n\
.sk-ft-label { flex: 1; }\n\
.sk-ft-badge {\n\
  font-size: 9px; font-weight: 700;\n\
  padding: 2px 6px; border-radius: 4px;\n\
  background: rgba(0,122,255,0.1); color: var(--exec-blue, #007AFF);\n\
  text-transform: uppercase; letter-spacing: 0.5px;\n\
}\n\
\n\
/* Responsive */\n\
@media (max-width: 768px) {\n\
  .sk-ft-grid { flex-direction: column; }\n\
  .sk-ft-card { width: 100%; }\n\
}\n\
';
  document.head.appendChild(style);

  // ── Feature Definitions ────────────────────────────────────────────────────
  // Only features with NO existing UI access point
  // Removed: Channels (sidebar has cards), Mission Control (statusbar Missions)
  var features = [
    {
      id: 'briefing',
      icon: '📋',
      label: 'Daily Briefing',
      color: 'rgba(0,122,255,0.1)',
      action: function() { if (window.openMeetingPanel) window.openMeetingPanel(); }
    },
    {
      id: 'skill-forge',
      icon: '🔨',
      label: 'Skill Forge',
      color: 'rgba(255,149,0,0.1)',
      action: function() { if (window.SkillForge) window.SkillForge.open(); }
    },
    {
      id: 'use-cases',
      icon: '💡',
      label: 'Use Cases',
      color: 'rgba(52,199,89,0.1)',
      action: function() { if (window.UseCaseExplorer) window.UseCaseExplorer.open(); }
    },
    {
      id: 'marketplace',
      icon: '🏪',
      label: 'Skill Store',
      color: 'rgba(175,82,222,0.1)',
      action: function() { if (window.SkillMarketplace) window.SkillMarketplace.open(); }
    },
    {
      id: 'profile',
      icon: '👤',
      label: 'Creator Profile',
      color: 'rgba(90,200,250,0.1)',
      action: function() { if (window.openCreatorProfile) window.openCreatorProfile(); }
    },
    {
      id: 'add-agent',
      icon: '➕',
      label: 'Add Agent',
      color: 'rgba(255,59,48,0.1)',
      action: function() { if (window.openAddAgentWizard) window.openAddAgentWizard(); }
    }
  ];

  // ── Build & Inject ─────────────────────────────────────────────────────────
  function inject() {
    // Find the main content area — look for the chat suggestions or the welcome section
    var target = document.querySelector('.exec-main-content') ||
                 document.querySelector('.main-content') ||
                 document.querySelector('[class*="main"]');

    // Alternative: inject before the quick actions in the statusbar area
    if (!target) {
      // Try above the statusbar
      target = document.querySelector('.exec-statusbar');
      if (target && target.parentNode) {
        var wrapper = document.createElement('div');
        wrapper.style.cssText = 'padding: 0 24px;';
        target.parentNode.insertBefore(wrapper, target);
        target = wrapper;
      }
    }

    if (!target) return; // Can't find injection point

    // Don't double-inject
    if (document.querySelector('.sk-ft')) return;

    var toolbar = document.createElement('div');
    toolbar.className = 'sk-ft';

    var title = document.createElement('div');
    title.className = 'sk-ft-title';
    title.textContent = 'Quick Actions';
    toolbar.appendChild(title);

    var grid = document.createElement('div');
    grid.className = 'sk-ft-grid';

    features.forEach(function(f) {
      var card = document.createElement('button');
      card.className = 'sk-ft-card';
      card.setAttribute('data-feature', f.id);

      var iconEl = document.createElement('span');
      iconEl.className = 'sk-ft-icon';
      iconEl.style.background = f.color;
      iconEl.textContent = f.icon;

      var labelEl = document.createElement('span');
      labelEl.className = 'sk-ft-label';
      labelEl.textContent = f.label;

      card.appendChild(iconEl);
      card.appendChild(labelEl);

      card.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        f.action();
      });

      grid.appendChild(card);
    });

    toolbar.appendChild(grid);

    // Insert at the top of main content or before statusbar
    if (target.firstChild) {
      target.insertBefore(toolbar, target.firstChild);
    } else {
      target.appendChild(toolbar);
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  // Wait for DOM and other scripts to load
  function init() {
    // Try immediate
    inject();

    // Retry after scripts load (some features register lazily)
    if (!document.querySelector('.sk-ft')) {
      setTimeout(inject, 1000);
    }
    if (!document.querySelector('.sk-ft')) {
      setTimeout(inject, 3000);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // Small delay to let other scripts register their window globals
    setTimeout(init, 500);
  }
})();
