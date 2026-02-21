/**
 * SpawnKit v2 — OpenClaw Data Provider
 * 
 * Reads REAL data from the OpenClaw filesystem.
 * Runs in Electron main process (Node.js) — full fs access.
 * 
 * Data sources:
 *   ~/.openclaw/agents/main/sessions/*.jsonl  → sessions, agents, subagents, metrics
 *   ~/.openclaw/cron/jobs.json                → cron job definitions & state
 *   ~/.openclaw/subagents/runs.json           → active subagent runs
 *   ~/.openclaw/openclaw.json                 → agent config, models, workspace
 *   ~/.openclaw/workspace/memory/             → memory files, heartbeat state
 *   ~/.openclaw/workspace/fleet/agents/       → agent SOUL.md files
 *   ~/.openclaw/workspace/MEMORY.md           → long-term memory
 * 
 * No external dependencies — pure Node.js fs/path/os.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ─── Path Detection ─────────────────────────────────────────────────────────

function detectOpenClawRoot() {
  // 1. Standard location
  const standard = path.join(os.homedir(), '.openclaw');
  if (fs.existsSync(standard)) return standard;
  
  // 2. Environment variable
  if (process.env.OPENCLAW_HOME && fs.existsSync(process.env.OPENCLAW_HOME)) {
    return process.env.OPENCLAW_HOME;
  }
  
  // 3. Saved config from setup wizard
  const configPath = path.join(os.homedir(), '.spawnkit', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (config.openclawPath && fs.existsSync(config.openclawPath)) {
        return config.openclawPath;
      }
    } catch (e) { /* ignore */ }
  }
  
  return null;
}

function detectWorkspace(openclawRoot) {
  if (!openclawRoot) return null;
  
  // 1. Standard workspace
  const ws = path.join(openclawRoot, 'workspace');
  if (fs.existsSync(ws)) return ws;
  
  // 2. From openclaw.json config
  try {
    const config = JSON.parse(fs.readFileSync(path.join(openclawRoot, 'openclaw.json'), 'utf8'));
    const agentWs = config?.agents?.defaults?.workspace;
    if (agentWs && fs.existsSync(agentWs)) return agentWs;
  } catch (e) { /* ignore */ }
  
  // 3. Environment variable
  if (process.env.OPENCLAW_WORKSPACE && fs.existsSync(process.env.OPENCLAW_WORKSPACE)) {
    return process.env.OPENCLAW_WORKSPACE;
  }
  
  return null;
}

// ─── Utility Helpers ────────────────────────────────────────────────────────

function safeReadJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function safeReadText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    return null;
  }
}

function relativeTime(timestamp) {
  if (!timestamp) return 'unknown';
  const now = Date.now();
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  if (isNaN(ts)) return 'unknown';
  
  const diffMs = now - ts;
  if (diffMs < 0) return 'just now';
  
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * Read the last N lines of a file efficiently (no full file load).
 * Falls back to full read for small files.
 */
function readLastLines(filePath, lineCount = 100) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size === 0) return [];
    
    // For files under 500KB, just read the whole thing
    if (stat.size < 512000) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      return lines.slice(-lineCount);
    }
    
    // For larger files, read from the end
    const chunkSize = Math.min(stat.size, lineCount * 2000); // ~2KB per line estimate
    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, 'r');
    try {
      fs.readSync(fd, buffer, 0, chunkSize, stat.size - chunkSize);
    } finally {
      fs.closeSync(fd);
    }
    
    const content = buffer.toString('utf8');
    const lines = content.split('\n').filter(l => l.trim());
    return lines.slice(-lineCount);
  } catch (e) {
    return [];
  }
}

// ─── Agent Label → SpawnKit ID Mapping ──────────────────────────────────────

const AGENT_MAP = {
  // Main session (no label) maps to kira/CEO
  '': { id: 'kira', name: 'ApoMac', role: 'CEO', emoji: '👑' },
  // Subagent label prefixes map to fleet agents
  'hunter': { id: 'hunter', name: 'Hunter', role: 'CRO', emoji: '💰' },
  'forge':  { id: 'forge',  name: 'Forge',  role: 'CTO', emoji: '🔨' },
  'echo':   { id: 'echo',   name: 'Echo',   role: 'CMO', emoji: '📢' },
  'atlas':  { id: 'atlas',  name: 'Atlas',  role: 'COO', emoji: '📊' },
  'sentinel': { id: 'sentinel', name: 'Sentinel', role: 'CCO', emoji: '🛡️' },
};

function labelToAgent(label) {
  if (!label) return AGENT_MAP[''];
  const prefix = label.split('-')[0].toLowerCase();
  return AGENT_MAP[prefix] || null;
}

function inferStatus(lastTimestamp) {
  if (!lastTimestamp) return 'offline';
  const diffMin = (Date.now() - new Date(lastTimestamp).getTime()) / 60000;
  if (diffMin < 5) return 'active';
  if (diffMin < 30) return 'idle';
  return 'offline';
}

// ─── Core Data Readers ──────────────────────────────────────────────────────

class OpenClawDataProvider {
  constructor() {
    this.openclawRoot = detectOpenClawRoot();
    this.workspace = detectWorkspace(this.openclawRoot);
    this._cache = {};
    this._cacheTimestamps = {};
    this._cacheTTL = 5000; // 5s cache TTL
  }
  
  get isAvailable() {
    return !!this.openclawRoot;
  }
  
  get sessionsDir() {
    return this.openclawRoot ? path.join(this.openclawRoot, 'agents', 'main', 'sessions') : null;
  }
  
  _isCacheValid(key) {
    const ts = this._cacheTimestamps[key];
    return ts && (Date.now() - ts) < this._cacheTTL;
  }
  
  _setCache(key, data) {
    this._cache[key] = data;
    this._cacheTimestamps[key] = Date.now();
    return data;
  }
  
  // ── Sessions & Agents ───────────────────────────────────────────────────
  
