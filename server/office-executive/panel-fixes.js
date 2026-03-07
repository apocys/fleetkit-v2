/**
 * Panel Fixes for SpawnKit Executive Dashboard
 * Enhances the Cron Panel and Add Agent Wizard with functional forms and API integration
 */
(function() {
    'use strict';

    var API_URL = window.location.origin;
    var skF = window.skFetch || fetch;
    var isDemo = window.SK_DEMO_MODE;

    // Default skill list for demo mode
    var DEMO_SKILLS = [
        'coding-agent', 'github', 'weather', 'summarize', 'apple-notes',
        'things-mac', 'apple-reminders', 'imsg', 'gog', 'healthcheck',
        'video-frames', 'openai-whisper', 'nano-pdf'
    ];

    /**
     * Initialize panel enhancements when DOM is ready
     */
    function initPanelFixes() {
        enhanceCronPanel();
        enhanceAddAgentWizard();
    }

    /**
     * CRON PANEL ENHANCEMENT
     * Replace static "Loading cron jobs…" with functional cron management
     */
    function enhanceCronPanel() {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        // Replace static content with dynamic loading
        cronBody.innerHTML = '<div class="cron-loading">Loading cron jobs...</div>';

        // Load cron data
        loadCronData();
    }

    function loadCronData() {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        if (isDemo) {
            // Demo mode - show sample crons
            displayDemoCrons();
            return;
        }

        // Real mode - fetch from API
        skF(API_URL + '/api/oc/crons')
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to fetch crons');
                return response.json();
            })
            .then(function(data) {
                displayCrons(data);
            })
            .catch(function(error) {
                console.warn('[Panel Fixes] Cron API error:', error);
                displayCronError();
            });
    }

    function displayDemoCrons() {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        var demoCrons = [
            { id: 'demo1', schedule: '0 6 * * *', task: 'Daily morning briefing', enabled: true, nextRun: 'Tomorrow 6:00 AM' },
            { id: 'demo2', schedule: '0 */2 * * *', task: 'Check fleet health', enabled: true, nextRun: 'Next 2 hours' }
        ];

        renderCronList(demoCrons);
    }

    function displayCrons(data) {
        var crons = Array.isArray(data) ? data : (data.crons || data.items || []);
        renderCronList(crons);
    }

    function displayCronError() {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        cronBody.innerHTML = '<div class="cron-empty" style="text-align:center;padding:40px 20px;color:var(--text-tertiary);"><div style="font-size:24px;margin-bottom:8px;">⚠️</div><div>Failed to load cron jobs</div><button onclick="window.panelFixes.loadCronData()" style="margin-top:12px;padding:8px 16px;background:var(--exec-blue);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">Retry</button></div>';
    }

    function renderCronList(crons) {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        if (!Array.isArray(crons) || crons.length === 0) {
            cronBody.innerHTML = 
                '<div class="cron-empty" style="text-align:center;padding:40px 20px;color:var(--text-tertiary);">' +
                    '<div style="font-size:24px;margin-bottom:8px;">📅</div>' +
                    '<div style="font-size:14px;font-weight:600;margin-bottom:4px;">No cron jobs configured</div>' +
                    '<div style="font-size:13px;margin-bottom:16px;">Schedule automated tasks to keep your team running smoothly</div>' +
                    '<button onclick="window.panelFixes.showCreateCronForm()" style="padding:8px 16px;background:var(--exec-blue);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;">Create Cron Job</button>' +
                '</div>';
            return;
        }

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding:0 4px;">' +
            '<div style="font-size:14px;font-weight:600;color:var(--text-primary);">Scheduled Jobs</div>' +
            '<button onclick="window.panelFixes.showCreateCronForm()" style="padding:6px 12px;background:var(--exec-blue);color:white;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;">+ Create</button>' +
            '</div><div class="cron-list">';

        crons.forEach(function(cron) {
            var statusColor = cron.enabled ? 'var(--exec-green, #30D158)' : 'var(--text-tertiary)';
            var statusIcon = cron.enabled ? '🟢' : '⚪';
            
            html += 
                '<div class="cron-item" style="padding:12px 16px;border:1px solid var(--border-subtle);border-radius:8px;margin-bottom:8px;background:var(--bg-secondary);">' +
                    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                        '<span style="font-size:12px;">' + statusIcon + '</span>' +
                        '<div style="flex:1;font-size:13px;font-weight:600;color:var(--text-primary);">' + escapeHtml(cron.task || 'Untitled') + '</div>' +
                        '<button onclick="window.panelFixes.deleteCron(\'' + cron.id + '\')" style="padding:4px 8px;background:none;border:1px solid var(--border-medium);border-radius:4px;color:var(--text-secondary);cursor:pointer;font-size:11px;font-family:inherit;">Delete</button>' +
                    '</div>' +
                    '<div style="font-size:11px;color:var(--text-tertiary);font-family:monospace;margin-bottom:2px;">Schedule: ' + escapeHtml(cron.schedule || '') + '</div>' +
                    (cron.nextRun ? '<div style="font-size:11px;color:var(--text-tertiary);">Next: ' + escapeHtml(cron.nextRun) + '</div>' : '') +
                '</div>';
        });

        html += '</div>';
        cronBody.innerHTML = html;
    }

    function showCreateCronForm() {
        var cronBody = document.getElementById('cronBody');
        if (!cronBody) return;

        var formHtml = 
            '<div style="border-bottom:1px solid var(--border-subtle);padding-bottom:16px;margin-bottom:16px;">' +
                '<div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text-primary);">Create Cron Job</div>' +
                '<div style="margin-bottom:12px;">' +
                    '<label style="display:block;font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:4px;">Schedule Expression</label>' +
                    '<input id="cronScheduleInput" type="text" placeholder="0 6 * * * (daily at 6am)" style="width:100%;padding:8px 10px;border:1px solid var(--border-medium);border-radius:6px;font-size:12px;font-family:monospace;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">' +
                '</div>' +
                '<div style="margin-bottom:16px;">' +
                    '<label style="display:block;font-size:12px;font-weight:500;color:var(--text-primary);margin-bottom:4px;">Task Description</label>' +
                    '<input id="cronTaskInput" type="text" placeholder="Daily morning briefing" style="width:100%;padding:8px 10px;border:1px solid var(--border-medium);border-radius:6px;font-size:12px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">' +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button onclick="window.panelFixes.createCronJob()" style="padding:8px 16px;background:var(--exec-blue);color:white;border:none;border-radius:6px;cursor:pointer;font-family:inherit;font-size:12px;font-weight:500;">Create Job</button>' +
                    '<button onclick="window.panelFixes.loadCronData()" style="padding:8px 16px;background:none;border:1px solid var(--border-medium);border-radius:6px;color:var(--text-secondary);cursor:pointer;font-family:inherit;font-size:12px;">Cancel</button>' +
                '</div>' +
            '</div>' +
            '<div id="cronExistingJobs"><div style="text-align:center;color:var(--text-tertiary);font-size:12px;">Loading existing jobs...</div></div>';

        cronBody.innerHTML = formHtml;

        // Focus on schedule input
        setTimeout(function() {
            var input = document.getElementById('cronScheduleInput');
            if (input) input.focus();
        }, 100);

        // Load existing jobs below form
        setTimeout(loadCronData, 200);
    }

    function createCronJob() {
        var scheduleInput = document.getElementById('cronScheduleInput');
        var taskInput = document.getElementById('cronTaskInput');
        
        if (!scheduleInput || !taskInput) return;

        var schedule = scheduleInput.value.trim();
        var task = taskInput.value.trim();

        if (!schedule || !task) {
            alert('Please fill in both schedule and task fields');
            return;
        }

        if (isDemo) {
            alert('Cron job created! (Demo mode - not actually scheduled)');
            loadCronData();
            return;
        }

        // Real mode - POST to API
        skF(API_URL + '/api/oc/crons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule: schedule, task: task, enabled: true })
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to create cron job');
            return response.json();
        })
        .then(function(data) {
            loadCronData();
        })
        .catch(function(error) {
            console.error('[Panel Fixes] Create cron error:', error);
            alert('Failed to create cron job. Please try again.');
        });
    }

    function deleteCron(cronId) {
        if (!cronId) return;
        if (!confirm('Delete this cron job?')) return;

        if (isDemo) {
            alert('Cron job deleted! (Demo mode)');
            loadCronData();
            return;
        }

        skF(API_URL + '/api/oc/crons/' + cronId, { method: 'DELETE' })
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to delete cron');
                loadCronData();
            })
            .catch(function(error) {
                console.error('[Panel Fixes] Delete cron error:', error);
                alert('Failed to delete cron job.');
            });
    }

    /**
     * ADD AGENT WIZARD ENHANCEMENT
     * Replace empty form with functional agent creation wizard
     */
    function enhanceAddAgentWizard() {
        var addAgentBody = document.getElementById('addAgentBody');
        if (!addAgentBody) return;

        // Replace empty content with agent creation form
        renderAddAgentForm();
    }

    function renderAddAgentForm() {
        var addAgentBody = document.getElementById('addAgentBody');
        if (!addAgentBody) return;

        var formHtml = 
            '<div class="agent-wizard-form">' +
                '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Agent Name</label>' +
                    '<input id="newAgentName" type="text" placeholder="Atlas, Hunter, Echo..." style="width:100%;padding:10px 12px;border:1px solid var(--border-medium);border-radius:8px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);box-sizing:border-box;">' +
                '</div>' +
                '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Role</label>' +
                    '<select id="newAgentRole" style="width:100%;padding:10px 12px;border:1px solid var(--border-medium);border-radius:8px;font-size:13px;background:var(--bg-primary);color:var(--text-primary);cursor:pointer;box-sizing:border-box;">' +
                        '<option value="">Select a role...</option>' +
                        '<option value="CEO">CEO - Chief Executive Officer</option>' +
                        '<option value="CTO">CTO - Chief Technology Officer</option>' +
                        '<option value="CMO">CMO - Chief Marketing Officer</option>' +
                        '<option value="COO">COO - Chief Operating Officer</option>' +
                        '<option value="CRO">CRO - Chief Revenue Officer</option>' +
                        '<option value="CFO">CFO - Chief Financial Officer</option>' +
                        '<option value="Designer">Designer - Creative Lead</option>' +
                        '<option value="Engineer">Engineer - Technical Specialist</option>' +
                        '<option value="Analyst">Analyst - Data & Research</option>' +
                        '<option value="QA">QA - Quality Assurance</option>' +
                        '<option value="Support">Support - Customer Success</option>' +
                    '</select>' +
                '</div>' +
                '<div style="margin-bottom:20px;">' +
                    '<label style="display:block;font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:6px;">Skills (Select up to 3)</label>' +
                    '<div id="skillsLoadingMsg" style="padding:12px;text-align:center;color:var(--text-tertiary);font-size:12px;">Loading available skills...</div>' +
                    '<div id="skillsContainer" style="display:none;max-height:160px;overflow-y:auto;border:1px solid var(--border-medium);border-radius:8px;padding:12px;background:var(--bg-secondary);"></div>' +
                '</div>' +
                '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
                    '<button id="cancelAgentBtn" style="padding:10px 20px;border:1px solid var(--border-medium);background:transparent;color:var(--text-secondary);border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;">Cancel</button>' +
                    '<button id="createAgentBtn" style="padding:10px 20px;background:var(--exec-blue);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;">Create Agent</button>' +
                '</div>' +
            '</div>';

        addAgentBody.innerHTML = formHtml;

        // Wire up event handlers
        setupAddAgentHandlers();

        // Load skills
        loadAvailableSkills();
    }

    function setupAddAgentHandlers() {
        var cancelBtn = document.getElementById('cancelAgentBtn');
        var createBtn = document.getElementById('createAgentBtn');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                closeAddAgentWizard();
            });
        }

        if (createBtn) {
            createBtn.addEventListener('click', function() {
                createNewAgent();
            });
        }

        // Close overlay when clicking backdrop
        var overlay = document.getElementById('addAgentOverlay');
        var backdrop = document.getElementById('addAgentBackdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function() {
                closeAddAgentWizard();
            });
        }
    }

    function loadAvailableSkills() {
        var container = document.getElementById('skillsContainer');
        var loadingMsg = document.getElementById('skillsLoadingMsg');

        if (isDemo) {
            displaySkills(DEMO_SKILLS.map(function(skill) {
                return { name: skill, description: 'Demo skill: ' + skill };
            }));
            return;
        }

        skF(API_URL + '/api/oc/skills')
            .then(function(response) {
                if (!response.ok) throw new Error('Failed to fetch skills');
                return response.json();
            })
            .then(function(data) {
                var skills = Array.isArray(data) ? data : (data.skills || data.items || []);
                displaySkills(skills);
            })
            .catch(function(error) {
                console.warn('[Panel Fixes] Skills API error:', error);
                // Fallback to demo skills
                displaySkills(DEMO_SKILLS.map(function(skill) {
                    return { name: skill, description: 'Skill: ' + skill };
                }));
            });
    }

    function displaySkills(skills) {
        var container = document.getElementById('skillsContainer');
        var loadingMsg = document.getElementById('skillsLoadingMsg');

        if (!container) return;

        if (loadingMsg) loadingMsg.style.display = 'none';
        container.style.display = 'block';

        if (!Array.isArray(skills) || skills.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--text-tertiary);font-size:12px;padding:20px;">No skills available</div>';
            return;
        }

        var html = '';
        skills.forEach(function(skill, index) {
            var skillName = skill.name || skill.id || skill;
            var skillDesc = skill.description || skill.desc || '';
            
            html += 
                '<label style="display:block;padding:6px 8px;border-radius:6px;cursor:pointer;margin-bottom:4px;transition:background-color 0.2s;" onmouseover="this.style.backgroundColor=\'var(--bg-tertiary)\'" onmouseout="this.style.backgroundColor=\'transparent\'">' +
                    '<input type="checkbox" name="agentSkills" value="' + escapeHtml(skillName) + '" style="margin-right:8px;" onchange="window.panelFixes.updateSkillCount()">' +
                    '<span style="font-size:12px;font-weight:500;color:var(--text-primary);">' + escapeHtml(skillName) + '</span>' +
                    (skillDesc ? '<div style="font-size:11px;color:var(--text-secondary);margin-left:20px;margin-top:2px;">' + escapeHtml(skillDesc) + '</div>' : '') +
                '</label>';
        });

        container.innerHTML = html;
    }

    function updateSkillCount() {
        var checkboxes = document.querySelectorAll('input[name="agentSkills"]:checked');
        if (checkboxes.length > 3) {
            // Uncheck the last one
            checkboxes[checkboxes.length - 1].checked = false;
            alert('You can select up to 3 skills only.');
        }
    }

    function createNewAgent() {
        var nameInput = document.getElementById('newAgentName');
        var roleSelect = document.getElementById('newAgentRole');
        var skillCheckboxes = document.querySelectorAll('input[name="agentSkills"]:checked');

        if (!nameInput || !roleSelect) return;

        var name = nameInput.value.trim();
        var role = roleSelect.value;
        var skills = Array.from(skillCheckboxes).map(function(cb) { return cb.value; });

        if (!name) {
            alert('Please enter an agent name');
            nameInput.focus();
            return;
        }

        if (!role) {
            alert('Please select a role');
            roleSelect.focus();
            return;
        }

        // Create agent object
        var agent = {
            id: name.toLowerCase().replace(/[^a-z0-9]/g, ''),
            name: name,
            role: role,
            skills: skills,
            status: 'idle',
            created: new Date().toISOString()
        };

        // Save to localStorage
        var agents = JSON.parse(localStorage.getItem('spawnkit-agents') || '[]');
        agents.push(agent);
        localStorage.setItem('spawnkit-agents', JSON.stringify(agents));

        // Show success message
        showAgentCreatedSuccess(agent);

        // Refresh team grid if available
        if (window.refreshTeamGrid && typeof window.refreshTeamGrid === 'function') {
            window.refreshTeamGrid();
        }
    }

    function showAgentCreatedSuccess(agent) {
        var addAgentBody = document.getElementById('addAgentBody');
        if (!addAgentBody) return;

        var html = 
            '<div style="text-align:center;padding:20px;">' +
                '<div style="font-size:48px;margin-bottom:16px;">✅</div>' +
                '<div style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:8px;">Agent Created!</div>' +
                '<div style="font-size:14px;color:var(--text-secondary);margin-bottom:8px;">' + escapeHtml(agent.name) + ' is ready as your ' + escapeHtml(agent.role) + '</div>' +
                (agent.skills.length > 0 ? '<div style="font-size:12px;color:var(--text-tertiary);margin-bottom:20px;">Equipped with: ' + agent.skills.map(escapeHtml).join(', ') + '</div>' : '') +
                '<button onclick="window.panelFixes.closeAddAgentWizard()" style="padding:10px 24px;background:var(--exec-blue);color:white;border:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600;">Done</button>' +
            '</div>';

        addAgentBody.innerHTML = html;

        // Auto-close after 3 seconds
        setTimeout(function() {
            closeAddAgentWizard();
        }, 3000);
    }

    function closeAddAgentWizard() {
        var overlay = document.getElementById('addAgentOverlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.remove('open');
        }
    }

    /**
     * Utility functions
     */
    function escapeHtml(unsafe) {
        return String(unsafe || '')
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Expose methods to global scope for onclick handlers
    window.panelFixes = {
        loadCronData: loadCronData,
        showCreateCronForm: showCreateCronForm,
        createCronJob: createCronJob,
        deleteCron: deleteCron,
        updateSkillCount: updateSkillCount,
        closeAddAgentWizard: closeAddAgentWizard
    };

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPanelFixes);
    } else {
        initPanelFixes();
    }

})();