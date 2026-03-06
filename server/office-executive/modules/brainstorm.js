/* ═══════════════════════════════════════════════
   SpawnKit Executive — Meeting & Brainstorm
   ═══════════════════════════════════════════════ */
(function() {
    'use strict';
    var E = window.Exec;
    var AGENTS = E.AGENTS;
    var API = E.API;
    var esc = E.esc;
    var showToast = E.showToast;

    // DOM refs
    var meetingOverlay  = document.getElementById('meetingOverlay');
    var meetingBackdrop = document.getElementById('meetingBackdrop');
    var meetingClose    = document.getElementById('meetingClose');
    var meetingContent  = document.getElementById('meetingContent');

    /* ── Brainstorm helpers ─────────────────────── */
    var _brainstormCompleted = null; // stores last completed brainstorm result
    var _brainstormHistory = JSON.parse(localStorage.getItem('spawnkit-brainstorm-history') || '[]');
    function saveBrainstormToHistory(result) {
        if (!result || !result.answer) return;
        _brainstormHistory.unshift(result);
        if (_brainstormHistory.length > 20) _brainstormHistory = _brainstormHistory.slice(0, 20);
        localStorage.setItem('spawnkit-brainstorm-history', JSON.stringify(_brainstormHistory));
    }

    function buildBrainstormEmptyState() {
        return '<div class="brainstorm-empty" style="text-align:left;">' +
            '<div style="text-align:center;margin-bottom:16px;">' +
            '<div class="brainstorm-empty-icon">🧠</div>' +
            '<div class="brainstorm-empty-title">Brainstorm Room</div>' +
            '<div class="brainstorm-empty-desc" style="max-width:500px;margin:0 auto;">Your AI team debates ideas together. The CEO orchestrates, specialists research, verify, and challenge — so you get better answers.</div>' +
            '</div>' +
            '<div style="background:var(--bg-primary,#fff);border:1px solid var(--border-subtle);border-radius:14px;padding:20px;margin-bottom:16px;width:100%;box-sizing:border-box;">' +
            '<div style="font-size:13px;font-weight:600;color:var(--text-secondary);margin-bottom:8px;">What should your team work on?</div>' +
            '<textarea class="brainstorm-input" id="inlineBrainstormInput" rows="3" placeholder="e.g. What is the best stablecoin strategy for 2025?" style="width:100%;box-sizing:border-box;"></textarea>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;">' +
            '<label for="brainstormFileInput" style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;border:1px solid var(--border-medium);background:var(--bg-tertiary);font-size:11px;color:var(--text-secondary);cursor:pointer;transition:all 0.15s;">📎 Attach file</label>' +
            '<input type="file" id="brainstormFileInput" style="display:none;" accept=".txt,.md,.json,.csv,.pdf,.js,.py,.html,.css" />' +
            '<span id="brainstormFileName" style="font-size:11px;color:var(--text-tertiary);"></span>' +
            '</div>' +
            '<div style="display:flex;gap:12px;margin-top:12px;align-items:center;flex-wrap:wrap;">' +
            '<div style="font-size:12px;font-weight:600;color:var(--text-tertiary);">Complexity:</div>' +
            '<div style="display:flex;gap:6px;">' +
            '<button class="complexity-option active" data-value="quick" style="padding:6px 14px;border-radius:8px;border:1px solid var(--exec-blue);background:var(--exec-blue);color:white;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">⚡ Quick</button>' +
            '<button class="complexity-option" data-value="deep" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🔍 Deep</button>' +
            '<button class="complexity-option" data-value="thorough" style="padding:6px 14px;border-radius:8px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;">🔬 Thorough</button>' +
            '</div>' +
            '</div>' +
            '<div style="display:flex;gap:8px;margin-top:16px;">' +
            '<button class="brainstorm-btn-primary" id="btnInlineBrainstorm" style="flex:1;">Start Brainstorm →</button>' +
            '</div>' +
            '</div>' +
            '<div style="text-align:center;padding:10px;border-radius:10px;background:rgba(0,122,255,0.04);font-size:12px;color:var(--text-tertiary);line-height:1.6;">' +
            '<strong>How it works:</strong><br>' +
            '📡 Echo researches → 🔬 Forge verifies → 😈 Sentinel challenges → 🎯 CEO synthesizes' +
            '</div>' +
            '</div>';
    }

    function buildBrainstormActiveState(subagents) {
        var agentDefs = [
            { key: 'echo',     emoji: '📡', name: 'Echo' },
            { key: 'forge',    emoji: '🔬', name: 'Forge' },
            { key: 'sentinel', emoji: '😈', name: 'Sentinel' },
            { key: 'ceo',      emoji: '🎯', name: 'CEO' }
        ];
        var total = subagents.length;
        var phaseNum = 1;
        var phaseName = 'Research';
        var progressPct = 25;

        var cards = agentDefs.map(function(a) {
            var match = subagents.find(function(s) {
                return (s.parentAgent || '').toLowerCase() === a.key || (s.label || '').toLowerCase().indexOf(a.key) !== -1;
            });
            var isActive = !!match;
            var status = isActive ? 'Working…' : 'Waiting';
            return '<div class="brainstorm-agent-card' + (isActive ? ' active' : '') + '">' +
                '<div class="brainstorm-agent-avatar">' + a.emoji + '</div>' +
                '<div class="brainstorm-agent-name">' + a.name + '</div>' +
                '<div class="brainstorm-agent-status">' + status + '</div>' +
                '</div>';
        }).join('');

        return '<div class="brainstorm-active">' +
            '<div class="brainstorm-active-header">' +
            '<div class="brainstorm-active-title">🧠 Brainstorm in Progress</div>' +
            '<div class="brainstorm-active-topic">' + total + ' agent' + (total !== 1 ? 's' : '') + ' working</div>' +
            '</div>' +
            '<div class="brainstorm-flow">' + cards + '</div>' +
            '<div class="brainstorm-phase">Phase: ' + phaseNum + '/4 — ' + phaseName + '</div>' +
            '<div>' +
            '<div class="brainstorm-progress"><div class="brainstorm-progress-bar" style="width:' + progressPct + '%"></div></div>' +
            '<div class="brainstorm-progress-label">' + progressPct + '%</div>' +
            '</div>' +
            '</div>';
    }

    function buildBrainstormCompleteState(result) {
        result = result || {};
        var html = '<div class="brainstorm-complete">';
        html += '<div style="font-size:24px;text-align:center;margin-bottom:8px;">✅</div>';
        html += '<h3 style="text-align:center;margin:0 0 4px;font-size:15px;font-weight:600;">Brainstorm Complete</h3>';
        if (result.complexity || result.timestamp) {
            html += '<p style="text-align:center;color:var(--text-tertiary);font-size:12px;margin-bottom:16px;">';
            if (result.complexity) html += esc(result.complexity);
            if (result.complexity && result.timestamp) html += ' · ';
            if (result.timestamp) html += new Date(result.timestamp).toLocaleTimeString();
            html += '</p>';
        }
        if (result.question) {
            html += '<div style="background:var(--bg-tertiary,#f5f5f5);border-radius:10px;padding:12px;margin-bottom:12px;">';
            html += '<div style="font-size:11px;color:var(--text-tertiary,#888);margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;">Question</div>';
            html += '<div style="font-size:13px;font-weight:500;">' + esc(result.question) + '</div>';
            html += '</div>';
        }
        if (result.answer) {
            html += '<div style="background:white;border:1px solid var(--exec-gray-200,#e5e7eb);border-radius:10px;padding:16px;margin-bottom:16px;font-size:13px;line-height:1.6;max-height:400px;overflow-y:auto;">';
            html += typeof window.renderMarkdown === 'function' ? window.renderMarkdown(result.answer) : '<pre style="white-space:pre-wrap;font-family:inherit;margin:0;">' + esc(result.answer) + '</pre>';
            html += '</div>';
        }
        html += '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">';
        html += '<button class="brainstorm-btn-secondary" id="btnBrainstormFollowUp" style="background:var(--exec-blue);color:white;border:none;font-weight:600;">💬 Follow Up</button>';
        html += '<button class="brainstorm-btn-secondary" id="btnBrainstormSave" style="border-color:var(--exec-blue);color:var(--exec-blue);font-weight:600;">📌 Save</button>';
        html += '<button class="brainstorm-btn-primary" id="btnNewTopic">New Topic</button>';
        html += '<button class="brainstorm-btn-secondary" id="btnCloseBrainstorm">Close</button>';
        html += '</div>';
        html += '</div>';
        return html;
    }

    function openBrainstormModal() {
        var existing = document.getElementById('brainstormModalOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.className = 'brainstorm-modal-overlay';
        overlay.id = 'brainstormModalOverlay';
        overlay.innerHTML =
            '<div class="brainstorm-modal-backdrop" id="brainstormModalBackdrop"></div>' +
            '<div class="brainstorm-modal">' +
            '<div class="brainstorm-modal-title">🧠 Start a Brainstorm</div>' +
            '<div>' +
            '<div class="brainstorm-modal-label">What should your team work on?</div>' +
            '<textarea class="brainstorm-input" id="brainstormQuestion" rows="3" placeholder="e.g. What is the best stablecoin strategy for 2025?"></textarea>' +
            '</div>' +
            '<div>' +
            '<div class="brainstorm-modal-label">Complexity:</div>' +
            '<div class="complexity-selector">' +
            '<button class="complexity-option active" data-complexity="quick">⚡ Quick</button>' +
            '<button class="complexity-option" data-complexity="deep">🔍 Deep</button>' +
            '<button class="complexity-option" data-complexity="thorough">🔬 Thorough</button>' +
            '</div>' +
            '</div>' +
            '<div>' +
            '<div class="brainstorm-modal-label">Team:</div>' +
            '<div class="brainstorm-team">' +
            '<span class="brainstorm-team-member">📡 Echo</span>' +
            '<span class="brainstorm-team-member">🔬 Forge</span>' +
            '<span class="brainstorm-team-member">😈 Sentinel</span>' +
            '</div>' +
            '<div style="font-size:11px;color:var(--text-tertiary);margin-top:4px;">All active by default</div>' +
            '</div>' +
            '<div class="brainstorm-modal-actions">' +
            '<button class="brainstorm-btn-primary" id="btnStartBrainstorm">Start Brainstorm →</button>' +
            '<button class="brainstorm-btn-secondary" id="btnCancelBrainstorm">Cancel</button>' +
            '</div>' +
            '</div>';

        document.body.appendChild(overlay);

        // Complexity selector toggle
        overlay.querySelectorAll('.complexity-option').forEach(function(btn) {
            btn.addEventListener('click', function() {
                overlay.querySelectorAll('.complexity-option').forEach(function(b) { b.classList.remove('active'); });
                btn.classList.add('active');
            });
        });

        // Close on backdrop
        document.getElementById('brainstormModalBackdrop').addEventListener('click', function() { overlay.remove(); });

        // Cancel
        document.getElementById('btnCancelBrainstorm').addEventListener('click', function() { overlay.remove(); });

        // Start
        document.getElementById('btnStartBrainstorm').addEventListener('click', function() {
            var question = (document.getElementById('brainstormQuestion') || {}).value || '';
            var activeComplexityBtn = overlay.querySelector('.complexity-option.active');
            var complexity = activeComplexityBtn ? (activeComplexityBtn.dataset.complexity || 'quick') : 'quick';

            if (!question.trim()) {
                showToast('Please enter a question');
                return;
            }

            // Close the modal
            overlay.remove();

            // Close the boardroom panel if open (so it reopens fresh after)
            var meetingOverlayEl = document.getElementById('meetingOverlay');
            if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');

            showToast('🧠 Brainstorm started — your team is working on it...');

            (window.skFetch || fetch)('/api/brainstorm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: question, complexity: complexity })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.ok && data.answer) {
                    _brainstormCompleted = {
                        question: question,
                        answer: data.answer,
                        complexity: complexity,
                        timestamp: new Date().toISOString()
                    };
                    saveBrainstormToHistory(_brainstormCompleted);
                    showToast('✅ Brainstorm complete!');
                    // Auto-open the boardroom to show results
                    setTimeout(function() {
                        var boardroomEl = document.querySelector('[data-room="meeting"]');
                        if (boardroomEl) boardroomEl.click();
                    }, 500);
                } else {
                    showToast('⚠️ Brainstorm failed: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(function(err) {
                showToast('⚠️ Network error: ' + err.message);
            });
        });

        // Focus textarea
        setTimeout(function() {
            var ta = document.getElementById('brainstormQuestion');
            if (ta) ta.focus();
        }, 50);
    }

    function attachBrainstormListeners() {
        var askBtn = document.getElementById('btnAskQuestion');
        if (askBtn) askBtn.addEventListener('click', openBrainstormModal);

        // Inline brainstorm form (no popup)
        var inlineBtn = document.getElementById('btnInlineBrainstorm');
        if (inlineBtn) {
            // Wire complexity toggles
            var panel = inlineBtn.closest('.brainstorm-empty') || document;
            panel.querySelectorAll('.complexity-option').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    panel.querySelectorAll('.complexity-option').forEach(function(b) {
                        b.classList.remove('active');
                        b.style.background = 'transparent';
                        b.style.borderColor = 'var(--border-medium)';
                        b.style.color = 'var(--text-secondary)';
                    });
                    btn.classList.add('active');
                    btn.style.background = 'var(--exec-blue)';
                    btn.style.borderColor = 'var(--exec-blue)';
                    btn.style.color = 'white';
                });
            });

            // Wire file input
            var fileInput = document.getElementById('brainstormFileInput');
            var fileNameEl = document.getElementById('brainstormFileName');
            var _brainstormFileContent = '';
            if (fileInput) {
                fileInput.addEventListener('change', function() {
                    var file = fileInput.files[0];
                    if (!file) { _brainstormFileContent = ''; if (fileNameEl) fileNameEl.textContent = ''; return; }
                    if (file.size > 100000) { showToast('File too large (max 100KB)'); fileInput.value = ''; return; }
                    if (fileNameEl) fileNameEl.textContent = '📄 ' + file.name + ' (' + (file.size / 1024).toFixed(1) + 'KB)';
                    var reader = new FileReader();
                    reader.onload = function(e) { _brainstormFileContent = e.target.result; };
                    reader.readAsText(file);
                });
            }

            inlineBtn.addEventListener('click', function() {
                var question = (document.getElementById('inlineBrainstormInput') || {}).value || '';
                var activeOpt = panel.querySelector('.complexity-option.active');
                var complexity = activeOpt ? (activeOpt.dataset.value || 'quick') : 'quick';
                // Append file content as context
                if (_brainstormFileContent) {
                    question += '\n\n--- ATTACHED FILE ---\n' + _brainstormFileContent.substring(0, 10000);
                }
                if (!question.trim()) { showToast('Please enter a question'); return; }
                showToast('🧠 Brainstorm started — your team is working on it...');
                // Close the meeting panel so it reopens with result
                var meetingOverlayEl = document.getElementById('meetingOverlay');
                if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
                (window.skFetch || fetch)('/api/brainstorm', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ question: question, complexity: complexity })
                })
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.ok && data.answer) {
                        _brainstormCompleted = { question: question, answer: data.answer, complexity: complexity, timestamp: new Date().toISOString() };
                        saveBrainstormToHistory(_brainstormCompleted);
                        showToast('✅ Brainstorm complete!');
                        setTimeout(function() {
                            var br = document.querySelector('[data-room="meeting"]') || Array.from(document.querySelectorAll('button')).find(function(b) { return b.textContent.includes('Boardroom'); });
                            if (br) br.click();
                        }, 500);
                    } else {
                        showToast('⚠️ ' + (data.error || 'Brainstorm failed'));
                    }
                })
                .catch(function(err) { showToast('⚠️ Error: ' + err.message); });
            });
        }

        var missionBtn = document.getElementById('btnStartMission');
        if (missionBtn) missionBtn.addEventListener('click', function() { showToast('Missions are coming soon'); });

        var viewBtn = document.getElementById('btnViewDiscussion');
        if (viewBtn) viewBtn.addEventListener('click', function() { showToast('Full discussion view coming soon'); });

        var newTopicBtn = document.getElementById('btnNewTopic');
        if (newTopicBtn) newTopicBtn.addEventListener('click', function() {
            _brainstormCompleted = null;
            openMeetingPanel();
        });

        // History item clicks — load past brainstorm into view
        document.querySelectorAll('.brainstorm-history-item').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(item.dataset.bsIdx);
                if (_brainstormHistory[idx]) {
                    _brainstormCompleted = _brainstormHistory[idx];
                    openMeetingPanel();
                }
            });
            item.addEventListener('mouseenter', function() { item.style.background = 'var(--exec-gray-200,#e5e7eb)'; });
            item.addEventListener('mouseleave', function() { item.style.background = 'var(--bg-tertiary,#f5f5f5)'; });
        });

        // Follow Up — pre-fill chat with brainstorm context
        var followUpBtn = document.getElementById('btnBrainstormFollowUp');
        if (followUpBtn) followUpBtn.addEventListener('click', function() {
            if (!_brainstormCompleted) return;
            // Close boardroom, open Mission Control with chat pre-filled
            var meetingOverlayEl = document.getElementById('meetingOverlay');
            if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
            // Try to open Mission Control and pre-fill chat
            var ceoRoom = document.querySelector('[data-agent="ceo"]');
            if (ceoRoom) ceoRoom.click();
            setTimeout(function() {
                var chatInput = document.getElementById('mcChatInput');
                if (chatInput) {
                    chatInput.value = 'Regarding the brainstorm on: "' + _brainstormCompleted.question + '"\n\n';
                    chatInput.focus();
                    chatInput.setSelectionRange(chatInput.value.length, chatInput.value.length);
                }
            }, 800);
            showToast('💬 Chat opened with brainstorm context');
        });

        // Save — store to brainstorm history + show confirmation
        var saveBtn = document.getElementById('btnBrainstormSave');
        if (saveBtn) saveBtn.addEventListener('click', function() {
            if (!_brainstormCompleted) return;
            // Already in history from when it completed, but ensure it's there
            saveBrainstormToHistory(_brainstormCompleted);
            saveBtn.textContent = '✅ Saved!';
            saveBtn.style.background = 'rgba(48,209,88,0.12)';
            saveBtn.style.color = '#30D158';
            saveBtn.style.borderColor = '#30D158';
            setTimeout(function() {
                saveBtn.textContent = '📌 Save';
                saveBtn.style.background = '';
                saveBtn.style.color = 'var(--exec-blue)';
                saveBtn.style.borderColor = 'var(--exec-blue)';
            }, 2000);
            showToast('📌 Saved to brainstorm history');
        });

        var closeBtn = document.getElementById('btnCloseBrainstorm');
        if (closeBtn) closeBtn.addEventListener('click', function() {
            var meetingOverlayEl = document.getElementById('meetingOverlay');
            if (meetingOverlayEl) meetingOverlayEl.classList.remove('open');
        });
    }

    async function openMeetingPanel() {
        window.closeAllPanels();

        var activeSubagents = [];
        if (API) {
            try {
                if (window.OcStore && window.OcStore.sessions) {
                    activeSubagents = window.OcStore.sessions.filter(s => s.kind === 'subagent' && s.status === 'active');
                }
            } catch(e) { console.warn('Failed to load active subagents:', e); }
        }

        var content = '';

        // ── Brainstorm section (top) ──────────────────
        content += '<div class="meeting-section">';
        content += '<div class="meeting-section-title">🧠 Brainstorm</div>';

        if (_brainstormCompleted) {
            content += buildBrainstormCompleteState(_brainstormCompleted);
        } else if (activeSubagents && activeSubagents.length > 0) {
            content += buildBrainstormActiveState(activeSubagents);
        } else {
            content += buildBrainstormEmptyState();
        }

        content += '</div>';

        // ── Past Brainstorms ──────────────────────────
        if (_brainstormHistory.length > 0) {
            content += '<div class="meeting-section">';
            content += '<div class="meeting-section-title">📋 Past Sessions (' + _brainstormHistory.length + ')</div>';
            content += '<div style="display:flex;flex-direction:column;gap:6px;">';
            _brainstormHistory.forEach(function(bs, idx) {
                var ts = bs.timestamp ? new Date(bs.timestamp) : null;
                var timeStr = ts ? ts.toLocaleDateString('en-GB', {day:'numeric',month:'short'}) + ' ' + ts.toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'}) : '';
                var preview = (bs.answer || '').replace(/[#*_`\n]/g, ' ').substring(0, 80).trim();
                content += '<div class="brainstorm-history-item" data-bs-idx="' + idx + '" style="background:var(--bg-tertiary,#f5f5f5);border-radius:10px;padding:12px;cursor:pointer;transition:background 0.15s;">';
                content += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
                content += '<div style="font-size:13px;font-weight:600;color:var(--text-primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(bs.question || 'Untitled') + '</div>';
                content += '<div style="font-size:11px;color:var(--text-tertiary);margin-left:8px;flex-shrink:0;">' + esc(bs.complexity || '') + '</div>';
                content += '</div>';
                content += '<div style="font-size:11px;color:var(--text-tertiary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(preview) + '</div>';
                content += '<div style="font-size:10px;color:var(--text-quaternary,#aaa);margin-top:4px;">' + esc(timeStr) + '</div>';
                content += '</div>';
            });
            content += '</div>';
            content += '</div>';
        }

        // ── Active Work Sessions (fallback/supplemental) ──
        content += '<div class="meeting-section">';
        content += '<div class="meeting-section-title">Active Work Sessions</div>';
        content += '<div class="meeting-list">';

        if (activeSubagents && activeSubagents.length > 0) {
            activeSubagents.forEach(function(sa) {
                var duration = sa.durationMs ? Math.floor(sa.durationMs / 60000) + 'm' : '—';
                var parentAvatar = sa.parentAgent || 'main';
                var avatarMap = { forge: 'avatar-forge', atlas: 'avatar-atlas', hunter: 'avatar-hunter', echo: 'avatar-echo', sentinel: 'avatar-sentinel', main: 'avatar-ceo' };
                var avatarId = avatarMap[parentAvatar] || 'avatar-ceo';

                content += '<div class="meeting-item meeting-item--active">';
                content += '<div class="meeting-item-header">';
                content += '<div class="meeting-item-title">🔴 ' + (sa.label || 'Sub-agent ' + sa.id) + '</div>';
                content += '<div class="meeting-item-status">' + duration + '</div>';
                content += '</div>';
                content += '<div class="meeting-item-description">Active sub-agent under ' + (sa.parentAgent || 'main') + '</div>';
                content += '<div class="meeting-participants">';
                content += '<div class="meeting-participant"><svg><use href="#' + avatarId + '"/></svg></div>';
                content += '</div>';
                content += '</div>';
            });
        } else {
            content += '<div class="meeting-item" style="opacity:0.6">';
            content += '<div class="meeting-item-header">';
            content += '<div class="meeting-item-title">💤 No active work sessions</div>';
            content += '</div>';
            content += '<div class="meeting-item-description">All sub-agents have completed their tasks.</div>';
            content += '</div>';
        }

        content += '</div>';
        content += '</div>';

        // Recently completed sessions section (from sessions data)
        content += '<div class="meeting-section">';
        content += '<div class="meeting-section-title">Recent</div>';
        content += '<div class="meeting-list">';

        if (API) {
            try {
                var sessions = (window.OcStore && window.OcStore.sessions) ? window.OcStore.sessions : [];
                var completed = (sessions.subagents || []).filter(function(sa) { return sa.status === 'completed'; }).slice(0, 4);
                if (completed.length > 0) {
                    completed.forEach(function(sa) {
                        content += '<div class="meeting-item">';
                        content += '<div class="meeting-item-header">';
                        content += '<div class="meeting-item-title">✅ ' + (sa.name || sa.label || sa.id) + '</div>';
                        content += '<div class="meeting-item-status">Completed</div>';
                        content += '</div>';
                        content += '<div class="meeting-item-description">' + (sa.task || 'Task completed') + '</div>';
                        content += '</div>';
                    });
                } else {
                    content += '<div class="meeting-item" style="opacity:0.5">';
                    content += '<div class="meeting-item-description">No recently completed sessions</div>';
                    content += '</div>';
                }
            } catch(e) {
                content += '<div class="meeting-item"><div class="meeting-item-description">Could not load session data</div></div>';
            }
        }

        meetingContent.innerHTML = content;
        attachBrainstormListeners();

        // Show panel
        meetingOverlay.classList.add('open');
        meetingClose.focus();
        document.body.style.overflow = 'hidden';
    }

    function closeMeetingPanel() {
        meetingOverlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    meetingBackdrop.addEventListener('click', closeMeetingPanel);
    meetingClose.addEventListener('click', closeMeetingPanel);

    // Exports
    window.openMeetingPanel = openMeetingPanel;
    window.closeMeetingPanel = closeMeetingPanel;
})();
