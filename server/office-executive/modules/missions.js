/* ═══════════════════════════════════════════════
   SpawnKit Executive — Missions Panel
   ═══════════════════════════════════════════════ */
(function() {
    'use strict';
    var E = window.Exec;
    var AGENTS = E.AGENTS;
    var API = E.API;
    var esc = E.esc;
    var showToast = E.showToast;

    // DOM refs (local to IIFE)
    var missionsOverlay = document.getElementById('missionsOverlay');
    var missionsBackdropEl = document.getElementById('missionsBackdrop');
    var missionsCloseBtn = document.getElementById('missionsClose');
    var missionsBody = document.getElementById('missionsBody');

    function openMissionsPanel() {
        window.closeAllPanels();
        missionsOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderMissions();
    }

    function closeMissionsPanel() {
        missionsOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    document.getElementById('missionsBtn').addEventListener('click', openMissionsPanel);
    missionsBackdropEl.addEventListener('click', closeMissionsPanel);
    missionsCloseBtn.addEventListener('click', closeMissionsPanel);

    // New Mission form
    var newMissionForm = document.getElementById('newMissionForm');
    document.getElementById('newMissionBtn').addEventListener('click', function() {
        newMissionForm.style.display = newMissionForm.style.display === 'none' ? 'block' : 'none';
        if (newMissionForm.style.display === 'block') {
            setTimeout(function() { document.getElementById('newMissionInput').focus(); }, 100);
        }
    });
    document.getElementById('cancelMissionBtn').addEventListener('click', function() {
        newMissionForm.style.display = 'none';
        document.getElementById('newMissionInput').value = '';
    });
    document.getElementById('launchMissionBtn').addEventListener('click', function() {
        var task = document.getElementById('newMissionInput').value.trim();
        if (!task) { showToast('Please describe the mission'); return; }
        var model = 'sonnet';
        var btn = document.getElementById('launchMissionBtn');
        btn.disabled = true;
        btn.textContent = '\u{1F680} Launching...';

        // Send as brainstorm (uses the CEO to process)
        var apiUrl = window.OC_API_URL || (window.location.origin);
        (window.skFetch || fetch)(apiUrl + '/api/brainstorm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: '\u{1F680} MISSION: ' + task + '\n\nPlease execute this mission thoroughly. Complexity: thorough.',
                complexity: 'deep'
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            btn.disabled = false;
            btn.textContent = '\u{1F680} Launch';
            newMissionForm.style.display = 'none';
            document.getElementById('newMissionInput').value = '';
            if (data.ok) {
                showToast('\u2705 Mission complete! Check the Boardroom for results.');
                renderMissions();
            } else {
                showToast('\u26A0\uFE0F Mission failed: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(function(err) {
            btn.disabled = false;
            btn.textContent = '\u{1F680} Launch';
            showToast('\u26A0\uFE0F Error: ' + err.message);
        });
    });

    async function renderMissions() {
        var sessions = null;

        // Try API first
        if (API) {
            try { sessions = (window.OcStore && window.OcStore.sessions) ? window.OcStore.sessions : []; } catch(e) {}
        }

        // Fallback: use OcStore cache (no extra fetch)
        if (!sessions && window.OcStore && window.OcStore.sessions.length > 0) {
            var data = window.OcStore.sessions;
            sessions = {
                subagents: data.filter(function(s) { return s.kind === 'subagent'; }).map(function(s) {
                    return {
                        id: s.key,
                        name: s.label || s.displayName || s.key.split(':').pop(),
                        label: s.label || s.displayName,
                        status: s.status === 'active' ? 'running' : 'completed',
                        parentAgent: s.key.split(':')[1] || 'main',
                        model: s.model,
                        totalTokens: s.totalTokens || 0,
                        lastActive: s.lastActive
                    };
                }),
                activeSessions: data.filter(function(s) { return s.status === 'active'; })
            };
        }

        // Build mission list from sessions
        var subagents = (sessions && sessions.subagents) || [];
        var activeSessions = (sessions && sessions.activeSessions) ||
            (Array.isArray(sessions) ? sessions.filter(function(s) { return s.status === 'active'; }) : []);
        var running = subagents.filter(function(sa) { return sa.status === 'running'; });
        // completed section removed (Kira fix 2026-02-28)
        var errored = subagents.filter(function(sa) { return sa.status === 'error'; }).slice(0, 3);

        // If no subagents but we have active sessions, show those as missions
        if (running.length === 0 && activeSessions.length === 0) {
            missionsBody.innerHTML = '<div class="cron-empty" style="text-align:center;padding:40px 20px;">'
                + '<div style="font-size:40px;margin-bottom:12px;">\u{1F3AF}</div>'
                + '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">All Clear</div>'
                + '<div style="font-size:12px;color:var(--text-tertiary);line-height:1.5;">No active missions or sub-agents running.</div>'
                + '</div>';
            return;
        }

        var html = '';

        // Active sessions as missions
        if (activeSessions.length > 0 && running.length === 0) {
            html += '<div class="cron-group"><div class="cron-group-title">\u{1F7E2} Active Sessions (' + activeSessions.length + ')</div>';
            activeSessions.forEach(function(s) {
                var name = s.label || s.displayName || s.key || 'Session';
                var model = s.model || '\u2014';
                var tokens = s.totalTokens ? (s.totalTokens / 1000).toFixed(1) + 'k tokens' : '';
                var lastActive = s.lastActive ? new Date(s.lastActive).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '';
                html += '<div class="cron-item">';
                html += '<span class="cron-item-icon">\u{1F7E2}</span>';
                html += '<div class="cron-item-info">';
                html += '<div class="cron-item-name">' + esc(name) + '</div>';
                html += '<div class="cron-item-schedule">' + esc(model) + (tokens ? ' \u2022 ' + tokens : '') + (lastActive ? ' \u2022 ' + lastActive : '') + '</div>';
                html += '</div>';
                html += '<span class="cron-item-status cron-item-status--active">Live</span>';
                html += '</div>';
            });
            html += '</div>';
        }

        // Active sub-agent missions
        if (running.length > 0) {
            html += '<div class="cron-group"><div class="cron-group-title">\u{1F534} Active Missions (' + running.length + ')</div>';
            running.forEach(function(sa) {
                var duration = sa.durationMs ? Math.floor(sa.durationMs / 60000) : 0;
                var progress = sa.progress || 0.5;
                html += '<div class="cron-item">';
                html += '<span class="cron-item-icon">\u{1F680}</span>';
                html += '<div class="cron-item-info">';
                html += '<div class="cron-item-name">' + esc(sa.name || sa.label || sa.id) + '</div>';
                html += '<div class="cron-item-schedule">Parent: ' + esc(sa.parentAgent || 'main') + (duration ? ' \u2022 ' + duration + 'm' : '') + '</div>';
                html += '<div style="margin-top:4px;height:4px;background:var(--bg-tertiary);border-radius:2px;overflow:hidden;"><div style="width:' + Math.round(progress * 100) + '%;height:100%;background:var(--exec-blue);border-radius:2px;transition:width 0.3s;"></div></div>';
                html += '</div>';
                html += '<span class="cron-item-status cron-item-status--active">' + Math.round(progress * 100) + '%</span>';
                html += '</div>';
            });
            html += '</div>';
        }

        // Completed section removed (Kira fix 2026-02-28)

        // Errored
        if (errored.length > 0) {
            html += '<div class="cron-group"><div class="cron-group-title">\u274C Errors (' + errored.length + ')</div>';
            errored.forEach(function(sa) {
                html += '<div class="cron-item" style="opacity:0.6">';
                html += '<span class="cron-item-icon">\u274C</span>';
                html += '<div class="cron-item-info">';
                html += '<div class="cron-item-name">' + esc(sa.name || sa.label || sa.id) + '</div>';
                html += '</div>';
                html += '<span class="cron-item-status cron-item-status--error">Error</span>';
                html += '</div>';
            });
            html += '</div>';
        }

        missionsBody.innerHTML = html;
    }

    // Missions auto-refresh via OcStore (replaces dedicated 15s setInterval)
    function initMissionsRefresh() {
        if (window.OcStore) {
            window.OcStore.subscribe(function() {
                if (missionsOverlay.classList.contains('open')) renderMissions();
            });
        } else {
            document.addEventListener('DOMContentLoaded', initMissionsRefresh);
        }
    }
    initMissionsRefresh();

    // Exports
    window.openMissionsPanel = openMissionsPanel;
    window.closeMissionsPanel = closeMissionsPanel;
})();