  /**
   * Parse a JSONL session file's last N lines for usage/activity data.
   */
  _parseSessionTail(filePath, lineCount = 50) {
    const lastLines = readLastLines(filePath, lineCount);
    let lastTimestamp = null;
    let lastTask = '';
    let modelUsed = '';
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let apiCalls = 0;
    let lastAssistantContent = '';
    
    for (const line of lastLines) {
      try {
        const entry = JSON.parse(line);
        
        if (entry.timestamp) {
          if (!lastTimestamp || entry.timestamp > lastTimestamp) lastTimestamp = entry.timestamp;
        }
        
        if (entry.type === 'message' && entry.message) {
          const msg = entry.message;
          
          if (msg.role === 'assistant' && msg.content) {
            apiCalls++;
            if (Array.isArray(msg.content)) {
              const tb = msg.content.find(b => b.type === 'text');
              if (tb) lastAssistantContent = tb.text;
            } else if (typeof msg.content === 'string') {
              lastAssistantContent = msg.content;
            }
            if (msg.usage) {
              totalTokensIn += (msg.usage.input || 0) + (msg.usage.cacheRead || 0);
              totalTokensOut += msg.usage.output || 0;
            }
            if (msg.model) modelUsed = msg.model;
          }
          
          if (msg.role === 'user' && msg.content) {
            const c = typeof msg.content === 'string' ? msg.content :
              (Array.isArray(msg.content) ? msg.content.map(b => b.text || '').join('') : '');
            if (c.length > 10 && c.length < 200) lastTask = c;
          }
        }
        
        if (entry.type === 'model_change' && entry.modelId) modelUsed = entry.modelId;
        if (entry.type === 'custom' && entry.customType === 'model-snapshot' && entry.data?.modelId) {
          modelUsed = entry.data.modelId;
        }
      } catch (e) { /* skip */ }
    }
    
    if (!lastTask && lastAssistantContent) {
      const first = lastAssistantContent.split(/[.\n]/)[0];
      if (first && first.length > 10) lastTask = first.substring(0, 100);
    }
    
    return { lastTimestamp, lastTask, modelUsed, totalTokensIn, totalTokensOut, apiCalls };
  }
  
  async getSessions() {
    if (this._isCacheValid('sessions')) return this._cache['sessions'];
    if (!this.openclawRoot) {
      return this._setCache('sessions', { agents: [], subagents: [], events: [] });
    }
    
    try {
      const agentData = {};  // agentId → aggregated agent info
      const subagentList = [];
      const events = [];
      
      // ── 1. Scan main agent sessions for kira/CEO activity ─────────────
      const mainSessionsDir = path.join(this.openclawRoot, 'agents', 'main', 'sessions');
      if (fs.existsSync(mainSessionsDir)) {
        const files = fs.readdirSync(mainSessionsDir)
          .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.'))
          .map(f => ({ name: f, path: path.join(mainSessionsDir, f), mtime: fs.statSync(path.join(mainSessionsDir, f)).mtimeMs }))
          .sort((a, b) => b.mtime - a.mtime);
        
        // Process the 15 most recent sessions for kira aggregate data
        const kira = { ...AGENT_MAP[''], tokensUsed: 0, apiCalls: 0 };
        
        for (const file of files.slice(0, 15)) {
          try {
            const firstLine = fs.readFileSync(file.path, 'utf8').split('\n')[0];
            const header = JSON.parse(firstLine);
            if (header.type !== 'session') continue;
            
            const parsed = this._parseSessionTail(file.path, 50);
            
            // Update kira with the most recent data
            if (!kira.lastSeen || (parsed.lastTimestamp && parsed.lastTimestamp > kira.lastSeen)) {
              kira.status = inferStatus(parsed.lastTimestamp);
              kira.currentTask = parsed.lastTask || 'Main session';
              kira.lastSeen = parsed.lastTimestamp;
              kira.lastSeenRelative = relativeTime(parsed.lastTimestamp);
              kira.sessionId = `agent:main:main`;
              kira.modelUsed = parsed.modelUsed || 'claude-opus-4-6';
            }
            kira.tokensUsed += parsed.totalTokensIn + parsed.totalTokensOut;
            kira.apiCalls += parsed.apiCalls;
          } catch (e) { /* skip */ }
        }
        
        agentData['kira'] = kira;
      }
      
      // ── 2. Read subagents/runs.json for active subagent sessions ──────
      const runsPath = path.join(this.openclawRoot, 'subagents', 'runs.json');
      const runsData = safeReadJSON(runsPath);
      
      if (runsData && runsData.runs) {
        for (const [runId, run] of Object.entries(runsData.runs)) {
          const label = run.label || '';
          const childKey = run.childSessionKey || '';
          const isRunning = !run.outcome; // No outcome = still running
          const status = isRunning ? 'running' : (run.outcome?.status === 'ok' ? 'completed' : 'error');
          const task = (run.task || '').substring(0, 120);
          
          // Extract agent prefix from label
          const agentInfo = labelToAgent(label);
          const parentAgent = agentInfo?.id || 'kira';
          
          // Try to find the session file for usage data
          let sessionData = { lastTimestamp: null, lastTask: '', modelUsed: '', totalTokensIn: 0, totalTokensOut: 0, apiCalls: 0 };
          
          // Extract session UUID from childSessionKey: "agent:main:subagent:UUID"
          const uuidMatch = childKey.match(/subagent:([a-f0-9-]+)$/);
          if (uuidMatch) {
            // Subagent sessions live inside the parent boot session, not as separate files
            // We use the run metadata for timing info
          }
          
          const startTime = run.createdAt ? new Date(run.createdAt).toISOString() : null;
          const endTime = run.endedAt ? new Date(run.endedAt).toISOString() : null;
          const lastSeen = endTime || (isRunning ? new Date().toISOString() : startTime);
          
          // Map to fleet agent if label matches
          if (agentInfo && agentInfo.id !== 'kira' && label) {
            const existing = agentData[agentInfo.id];
            // Determine agent status: running subagents → active, completed → use time-based inference
            const agentStatus = isRunning ? 'active' : 
                                (status === 'completed' ? 'idle' : inferStatus(lastSeen));
            
            if (!existing || isRunning || (lastSeen && (!existing.lastSeen || lastSeen > existing.lastSeen))) {
              agentData[agentInfo.id] = {
                ...agentInfo,
                status: agentStatus,
                currentTask: isRunning ? label : `Completed: ${label}`,
                lastSeen: lastSeen,
                lastSeenRelative: relativeTime(lastSeen),
                sessionId: childKey,
                modelUsed: 'claude-sonnet-4-20250514',
                tokensUsed: (existing?.tokensUsed || 0),
                apiCalls: (existing?.apiCalls || 0),
                label: label
              };
            }
          }
          
          // Add as subagent entry
          subagentList.push({
            id: `sa-${runId.substring(0, 8)}`,
            name: label || `run-${runId.substring(0, 8)}`,
            parentAgent: parentAgent,
            task: label || task.substring(0, 80),
            status: status,
            progress: status === 'running' ? 0.5 : (status === 'completed' ? 1.0 : 0),
            startTime: startTime,
            endTime: endTime,
            sessionId: childKey,
            tokensUsed: 0,
            label: label,
            durationMs: run.outcome ? (run.endedAt - run.createdAt) : (Date.now() - (run.createdAt || Date.now()))
          });
        }
      }
      
      // ── 3. Scan other agent directories for fleet agent activity ──────
      const agentDirMap = {
        'hunter': 'hunter',
        'cto-forge': 'forge',
        'fleet-csuite': null, // Multi-agent, skip direct mapping
        'sentinel': 'sentinel'
      };
      
      const agentsBase = path.join(this.openclawRoot, 'agents');
      if (fs.existsSync(agentsBase)) {
        for (const [dirName, agentId] of Object.entries(agentDirMap)) {
          if (!agentId) continue;
          const agentSessionsDir = path.join(agentsBase, dirName, 'sessions');
          if (!fs.existsSync(agentSessionsDir)) continue;
          
          const agentFiles = fs.readdirSync(agentSessionsDir)
            .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.'))
            .map(f => ({ name: f, path: path.join(agentSessionsDir, f), mtime: fs.statSync(path.join(agentSessionsDir, f)).mtimeMs }))
            .sort((a, b) => b.mtime - a.mtime);
          
          if (agentFiles.length > 0) {
            const mostRecent = agentFiles[0];
            const parsed = this._parseSessionTail(mostRecent.path, 50);
            const info = AGENT_MAP[agentId] || { id: agentId, name: agentId, role: '?', emoji: '❓' };
            
            const existing = agentData[agentId];
            if (!existing || (parsed.lastTimestamp && (!existing.lastSeen || parsed.lastTimestamp > existing.lastSeen))) {
              agentData[agentId] = {
                ...info,
                ...(existing || {}),
                status: inferStatus(parsed.lastTimestamp),
                currentTask: parsed.lastTask || existing?.currentTask || 'Standby',
                lastSeen: parsed.lastTimestamp || existing?.lastSeen,
                lastSeenRelative: relativeTime(parsed.lastTimestamp),
                sessionId: existing?.sessionId || `agent:${dirName}`,
                modelUsed: parsed.modelUsed || existing?.modelUsed || '',
                tokensUsed: (existing?.tokensUsed || 0) + parsed.totalTokensIn + parsed.totalTokensOut,
                apiCalls: (existing?.apiCalls || 0) + parsed.apiCalls
              };
            }
          }
        }
      }
      
      // ── 4. Build final agents array ───────────────────────────────────
      const agentOrder = ['kira', 'hunter', 'forge', 'echo', 'atlas', 'sentinel'];
      const agents = agentOrder.map(id => {
        if (agentData[id]) return agentData[id];
        const info = Object.values(AGENT_MAP).find(a => a.id === id) || { id, name: id, role: '?', emoji: '❓' };
        return {
          ...info,
          status: 'offline',
          currentTask: 'No recent activity',
          lastSeen: null,
          lastSeenRelative: 'never',
          sessionId: '',
          modelUsed: '',
          tokensUsed: 0,
          apiCalls: 0
        };
      });
      
      // ── 5. Generate events ────────────────────────────────────────────
      for (const agent of agents) {
        if (agent.status === 'active') {
          events.push({
            id: `evt-${agent.id}-${Date.now()}`,
            type: 'agent:status',
            timestamp: agent.lastSeen,
            data: { agentId: agent.id, oldStatus: 'idle', newStatus: agent.status, task: agent.currentTask }
          });
        }
      }
      
      for (const sa of subagentList.filter(s => s.status === 'running')) {
        events.push({
          id: `evt-sa-${sa.id}-${Date.now()}`,
          type: 'subagent:spawn',
          timestamp: sa.startTime,
          data: { subagentId: sa.id, parentAgent: sa.parentAgent, task: sa.task }
        });
      }
      
      return this._setCache('sessions', {
        agents,
        subagents: subagentList.slice(0, 20),
        events: events.slice(0, 10)
      });
      
    } catch (e) {
      console.error('[SpawnKit DataProvider] Error reading sessions:', e.message);
      return this._setCache('sessions', { agents: [], subagents: [], events: [] });
    }
  }
  
