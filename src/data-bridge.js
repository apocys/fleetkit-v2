/**
 * FleetKit v2 — Universal Data Bridge
 * 
 * DUAL MODE:
 *   Electron → reads REAL data from OpenClaw via IPC (window.fleetkitAPI)
 *   Browser  → shows demo data with clear "DEMO" badge
 * 
 * Public API (unchanged for all consumers):
 *   FleetKit.data         → { agents, subagents, missions, crons, metrics, events, memory }
 *   FleetKit.on(event, cb)
 *   FleetKit.off(event, cb)
 *   FleetKit.emit(event, data)
 *   FleetKit.refresh()
 *   FleetKit.startLive()
 *   FleetKit.mode          → 'live' | 'demo'
 *   FleetKit.config
 */

(function(global) {
    'use strict';

    if (!global.FleetKit) global.FleetKit = {};

    // ── Event System ────────────────────────────────────────────────────────
    const listeners = {};
    FleetKit.on = function(event, cb) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(cb);
    };
    FleetKit.off = function(event, cb) {
        if (!listeners[event]) return;
        const i = listeners[event].indexOf(cb);
        if (i > -1) listeners[event].splice(i, 1);
    };
    FleetKit.emit = function(event, data) {
        (listeners[event] || []).forEach(cb => { try { cb(data); } catch(e) {} });
    };

    // ── Mode Detection ──────────────────────────────────────────────────────
    const hasElectronAPI = typeof global.fleetkitAPI !== 'undefined';
    FleetKit.mode = hasElectronAPI ? 'live' : 'demo';

    // ── Demo Data (browser fallback) ────────────────────────────────────────
    function makeDemoData() {
        const now = Date.now();
        return {
            agents: [
                { id: 'kira', name: 'ApoMac', role: 'CEO', status: 'active', currentTask: 'Strategic planning', emoji: '👑', lastSeen: new Date(now - 30000).toISOString(), lastSeenRelative: '30s ago', tokensUsed: 12500, apiCalls: 45 },
                { id: 'hunter', name: 'Hunter', role: 'CRO', status: 'working', currentTask: 'Revenue pipeline analysis', emoji: '💰', lastSeen: new Date(now - 300000).toISOString(), lastSeenRelative: '5m ago', tokensUsed: 8200, apiCalls: 23 },
                { id: 'forge', name: 'Forge', role: 'CTO', status: 'building', currentTask: 'Data bridge integration', emoji: '🔨', lastSeen: new Date(now - 60000).toISOString(), lastSeenRelative: '1m ago', tokensUsed: 15600, apiCalls: 67 },
                { id: 'echo', name: 'Echo', role: 'CMO', status: 'creating', currentTask: 'Launch content strategy', emoji: '📢', lastSeen: new Date(now - 900000).toISOString(), lastSeenRelative: '15m ago', tokensUsed: 6400, apiCalls: 18 },
                { id: 'atlas', name: 'Atlas', role: 'COO', status: 'organizing', currentTask: 'Process optimization', emoji: '📊', lastSeen: new Date(now - 600000).toISOString(), lastSeenRelative: '10m ago', tokensUsed: 7200, apiCalls: 22 },
                { id: 'sentinel', name: 'Sentinel', role: 'Auditor', status: 'monitoring', currentTask: 'Quality review', emoji: '🛡️', lastSeen: new Date(now - 1800000).toISOString(), lastSeenRelative: '30m ago', tokensUsed: 4900, apiCalls: 12 }
            ],
            subagents: [
                { id: 'sa-1', name: 'Theme Builder', parentAgent: 'forge', task: 'Building theme system', status: 'running', progress: 0.85, startTime: new Date(now - 1200000).toISOString() },
                { id: 'sa-2', name: 'Revenue Analyst', parentAgent: 'hunter', task: 'Q1 pipeline', status: 'completed', progress: 1.0, startTime: new Date(now - 3600000).toISOString() }
            ],
            missions: [
                { id: 'm-1', name: 'Build FleetKit v2', status: 'active', progress: 0.92, assignedAgents: ['forge', 'atlas'], startTime: new Date(now - 7200000).toISOString(), priority: 'high' },
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
    FleetKit.data = makeDemoData(); // Start with demo, replaced by live if available

    // ── Live Data Fetching (Electron) ───────────────────────────────────────
    async function fetchLiveData() {
        if (!hasElectronAPI) return false;
        try {
            const available = await global.fleetkitAPI.isAvailable();
            if (!available) {
                FleetKit.mode = 'demo';
                return false;
            }

            const all = await global.fleetkitAPI.getAll();
            if (!all) return false;

            // Map the data-provider response to FleetKit.data format
            if (all.agents) FleetKit.data.agents = all.agents;
            if (all.subagents) FleetKit.data.subagents = all.subagents;
            if (all.crons) FleetKit.data.crons = all.crons;
            if (all.metrics) FleetKit.data.metrics = all.metrics;
            if (all.memory) FleetKit.data.memory = all.memory;
            if (all.missions) FleetKit.data.missions = all.missions;

            FleetKit.mode = 'live';
            FleetKit.emit('data:refresh', FleetKit.data);
            FleetKit.emit('mode:live', FleetKit.data);
            return true;
        } catch (e) {
            FleetKit.mode = 'demo';
            return false;
        }
    }

    // ── Refresh ─────────────────────────────────────────────────────────────
    FleetKit.refresh = async function() {
        if (hasElectronAPI) {
            await fetchLiveData();
        } else {
            // Demo mode: simulate minor updates
            FleetKit.data.agents.forEach(agent => {
                if (Math.random() > 0.7) {
                    agent.tokensUsed += Math.floor(Math.random() * 100);
                    agent.apiCalls += Math.floor(Math.random() * 5);
                }
            });
            FleetKit.data.metrics.tokensToday += Math.floor(Math.random() * 50);
            FleetKit.data.metrics.apiCallsToday += Math.floor(Math.random() * 3);
        }
        FleetKit.emit('data:refresh', FleetKit.data);
    };

    // ── Live Updates ────────────────────────────────────────────────────────
    let liveInterval = null;
    FleetKit.startLive = function() {
        if (liveInterval) return;
        const interval = FleetKit.mode === 'live' ? 10000 : 30000; // 10s live, 30s demo
        liveInterval = setInterval(FleetKit.refresh, interval);
    };
    FleetKit.stopLive = function() {
        if (liveInterval) { clearInterval(liveInterval); liveInterval = null; }
    };

    // ── Config ──────────────────────────────────────────────────────────────
    FleetKit.config = {
        theme: localStorage.getItem('fleetkit-theme') || 'gameboy',
        refreshInterval: 10000,
        autoStart: true
    };
    FleetKit.loadConfig = function() {
        const saved = localStorage.getItem('fleetkit-theme');
        if (saved) FleetKit.config.theme = saved;
    };
    FleetKit.saveConfig = function() {
        localStorage.setItem('fleetkit-theme', FleetKit.config.theme);
    };

    // ── API Convenience Methods ─────────────────────────────────────────────
    FleetKit.api = {
        getSessions: async function() {
            if (hasElectronAPI) {
                return await global.fleetkitAPI.getSessions();
            }
            return { sessions: FleetKit.data.agents.concat(FleetKit.data.subagents) };
        },
        getCrons: async function() {
            if (hasElectronAPI) {
                return await global.fleetkitAPI.getCrons();
            }
            return { crons: FleetKit.data.crons };
        },
        getAgentInfo: async function(agentId) {
            if (hasElectronAPI) {
                return await global.fleetkitAPI.getAgentInfo(agentId);
            }
            return FleetKit.data.agents.find(a => a.id === agentId) || null;
        },
        getMemory: async function() {
            if (hasElectronAPI) {
                return await global.fleetkitAPI.getMemory();
            }
            return FleetKit.data.memory;
        },
        sendMission: async function(task) {
            if (hasElectronAPI) {
                return await global.fleetkitAPI.sendMission(task);
            }
            // Demo mode: simulate mission creation
            const mission = {
                id: 'm-' + Date.now(),
                name: task,
                status: 'active',
                progress: 0,
                assignedAgents: ['forge'],
                startTime: new Date().toISOString(),
                priority: 'normal'
            };
            FleetKit.data.missions.push(mission);
            FleetKit.emit('mission:new', mission);
            return mission;
        }
    };

    // ── Demo Badge ──────────────────────────────────────────────────────────
    function showDemoBadge() {
        if (FleetKit.mode !== 'demo') return;
        if (typeof document === 'undefined') return;
        
        const badge = document.createElement('div');
        badge.id = 'fleetkit-demo-badge';
        badge.innerHTML = '🎮 DEMO MODE — <a href="https://apocys.github.io/fleetkit-v2/" target="_blank" style="color:inherit;text-decoration:underline">Get FleetKit</a> for live data';
        badge.style.cssText = 'position:fixed;top:8px;left:50%;transform:translateX(-50%);background:rgba(99,102,241,0.9);color:white;padding:6px 16px;border-radius:100px;font-size:11px;font-family:Inter,system-ui,sans-serif;z-index:999999;backdrop-filter:blur(8px);pointer-events:auto;';
        
        // Only show after a brief delay (let boot sequence finish)
        setTimeout(() => {
            if (FleetKit.mode === 'demo' && document.body) {
                document.body.appendChild(badge);
            }
        }, 3000);
    }

    // ── Initialize ──────────────────────────────────────────────────────────
    FleetKit.init = async function() {
        FleetKit.loadConfig();

        // Try live data first
        if (hasElectronAPI) {
            const gotLive = await fetchLiveData();
            if (gotLive) {
                console.log('🔌 FleetKit: Connected to OpenClaw (live data)');
            } else {
                console.log('🎮 FleetKit: Demo mode (OpenClaw not detected)');
                showDemoBadge();
            }
        } else {
            console.log('🎮 FleetKit: Demo mode (browser — no Electron API)');
            showDemoBadge();
        }

        // Listen for live updates from Electron
        if (hasElectronAPI && global.fleetkitAPI.onUpdate) {
            global.fleetkitAPI.onUpdate((data) => {
                if (data.agents) FleetKit.data.agents = data.agents;
                if (data.subagents) FleetKit.data.subagents = data.subagents;
                if (data.metrics) FleetKit.data.metrics = data.metrics;
                FleetKit.emit('data:refresh', FleetKit.data);
            });
        }

        if (FleetKit.config.autoStart) {
            FleetKit.startLive();
        }
    };

    // ── Auto-Initialize ─────────────────────────────────────────────────────
    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', FleetKit.init);
        } else {
            FleetKit.init();
        }
    } else {
        FleetKit.init();
    }

})(typeof window !== 'undefined' ? window : global);
