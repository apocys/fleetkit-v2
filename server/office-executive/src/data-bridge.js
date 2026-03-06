/**
 * SpawnKit v2 — Universal Data Bridge
 * 
 * DUAL MODE:
 *   Electron → reads REAL data from OpenClaw via IPC (window.spawnkitAPI)
 *   Browser  → shows demo data with clear "DEMO" badge
 * 
 * Public API (unchanged for all consumers):
 *   SpawnKit.data         → { agents, subagents, missions, crons, metrics, events, memory }
 *   SpawnKit.on(event, cb)
 *   SpawnKit.off(event, cb)
 *   SpawnKit.emit(event, data)
 *   SpawnKit.refresh()
 *   SpawnKit.startLive()
 *   SpawnKit.mode          → 'live' | 'demo'
 *   SpawnKit.config
 */

(function(global) {
    'use strict';

    if (!window.SpawnKit) window.SpawnKit = {};
    
    // ── Import Model Identity System ───────────────────────────────────────
    // Note: ModelIdentity is loaded via separate script tag in HTML

    // ── Event System ────────────────────────────────────────────────────────
    const listeners = {};
    SpawnKit.on = function(event, cb) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
    };
    SpawnKit.off = function(event, cb) {
        if (!listeners[event]) return;
        const i = listeners[event].indexOf(cb);
        if (i > -1) listeners[event].splice(i, 1);
    };
    SpawnKit.emit = function(event, data) {
        (listeners[event] || []).forEach(cb => { try { cb(data); } catch(e) {} });
    };

    // ── Mode Detection ──────────────────────────────────────────────────────
    const hasElectronAPI = typeof window.spawnkitAPI !== 'undefined';
    const hasRelayAPI = !!(window.OC_RELAY_URL || (typeof process !== 'undefined' && process.env && process.env.OC_RELAY_URL));
    const relayURL = window.OC_RELAY_URL || (typeof process !== 'undefined' && process.env && process.env.OC_RELAY_URL) || null;
    // Read token dynamically — app.js may set OC_RELAY_TOKEN after data-bridge loads
    function getRelayToken() {
        return window.OC_RELAY_TOKEN || localStorage.getItem('spawnkit-token') || (typeof process !== 'undefined' && process.env && process.env.OC_RELAY_TOKEN) || null;
    }
    const relayToken = getRelayToken(); // initial snapshot for compat
    SpawnKit.mode = hasElectronAPI ? 'live' : (hasRelayAPI ? 'live' : 'demo');

    // ── Agent OS Naming System v2.0 — MINIMAL, PERFECT & EXTENSIBLE ──────────
    class AgentOSNaming {
        // Parent agent mapping (lowercase key → display format)
        static PARENTS = {
            main: 'Main', forge: 'Forge', atlas: 'Atlas', 
            hunter: 'Hunter', echo: 'Echo', sentinel: 'Sentinel'
        };

        // 8 immutable core roles — foundation that never changes
        static CORE_ROLES = {
            TaskRunner: { abbrev: 'TR', parents: ['forge', 'atlas', 'main'], core: true },
            CodeBuilder: { abbrev: 'CB', parents: ['forge'], core: true },
            DataProcessor: { abbrev: 'DP', parents: ['atlas'], core: true },
            ContentCreator: { abbrev: 'CC', parents: ['echo'], core: true },
            OpsRunner: { abbrev: 'OR', parents: ['atlas'], core: true },
            Auditor: { abbrev: 'AU', parents: ['sentinel'], core: true },
            Researcher: { abbrev: 'RE', parents: ['hunter', 'echo'], core: true },
            Coordinator: { abbrev: 'CO', parents: ['main', 'atlas'], core: true }
        };

        // Runtime registry for custom roles
        static customRoles = new Map();

        // Combined getter — core + custom roles
        static get ROLES() {
            return { ...this.CORE_ROLES, ...Object.fromEntries(this.customRoles) };
        }

        static generate(parent, role, existingSubagents = []) {
            const parentKey = parent?.toLowerCase();
            const parentDisplay = this.PARENTS[parentKey];
            if (!parentDisplay) {
                throw new Error(`Invalid parent: ${parent}`);
            }

            const roleInfo = this.ROLES[role];
            if (!roleInfo) {
                throw new Error(`Invalid role: ${role}`);
            }

            if (!roleInfo.parents.includes(parentKey)) {
                throw new Error(`Role ${role} not allowed for parent ${parent}`);
            }

            const nextId = this.getNextId(parentDisplay, role, existingSubagents);
            return `${parentDisplay}.${role}-${nextId}`;
        }

        static getNextId(parentDisplay, role, existingSubagents) {
            // Extract existing numeric IDs (01-99)
            const pattern = new RegExp(`^${parentDisplay}\\.${role}-(\\d{2})$`);
            const numericIds = existingSubagents
                .map(sa => sa.agentOSName?.match(pattern)?.[1])
                .filter(Boolean)
                .map(id => parseInt(id, 10))
                .filter(id => !isNaN(id) && id >= 1 && id <= 99);

            if (numericIds.length === 0) return '01';
            
            const maxId = Math.max(...numericIds);
            if (maxId < 99) return (maxId + 1).toString().padStart(2, '0');
            
            // ID overflow beyond 99: alphabetic suffix (A1, A2, ..., Z9)
            const alphaPattern = new RegExp(`^${parentDisplay}\\.${role}-([A-Z]\\d)$`);
            const alphaIds = existingSubagents
                .map(sa => sa.agentOSName?.match(alphaPattern)?.[1])
                .filter(Boolean);
            
            if (alphaIds.length === 0) return 'A1';
            
            // Find next alpha ID
            const lastAlpha = alphaIds.sort().pop();
            const letter = lastAlpha.charAt(0);
            const num = parseInt(lastAlpha.charAt(1), 10);
            
            if (num < 9) return letter + (num + 1);
            if (letter < 'Z') return String.fromCharCode(letter.charCodeAt(0) + 1) + '1';
            
            throw new Error('ID space exhausted (Z9 reached)');
        }

        static parse(agentOSName) {
            if (!agentOSName) return null;
            
            // Parse standard format: Parent.Role-ID
            const match = agentOSName.match(/^(\w+)\.(\w+)-([A-Z]?\d+)$/);
            if (!match) return null;
            
            const [, parentDisplay, role, idStr] = match;
            
            // Validate parent and role
            const parentKey = Object.keys(this.PARENTS).find(key => this.PARENTS[key] === parentDisplay);
            const roleInfo = this.ROLES[role];
            
            return {
                parent: parentKey,
                parentDisplay,
                role,
                idStr,
                full: agentOSName,
                isValid: !!parentKey && !!roleInfo && roleInfo.parents.includes(parentKey)
            };
        }

        static displayName(agentOSName, format = 'full') {
            const parsed = this.parse(agentOSName);
            if (!parsed?.isValid) return agentOSName;

            if (format === 'abbreviated') {
                const roleAbbrev = this.ROLES[parsed.role]?.abbrev || 'XX';
                return `${parsed.parentDisplay[0]}.${roleAbbrev}-${parsed.idStr}`;
            }
            
            return agentOSName; // full format
        }

        static migrateFromLegacy(legacyName, parentAgent) {
            const parentKey = parentAgent?.toLowerCase();
            const parentDisplay = this.PARENTS[parentKey];
            if (!parentDisplay || !legacyName) return null;

            // Real-world label mapping based on keywords
            const legacyLower = legacyName.toLowerCase();
            let targetRole = null;

            // Direct keyword mapping - audit first to catch sentinel-gameboy-audit
            if (legacyLower.includes('audit') || legacyLower.includes('review')) {
                targetRole = 'Auditor'; // sentinel-gameboy-audit
            } else if (legacyLower.includes('data') || legacyLower.includes('bridge')) {
                targetRole = 'TaskRunner'; // forge-data-bridge
            } else if (legacyLower.includes('gameboy') || legacyLower.includes('enhance')) {
                targetRole = 'CodeBuilder'; // forge-gameboy-enhance
            } else if (legacyLower.includes('ops') || legacyLower.includes('hetzner')) {
                targetRole = 'OpsRunner'; // atlas-hetzner-ops
            } else if (legacyLower.includes('landing') || legacyLower.includes('content')) {
                targetRole = 'ContentCreator'; // echo-landing-v2
            } else if (legacyLower.includes('videocast') || legacyLower.includes('video')) {
                targetRole = 'CodeBuilder'; // forge-videocast-v2
            }

            // Fallback to parent's primary role
            if (!targetRole) {
                const fallbacks = {
                    forge: 'CodeBuilder',
                    atlas: 'OpsRunner', 
                    echo: 'ContentCreator',
                    hunter: 'Researcher',
                    sentinel: 'Auditor',
                    main: 'Coordinator'
                };
                targetRole = fallbacks[parentKey];
            }

            // Extract ID from legacy name (e.g., -v2 → 02)
            const versionMatch = legacyName?.match(/-v(\d+)$/);
            const numMatch = legacyName?.match(/-(\d+)$/);
            const extractedId = versionMatch?.[1] || numMatch?.[1];
            
            try {
                if (targetRole && this.ROLES[targetRole]?.parents.includes(parentKey)) {
                    const baseId = extractedId ? extractedId.padStart(2, '0') : '01';
                    return `${parentDisplay}.${targetRole}-${baseId}`;
                }
            } catch (e) {
                console.warn(`Legacy migration failed for ${legacyName}:`, e.message);
            }

            return null;
        }

        // Minimal API — only what's needed TODAY
        static isValidName(agentOSName) {
            return this.parse(agentOSName)?.isValid || false;
        }

        static getRoleInfo(role) {
            return this.ROLES[role] || null;
        }

        static getAvailableRoles(parentAgent) {
            const parentKey = parentAgent?.toLowerCase();
            if (!parentKey) return Object.keys(this.ROLES);
            
            return Object.entries(this.ROLES)
                .filter(([, info]) => info.parents.includes(parentKey))
                .map(([role]) => role);
        }

        // ── Extension API (CEO/Board Requirement) ─────────────────────────────────
        
        static registerRole(name, config) {
            // Validate role name
            if (!name || typeof name !== 'string') {
                throw new Error('Role name must be a non-empty string');
            }
            
            if (!/^[A-Z][a-zA-Z0-9]{2,19}$/.test(name)) {
                throw new Error('Role name must be PascalCase, alphanumeric, 3-20 characters');
            }

            // Check if role already exists (core or custom)
            if (this.CORE_ROLES[name] || this.customRoles.has(name)) {
                throw new Error(`Role '${name}' already exists and cannot be modified`);
            }

            // Validate config
            if (!config || typeof config !== 'object') {
                throw new Error('Config must be an object');
            }

            const { abbreviation, parents, category, description } = config;

            // Validate abbreviation
            if (!abbreviation || typeof abbreviation !== 'string') {
                throw new Error('Abbreviation is required and must be a string');
            }
            
            if (!/^[A-Z0-9]{2,4}$/.test(abbreviation)) {
                throw new Error('Abbreviation must be 2-4 uppercase alphanumeric characters');
            }

            // Check for abbreviation collisions (core + custom)
            const allAbbrevs = new Set([
                ...Object.values(this.CORE_ROLES).map(r => r.abbrev),
                ...Array.from(this.customRoles.values()).map(r => r.abbrev)
            ]);
            
            if (allAbbrevs.has(abbreviation)) {
                throw new Error(`Abbreviation '${abbreviation}' already exists`);
            }

            // Validate parents
            if (!Array.isArray(parents) || parents.length === 0) {
                throw new Error('Parents must be a non-empty array');
            }

            const validParents = Object.keys(this.PARENTS);
            const invalidParents = parents.filter(p => !validParents.includes(p));
            if (invalidParents.length > 0) {
                throw new Error(`Invalid parent agents: ${invalidParents.join(', ')}`);
            }

            // Register the custom role
            this.customRoles.set(name, {
                abbrev: abbreviation,
                parents: [...parents], // Clone array
                category: category || 'custom',
                description: description || '',
                core: false,
                registeredAt: new Date().toISOString()
            });

            console.log(`✅ Registered custom role: ${name} (${abbreviation}) for parents: ${parents.join(', ')}`);
            return true;
        }

        static listRoles() {
            const roles = this.ROLES;
            return {
                core: Object.entries(this.CORE_ROLES).map(([name, info]) => ({
                    name,
                    ...info
                })),
                custom: Array.from(this.customRoles.entries()).map(([name, info]) => ({
                    name,
                    ...info
                })),
                total: Object.keys(roles).length,
                coreCount: Object.keys(this.CORE_ROLES).length,
                customCount: this.customRoles.size
            };
        }

        static clearCustomRoles() {
            // For testing only — not part of public API
            this.customRoles.clear();
        }

        static isCustomRole(roleName) {
            return this.customRoles.has(roleName);
        }

        static isCoreRole(roleName) {
            return !!this.CORE_ROLES[roleName];
        }
    }

    // ── Demo Data (browser fallback) ────────────────────────────────────────
    function makeDemoData() {
        const now = Date.now();
        return {
            agents: [
                { id: 'kira', name: 'ApoMac', role: 'CEO', status: 'active', currentTask: 'Strategic planning', emoji: '👑', lastSeen: new Date(now - 30000).toISOString(), lastSeenRelative: '30s ago', tokensUsed: 12500, apiCalls: 45, model: 'claude-opus-4-6' },
                { id: 'hunter', name: 'Hunter', role: 'CRO', status: 'working', currentTask: 'Revenue pipeline analysis', emoji: '💰', lastSeen: new Date(now - 300000).toISOString(), lastSeenRelative: '5m ago', tokensUsed: 8200, apiCalls: 23, model: 'claude-sonnet-4' },
                { id: 'forge', name: 'Forge', role: 'CTO', status: 'building', currentTask: 'Data bridge integration', emoji: '🔨', lastSeen: new Date(now - 60000).toISOString(), lastSeenRelative: '1m ago', tokensUsed: 15600, apiCalls: 67, model: 'claude-opus-4-6' },
                { id: 'echo', name: 'Echo', role: 'CMO', status: 'creating', currentTask: 'Launch content strategy', emoji: '📢', lastSeen: new Date(now - 900000).toISOString(), lastSeenRelative: '15m ago', tokensUsed: 6400, apiCalls: 18, model: 'claude-haiku-4-5' },
                { id: 'atlas', name: 'Atlas', role: 'COO', status: 'organizing', currentTask: 'Process optimization', emoji: '📊', lastSeen: new Date(now - 600000).toISOString(), lastSeenRelative: '10m ago', tokensUsed: 7200, apiCalls: 22, model: 'claude-sonnet-4' },
                { id: 'sentinel', name: 'Sentinel', role: 'Auditor', status: 'monitoring', currentTask: 'Quality review', emoji: '🛡️', lastSeen: new Date(now - 1800000).toISOString(), lastSeenRelative: '30m ago', tokensUsed: 4900, apiCalls: 12, model: 'claude-haiku-4-5' }
            ],
            subagents: [
                { 
                    id: 'sa-1', 
                    name: 'Theme Builder', 
                    agentOSName: 'Forge.TaskRunner-01',
                    parentAgent: 'forge', 
                    parentDisplay: 'Forge',
                    role: 'TaskRunner',
                    idStr: '01',
                    task: 'Building theme system', 
                    status: 'running', 
                    progress: 0.85, 
                    startTime: new Date(now - 1200000).toISOString(),
                    displayNames: {
                        full: 'Forge.TaskRunner-01',
                        abbreviated: 'F.TR-01'
                    },
                    roleInfo: AgentOSNaming.getRoleInfo('TaskRunner'),
                    model: 'claude-haiku-4-5'
                },
                { 
                    id: 'sa-2', 
                    name: 'Revenue Analyst', 
                    agentOSName: 'Hunter.Researcher-01',
                    parentAgent: 'hunter', 
                    parentDisplay: 'Hunter',
                    role: 'Researcher',
                    idStr: '01',
                    task: 'Q1 pipeline research', 
                    status: 'completed', 
                    progress: 1.0, 
                    startTime: new Date(now - 3600000).toISOString(),
                    displayNames: {
                        full: 'Hunter.Researcher-01',
                        abbreviated: 'H.RE-01'
                    },
                    roleInfo: AgentOSNaming.getRoleInfo('Researcher'),
                    model: 'claude-sonnet-4'
                }
            ],
            missions: [
                { id: 'm-1', name: 'Build SpawnKit v2', status: 'active', progress: 0.92, assignedAgents: ['forge', 'atlas'], startTime: new Date(now - 7200000).toISOString(), priority: 'high' },
                { id: 'm-2', name: 'Launch Campaign', status: 'pending', progress: 0.0, assignedAgents: ['echo', 'hunter'], priority: 'medium' }
            ],
            crons: [
                { id: 'c-1', name: 'Morning Brief', schedule: '6:30 AM daily', nextRun: '2026-02-20T05:30:00Z', status: 'active', emoji: '☀️' },
                { id: 'c-2', name: 'Git Auto-Backup', schedule: 'Every 6h', nextRun: new Date(now + 3600000).toISOString(), status: 'active', emoji: '💾' },
                { id: 'c-3', name: 'Fleet Standup', schedule: '8:00 AM Mon-Fri', nextRun: '2026-02-20T07:00:00Z', status: 'active', emoji: '🤝' }
            ],
            metrics: {
                tokensToday: 54900,
                apiCallsToday: 187,
                sessionsActive: 6,
                uptime: '14h 32m',
                memoryUsage: 0.45,
                cpuUsage: 0.32,
                model: 'claude-opus-4-6'
            },
            events: [],
            memory: { lastUpdated: new Date(now - 3600000).toISOString(), fileCount: 12, totalSize: '48KB' }
        };
    }

    // ── Core Data ───────────────────────────────────────────────────────────
    SpawnKit.data = makeDemoData(); // Start with demo, replaced by live if available

    // ── Relay API Helpers ───────────────────────────────────────────────────
    async function relayFetch(endpoint) {
        if (!relayURL) return null;
        const url = relayURL.replace(/\/+$/, '') + endpoint;
        const headers = { 'Accept': 'application/json' };
        const token = getRelayToken();
        if (token) headers['Authorization'] = 'Bearer ' + token;
        try {
            const resp = await fetch(url, { headers, mode: 'cors' });
            if (!resp.ok) {
                console.warn(`[SpawnKit Relay] ${endpoint} → ${resp.status}`);
                return null;
            }
            return await resp.json();
        } catch (e) {
            console.warn(`[SpawnKit Relay] ${endpoint} error:`, e.message);
            return null;
        }
    }

    async function fetchRelayData() {
        if (!hasRelayAPI) return false;
        try {
            // Fetch all endpoints in parallel
            const [sessions, crons, memory, config, agents] = await Promise.all([
                relayFetch('/api/oc/sessions'),
                relayFetch('/api/oc/crons'),
                relayFetch('/api/oc/memory'),
                relayFetch('/api/oc/config'),
                relayFetch('/api/oc/agents')
            ]);

            if (!sessions && !crons && !memory) {
                console.warn('[SpawnKit Relay] All endpoints failed — falling back to demo');
                return false;
            }

            const newData = mapRelayToSpawnKit({ sessions, crons, memory, config, agents });

            // Detect changes
            const oldAgents = SpawnKit.data?.agents || [];
            checkForStatusChanges(oldAgents, newData.agents);
            const oldSubagents = SpawnKit.data?.subagents || [];
            checkForNewSubagents(oldSubagents, newData.subagents);

            SpawnKit.data = newData;
            SpawnKit.mode = 'live';
            SpawnKit.emit('data:refresh', SpawnKit.data);
            SpawnKit.emit('mode:live', SpawnKit.data);
            return true;
        } catch (e) {
            console.error('[SpawnKit Relay] fetchRelayData error:', e);
            return false;
        }
    }

    function mapRelayToSpawnKit(raw) {
        const now = Date.now();
        const sessionArray = Array.isArray(raw.sessions) ? raw.sessions : [];
        const cronsRaw = raw.crons;
        const cronArray = Array.isArray(cronsRaw) ? cronsRaw : (cronsRaw && Array.isArray(cronsRaw.jobs) ? cronsRaw.jobs : []);
        const agentArray = Array.isArray(raw.agents) ? raw.agents : [];

        // ── Agents ──
        // If /api/oc/agents returned data, use it; otherwise derive from sessions
        let mappedAgents;
        if (agentArray.length > 0) {
            mappedAgents = agentArray.map(a => {
                const isActive = a.status === 'active';
                const lastSeenMs = a.lastActive ? (typeof a.lastActive === 'number' ? a.lastActive : new Date(a.lastActive).getTime()) : null;
                const modelIdentity = a.model ? SpawnKit.getModelIdentity(a.model) : null;
                return {
                    id: a.id,
                    name: a.id.charAt(0).toUpperCase() + a.id.slice(1),
                    role: a.isDefault ? 'Main' : 'Agent',
                    status: a.status || 'offline',
                    currentTask: isActive ? 'Working...' : 'Standby',
                    emoji: getAgentEmoji(a.id),
                    lastSeen: a.lastActive ? new Date(typeof a.lastActive === 'number' ? a.lastActive : a.lastActive).toISOString() : null,
                    lastSeenRelative: lastSeenMs ? relativeTime(lastSeenMs) : 'unknown',
                    lastSeenMs: lastSeenMs,
                    tokensUsed: a.totalTokens || 0,
                    apiCalls: 0,
                    model: a.model,
                    modelIdentity: modelIdentity,
                    sessionId: a.sessionKey
                };
            });
        } else {
            // Derive from sessions: group main sessions as agents
            const mainSessions = sessionArray.filter(s => s.kind === 'main' || s.kind === 'cron');
            mappedAgents = [{
                id: 'main',
                name: 'Sycopa',
                role: 'Worker',
                status: mainSessions.some(s => s.status === 'active') ? 'active' : 'idle',
                currentTask: mainSessions.find(s => s.status === 'active')?.label || 'Standby',
                emoji: '🎭',
                lastSeen: mainSessions[0]?.lastActive ? new Date(mainSessions[0].lastActive).toISOString() : null,
                lastSeenRelative: mainSessions[0]?.lastActive ? relativeTime(mainSessions[0].lastActive) : 'unknown',
                lastSeenMs: mainSessions[0]?.lastActive || null,
                tokensUsed: mainSessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
                apiCalls: 0,
                model: mainSessions[0]?.model || 'unknown',
                modelIdentity: null,
                sessionId: mainSessions[0]?.key
            }];
        }

        // ── Subagents from sessions ──
        const subagentSessions = sessionArray.filter(s => s.kind === 'subagent' || (s.key && s.key.includes('subagent')));
        const mappedSubagents = subagentSessions.map((sa, idx) => {
            const label = sa.label || sa.key || 'subagent';
            // Try to extract parent from key: agent:main:subagent:xxx
            const keyParts = (sa.key || '').split(':');
            const parentAgent = keyParts.length >= 2 ? keyParts[1] : 'main';

            let agentOSName = null;
            let parsedName = null;

            // Try legacy migration
            agentOSName = AgentOSNaming.migrateFromLegacy(label, parentAgent);
            if (agentOSName) parsedName = AgentOSNaming.parse(agentOSName);

            const displayNames = parsedName?.isValid ? {
                full: agentOSName,
                abbreviated: AgentOSNaming.displayName(agentOSName, 'abbreviated')
            } : {};

            const modelIdentity = sa.model ? SpawnKit.getModelIdentity(sa.model) : null;

            return {
                id: sa.key || `sa-relay-${idx}`,
                name: label,
                agentOSName: agentOSName,
                parentAgent: parentAgent,
                parentDisplay: parsedName?.parentDisplay || parentAgent,
                role: parsedName?.role || 'TaskRunner',
                idStr: parsedName?.idStr || String(idx + 1).padStart(2, '0'),
                task: label,
                status: sa.status === 'active' ? 'running' : 'completed',
                progress: sa.status === 'active' ? 0.5 : 1.0,
                startTime: sa.lastActive ? new Date(sa.lastActive).toISOString() : null,
                displayNames: displayNames,
                legacyName: label,
                roleInfo: parsedName?.role ? AgentOSNaming.getRoleInfo(parsedName.role) : null,
                model: sa.model,
                modelIdentity: modelIdentity
            };
        });

        // ── Missions from active sessions/subagents ──
        const missions = [];
        const activeSessions = sessionArray.filter(s => s.status === 'active');
        activeSessions.forEach(s => {
            if (s.label && s.label !== s.key) {
                missions.push({
                    id: `m-${s.key}`,
                    name: s.label,
                    title: s.label,
                    status: 'in_progress',
                    progress: 0.5,
                    priority: s.kind === 'cron' ? 'medium' : 'high',
                    assignedTo: ['main'],
                    assignedAgents: ['main'],
                    startTime: s.lastActive ? new Date(s.lastActive).toISOString() : null
                });
            }
        });

        // ── Crons ──
        const mappedCrons = cronArray.map(cron => {
            const schedule = cron.schedule;
            const cronExpr = schedule && schedule.expr ? schedule.expr : (typeof schedule === 'string' ? schedule : '');
            const state = cron.state || {};
            return {
                id: cron.id,
                name: cron.name || 'Unnamed cron',
                schedule: formatCronSchedule(cronExpr),
                nextRun: state.nextRunAtMs || null,
                status: cron.enabled ? 'active' : 'disabled',
                enabled: cron.enabled,
                owner: cron.agentId || 'main',
                emoji: getCronEmoji(cron.name || ''),
                lastRun: state.lastRunAtMs ? new Date(state.lastRunAtMs).toISOString() : null,
                lastStatus: state.lastStatus || null,
                description: (cron.payload && cron.payload.text) ? cron.payload.text.substring(0, 100) + '...' : ''
            };
        });

        // ── Memory ──
        const memoryData = raw.memory || {};

        // ── Metrics ──
        const totalTokens = sessionArray.reduce((sum, s) => sum + (s.totalTokens || 0), 0);
        const activeSessCount = sessionArray.filter(s => s.status === 'active').length;

        return {
            agents: mappedAgents,
            subagents: mappedSubagents,
            missions: missions.slice(0, 5),
            crons: mappedCrons,
            metrics: {
                tokensToday: totalTokens,
                apiCallsToday: 0,
                sessionsActive: activeSessCount,
                totalTokens: totalTokens,
                totalCost: estimateCost(totalTokens),
                uptime: 'live',
                memoryUsage: 0,
                cpuUsage: 0,
                activeAgents: mappedAgents.filter(a => a.status === 'active').length,
                activeSubagents: mappedSubagents.filter(s => s.status === 'running').length,
                model: mappedAgents[0]?.model || 'unknown'
            },
            events: [],
            memory: {
                lastUpdated: memoryData.files && memoryData.files.length > 0 ? new Date().toISOString() : null,
                fileCount: (memoryData.files || []).length,
                totalSize: memoryData.main ? `${Math.round(memoryData.main.length / 1024)}KB` : '0KB',
                longTerm: memoryData.main ? { content: memoryData.main, size: memoryData.main.length } : null,
                daily: (memoryData.files || []).slice(0, 3).map(f => ({ name: f.name, size: f.size })),
                heartbeat: null
            }
        };
    }

    function getAgentEmoji(agentId) {
        const map = { main: '🎭', forge: '🔨', atlas: '📊', hunter: '💰', echo: '📢', sentinel: '🛡️' };
        return map[agentId] || '🤖';
    }

    function relativeTime(ms) {
        const diff = Date.now() - (typeof ms === 'number' ? ms : new Date(ms).getTime());
        if (diff < 60000) return Math.round(diff / 1000) + 's ago';
        if (diff < 3600000) return Math.round(diff / 60000) + 'm ago';
        if (diff < 86400000) return Math.round(diff / 3600000) + 'h ago';
        return Math.round(diff / 86400000) + 'd ago';
    }

    // ── Live Data Fetching (Electron) ───────────────────────────────────────
    async function fetchLiveData() {
        if (!hasElectronAPI) return false;
        try {
            const available = await window.spawnkitAPI.isAvailable();
            if (!available) {
                SpawnKit.mode = 'demo';
                return false;
            }

            const all = await window.spawnkitAPI.getAll();
            if (!all) return false;

            // Map the data-provider response to SpawnKit.data format
            const newData = mapOpenClawToSpawnKit(all);
            
            // Check for agent status changes
            const oldAgents = SpawnKit.data?.agents || [];
            checkForStatusChanges(oldAgents, newData.agents);
            
            // Check for new subagents
            const oldSubagents = SpawnKit.data?.subagents || [];
            checkForNewSubagents(oldSubagents, newData.subagents);
            
            // Update SpawnKit.data
            SpawnKit.data = newData;

            SpawnKit.mode = 'live';
            SpawnKit.emit('data:refresh', SpawnKit.data);
            SpawnKit.emit('mode:live', SpawnKit.data);
            return true;
        } catch (e) {
            console.error('fetchLiveData error:', e);
            SpawnKit.mode = 'demo';
            return false;
        }
    }
    
    // ── Data Format Mapping ─────────────────────────────────────────────────
    function mapOpenClawToSpawnKit(openclawData) {
        // Validate input data
        if (!openclawData || typeof openclawData !== 'object') {
            console.warn('[SpawnKit DataBridge] Invalid data received, using empty defaults');
            openclawData = {};
        }
        const { agents = [], subagents = [], crons = [], metrics = {}, memory = {}, events = [] } = openclawData;
        // Validate arrays are actually arrays
        const safeAgents = Array.isArray(agents) ? agents.filter(a => a && typeof a === 'object') : [];
        const safeSubagents = Array.isArray(subagents) ? subagents.filter(s => s && typeof s === 'object') : [];
        const safeCrons = Array.isArray(crons) ? crons.filter(c => c && typeof c === 'object') : [];
        const safeEvents = Array.isArray(events) ? events.filter(e => e && typeof e === 'object') : [];
        
        // Build subagent lookup by parent for agent enrichment
        const subagentsByParent = {};
        safeSubagents.forEach(sa => {
            if (!subagentsByParent[sa.parentAgent]) subagentsByParent[sa.parentAgent] = [];
            subagentsByParent[sa.parentAgent].push(sa);
        });
        
        // Map agents: OpenClaw format → SpawnKit format with enhanced fields
        const mappedAgents = safeAgents.map(agent => {
            const agentSubagents = subagentsByParent[agent.id] || [];
            const activeSubagents = agentSubagents.filter(sa => sa.status === 'running');
            
            // Get model identity if available
            const modelIdentity = agent.modelUsed ? SpawnKit.getModelIdentity(agent.modelUsed) : null;
            
            return {
                id: agent.id,
                name: agent.name,
                role: agent.role,
                status: agent.status,
                currentTask: agent.currentTask || 'Standby',
                emoji: agent.emoji,
                lastSeen: agent.lastSeen,
                lastSeenRelative: agent.lastSeenRelative,
                tokensUsed: agent.tokensUsed || 0,
                apiCalls: agent.apiCalls || 0,
                sessionId: agent.sessionId,
                modelUsed: agent.modelUsed,
                // Enhanced fields for gameboy-state-bridge
                subagents: activeSubagents,
                metrics: {
                    tokens: agent.tokensUsed || 0,
                    apiCalls: agent.apiCalls || 0
                },
                recentMessages: [], // Would need session parsing to populate
                // Convert timestamps to numbers for time comparisons
                lastSeenMs: agent.lastSeen ? new Date(agent.lastSeen).getTime() : null,
                // Model identity integration
                model: agent.modelUsed,
                modelIdentity: modelIdentity
            };
        });
        
        // Map subagents: OpenClaw format → SpawnKit format with Agent OS naming v2.0
        const mappedSubagents = safeSubagents.map(sa => {
            let agentOSName = sa.agentOSName;
            let parsedName = null;

            // Try to parse existing Agent OS name
            if (agentOSName) {
                parsedName = AgentOSNaming.parse(agentOSName);
            }

            // If no valid Agent OS name, try to migrate from legacy naming
            if (!parsedName?.isValid && sa.parentAgent) {
                agentOSName = AgentOSNaming.migrateFromLegacy(sa.name || sa.label, sa.parentAgent);
                if (agentOSName) {
                    parsedName = AgentOSNaming.parse(agentOSName);
                }
            }

            // Generate minimal display names (only full + abbreviated)
            const displayNames = parsedName?.isValid ? {
                full: agentOSName,
                abbreviated: AgentOSNaming.displayName(agentOSName, 'abbreviated')
            } : {};

            // Get model identity if available
            const modelIdentity = sa.model ? SpawnKit.getModelIdentity(sa.model) : null;

            return {
                id: sa.id,
                name: sa.name || sa.label,
                agentOSName: agentOSName,
                status: sa.status,
                progress: sa.progress || (sa.status === 'running' ? 0.5 : sa.status === 'completed' ? 1.0 : 0),
                parentAgent: sa.parentAgent,
                parentDisplay: parsedName?.parentDisplay,
                role: parsedName?.role,
                idStr: parsedName?.idStr,
                task: sa.task || sa.label,
                startTime: sa.startTime,
                endTime: sa.endTime,
                durationMs: sa.durationMs,
                label: sa.label,
                displayNames: displayNames,
                // Legacy compatibility
                legacyName: sa.name || sa.label,
                // Role information
                roleInfo: parsedName?.role ? AgentOSNaming.getRoleInfo(parsedName.role) : null,
                // Model identity integration
                model: sa.model,
                modelIdentity: modelIdentity
            };
        });
        
        // Create missions from active subagents and derive from agents' currentTask
        const missions = [];
        
        // Active subagents become missions
        const activeSubagents = mappedSubagents.filter(sa => sa.status === 'running');
        activeSubagents.forEach(sa => {
            missions.push({
                id: `m-${sa.id}`,
                name: sa.task || sa.name,
                title: sa.task || sa.name,
                status: 'in_progress',
                progress: sa.progress,
                priority: determinePriority(sa.task || sa.name),
                assignedTo: [sa.parentAgent],
                assignedAgents: [sa.parentAgent],
                startTime: sa.startTime
            });
        });
        
        // Active agents with substantial tasks become missions too
        mappedAgents.forEach(agent => {
            if (agent.status === 'active' && agent.currentTask && 
                agent.currentTask !== 'Standby' && 
                agent.currentTask !== 'No recent activity' &&
                agent.currentTask.length > 10 &&
                !missions.some(m => m.title === agent.currentTask)) {
                missions.push({
                    id: `m-${agent.id}-current`,
                    name: agent.currentTask,
                    title: agent.currentTask,
                    status: 'in_progress',
                    progress: estimateProgress(agent.currentTask, agent.lastSeenMs),
                    priority: agent.role === 'CEO' ? 'high' : 'medium',
                    assignedTo: [agent.id],
                    assignedAgents: [agent.id]
                });
            }
        });
        
        // Map crons: OpenClaw format → SpawnKit format  
        const mappedCrons = crons.map(cron => {
            // Parse nextRun and convert to proper timestamp
            let nextRunMs = null;
            if (cron.nextRun) {
                if (typeof cron.nextRun === 'number') {
                    nextRunMs = cron.nextRun;
                } else {
                    nextRunMs = new Date(cron.nextRun).getTime();
                }
            }
            
            return {
                id: cron.id,
                name: cron.name,
                schedule: formatCronSchedule(cron.schedule),
                nextRun: nextRunMs,
                status: cron.enabled ? 'active' : 'disabled',
                enabled: cron.enabled,
                owner: cron.owner,
                emoji: getCronEmoji(cron.name),
                lastRun: cron.lastRun,
                lastStatus: cron.lastStatus,
                description: cron.description || ''
            };
        });
        
        return {
            agents: mappedAgents,
            subagents: mappedSubagents,
            missions: missions.slice(0, 5), // Limit to 5 most relevant missions
            crons: mappedCrons,
            metrics: {
                tokensToday: metrics.tokensToday || 0,
                apiCallsToday: metrics.apiCallsToday || 0,
                sessionsActive: metrics.activeSessions || 0,
                totalTokens: metrics.tokensToday || 0,
                totalCost: estimateCost(metrics.tokensToday || 0),
                uptime: metrics.uptime || 'unknown',
                memoryUsage: metrics.memoryUsage || 0,
                cpuUsage: metrics.cpuUsage || 0,
                activeAgents: metrics.activeAgents || 0,
                activeSubagents: metrics.activeSubagents || 0,
                model: 'claude-opus-4-6'
            },
            events: events || [],
            memory: {
                lastUpdated: memory.longTerm?.lastModified ? new Date(memory.longTerm.lastModified).toISOString() : null,
                fileCount: memory.daily?.length || 0,
                totalSize: memory.longTerm?.size ? `${Math.round(memory.longTerm.size / 1024)}KB` : '0KB',
                longTerm: memory.longTerm?.content ? memory.longTerm.content.substring(0, 1000) : null,
                daily: memory.daily ? memory.daily.slice(0, 3) : [],
                heartbeat: memory.heartbeat
            }
        };
    }
    
    // ── Helper Functions ────────────────────────────────────────────────────
    function determinePriority(taskName) {
        const task = taskName.toLowerCase();
        if (task.includes('urgent') || task.includes('critical') || task.includes('fix') || task.includes('bug')) {
            return 'high';
        }
        if (task.includes('build') || task.includes('deploy') || task.includes('release')) {
            return 'high';
        }
        if (task.includes('review') || task.includes('audit') || task.includes('test')) {
            return 'medium';
        }
        return 'normal';
    }
    
    function estimateProgress(taskName, startTimeMs) {
        // Simple heuristic: estimate progress based on task type and time elapsed
        const task = taskName.toLowerCase();
        const now = Date.now();
        const elapsedMs = startTimeMs ? (now - startTimeMs) : 0;
        const elapsedHours = elapsedMs / (1000 * 60 * 60);
        
        // Quick tasks
        if (task.includes('fix') || task.includes('update') || task.includes('check')) {
            return Math.min(0.9, 0.1 + (elapsedHours * 0.3));
        }
        
        // Medium tasks
        if (task.includes('build') || task.includes('implement') || task.includes('create')) {
            return Math.min(0.8, 0.05 + (elapsedHours * 0.15));
        }
        
        // Default: slow steady progress
        return Math.min(0.7, 0.1 + (elapsedHours * 0.1));
    }
    
    function formatCronSchedule(schedule) {
        if (!schedule) return '';
        
        // Convert cron expressions to human-readable format
        if (schedule.includes('0 6 * * *')) return '6:00 AM daily';
        if (schedule.includes('0 8 * * 1-5')) return '8:00 AM Mon-Fri';
        if (schedule.includes('0 */6 * * *')) return 'Every 6h';
        if (schedule.includes('*/30 * * * *')) return 'Every 30 min';
        
        return schedule;
    }
    
    function estimateCost(tokens) {
        // Rough estimate: Claude Opus ~$15/1M input tokens, $75/1M output
        // Assume 50/50 split, average ~$45/1M tokens
        return tokens * 0.000045;
    }
    
    // ── Event Detection Helpers ─────────────────────────────────────────────
    function checkForStatusChanges(oldAgents, newAgents) {
        if (!Array.isArray(oldAgents) || !Array.isArray(newAgents)) {
            console.warn('⚠️  SpawnKit: Invalid agents arrays for status change detection');
            return;
        }
        
        let changesDetected = 0;
        newAgents.forEach(newAgent => {
            const oldAgent = oldAgents.find(a => a.id === newAgent.id);
            if (oldAgent && oldAgent.status !== newAgent.status) {
                console.log(`🔄 SpawnKit: Agent status changed: ${newAgent.name} (${newAgent.id}) ${oldAgent.status} → ${newAgent.status}`);
                SpawnKit.emit('agent:status', {
                    agentId: newAgent.id,
                    name: newAgent.name,
                    oldStatus: oldAgent.status,
                    newStatus: newAgent.status,
                    currentTask: newAgent.currentTask
                });
                changesDetected++;
            }
        });
        
        if (changesDetected > 0) {
            console.log(`📊 SpawnKit: Detected ${changesDetected} agent status changes`);
        }
    }
    
    function checkForNewSubagents(oldSubagents, newSubagents) {
        if (!Array.isArray(oldSubagents) || !Array.isArray(newSubagents)) {
            console.warn('⚠️  SpawnKit: Invalid subagents arrays for new subagent detection');
            return;
        }
        
        const oldIds = new Set(oldSubagents.map(sa => sa.id));
        let newCount = 0;
        
        newSubagents.forEach(newSa => {
            if (!oldIds.has(newSa.id) && newSa.status === 'running') {
                console.log(`🚀 SpawnKit: New subagent spawned: ${newSa.name} (${newSa.id}) under ${newSa.parentAgent}`);
                SpawnKit.emit('subagent:spawn', {
                    subagentId: newSa.id,
                    name: newSa.name,
                    parentAgent: newSa.parentAgent,
                    task: newSa.task
                });
                newCount++;
            }
        });
        
        if (newCount > 0) {
            console.log(`👥 SpawnKit: Spawned ${newCount} new subagents`);
        }
    }
    
    function getCronEmoji(cronName) {
        const name = cronName.toLowerCase();
        if (name.includes('morning') || name.includes('brief')) return '☀️';
        if (name.includes('backup') || name.includes('git')) return '💾';
        if (name.includes('standup') || name.includes('meeting')) return '🤝';
        if (name.includes('deploy') || name.includes('release')) return '🚀';
        if (name.includes('audit') || name.includes('security')) return '🛡️';
        if (name.includes('report') || name.includes('metrics')) return '📊';
        return '⏰';
    }

    // ── Refresh ─────────────────────────────────────────────────────────────
    SpawnKit.refresh = async function() {
        const oldData = SpawnKit.data ? JSON.parse(JSON.stringify(SpawnKit.data)) : null;
        
        if (hasElectronAPI) {
            await fetchLiveData();
        } else if (hasRelayAPI) {
            await fetchRelayData();
        } else {
            // Demo mode: simulate minor updates
            (SpawnKit.data?.agents || []).forEach(agent => {
                if (Math.random() > 0.7) {
                    agent.tokensUsed = (agent.tokensUsed || 0) + Math.floor(Math.random() * 100);
                    agent.apiCalls = (agent.apiCalls || 0) + Math.floor(Math.random() * 5);
                }
            });
            if (SpawnKit.data?.metrics) {
                SpawnKit.data.metrics.tokensToday = (SpawnKit.data.metrics.tokensToday || 0) + Math.floor(Math.random() * 50);
                SpawnKit.data.metrics.apiCallsToday = (SpawnKit.data.metrics.apiCallsToday || 0) + Math.floor(Math.random() * 3);
            }
        }
        
        // Check for new missions after refresh
        if (oldData && SpawnKit.data) {
            checkForNewMissions(oldData.missions || [], SpawnKit.data.missions || []);
            checkForCronTriggers(oldData.crons || [], SpawnKit.data.crons || []);
        }
        
        SpawnKit.emit('data:refresh', SpawnKit.data);
    };
    
    // ── Mission & Cron Event Detection ──────────────────────────────────────
    function checkForNewMissions(oldMissions, newMissions) {
        if (!Array.isArray(oldMissions) || !Array.isArray(newMissions)) return;
        
        const oldIds = new Set(oldMissions.map(m => m.id));
        newMissions.forEach(newMission => {
            if (!oldIds.has(newMission.id) && newMission.status === 'active') {
                SpawnKit.emit('mission:new', {
                    missionId: newMission.id,
                    title: newMission.title,
                    assignedTo: newMission.assignedTo,
                    priority: newMission.priority
                });
            }
        });
    }
    
    function checkForCronTriggers(oldCrons, newCrons) {
        if (!Array.isArray(oldCrons) || !Array.isArray(newCrons)) return;
        
        newCrons.forEach(newCron => {
            const oldCron = oldCrons.find(c => c.id === newCron.id);
            // If lastRun timestamp changed, cron was triggered
            if (oldCron && oldCron.lastRun !== newCron.lastRun && newCron.lastRun) {
                SpawnKit.emit('cron:trigger', {
                    cronId: newCron.id,
                    name: newCron.name,
                    owner: newCron.owner,
                    lastStatus: newCron.lastStatus
                });
            }
        });
    }

    // ── Live Updates ────────────────────────────────────────────────────────
    let liveInterval = null;
    let refreshCount = 0;
    let lastRefreshError = null;
    
    SpawnKit.startLive = function() {
        if (liveInterval) {
            console.log('⚠️  SpawnKit: Live updates already running');
            return;
        }
        
        const interval = SpawnKit.mode === 'live' ? 10000 : 30000; // 10s live, 30s demo
        console.log(`⏰ SpawnKit: Starting live updates every ${interval/1000}s`);
        
        liveInterval = setInterval(async () => {
            try {
                await SpawnKit.refresh();
                refreshCount++;
                lastRefreshError = null;
            } catch (e) {
                lastRefreshError = e;
                console.error(`❌ SpawnKit: Live refresh #${refreshCount} failed:`, e.message);
                
                // If we fail 3 times in live mode, fall back to demo
                if (SpawnKit.mode === 'live' && refreshCount % 3 === 0) {
                    console.warn('⚠️  SpawnKit: Multiple live refresh failures, checking connection...');
                    try {
                        let connected = false;
                        if (hasElectronAPI) {
                            connected = await window.spawnkitAPI?.isAvailable();
                        } else if (hasRelayAPI) {
                            const health = await relayFetch('/api/oc/health');
                            connected = !!(health && health.ok);
                        }
                        if (!connected) {
                            console.log('🎮 SpawnKit: Connection lost, falling back to demo mode');
                            SpawnKit.mode = 'demo';
                            SpawnKit.data = makeDemoData();
                            showDemoBadge();
                        }
                    } catch (e2) {
                        console.error('❌ SpawnKit: Connection check failed:', e2.message);
                    }
                }
            }
        }, interval);
        
        SpawnKit.emit('live:started', { interval, mode: SpawnKit.mode });
    };
    
    SpawnKit.stopLive = function() {
        if (liveInterval) {
            clearInterval(liveInterval);
            liveInterval = null;
            console.log(`⏹️  SpawnKit: Stopped live updates (completed ${refreshCount} refreshes)`);
            SpawnKit.emit('live:stopped', { refreshCount, lastError: lastRefreshError?.message });
        }
    };

    // ── Config ──────────────────────────────────────────────────────────────
    SpawnKit.config = {
        theme: localStorage.getItem('spawnkit-theme') || 'gameboy',
        refreshInterval: 10000,
        autoStart: true
    };
    SpawnKit.loadConfig = function() {
        const saved = localStorage.getItem('spawnkit-theme');
        if (saved) SpawnKit.config.theme = saved;
    };
    SpawnKit.saveConfig = function() {
        localStorage.setItem('spawnkit-theme', SpawnKit.config.theme);
    };

    // ── API Convenience Methods ─────────────────────────────────────────────
    SpawnKit.api = {
        getSessions: async function() {
            try {
                if (hasElectronAPI && window.spawnkitAPI.getSessions) {
                    return await window.spawnkitAPI.getSessions();
                }
                if (hasRelayAPI) {
                    const data = await relayFetch('/api/oc/sessions?all=true');
                    return { sessions: data || [] };
                }
                return { sessions: (SpawnKit.data?.agents || []).concat(SpawnKit.data?.subagents || []) };
            } catch (e) {
                console.error('SpawnKit.api.getSessions error:', e);
                return { sessions: [], error: e.message };
            }
        },
        getCrons: async function() {
            try {
                if (hasElectronAPI && window.spawnkitAPI.getCrons) {
                    return await window.spawnkitAPI.getCrons();
                }
                if (hasRelayAPI) {
                    const data = await relayFetch('/api/oc/crons');
                    const jobs = data && data.jobs ? data.jobs : (Array.isArray(data) ? data : []);
                    return { crons: jobs };
                }
                return { crons: SpawnKit.data?.crons || [] };
            } catch (e) {
                console.error('SpawnKit.api.getCrons error:', e);
                return { crons: [], error: e.message };
            }
        },
        getAgentInfo: async function(agentId) {
            try {
                if (hasElectronAPI && window.spawnkitAPI.getAgentInfo) {
                    return await window.spawnkitAPI.getAgentInfo(agentId);
                }
                if (hasRelayAPI) {
                    const agents = await relayFetch('/api/oc/agents');
                    if (Array.isArray(agents)) return agents.find(a => a.id === agentId) || null;
                }
                return (SpawnKit.data?.agents || []).find(a => a?.id === agentId) || null;
            } catch (e) {
                console.error('SpawnKit.api.getAgentInfo error:', e);
                return null;
            }
        },
        getMemory: async function() {
            try {
                if (hasElectronAPI && window.spawnkitAPI.getMemory) {
                    return await window.spawnkitAPI.getMemory();
                }
                if (hasRelayAPI) {
                    return await relayFetch('/api/oc/memory');
                }
                return SpawnKit.data?.memory || null;
            } catch (e) {
                console.error('SpawnKit.api.getMemory error:', e);
                return null;
            }
        },
        sendMission: async function(task) {
            try {
                if (hasElectronAPI && window.spawnkitAPI.sendMission) {
                    const result = await window.spawnkitAPI.sendMission(task);
                    // Trigger immediate refresh to pick up new mission
                    setTimeout(() => SpawnKit.refresh(), 1000);
                    return result;
                }
                // Demo mode: simulate mission creation
                const mission = {
                    id: 'm-' + Date.now(),
                    name: task,
                    title: task,
                    status: 'in_progress',
                    progress: 0,
                    assignedTo: ['forge'],
                    assignedAgents: ['forge'],
                    startTime: new Date().toISOString(),
                    priority: 'normal'
                };
                if (!SpawnKit.data.missions) SpawnKit.data.missions = [];
                SpawnKit.data.missions.push(mission);
                SpawnKit.emit('mission:new', mission);
                return mission;
            } catch (e) {
                console.error('SpawnKit.api.sendMission error:', e);
                return { error: e.message };
            }
        },
        spawnSubagent: async function(parentAgent, role, task, options = {}) {
            try {
                // Generate Agent OS name v2.0
                const existingSubagents = SpawnKit.data?.subagents || [];
                const agentOSName = AgentOSNaming.generate(parentAgent, role, existingSubagents);
                
                if (hasElectronAPI && window.spawnkitAPI.spawnSubagent) {
                    const result = await window.spawnkitAPI.spawnSubagent({
                        parentAgent,
                        role,
                        task,
                        agentOSName,
                        ...options
                    });
                    
                    // Trigger immediate refresh to pick up new subagent
                    setTimeout(() => SpawnKit.refresh(), 1000);
                    return result;
                }
                
                // Demo mode: simulate subagent creation
                const parsed = AgentOSNaming.parse(agentOSName);
                const subagent = {
                    id: 'sa-' + Date.now(),
                    name: task,
                    agentOSName,
                    parentAgent,
                    parentDisplay: parsed?.parentDisplay,
                    role,
                    idStr: parsed?.idStr,
                    task,
                    status: 'running',
                    progress: 0,
                    startTime: new Date().toISOString(),
                    displayNames: {
                        full: agentOSName,
                        abbreviated: AgentOSNaming.displayName(agentOSName, 'abbreviated')
                    },
                    roleInfo: AgentOSNaming.getRoleInfo(role)
                };
                
                if (!SpawnKit.data.subagents) SpawnKit.data.subagents = [];
                SpawnKit.data.subagents.push(subagent);
                SpawnKit.emit('subagent:spawn', subagent);
                return subagent;
                
            } catch (e) {
                console.error('SpawnKit.api.spawnSubagent error:', e);
                return { error: e.message };
            }
        },
        getAgentOSInfo: function() {
            return {
                parents: AgentOSNaming.PARENTS,
                roles: AgentOSNaming.ROLES,
                activeSubagents: SpawnKit.data?.subagents?.filter(sa => sa.status === 'running').length || 0,
                totalSubagents: SpawnKit.data?.subagents?.length || 0,
                rolesInUse: [...new Set(SpawnKit.data?.subagents?.map(sa => sa.role).filter(Boolean))],
                agentOSCoverage: SpawnKit.data?.subagents?.filter(sa => sa.agentOSName).length || 0,
                version: '2.0'
            };
        },
        validateAgentOSName: function(agentOSName) {
            const parsed = AgentOSNaming.parse(agentOSName);
            return {
                isValid: parsed?.isValid || false,
                parsed,
                errors: parsed ? [] : ['Invalid Agent OS name format']
            };
        },
        generateAgentOSName: function(parentAgent, role) {
            try {
                const existingSubagents = SpawnKit.data?.subagents || [];
                return AgentOSNaming.generate(parentAgent, role, existingSubagents);
            } catch (e) {
                return { error: e.message };
            }
        },
        getAvailableRoles: function(parentAgent) {
            return AgentOSNaming.getAvailableRoles(parentAgent);
        },
        getDebugInfo: function() {
            return {
                mode: SpawnKit.mode,
                hasElectronAPI: hasElectronAPI,
                hasRelayAPI: hasRelayAPI,
                relayURL: relayURL,
                dataSize: JSON.stringify(SpawnKit.data || {}).length,
                agentCount: SpawnKit.data?.agents?.length || 0,
                subagentCount: SpawnKit.data?.subagents?.length || 0,
                missionCount: SpawnKit.data?.missions?.length || 0,
                cronCount: SpawnKit.data?.crons?.length || 0,
                refreshCount: refreshCount,
                lastRefreshError: lastRefreshError?.message || null,
                liveUpdateActive: !!liveInterval,
                config: SpawnKit.config,
                listeners: Object.keys(listeners).map(event => ({ event, count: listeners[event]?.length || 0 }))
            };
        },
        forceRefresh: async function() {
            console.log('🔄 SpawnKit: Manual refresh triggered');
            return await SpawnKit.refresh();
        }
    };

    // ── Demo Badge ──────────────────────────────────────────────────────────
    function showDemoBadge() {
        if (SpawnKit.mode !== 'demo') return;
        if (typeof document === 'undefined') return;
        
        // Remove existing badge first
        const existing = document.getElementById('spawnkit-demo-badge');
        if (existing) existing.remove();
        
        const badge = document.createElement('div');
        badge.id = 'spawnkit-demo-badge';
        badge.innerHTML = '🎮 DEMO MODE — Set <code>window.OC_RELAY_URL</code> or <a href="https://spawnkit.ai" target="_blank" style="color:inherit;text-decoration:underline">Get SpawnKit</a> for live data';
        badge.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:rgba(99,102,241,0.9);color:white;padding:6px 16px;border-radius:100px;font-size:11px;font-family:Inter,system-ui,sans-serif;z-index:999999;backdrop-filter:blur(8px);pointer-events:auto;cursor:pointer;';
        
        // Click to hide badge
        badge.addEventListener('click', () => {
            badge.style.display = 'none';
        });
        
        // Only show after a brief delay (let boot sequence finish)
        setTimeout(() => {
            if (SpawnKit.mode === 'demo' && document.body && !document.getElementById('spawnkit-demo-badge')) {
                document.body.appendChild(badge);
                console.log('🎮 SpawnKit: Demo badge displayed');
            }
        }, 3000);
    }
    
    function hideDemoBadge() {
        const badge = document.getElementById('spawnkit-demo-badge');
        if (badge) {
            badge.remove();
            console.log('🔌 SpawnKit: Demo badge removed (live mode)');
        }
    }

    // ── Initialize ──────────────────────────────────────────────────────────
    SpawnKit.init = async function() {
        console.log('🚀 SpawnKit: Initializing...');
        
        try {
            SpawnKit.loadConfig();

            // Try live data first
            if (hasElectronAPI) {
                console.log('🔍 SpawnKit: Electron API detected, attempting live connection...');
                const gotLive = await fetchLiveData();
                if (gotLive) {
                    console.log('🔌 SpawnKit: Connected to OpenClaw (live data)');
                    console.log(`📊 SpawnKit: Found ${SpawnKit.data.agents.length} agents, ${SpawnKit.data.subagents.length} subagents, ${SpawnKit.data.missions.length} missions`);
                    hideDemoBadge(); // Remove demo badge in live mode
                } else {
                    console.log('🎮 SpawnKit: Falling back to demo mode (OpenClaw connection failed)');
                    SpawnKit.mode = 'demo';
                    SpawnKit.data = makeDemoData();
                    showDemoBadge();
                }
            } else if (hasRelayAPI) {
                console.log('🔍 SpawnKit: Relay API detected (' + relayURL + '), attempting live connection...');
                const gotRelay = await fetchRelayData();
                if (gotRelay) {
                    console.log('🌐 SpawnKit: Connected via Fleet Relay (live data)');
                    console.log(`📊 SpawnKit: Found ${SpawnKit.data.agents.length} agents, ${SpawnKit.data.subagents.length} subagents, ${SpawnKit.data.crons.length} crons`);
                    hideDemoBadge();
                } else {
                    console.log('🎮 SpawnKit: Relay connection failed, falling back to demo mode');
                    SpawnKit.mode = 'demo';
                    SpawnKit.data = makeDemoData();
                    showDemoBadge();
                }
            } else {
                console.log('🎮 SpawnKit: Demo mode (browser — no Electron API, no Relay URL)');
                SpawnKit.mode = 'demo';
                SpawnKit.data = makeDemoData();
                showDemoBadge();
            }

            // Listen for live updates from Electron with proper error handling
            if (hasElectronAPI && window.spawnkitAPI.onUpdate) {
                try {
                    window.spawnkitAPI.onUpdate((data) => {
                        try {
                            console.log('📡 SpawnKit: Received live update');
                            const mappedData = mapOpenClawToSpawnKit(data);
                            
                            // Preserve existing data and merge
                            const oldData = SpawnKit.data;
                            SpawnKit.data = { ...oldData, ...mappedData };
                            
                            SpawnKit.emit('data:refresh', SpawnKit.data);
                        } catch (e) {
                            console.error('❌ SpawnKit: Error processing live update:', e);
                        }
                    });
                } catch (e) {
                    console.warn('⚠️  SpawnKit: Could not set up live update listener:', e.message);
                }
            }

            if (SpawnKit.config.autoStart) {
                console.log('⏰ SpawnKit: Starting live updates...');
                SpawnKit.startLive();
            }
            
            // Emit initialization complete
            SpawnKit.emit('init:complete', { mode: SpawnKit.mode, dataSize: JSON.stringify(SpawnKit.data).length });
            console.log(`✅ SpawnKit: Initialized in ${SpawnKit.mode} mode`);
            
        } catch (e) {
            console.error('💥 SpawnKit: Initialization failed:', e);
            // Fallback to demo data
            SpawnKit.mode = 'demo';
            SpawnKit.data = makeDemoData();
            showDemoBadge();
            SpawnKit.emit('init:error', { error: e.message });
        }
    };

    // ── Model Identity Integration ──────────────────────────────────────────
    SpawnKit.getModelIdentity = function(modelId) {
        if (typeof ModelIdentity !== 'undefined') {
            return ModelIdentity.getIdentity(modelId);
        }
        return { tier: 'unknown', color: '#8E8E93', symbol: '?', level: '???', name: 'Unknown' };
    };

    SpawnKit.formatAgentDisplay = function(theme, agent) {
        if (!agent.model) return agent.name;
        
        if (typeof ModelIdentity !== 'undefined') {
            return ModelIdentity.formatDisplayName(theme, agent.name, agent.model);
        }
        return agent.name;
    };

    SpawnKit.applyModelStyling = function(element, modelId) {
        if (typeof ModelIdentity !== 'undefined') {
            ModelIdentity.applyToElement(element, modelId);
        }
    };

    // ── Auto-Initialize ─────────────────────────────────────────────────────
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', SpawnKit.init);
        } else {
            SpawnKit.init();
        }
    } else {
        SpawnKit.init();
    }

})(typeof window !== 'undefined' ? window : global);