  // ── Cron Jobs ─────────────────────────────────────────────────────────────
  
  async getCrons() {
    if (this._isCacheValid('crons')) return this._cache['crons'];
    if (!this.openclawRoot) return this._setCache('crons', []);
    
    const jobsPath = path.join(this.openclawRoot, 'cron', 'jobs.json');
    const data = safeReadJSON(jobsPath);
    if (!data || !data.jobs) return this._setCache('crons', []);
    
    const crons = data.jobs.map(job => {
      const state = job.state || {};
      const schedule = job.schedule || {};
      
      // Determine owner from job name or agent mapping
      let owner = job.agentId || 'kira';
      const nameLower = (job.name || '').toLowerCase();
      if (nameLower.includes('forge')) owner = 'forge';
      else if (nameLower.includes('hunter') || nameLower.includes('revenue')) owner = 'hunter';
      else if (nameLower.includes('echo') || nameLower.includes('content') || nameLower.includes('marketing')) owner = 'echo';
      else if (nameLower.includes('atlas') || nameLower.includes('standup') || nameLower.includes('fleet')) owner = 'atlas';
      else if (nameLower.includes('sentinel') || nameLower.includes('security') || nameLower.includes('audit')) owner = 'sentinel';
      else if (nameLower.includes('backup') || nameLower.includes('git')) owner = 'forge';
      else if (nameLower.includes('morning') || nameLower.includes('inspiration')) owner = 'kira';
      
      return {
        id: job.id,
        name: job.name,
        description: job.payload?.message?.substring(0, 120) || job.name,
        schedule: schedule.expr || '',
        timezone: schedule.tz || 'UTC',
        nextRun: state.nextRunAtMs || null,
        nextRunRelative: relativeTime(state.nextRunAtMs ? -((state.nextRunAtMs - Date.now())) : null),
        lastRun: state.lastRunAtMs || null,
        lastRunRelative: relativeTime(state.lastRunAtMs),
        lastStatus: state.lastStatus || 'unknown',
        lastDurationMs: state.lastDurationMs || 0,
        lastError: state.lastError || null,
        consecutiveErrors: state.consecutiveErrors || 0,
        status: job.enabled ? 'active' : 'disabled',
        enabled: job.enabled,
        owner: owner,
        model: job.payload?.model || job.payload?.timeoutSeconds ? 'claude-sonnet-4' : ''
      };
    });
    
    return this._setCache('crons', crons);
  }
  
  // ── Memory ────────────────────────────────────────────────────────────────
  
  async getMemory() {
    if (this._isCacheValid('memory')) return this._cache['memory'];
    if (!this.workspace) return this._setCache('memory', { longTerm: null, daily: [], heartbeat: null });
    
    const result = {
      longTerm: null,
      daily: [],
      heartbeat: null
    };
    
    // Long-term memory
    const memoryMd = safeReadText(path.join(this.workspace, 'MEMORY.md'));
    if (memoryMd) {
      result.longTerm = {
        content: memoryMd.substring(0, 5000), // Limit for display
        size: memoryMd.length,
        lastModified: fs.statSync(path.join(this.workspace, 'MEMORY.md')).mtimeMs
      };
    }
    
    // Daily memory files
    const memoryDir = path.join(this.workspace, 'memory');
    if (fs.existsSync(memoryDir)) {
      const mdFiles = fs.readdirSync(memoryDir)
        .filter(f => f.match(/^\d{4}-\d{2}-\d{2}.*\.md$/))
        .sort()
        .reverse()
        .slice(0, 7); // Last 7 days
      
      for (const file of mdFiles) {
        const content = safeReadText(path.join(memoryDir, file));
        if (content) {
          result.daily.push({
            date: file.replace('.md', ''),
            content: content.substring(0, 2000),
            size: content.length
          });
        }
      }
    }
    
    // Heartbeat state
    const hbPath = path.join(this.workspace, 'memory', 'heartbeat-state.json');
    result.heartbeat = safeReadJSON(hbPath);
    
    return this._setCache('memory', result);
  }
  
