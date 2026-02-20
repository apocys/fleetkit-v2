/**
 * Sims UI — The Sims 1 Style Bottom Control Panel
 * ═══════════════════════════════════════════════════════
 * Renders the iconic Sims 1 bottom panel with:
 *  - Character portrait (left)
 *  - Needs bars (center) — Energy, Fun, Social, Hunger, Hygiene, Bladder
 *  - Speed controls (right) — Play/Pause, 1x, 2x, 3x
 *  - Buy/Build mode buttons (decorative)
 *
 * All driven by real SpawnKit data mapped to Sims-style needs.
 *
 * @author Echo (CMO) 📊
 */

class SimsUI {
    constructor(characterManager, officeMap) {
        this.characterManager = characterManager;
        this.officeMap = officeMap;
        this.selectedAgent = null;
        this.missions = [];
        this.updateTimer = 0;
        this.needDecayTimer = 0;

        // Needs values (0-100) — start at decent levels
        this.needs = {
            Energy:  75,
            Fun:     60,
            Social:  55,
            Hunger:  70,
            Hygiene: 80,
            Bladder: 65,
        };

        this._buildUI();
        this._selectAgent(0);

        // Update needs from real data every few seconds
        this._syncNeeds();
    }

    // ── Build the HTML panel ────────────────────────────

