(function() {
    'use strict';

    var AGENT_ROLES = [
        { id: 'taskrunner', name: 'TaskRunner', desc: 'Executes tasks and workflows', emoji: '⚡' },
        { id: 'codebuilder', name: 'CodeBuilder', desc: 'Writes and reviews code', emoji: '🛠️' },
        { id: 'researcher', name: 'Researcher', desc: 'Gathers and analyzes information', emoji: '🔍' },
        { id: 'analyst', name: 'Analyst', desc: 'Data analysis and reporting', emoji: '📊' },
        { id: 'writer', name: 'Writer', desc: 'Content creation and copywriting', emoji: '✍️' },
        { id: 'designer', name: 'Designer', desc: 'UI/UX and visual design', emoji: '🎨' },
        { id: 'security', name: 'Security', desc: 'Auditing and vulnerability scanning', emoji: '🛡️' },
        { id: 'ops', name: 'Operations', desc: 'DevOps and infrastructure', emoji: '⚙️' },
        { id: 'support', name: 'Support', desc: 'Customer support and communication', emoji: '💬' },
        { id: 'custom', name: 'Custom', desc: 'Define a custom role', emoji: '🧩' }
    ];

    var AGENT_MODELS = [
        { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', tier: 'Premium' },
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'Recommended' },
        { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', tier: 'Fast' },
        { id: 'gpt-4o', name: 'GPT-4o', tier: 'Standard' },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', tier: 'Budget' }
    ];

    var wizardState = { step: 1, name: '', emoji: '🤖', role: '', model: '' };

    function openAddAgentWizard() {
        var overlay = document.getElementById('addAgentOverlay');
        if (!overlay) return;
        wizardState = { step: 1, name: '', emoji: '🤖', role: '', model: '' };
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        renderWizardStep();
    }

    function closeAddAgentWizard() {
        var overlay = document.getElementById('addAgentOverlay');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    function renderWizardStep() {
        var body = document.getElementById('addAgentBody');
        if (!body) return;

        var html = '<div style="margin-bottom:20px;display:flex;gap:8px;">';
        for (var i = 1; i <= 3; i++) {
            var active = i === wizardState.step;
            var done = i < wizardState.step;
            html += '<div style="flex:1;height:4px;border-radius:2px;background:' + (done ? 'var(--exec-blue)' : (active ? 'var(--exec-blue)' : 'var(--exec-gray-200)')) + ';opacity:' + (active ? '1' : (done ? '0.6' : '0.3')) + '"></div>';
        }
        html += '</div>';

        if (wizardState.step === 1) {
            html += '<div style="text-align:center;margin-bottom:16px">';
            html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">Step 1 — Name & Identity</div>';
            html += '<div style="font-size:12px;color:var(--text-tertiary)">Give your agent a name and emoji</div>';
            html += '</div>';
            html += '<div style="display:flex;gap:12px;margin-bottom:16px;align-items:center;">';
            html += '<div style="position:relative">';
            html += '<input id="wizardEmoji" type="text" value="' + wizardState.emoji + '" maxlength="2" style="width:48px;height:48px;text-align:center;font-size:24px;border:1px solid var(--border-medium);border-radius:12px;background:var(--bg-tertiary);cursor:pointer;outline:none;" />';
            html += '</div>';
            html += '<input id="wizardName" type="text" placeholder="Agent name (e.g. Nexus)" value="' + (wizardState.name || '') + '" style="flex:1;height:48px;padding:0 16px;border:1px solid var(--border-medium);border-radius:12px;background:var(--bg-tertiary);color:var(--text-primary);font-family:var(--font-family);font-size:14px;outline:none;" />';
            html += '</div>';
            html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">';
            ['🤖','🧠','⚡','🔥','🎯','💎','🦊','🐙','🌟','🚀','🛸','👾'].forEach(function(e) {
                html += '<button class="wizard-emoji-pick" onclick="document.getElementById(\'wizardEmoji\').value=\'' + e + '\'" style="width:36px;height:36px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--bg-tertiary);font-size:18px;cursor:pointer;transition:all 0.15s;">' + e + '</button>';
            });
            html += '</div>';
            html += '<button id="wizardNext1" style="width:100%;height:44px;border:none;border-radius:12px;background:var(--exec-blue);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;transition:all 0.2s;">Continue →</button>';
        } else if (wizardState.step === 2) {
            html += '<div style="text-align:center;margin-bottom:16px">';
            html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">Step 2 — Role</div>';
            html += '<div style="font-size:12px;color:var(--text-tertiary)">What will ' + (wizardState.emoji + ' ' + (wizardState.name || 'this agent')) + ' do?</div>';
            html += '</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px;max-height:240px;overflow-y:auto;margin-bottom:16px;">';
            AGENT_ROLES.forEach(function(r) {
                var selected = wizardState.role === r.id;
                html += '<button class="wizard-role-btn" data-role="' + r.id + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid ' + (selected ? 'var(--exec-blue)' : 'var(--border-subtle)') + ';border-radius:10px;background:' + (selected ? 'var(--exec-blue-muted)' : 'var(--bg-tertiary)') + ';cursor:pointer;text-align:left;font-family:var(--font-family);transition:all 0.15s;">';
                html += '<span style="font-size:20px">' + r.emoji + '</span>';
                html += '<div><div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + r.name + '</div>';
                html += '<div style="font-size:11px;color:var(--text-tertiary)">' + r.desc + '</div></div>';
                html += '</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;gap:8px;">';
            html += '<button id="wizardBack2" style="flex:1;height:44px;border:1px solid var(--border-medium);border-radius:12px;background:transparent;color:var(--text-secondary);font-family:var(--font-family);font-size:14px;font-weight:500;cursor:pointer;">← Back</button>';
            html += '<button id="wizardNext2" style="flex:2;height:44px;border:none;border-radius:12px;background:var(--exec-blue);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;opacity:' + (wizardState.role ? '1' : '0.5') + ';">Continue →</button>';
            html += '</div>';
        } else if (wizardState.step === 3) {
            html += '<div style="text-align:center;margin-bottom:16px">';
            html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:4px">Step 3 — Model</div>';
            html += '<div style="font-size:12px;color:var(--text-tertiary)">Choose the AI model for ' + wizardState.emoji + ' ' + wizardState.name + '</div>';
            html += '</div>';
            html += '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:20px;">';
            AGENT_MODELS.forEach(function(m) {
                var selected = wizardState.model === m.id;
                html += '<button class="wizard-model-btn" data-model="' + m.id + '" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid ' + (selected ? 'var(--exec-blue)' : 'var(--border-subtle)') + ';border-radius:10px;background:' + (selected ? 'var(--exec-blue-muted)' : 'var(--bg-tertiary)') + ';cursor:pointer;font-family:var(--font-family);transition:all 0.15s;">';
                html += '<div style="font-size:13px;font-weight:600;color:var(--text-primary)">' + m.name + '</div>';
                html += '<span style="font-size:10px;padding:2px 8px;border-radius:6px;background:var(--bg-primary);color:var(--text-tertiary);font-weight:500">' + m.tier + '</span>';
                html += '</button>';
            });
            html += '</div>';
            html += '<div style="display:flex;gap:8px;">';
            html += '<button id="wizardBack3" style="flex:1;height:44px;border:1px solid var(--border-medium);border-radius:12px;background:transparent;color:var(--text-secondary);font-family:var(--font-family);font-size:14px;font-weight:500;cursor:pointer;">← Back</button>';
            html += '<button id="wizardSubmit" style="flex:2;height:44px;border:none;border-radius:12px;background:linear-gradient(135deg,#30D158,#007AFF);color:white;font-family:var(--font-family);font-size:14px;font-weight:600;cursor:pointer;opacity:' + (wizardState.model ? '1' : '0.5') + ';">✨ Create Agent</button>';
            html += '</div>';
        }

        body.innerHTML = html;
        wireWizardEvents();
    }

    function wireWizardEvents() {
        var next1 = document.getElementById('wizardNext1');
        if (next1) next1.addEventListener('click', function() {
            var nameInput = document.getElementById('wizardName');
            var emojiInput = document.getElementById('wizardEmoji');
            wizardState.name = nameInput ? nameInput.value.trim() : '';
            wizardState.emoji = emojiInput ? emojiInput.value.trim() || '🤖' : '🤖';
            if (!wizardState.name) {
                nameInput.style.borderColor = 'var(--status-error)';
                nameInput.focus();
                return;
            }
            wizardState.step = 2;
            renderWizardStep();
        });

        // Role buttons — update in-place without re-render to preserve scroll
        document.querySelectorAll('.wizard-role-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                wizardState.role = btn.dataset.role;
                // Update all role buttons visually without re-rendering
                document.querySelectorAll('.wizard-role-btn').forEach(function(b) {
                    var sel = b.dataset.role === wizardState.role;
                    b.style.borderColor = sel ? 'var(--exec-blue)' : 'var(--border-subtle)';
                    b.style.background = sel ? 'var(--exec-blue-muted)' : 'var(--bg-tertiary)';
                });
                // Enable the Continue button
                var n2 = document.getElementById('wizardNext2');
                if (n2) n2.style.opacity = '1';
                // Scroll selected into view
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        // Model buttons — update in-place without re-render to preserve scroll
        document.querySelectorAll('.wizard-model-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                wizardState.model = btn.dataset.model;
                document.querySelectorAll('.wizard-model-btn').forEach(function(b) {
                    var sel = b.dataset.model === wizardState.model;
                    b.style.borderColor = sel ? 'var(--exec-blue)' : 'var(--border-subtle)';
                    b.style.background = sel ? 'var(--exec-blue-muted)' : 'var(--bg-tertiary)';
                });
                var sub = document.getElementById('wizardSubmit');
                if (sub) sub.style.opacity = '1';
                btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
        });

        var back2 = document.getElementById('wizardBack2');
        if (back2) back2.addEventListener('click', function() { wizardState.step = 1; renderWizardStep(); });

        var next2 = document.getElementById('wizardNext2');
        if (next2) next2.addEventListener('click', function() {
            if (!wizardState.role) return;
            wizardState.step = 3;
            renderWizardStep();
        });

        var back3 = document.getElementById('wizardBack3');
        if (back3) back3.addEventListener('click', function() { wizardState.step = 2; renderWizardStep(); });

        var submit = document.getElementById('wizardSubmit');
        if (submit) submit.addEventListener('click', function() {
            if (!wizardState.model) return;
            createNewAgent();
        });
    }

    function createNewAgent() {
        var role = AGENT_ROLES.find(function(r) { return r.id === wizardState.role; });
        var model = AGENT_MODELS.find(function(m) { return m.id === wizardState.model; });

        var baseId = wizardState.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        var agentId = baseId;
        var suffix = 2;
        while (typeof AGENTS !== 'undefined' && AGENTS[agentId]) {
            agentId = baseId + suffix;
            suffix++;
        }

        // ── 1. Persist to localStorage (Mission Desk reads this on load) ──
        var agentRecord = {
            id: agentId,
            name: wizardState.name,
            emoji: wizardState.emoji || '🤖',
            role: role ? role.name : 'Custom',
            roleId: wizardState.role,
            model: model ? model.id : wizardState.model,
            modelName: model ? model.name : wizardState.model,
            status: 'active',
            createdAt: new Date().toISOString()
        };

        var created = [];
        try { created = JSON.parse(localStorage.getItem('spawnkit-created-agents') || '[]'); } catch(e) { created = []; }
        if (!Array.isArray(created)) created = [];
        // Prevent duplicates
        created = created.filter(function(c) { return c.id !== agentId; });
        created.push(agentRecord);
        localStorage.setItem('spawnkit-created-agents', JSON.stringify(created));

        // ── 2. Register in AGENTS dict (for openDetailPanel) ──
        if (typeof AGENTS !== 'undefined') {
            // AGENTS may be an array (mission-desk) or object (app-init)
            var agentObj = {
                id: agentId,
                name: agentRecord.emoji + ' ' + agentRecord.name,
                role: agentRecord.role,
                color: '#007AFF',
                status: 'active',
                task: 'Ready for tasks',
                model: agentRecord.modelName
            };
            if (Array.isArray(AGENTS)) {
                AGENTS.push(agentObj);
            } else {
                AGENTS[agentId] = agentObj;
            }
        }

        // ── 3. Update Mission Desk grid live (no refresh needed) ──
        var teamEl = document.getElementById('missionDeskTeam');
        if (teamEl && typeof window.refreshMissionDeskTeam === 'function') {
            window.refreshMissionDeskTeam();
        } else if (teamEl) {
            // Fallback: insert tile before the "+ Add Agent" button
            var addTile = teamEl.querySelector('.md-agent--add');
            var newTile = document.createElement('div');
            newTile.className = 'md-agent';
            newTile.setAttribute('data-agent-id', agentId);
            newTile.setAttribute('tabindex', '0');
            newTile.setAttribute('role', 'button');
            newTile.setAttribute('aria-label', agentRecord.emoji + ' ' + agentRecord.name);
            newTile.innerHTML =
                '<div class="md-agent-avatar"><div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;background:#007AFF22;border-radius:50%;">' + agentRecord.emoji + '</div>' +
                '<span class="md-agent-status md-agent-status--active"></span></div>' +
                '<div class="md-agent-name">' + agentRecord.emoji + ' ' + agentRecord.name + '</div>' +
                '<div class="md-agent-role">' + agentRecord.role + '</div>';
            if (addTile) {
                teamEl.insertBefore(newTile, addTile);
            } else {
                teamEl.appendChild(newTile);
            }
            // Wire click to open detail
            newTile.addEventListener('click', function() {
                if (typeof openDetailPanel === 'function') openDetailPanel(agentId);
            });
        }

        // ── 4. Also add to hidden exec grid (legacy compat) ──
        var gridView = document.getElementById('gridView');
        if (gridView) {
            var tile = document.createElement('div');
            tile.className = 'exec-room';
            tile.setAttribute('data-agent', agentId);
            tile.innerHTML = '<span class="exec-room-label">' + wizardState.name + '</span>';
            gridView.appendChild(tile);
        }

        // Show success toast
        if (typeof showToast === 'function') {
            showToast('✨ Agent "' + agentRecord.emoji + ' ' + agentRecord.name + '" created!');
        }

        closeAddAgentWizard();
    }

    // ── Delete a custom agent ──
    function deleteCustomAgent(agentId) {
        // Remove from localStorage
        var created = [];
        try { created = JSON.parse(localStorage.getItem('spawnkit-created-agents') || '[]'); } catch(e) { created = []; }
        created = created.filter(function(c) { return c.id !== agentId; });
        localStorage.setItem('spawnkit-created-agents', JSON.stringify(created));

        // Remove from AGENTS dict
        if (typeof AGENTS !== 'undefined') {
            if (Array.isArray(AGENTS)) {
                for (var i = AGENTS.length - 1; i >= 0; i--) {
                    if (AGENTS[i].id === agentId) { AGENTS.splice(i, 1); break; }
                }
            } else {
                delete AGENTS[agentId];
            }
        }

        // Remove from DOM
        var mdTile = document.querySelector('.md-agent[data-agent-id="' + agentId + '"]');
        if (mdTile) mdTile.remove();
        var execTile = document.querySelector('.exec-room[data-agent="' + agentId + '"]');
        if (execTile) execTile.remove();

        if (typeof showToast === 'function') {
            showToast('🗑️ Agent removed');
        }

        // Close detail panel if open
        if (typeof window.closeAllPanels === 'function') window.closeAllPanels();
    }

    // Export for use by detail panel delete button
    window.deleteCustomAgent = deleteCustomAgent;

    // Wire up events
    document.addEventListener('DOMContentLoaded', function() {
        var addBtn = document.getElementById('addAgentBtn');
        var closeBtn = document.getElementById('addAgentClose');
        var backdrop = document.getElementById('addAgentBackdrop');

        if (addBtn) addBtn.addEventListener('click', openAddAgentWizard);
        if (closeBtn) closeBtn.addEventListener('click', closeAddAgentWizard);
        if (backdrop) backdrop.addEventListener('click', closeAddAgentWizard);

        // F10: Wire all fleet grid room tiles → open detail panel on click
        document.querySelectorAll('.exec-room[data-agent]').forEach(function(room) {
            room.style.cursor = 'pointer';
            room.addEventListener('click', function(e) {
                // Don't trigger if clicking a button inside the room
                if (e.target.closest('button')) return;
                var agentId = room.dataset.agent;
                if (agentId && typeof openDetailPanel === 'function') {
                    openDetailPanel(agentId);
                }
            });
        });
    });
})();