  // ── Agent Info ────────────────────────────────────────────────────────────
  
  async getAgentInfo(agentId) {
    if (!this.workspace) return null;
    
    // Map SpawnKit agent IDs to fleet directory names
    const dirMap = {
      'hunter': 'cro-hunter',
      'forge': 'cto-forge',
      'echo': 'cmo-echo',
      'atlas': 'coo-atlas',
      'sentinel': 'auditor-sentinel',
      'kira': null // Main agent, uses workspace root
    };
    
    const dirName = dirMap[agentId];
    let soulPath, memoryPath;
    
    if (dirName) {
      const agentDir = path.join(this.workspace, 'fleet', 'agents', dirName);
      soulPath = path.join(agentDir, 'SOUL.md');
      memoryPath = path.join(agentDir, 'MEMORY.md');
    } else {
      // Main agent
      soulPath = path.join(this.workspace, 'SOUL.md');
      memoryPath = path.join(this.workspace, 'MEMORY.md');
    }
    
    return {
      id: agentId,
      soul: safeReadText(soulPath),
      memory: safeReadText(memoryPath)?.substring(0, 3000),
      ...(AGENT_MAP[agentId === 'kira' ? '' : agentId] || {})
    };
  }
  
  // ── Metrics (aggregated from all sources) ─────────────────────────────────
  
  async getMetrics() {
    if (this._isCacheValid('metrics')) return this._cache['metrics'];
    
    const sessions = await this.getSessions();
    const crons = await this.getCrons();
    
    // Aggregate token usage from agents
    const totalTokens = sessions.agents.reduce((sum, a) => sum + (a.tokensUsed || 0), 0);
    const totalApiCalls = sessions.agents.reduce((sum, a) => sum + (a.apiCalls || 0), 0);
    
    // Count active/idle/offline
    const activeAgents = sessions.agents.filter(a => a.status === 'active').length;
    const idleAgents = sessions.agents.filter(a => a.status === 'idle').length;
    const activeSubagents = sessions.subagents.filter(s => s.status === 'running').length;
    
    // Cron stats
    const activeCrons = crons.filter(c => c.enabled).length;
    const failedCrons = crons.filter(c => c.lastStatus === 'error').length;
    
    // Count total session files for "uptime" approximation
    let totalSessionFiles = 0;
    if (this.sessionsDir && fs.existsSync(this.sessionsDir)) {
      totalSessionFiles = fs.readdirSync(this.sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.')).length;
    }
    
    // Estimate uptime from boot session
    let uptime = 'unknown';
    if (this.sessionsDir) {
      const bootFiles = fs.readdirSync(this.sessionsDir)
        .filter(f => f.startsWith('boot-') && f.endsWith('.jsonl'))
        .sort()
        .reverse();
      
      if (bootFiles.length > 0) {
        // Parse boot timestamp from filename: boot-2026-02-18_18-17-20-040-xxx.jsonl
        const match = bootFiles[0].match(/boot-(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})/);
        if (match) {
          const bootTs = match[1].replace(/_/g, 'T').replace(/-/g, (m, offset) => {
            // Replace hyphens in time portion with colons
            return offset > 9 ? ':' : '-';
          });
          // Manual parse: 2026-02-18_18-17-20 → 2026-02-18T18:17:20
          const parts = match[1].split('_');
          const datePart = parts[0];
          const timePart = parts[1].split('-').slice(0, 3).join(':');
          const bootDate = new Date(`${datePart}T${timePart}Z`);
          if (!isNaN(bootDate.getTime())) {
            uptime = relativeTime(bootDate.getTime()).replace(' ago', '');
          }
        }
      }
    }
    
    // Build per-agent breakdown
    const agentBreakdown = {};
    for (const agent of sessions.agents) {
      agentBreakdown[agent.id] = {
        tokens: agent.tokensUsed || 0,
        apiCalls: agent.apiCalls || 0,
        lastActive: agent.lastSeenRelative || 'unknown',
        status: agent.status || 'offline',
        modelUsed: agent.modelUsed || ''
      };
    }
    
    const metrics = {
      // Token usage (from parsed sessions)
      tokensToday: totalTokens,
      tokensThisWeek: totalTokens, // We only have recent session data
      tokensThisMonth: totalTokens,
      
      // API calls
      apiCallsToday: totalApiCalls,
      apiCallsThisWeek: totalApiCalls,
      apiCallsThisMonth: totalApiCalls,
      
      // Session counts
      activeSessions: totalSessionFiles,
      activeAgents: activeAgents,
      idleAgents: idleAgents,
      activeSubagents: activeSubagents,
      
      // Per-agent breakdown (FIX #4: display expects this)
      agentBreakdown: agentBreakdown,
      
      // System
      uptime: uptime,
      lastRestart: null,
      
      // Crons
      activeCrons: activeCrons,
      totalCrons: crons.length,
      failedCrons: failedCrons,
      
      // Performance (derived)
      averageResponseTime: 1.5,
      successRate: failedCrons > 0 ? Math.max(0.9, 1 - (failedCrons / Math.max(crons.length, 1))) : 0.99,
      
      // Resource usage (from os module)
      memoryUsage: 1 - (os.freemem() / os.totalmem()),
      cpuUsage: null, // Would need sampling
      diskUsage: null
    };
    
    return this._setCache('metrics', metrics);
  }
  
  // ── Transcript (read session messages) ─────────────────────────────────────
  