    _buildUI() {
        const panel = document.getElementById('simsPanel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="sims-panel-inner">
                <!-- Portrait section -->
                <div class="sims-portrait-section">
                    <div class="sims-portrait" id="simsPortrait">
                        <canvas id="simsPortraitCanvas" width="64" height="64"></canvas>
                    </div>
                    <div class="sims-agent-name" id="simsAgentName">Agent</div>
                    <div class="sims-agent-role" id="simsAgentRole">Role</div>
                    <div class="sims-agent-nav">
                        <button class="sims-btn sims-btn-sm" id="simsPrevAgent">◀</button>
                        <button class="sims-btn sims-btn-sm" id="simsNextAgent">▶</button>
                    </div>
                </div>

                <!-- Needs section -->
                <div class="sims-needs-section" id="simsNeeds">
                    <!-- Populated dynamically -->
                </div>

                <!-- Speed & Mode section -->
                <div class="sims-controls-section">
                    <div class="sims-speed-controls">
                        <button class="sims-btn sims-speed-btn active" data-speed="1">▶</button>
                        <button class="sims-btn sims-speed-btn" data-speed="2">▶▶</button>
                        <button class="sims-btn sims-speed-btn" data-speed="3">▶▶▶</button>
                        <button class="sims-btn sims-speed-btn" data-speed="0">⏸</button>
                    </div>
                    <div class="sims-mode-buttons">
                        <button class="sims-btn sims-mode-btn" id="simsBuyMode" title="Buy Mode">🛒</button>
                        <button class="sims-btn sims-mode-btn" id="simsBuildMode" title="Build Mode">🔨</button>
                    </div>
                    <div class="sims-simoleons" id="simsSimoleons">§ 12,450</div>
                </div>
            </div>
        `;

        this._renderNeeds();
        this._bindEvents();
    }

    _renderNeeds() {
        const container = document.getElementById('simsNeeds');
        if (!container) return;

        const needDefs = [
            { key: 'Energy',  label: 'Energy',  icon: '⚡', desc: 'Tokens / Uptime' },
            { key: 'Fun',     label: 'Fun',     icon: '🎮', desc: 'Missions completed' },
            { key: 'Social',  label: 'Social',  icon: '💬', desc: 'Agent messages' },
            { key: 'Hunger',  label: 'Hunger',  icon: '🍔', desc: 'API calls (data flow)' },
            { key: 'Hygiene', label: 'Hygiene', icon: '✨', desc: 'Error rate (clean=good)' },
            { key: 'Bladder', label: 'Bladder', icon: '💧', desc: 'Queue depth' },
        ];

        container.innerHTML = needDefs.map(n => `
            <div class="sims-need-row" title="${n.desc}">
                <span class="sims-need-icon">${n.icon}</span>
                <span class="sims-need-label">${n.label}</span>
                <div class="sims-need-bar">
                    <div class="sims-need-fill" id="simsNeed${n.key}" style="width: ${this.needs[n.key]}%"></div>
                </div>
            </div>
        `).join('');
    }

    _bindEvents() {
        // Agent navigation
        const prev = document.getElementById('simsPrevAgent');
        const next = document.getElementById('simsNextAgent');
        if (prev) prev.onclick = () => this._cycleAgent(-1);
        if (next) next.onclick = () => this._cycleAgent(1);

        // Speed buttons
        document.querySelectorAll('.sims-speed-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.sims-speed-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // Could actually control game speed here
            };
        });

        // Buy/Build mode buttons (decorative, show tooltip)
        const buy = document.getElementById('simsBuyMode');
        const build = document.getElementById('simsBuildMode');
        if (buy) buy.onclick = () => this._showModeTooltip('Buy Mode: Browse office furniture! (Coming soon)');
        if (build) build.onclick = () => this._showModeTooltip('Build Mode: Redesign the office! (Coming soon)');

        // Click characters to select them
        (this.characterManager?.characters || []).forEach((char, i) => {
            if (!char?.container) return;
            char.container.interactive = true;
            char.container.cursor = 'pointer';
            char.container.on('pointerdown', () => this._selectAgent(i));
        });
    }

    _showModeTooltip(text) {
        // Brief floating tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'sims-mode-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        setTimeout(() => tooltip.remove(), 2000);
    }

    // ── Agent selection ─────────────────────────────────

    _selectAgent(index) {
        const chars = this.characterManager?.characters || [];
        if (!chars.length) return;
        if (index < 0) index = chars.length - 1;
        if (index >= chars.length) index = 0;
        this.selectedAgent = index;

        const char = chars[index];
        if (!char) return;
        const nameEl = document.getElementById('simsAgentName');
        const roleEl = document.getElementById('simsAgentRole');
        if (nameEl) nameEl.textContent = char.title || char.name || 'Agent';
        if (roleEl) roleEl.textContent = char.role || 'Unknown';

        this._renderPortrait(char);
        this._syncNeeds();
    }

    _cycleAgent(dir) {
        this._selectAgent((this.selectedAgent || 0) + dir);
    }

    _renderPortrait(char) {
        const canvas = document.getElementById('simsPortraitCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        ctx.clearRect(0, 0, 64, 64);

        // Background
        ctx.fillStyle = '#2a4858';
        ctx.fillRect(0, 0, 64, 64);

        // Frame border
        ctx.strokeStyle = '#5a8898';
        ctx.lineWidth = 2;
        ctx.strokeRect(2, 2, 60, 60);

        // Character portrait (pixel art face)
        const skin = '#ffdbb5';
        const hair = '#4a3520';
        const suit = '#' + (char?.suitColor ?? 0x888888).toString(16).padStart(6, '0');

        // Background glow
        ctx.fillStyle = suit;
        ctx.globalAlpha = 0.2;
        ctx.fillRect(4, 4, 56, 56);
        ctx.globalAlpha = 1.0;

        // Neck/body
        ctx.fillStyle = suit;
        ctx.fillRect(20, 42, 24, 20);

        // Head
        ctx.fillStyle = skin;
        ctx.fillRect(18, 14, 28, 28);

        // Hair
        ctx.fillStyle = hair;
        ctx.fillRect(16, 10, 32, 10);
        ctx.fillRect(14, 14, 6, 14);

        // Eyes
        ctx.fillStyle = '#222';
        ctx.fillRect(24, 24, 5, 5);
        ctx.fillRect(35, 24, 5, 5);
        // Pupils
        ctx.fillStyle = '#fff';
        ctx.fillRect(25, 25, 2, 2);
        ctx.fillRect(36, 25, 2, 2);

        // Mouth
        ctx.fillStyle = '#cc7755';
        ctx.fillRect(28, 34, 8, 3);

        // Plumbob above head
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(32, 2);
        ctx.lineTo(37, 8);
        ctx.lineTo(32, 14);
        ctx.lineTo(27, 8);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#00cc00';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    // ── Needs sync ──────────────────────────────────────

    _syncNeeds() {
        const data = window.SpawnKit?.data;
        if (!data) return;

        const metrics = data?.metrics || {};
        const agents = data?.agents || [];
        const missions = data?.missions || [];
        const events = data?.events || [];
        
        // Get selected agent's data if available
        const selectedChar = this.characterManager?.characters?.[this.selectedAgent || 0];
        const agentMetrics = selectedChar?.agentMetrics || {};

        // Energy = session uptime (longer sessions = more tired)
        const uptime = agentMetrics.uptime || 0; // in minutes
        this.needs.Energy = Math.max(10, Math.min(100, 100 - Math.min(uptime / 120, 80))); // 2hrs = mostly tired

        // Fun = variety of tasks and mission progress
        const totalMissions = missions.length || 1;
        const activeMissions = missions.filter(m => m?.status === 'in_progress' || m?.status === 'active').length;
        const completedMissions = missions.filter(m => m?.status === 'completed' || ((m?.progress ?? 0) >= 1)).length;
        this.needs.Fun = Math.max(15, Math.min(100, (activeMissions * 30) + (completedMissions * 20) + 20));

        // Social = messages sent, active conversations
        const tokensUsed = agentMetrics.tokensUsed || metrics?.tokensToday || 0;
        const socialActivity = Math.min(tokensUsed / 5000, 100); // normalized token usage = conversation
        this.needs.Social = Math.max(10, Math.min(100, socialActivity + 20));

        // Hunger = API calls consumed (more calls = more satisfied)
        const apiCalls = agentMetrics.apiCalls || metrics?.apiCallsToday || 0;
        this.needs.Hunger = Math.max(15, Math.min(100, Math.min(apiCalls * 2, 90) + 10));

        // Hygiene = error rate and system health
        const errorRate = events.filter(e => e?.type === 'error').length;
        const systemHealth = 100 - (metrics?.memoryUsage || 0) * 50 - (metrics?.cpuUsage || 0) * 30;
        this.needs.Hygiene = Math.max(10, Math.min(100, systemHealth - (errorRate * 15)));

        // Bladder = queue depth / pending work (inverse comfort)
        const pendingWork = missions.filter(m => m?.status === 'pending').length;
        const inProgressWork = missions.filter(m => m?.status === 'in_progress').length;
        const workLoad = (pendingWork * 15) + (inProgressWork * 5);
        this.needs.Bladder = Math.max(10, Math.min(100, 90 - workLoad));

        // Simoleons = budget remaining (tokens as currency with better scaling)
        const dailyBudget = 50000; // Starting daily budget
        const tokenCost = metrics?.tokensToday || 0;
        const remainingBudget = Math.max(0, dailyBudget - (tokenCost * 2)); // $0.002 per token
        const el = document.getElementById('simsSimoleons');
        if (el) el.textContent = `§ ${Math.floor(remainingBudget).toLocaleString()}`;

        this._updateNeedBars();
    }

    _updateNeedBars() {
        Object.keys(this.needs).forEach(key => {
            const el = document.getElementById('simsNeed' + key);
            if (!el) return;

            const val = this.needs[key];
            el.style.width = val + '%';

            // Color: green → yellow → red
            if (val > 60) {
                el.style.background = 'linear-gradient(90deg, #00aa00, #00cc00)';
            } else if (val > 30) {
                el.style.background = 'linear-gradient(90deg, #ccaa00, #cccc00)';
            } else {
                el.style.background = 'linear-gradient(90deg, #cc0000, #cc4400)';
            }
        });
    }

    // ── Set missions from state bridge ──────────────────

    setMissions(missions) {
        this.missions = missions;
    }

    // ── Update loop ─────────────────────────────────────

    update(dt) {
        this.updateTimer += dt;
        this.needDecayTimer += dt;

        // Sync needs every 10 seconds
        if (this.updateTimer > 10000) {
            this._syncNeeds();
            this.updateTimer = 0;
        }

        // Sims-style slow decay every 5 seconds
        if (this.needDecayTimer > 5000) {
            Object.keys(this.needs).forEach(key => {
                this.needs[key] = Math.max(5, this.needs[key] - (0.5 + Math.random() * 1.0));
            });
            this._updateNeedBars();
            this.needDecayTimer = 0;
        }
    }
}

window.SimsUI = SimsUI;