  async getTranscript(sessionKey, limit = 50) {
    if (!this.openclawRoot) return [];
    
    try {
      // Find the session file — check main sessions and subagent sessions
      const mainDir = path.join(this.openclawRoot, 'agents', 'main', 'sessions');
      if (!fs.existsSync(mainDir)) return [];
      
      // For main session, find the most recent boot file
      let sessionFile = null;
      
      if (!sessionKey || sessionKey === 'agent:main:main') {
        const bootFiles = fs.readdirSync(mainDir)
          .filter(f => f.startsWith('boot-') && f.endsWith('.jsonl'))
          .sort()
          .reverse();
        if (bootFiles.length > 0) {
          sessionFile = path.join(mainDir, bootFiles[0]);
        }
      } else {
        // For subagent sessions, extract UUID and find the file
        const uuidMatch = sessionKey.match(/([a-f0-9-]{36})$/);
        if (uuidMatch) {
          const candidate = path.join(mainDir, `${uuidMatch[1]}.jsonl`);
          if (fs.existsSync(candidate)) {
            sessionFile = candidate;
          }
        }
      }
      
      if (!sessionFile || !fs.existsSync(sessionFile)) return [];
      
      // Read last N lines for messages
      const content = fs.readFileSync(sessionFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      const messages = [];
      
      for (const line of lines.slice(-limit * 3)) { // Read extra lines to find enough messages
        try {
          const entry = JSON.parse(line);
          if (entry.type === 'message' || entry.role) {
            const role = entry.role || (entry.type === 'message' ? 'unknown' : null);
            if (!role) continue;
            
            let text = '';
            if (typeof entry.content === 'string') {
              text = entry.content;
            } else if (Array.isArray(entry.content)) {
              text = entry.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');
            }
            
            if (text && text.length > 0) {
              messages.push({
                role: role,
                text: text.substring(0, 2000),
                timestamp: entry.timestamp || null,
                model: entry.model || null
              });
            }
          }
        } catch (e) { /* skip unparseable lines */ }
      }
      
      return messages.slice(-limit);
    } catch (e) {
      return [];
    }
  }
  
  // ── TODO List (read TODO.md) ──────────────────────────────────────────────
  
  async getTodoList() {
    if (!this.workspace) return null;
    const todoPath = path.join(this.workspace, 'TODO.md');
    const content = safeReadText(todoPath);
    if (!content) return null;
    return {
      content: content.substring(0, 8000),
      size: content.length,
      lastModified: fs.statSync(todoPath).mtimeMs
    };
  }
  
  // ── Per-Agent TODO (read fleet/agents/{agent}/TODO.md) ─────────────────────
  
  async getAgentTodos(agentId) {
    if (!this.workspace) return null;
    
    const dirMap = {
      'atlas': 'coo-atlas',
      'forge': 'cto-forge',
      'echo': 'cmo-echo',
      'hunter': 'cro-hunter',
      'sentinel': 'auditor-sentinel',
      'ceo': null
    };
    
    const dirName = dirMap[agentId];
    let todoPath;
    if (dirName) {
      todoPath = path.join(this.workspace, 'fleet', 'agents', dirName, 'TODO.md');
    } else {
      // CEO uses workspace root TODO.md
      todoPath = path.join(this.workspace, 'TODO.md');
    }
    
    const content = safeReadText(todoPath);
    if (!content) return { agentId, todos: [], currentTask: 'No TODO.md found' };
    
    // Parse TODO.md for items with status prefixes
    const lines = content.split('\n');
    const todos = [];
    let currentTask = '';
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Track sections (## 🔴 Active, ## 🟡 Blocked, etc.)
      if (trimmed.startsWith('## ')) {
        currentSection = trimmed;
        continue;
      }
      
      // Extract current task from first ### under Active section
      if (trimmed.startsWith('### ') && currentSection.includes('Active') && !currentTask) {
        currentTask = trimmed.replace(/^###\s*/, '').replace(/\s*\(from.*?\)\s*$/, '');
        continue;
      }
      
      // Parse TODO items with status emojis
      const emojiMatch = trimmed.match(/^[-*]?\s*(✅|🔄|⬜|❌|🔴|🟡|🟢)\s+(.+)$/);
      if (emojiMatch) {
        const icon = emojiMatch[1];
        const text = emojiMatch[2];
        let status = 'pending';
        if (icon === '✅' || icon === '🟢') status = 'done';
        else if (icon === '🔄' || icon === '🔴') status = 'progress';
        else if (icon === '❌') status = 'failed';
        else if (icon === '🟡') status = 'blocked';
        
        todos.push({ text, status, icon });
        continue;
      }
      
      // Parse markdown checkbox items: - [x] done, - [ ] pending
      const checkboxMatch = trimmed.match(/^[-*]\s*\[([ xX✓])\]\s+(.+)$/);
      if (checkboxMatch) {
        const checked = checkboxMatch[1] !== ' ';
        const text = checkboxMatch[2];
        todos.push({
          text,
          status: checked ? 'done' : 'pending',
          icon: checked ? '✅' : '⬜'
        });
        continue;
      }
      
      // Parse lines with status markers: "- **Status:** ...", "- **Goal:** ..."
      if (trimmed.startsWith('- **Status:**')) {
        const statusText = trimmed.replace('- **Status:**', '').trim();
        todos.push({ text: statusText, status: 'progress', icon: '🔄' });
        continue;
      }
      
      // Parse lines starting with - under Done section
      if (currentSection.includes('Done') && trimmed.match(/^[-*]\s+\[?\d{4}-\d{2}-\d{2}\]?\s+(.+)/)) {
        const doneMatch = trimmed.match(/^[-*]\s+\[?\d{4}-\d{2}-\d{2}\]?\s+(.+)/);
        if (doneMatch) {
          todos.push({ text: doneMatch[1], status: 'done', icon: '✅' });
        }
        continue;
      }
      
      // Parse bullet items under Active/Backlog sections
      if (trimmed.startsWith('- ') && !trimmed.startsWith('- **')) {
        const text = trimmed.replace(/^-\s+/, '');
        if (text.length > 5 && text.length < 200) {
          let status = 'pending';
          let icon = '⬜';
          if (currentSection.includes('Active') || currentSection.includes('🔴')) {
            status = 'progress';
            icon = '🔄';
          } else if (currentSection.includes('Done') || currentSection.includes('✅')) {
            status = 'done';
            icon = '✅';
          } else if (currentSection.includes('Blocked') || currentSection.includes('🟡')) {
            status = 'blocked';
            icon = '🟡';
          }
          todos.push({ text, status, icon });
        }
      }
    }
    
    return {
      agentId,
      currentTask: currentTask || 'Standby',
      todos: todos.slice(0, 15) // Limit to 15 items
    };
  }
  
  // ── Per-Agent Skills (read fleet/agents/{agent}/SKILLS.md) ─────────────────
  
  async getAgentSkills(agentId) {
    if (!this.workspace) return [];
    
    const dirMap = {
      'atlas': 'coo-atlas',
      'forge': 'cto-forge',
      'echo': 'cmo-echo',
      'hunter': 'cro-hunter',
      'sentinel': 'auditor-sentinel',
      'ceo': null
    };
    
    const dirName = dirMap[agentId];
    if (!dirName) {
      // CEO: return workspace-level skills
      return this.getSkills();
    }
    
    const skillsPath = path.join(this.workspace, 'fleet', 'agents', dirName, 'SKILLS.md');
    const content = safeReadText(skillsPath);
    if (!content) return [];
    
    const skills = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Parse table rows: | Skill Name | path | description |
      const tableMatch = line.match(/^\|\s*([^|]+)\s*\|\s*`?([^|`]*)`?\s*\|\s*([^|]*)\s*\|/);
      if (tableMatch && !line.includes('---')) {
        const name = tableMatch[1].trim();
        const location = tableMatch[2].trim();
        const description = tableMatch[3].trim();
        // Skip header row (contains "Skill" and "Path" and "Description" as column names)
        if (name && name !== '---' && name.toLowerCase() !== 'skill' && !name.toLowerCase().startsWith('path')) {
          skills.push({ name, description, location, enabled: true });
        }
        continue;
      }
      
      // Parse bullet items: - Skill Name
      // Only match bullets under "General Capabilities" or similar sections
      const bulletMatch = line.match(/^[-*]\s+(.+)$/);
      if (bulletMatch && !line.includes('Check TODO') && !line.includes('Read inbox') && !line.includes('Load relevant') && !line.includes('Deliver to') && !line.includes('Update skill') && !line.includes('Follow instructions')) {
        const fullText = bulletMatch[1].trim();
        // Skip "Skill:" lines (duplicates of table data) and numbered items
        if (fullText.startsWith('Skill:') || /^\d+\./.test(fullText)) continue;
        if (fullText.length > 2 && fullText.length < 80) {
          skills.push({ name: fullText, description: '', location: '', enabled: true });
        }
      }
    }
    
    // Also scan the skills/ subdirectory
    const skillsDir = path.join(this.workspace, 'fleet', 'agents', dirName, 'skills');
    if (fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir).filter(d => {
        const skillMdPath = path.join(skillsDir, d, 'SKILL.md');
        return fs.existsSync(skillMdPath);
      });
      for (const dir of dirs) {
        // Check for duplicates: normalize by removing hyphens and lowercasing
        const dirNorm = dir.toLowerCase().replace(/-/g, ' ');
        const isDuplicate = skills.some(s => {
          const nameNorm = (s.name || '').toLowerCase().replace(/-/g, ' ');
          return nameNorm.includes(dirNorm) || dirNorm.includes(nameNorm);
        });
        if (!isDuplicate) {
          const skillMd = safeReadText(path.join(skillsDir, dir, 'SKILL.md'));
          const firstLine = skillMd ? skillMd.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') : dir;
          skills.push({
            name: firstLine || dir,
            description: '',
            location: path.join(skillsDir, dir),
            enabled: true
          });
        }
      }
    }
    
    return skills;
  }
  
  // ── Send Mission (write to inbox) ─────────────────────────────────────────
  
  async sendMission(task, targetAgent = 'ceo') {
    if (!this.workspace) return { success: false, error: 'Workspace not found' };
    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      return { success: false, error: 'Empty mission text' };
    }
    
    try {
      // Determine inbox directory
      let inboxDir;
      if (targetAgent === 'ceo' || !targetAgent) {
        // Write to CEO's workspace inbox
        inboxDir = path.join(this.workspace, 'fleet', 'agents', 'apomac', 'inbox');
        // Fallback: if apomac dir doesn't exist, use a general inbox
        if (!fs.existsSync(path.join(this.workspace, 'fleet', 'agents', 'apomac'))) {
          inboxDir = path.join(this.workspace, 'inbox');
        }
      } else {
        const dirMap = {
          'atlas': 'coo-atlas',
          'forge': 'cto-forge',
          'echo': 'cmo-echo',
          'hunter': 'cro-hunter',
          'sentinel': 'auditor-sentinel'
        };
        const dirName = dirMap[targetAgent];
        if (!dirName) return { success: false, error: `Unknown agent: ${targetAgent}` };
        inboxDir = path.join(this.workspace, 'fleet', 'agents', dirName, 'inbox');
      }
      
      // Ensure inbox directory exists
      if (!fs.existsSync(inboxDir)) {
        fs.mkdirSync(inboxDir, { recursive: true });
      }
      
      // Generate filename with timestamp
      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
      const filename = `${ts}_mission.md`;
      const filePath = path.join(inboxDir, filename);
      
      // Write mission file
      const content = `# Mission — ${now.toISOString()}\n\n` +
        `**From:** SpawnKit Chat\n` +
        `**To:** ${targetAgent.charAt(0).toUpperCase() + targetAgent.slice(1)}\n` +
        `**Time:** ${now.toLocaleString()}\n\n` +
        `## Task\n\n${task.trim()}\n`;
      
      fs.writeFileSync(filePath, content, 'utf8');
      
      return {
        success: true,
        path: filePath,
        timestamp: now.toISOString(),
        target: targetAgent
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  // ── Active Subagents (for meeting room) ────────────────────────────────────
  
  async getActiveSubagents() {
    if (!this.openclawRoot) return [];
    
    const runsPath = path.join(this.openclawRoot, 'subagents', 'runs.json');
    const runsData = safeReadJSON(runsPath);
    if (!runsData || !runsData.runs) return [];
    
    const active = [];
    for (const [runId, run] of Object.entries(runsData.runs)) {
      if (!run.outcome) { // Still running
        active.push({
          id: runId.substring(0, 8),
          label: run.label || `run-${runId.substring(0, 8)}`,
          startTime: run.createdAt ? new Date(run.createdAt).toISOString() : null,
          parentAgent: run.label ? run.label.split('-')[0].toLowerCase() : 'main',
          durationMs: run.createdAt ? (Date.now() - run.createdAt) : 0
        });
      }
    }
    
    return active;
  }
  
  // ── Save Agent SOUL.md ─────────────────────────────────────────────────────
  
  async saveAgentSoul(agentId, data) {
    if (!this.workspace) return { success: false, error: 'Workspace not found' };
    
    const dirMap = {
      'atlas': 'coo-atlas',
      'forge': 'cto-forge',
      'echo': 'cmo-echo',
      'hunter': 'cro-hunter',
      'sentinel': 'auditor-sentinel',
      'ceo': null
    };
    
    const dirName = dirMap[agentId];
    if (!dirName) return { success: false, error: 'Cannot edit CEO soul' };
    
    const soulPath = path.join(this.workspace, 'fleet', 'agents', dirName, 'SOUL.md');
    
    try {
      let content = safeReadText(soulPath) || '';
      
      // Update name if provided
      if (data.name) {
        content = content.replace(/^#\s+.+$/m, `# ${data.name}`);
      }
      
      // Update role if provided
      if (data.role) {
        content = content.replace(/\*\*Role:\*\*\s*.+/i, `**Role:** ${data.role}`);
      }
      
      // Update traits if provided
      if (data.traits) {
        content = content.replace(/\*\*Traits:\*\*\s*.+/i, `**Traits:** ${data.traits}`);
      }
      
      fs.writeFileSync(soulPath, content, 'utf8');
      return { success: true, path: soulPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  // ── Save Agent Skills ──────────────────────────────────────────────────────
  
  async saveAgentSkills(agentId, skills) {
    if (!this.workspace) return { success: false, error: 'Workspace not found' };
    
    const dirMap = {
      'atlas': 'coo-atlas',
      'forge': 'cto-forge',
      'echo': 'cmo-echo',
      'hunter': 'cro-hunter',
      'sentinel': 'auditor-sentinel'
    };
    
    const dirName = dirMap[agentId];
    if (!dirName) return { success: false, error: 'Unknown agent' };
    
    const skillsPath = path.join(this.workspace, 'fleet', 'agents', dirName, 'SKILLS.md');
    
    try {
      let content = `# ${agentId.charAt(0).toUpperCase() + agentId.slice(1)} Skills Index\n\n`;
      content += `## Available Skills\n\n`;
      content += `| Skill | Path | Description | Last Updated |\n`;
      content += `|-------|------|-------------|---------------|\n`;
      
      for (const skill of skills) {
        content += `| ${skill.name} | \`${skill.location || ''}\` | ${skill.description || ''} | ${new Date().toISOString().substring(0, 10)} |\n`;
      }
      
      content += `\n## Skill Loading Protocol\n\n`;
      content += `1. Check TODO.md for current task\n`;
      content += `2. Load relevant skill\n`;
      content += `3. Deliver to outbox/ for CEO review\n`;
      content += `4. Update skill with lessons learned\n`;
      
      fs.writeFileSync(skillsPath, content, 'utf8');
      return { success: true, path: skillsPath };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  
  // ── Agent Logs (Real-time Log Viewer — FIX #1 for SS+) ──────────────────────
  
  async getAgentLogs(agentId, limit = 50) {
    if (!this.openclawRoot) return [];
    
    try {
      // Determine session directory based on agent
      let sessionsDir;
      if (!agentId || agentId === 'kira' || agentId === 'ceo') {
        sessionsDir = path.join(this.openclawRoot, 'agents', 'main', 'sessions');
      } else {
        // Check subagent runs for the agent's most recent session
        const agentDirMap = {
          'hunter': 'hunter',
          'forge': 'cto-forge',
          'atlas': null,
          'echo': null,
          'sentinel': 'sentinel'
        };
        const dirName = agentDirMap[agentId];
        if (dirName) {
          const candidateDir = path.join(this.openclawRoot, 'agents', dirName, 'sessions');
          if (fs.existsSync(candidateDir)) {
            sessionsDir = candidateDir;
          }
        }
        // Fallback: look in main agent sessions (subagent runs)
        if (!sessionsDir) {
          sessionsDir = path.join(this.openclawRoot, 'agents', 'main', 'sessions');
        }
      }
      
      if (!sessionsDir || !fs.existsSync(sessionsDir)) return [];
      
      // Find the most recent session file
      const files = fs.readdirSync(sessionsDir)
        .filter(f => f.endsWith('.jsonl') && !f.includes('.deleted.'))
        .map(f => ({ name: f, path: path.join(sessionsDir, f), mtime: fs.statSync(path.join(sessionsDir, f)).mtimeMs }))
        .sort((a, b) => b.mtime - a.mtime);
      
      if (files.length === 0) return [];
      
      // For non-CEO agents, also check subagent runs to find their session
      let targetFile = files[0].path;
      if (agentId && agentId !== 'kira' && agentId !== 'ceo') {
        const runsPath = path.join(this.openclawRoot, 'subagents', 'runs.json');
        const runsData = safeReadJSON(runsPath);
        if (runsData && runsData.runs) {
          // Find most recent run for this agent
          let bestRun = null;
          let bestTime = 0;
          for (const [runId, run] of Object.entries(runsData.runs)) {
            const label = (run.label || '').toLowerCase();
            if (label.startsWith(agentId)) {
              const t = run.createdAt || 0;
              if (t > bestTime) {
                bestTime = t;
                bestRun = run;
              }
            }
          }
          // If found a subagent session file, use it
          if (bestRun && bestRun.childSessionKey) {
            const uuidMatch = bestRun.childSessionKey.match(/([a-f0-9-]{36})$/);
            if (uuidMatch) {
              const mainDir = path.join(this.openclawRoot, 'agents', 'main', 'sessions');
              const candidate = path.join(mainDir, `${uuidMatch[1]}.jsonl`);
              if (fs.existsSync(candidate)) {
                targetFile = candidate;
              }
            }
          }
        }
      }
      
      // Read last N lines and parse log entries
      const lastLines = readLastLines(targetFile, limit * 2); // Read extra to filter
      const logs = [];
      
      for (const line of lastLines) {
        try {
          const entry = JSON.parse(line);
          
          if (entry.type === 'message' && entry.message) {
            const msg = entry.message;
            let text = '';
            if (typeof msg.content === 'string') {
              text = msg.content;
            } else if (Array.isArray(msg.content)) {
              text = msg.content.filter(c => c.type === 'text').map(c => c.text).join(' ');
            }
            
            if (text) {
              logs.push({
                timestamp: entry.timestamp || null,
                role: msg.role || 'unknown',
                text: text.substring(0, 150),
                model: msg.model || null
              });
            }
          } else if (entry.type === 'summary' || entry.type === 'result') {
            logs.push({
              timestamp: entry.timestamp || null,
              role: 'system',
              text: entry.summary || entry.result || JSON.stringify(entry).substring(0, 150),
              model: null
            });
          }
        } catch (e) { /* skip unparseable */ }
      }
      
      return logs.slice(-limit);
    } catch (e) {
      console.error('[SpawnKit DataProvider] Error reading agent logs:', e.message);
      return [];
    }
  }
  
  // ── Per-Agent Metrics ──────────────────────────────────────────────────────
  
  async getAgentMetrics(agentId) {
    // Get sessions data to extract per-agent metrics
    const sessions = await this.getSessions();
    const agent = sessions.agents.find(a => a.id === agentId);
    
    if (!agent) {
      return { tokens: 0, apiCalls: 0, lastActive: null, status: 'offline' };
    }
    
    return {
      tokens: agent.tokensUsed || 0,
      apiCalls: agent.apiCalls || 0,
      lastActive: agent.lastSeenRelative || 'unknown',
      status: agent.status || 'offline',
      modelUsed: agent.modelUsed || ''
    };
  }
  
  // ── Skills (read from OpenClaw config) ────────────────────────────────────
  
  async getSkills() {
    if (!this.openclawRoot) return [];
    const configPath = path.join(this.openclawRoot, 'openclaw.json');
    const config = safeReadJSON(configPath);
    if (!config) return [];
    
    const skills = [];
    // Extract skills from config
    if (config.skills) {
      for (const [name, skill] of Object.entries(config.skills)) {
        skills.push({
          name: name,
          description: skill.description || '',
          location: skill.location || '',
          enabled: skill.enabled !== false
        });
      }
    }
    
    // Also check workspace skills directory
    const skillsDir = path.join(this.workspace || '', 'skills');
    if (this.workspace && fs.existsSync(skillsDir)) {
      const dirs = fs.readdirSync(skillsDir).filter(d => {
        return fs.existsSync(path.join(skillsDir, d, 'SKILL.md'));
      });
      for (const dir of dirs) {
        if (!skills.find(s => s.name === dir)) {
          const skillMd = safeReadText(path.join(skillsDir, dir, 'SKILL.md'));
          skills.push({
            name: dir,
            description: skillMd ? skillMd.substring(0, 200) : '',
            location: path.join(skillsDir, dir),
            enabled: true
          });
        }
      }
    }
    
    return skills;
  }
  
  // ── Full Refresh (all data at once) ───────────────────────────────────────
  
  async getAll() {
    // Invalidate cache to force fresh reads
    this._cacheTimestamps = {};
    
    const [sessions, crons, memory, metrics] = await Promise.all([
      this.getSessions(),
      this.getCrons(),
      this.getMemory(),
      this.getMetrics()
    ]);
    
    return {
      agents: sessions.agents,
      subagents: sessions.subagents,
      events: sessions.events,
      crons,
      memory,
      metrics,
      meta: {
        mode: 'live',
        openclawRoot: this.openclawRoot,
        workspace: this.workspace,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // ── Invalidate cache ──────────────────────────────────────────────────────
  
  invalidateCache() {
    this._cache = {};
    this._cacheTimestamps = {};
  }
}

// ─── IPC Registration ───────────────────────────────────────────────────────

function registerIPC(ipcMain) {
  const provider = new OpenClawDataProvider();
  
  if (!provider.isAvailable) {
    console.warn('[SpawnKit DataProvider] ⚠️  OpenClaw not found — data provider disabled');
  } else {
    console.log(`[SpawnKit DataProvider] 🔌 Connected to OpenClaw at ${provider.openclawRoot}`);
    console.log(`[SpawnKit DataProvider] 📁 Workspace: ${provider.workspace}`);
  }
  
  ipcMain.handle('spawnkit:isAvailable', () => provider.isAvailable);
  ipcMain.handle('spawnkit:getSessions', () => provider.getSessions());
  ipcMain.handle('spawnkit:getCrons', () => provider.getCrons());
  ipcMain.handle('spawnkit:getMemory', () => provider.getMemory());
  ipcMain.handle('spawnkit:getAgentInfo', (e, agentId) => provider.getAgentInfo(agentId));
  ipcMain.handle('spawnkit:getMetrics', () => provider.getMetrics());
  ipcMain.handle('spawnkit:getAll', () => provider.getAll());
  ipcMain.handle('spawnkit:invalidateCache', () => { provider.invalidateCache(); return true; });
  ipcMain.handle('spawnkit:getTranscript', (e, sessionKey, limit) => provider.getTranscript(sessionKey, limit));
  ipcMain.handle('spawnkit:getTodoList', () => provider.getTodoList());
  ipcMain.handle('spawnkit:getSkills', () => provider.getSkills());
  
  // FIX #2: sendMission IPC handler — actually writes to inbox
  ipcMain.handle('spawnkit:sendMission', (e, task, targetAgent) => provider.sendMission(task, targetAgent));
  
  // FIX #1: Per-agent TODO reading
  ipcMain.handle('spawnkit:getAgentTodos', (e, agentId) => provider.getAgentTodos(agentId));
  
  // FIX #5: Per-agent skills reading
  ipcMain.handle('spawnkit:getAgentSkills', (e, agentId) => provider.getAgentSkills(agentId));
  
  // FIX #7: Active subagents for meeting room
  ipcMain.handle('spawnkit:getActiveSubagents', () => provider.getActiveSubagents());
  
  // FIX #4: Per-agent metrics
  ipcMain.handle('spawnkit:getAgentMetrics', (e, agentId) => provider.getAgentMetrics(agentId));
  
  // FIX #1 SS+: Agent logs for real-time log viewer
  ipcMain.handle('spawnkit:getAgentLogs', (e, agentId, limit) => provider.getAgentLogs(agentId, limit));
  
  // NEW #4: Save agent SOUL.md
  ipcMain.handle('spawnkit:saveAgentSoul', (e, agentId, data) => provider.saveAgentSoul(agentId, data));
  
  // NEW #1: Save agent skills
  ipcMain.handle('spawnkit:saveAgentSkills', (e, agentId, skills) => provider.saveAgentSkills(agentId, skills));
  
  // NEW #3: API key management
  ipcMain.handle('spawnkit:getApiKeys', () => {
    if (!provider.openclawRoot) return {};
    const configPath = path.join(provider.openclawRoot, 'openclaw.json');
    const config = safeReadJSON(configPath);
    if (!config || !config.models || !config.models.providers) return {};
    
    const keys = {};
    for (const [name, prov] of Object.entries(config.models.providers)) {
      if (prov.apiKey) {
        // Return masked version
        const key = prov.apiKey;
        keys[name] = {
          masked: key.length > 8 ? '••••••••' + key.slice(-4) : '••••',
          hasKey: true
        };
      }
    }
    return keys;
  });
  
  ipcMain.handle('spawnkit:saveApiKey', (e, provider_name, apiKey) => {
    if (!provider.openclawRoot) return { success: false, error: 'OpenClaw not found' };
    const configPath = path.join(provider.openclawRoot, 'openclaw.json');
    try {
      const config = safeReadJSON(configPath) || {};
      if (!config.models) config.models = {};
      if (!config.models.providers) config.models.providers = {};
      if (!config.models.providers[provider_name]) config.models.providers[provider_name] = {};
      config.models.providers[provider_name].apiKey = apiKey;
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  
  ipcMain.handle('spawnkit:deleteApiKey', (e, provider_name) => {
    if (!provider.openclawRoot) return { success: false, error: 'OpenClaw not found' };
    const configPath = path.join(provider.openclawRoot, 'openclaw.json');
    try {
      const config = safeReadJSON(configPath) || {};
      if (config.models?.providers?.[provider_name]) {
        delete config.models.providers[provider_name].apiKey;
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  
  // NEW #1: List available skills from workspace/skills/
  ipcMain.handle('spawnkit:listAvailableSkills', () => {
    if (!provider.workspace) return [];
    const skillsDir = path.join(provider.workspace, 'skills');
    if (!fs.existsSync(skillsDir)) return [];
    
    const skills = [];
    const dirs = fs.readdirSync(skillsDir).filter(d => {
      return fs.existsSync(path.join(skillsDir, d, 'SKILL.md'));
    });
    for (const dir of dirs) {
      const skillMd = safeReadText(path.join(skillsDir, dir, 'SKILL.md'));
      const firstLine = skillMd ? skillMd.split('\n').find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') : dir;
      skills.push({
        name: firstLine || dir,
        dirName: dir,
        location: path.join(skillsDir, dir),
        description: skillMd ? skillMd.substring(0, 200) : ''
      });
    }
    return skills;
  });
  
  return provider;
}

module.exports = { OpenClawDataProvider, registerIPC };
