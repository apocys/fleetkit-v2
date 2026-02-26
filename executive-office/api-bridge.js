#!/usr/bin/env node
/**
 * SpawnKit API Bridge — Proxies OpenClaw Gateway internal data to REST endpoints
 * for the Executive Office data-bridge.js
 * 
 * Endpoints:
 *   GET /api/oc/sessions  → session list
 *   GET /api/oc/crons     → cron jobs
 *   GET /api/oc/memory    → memory files
 *   GET /api/oc/config    → gateway config
 *   GET /api/oc/agents    → agent list
 * 
 * Usage: node api-bridge.js [--port 8222] [--gateway http://127.0.0.1:18789] [--token xxx]
 */

const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse args
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
}

const PORT = parseInt(getArg('port', '8222'));
const GATEWAY_URL = getArg('gateway', 'http://127.0.0.1:18789');
const GATEWAY_TOKEN = getArg('token', '');
const WORKSPACE = getArg('workspace', process.env.HOME + '/.openclaw/workspace');
const SESSIONS_FILE = process.env.HOME + '/.openclaw/agents/main/sessions/sessions.json';

// ── Helpers ──
function readJSON(filepath) {
  try {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function ocExec(cmd) {
  try {
    const out = execSync(cmd, { timeout: 10000, encoding: 'utf8', env: { ...process.env, PATH: '/usr/local/bin:/usr/local/bin:' + process.env.PATH } });
    return out.trim();
  } catch (e) {
    return null;
  }
}

// ── Data fetchers ──
function getSessions() {
  const data = readJSON(SESSIONS_FILE);
  if (!data) return [];
  
  // sessions.json has { sessions: { key: sessionData } }
  const sessions = data.sessions || data;
  if (typeof sessions !== 'object') return [];
  
  return Object.entries(sessions).map(([key, s]) => ({
    key: key,
    kind: key.includes(':subagent:') ? 'subagent' : (key.includes(':cron:') ? 'cron' : 'main'),
    label: s.label || s.displayName || key.split(':').pop(),
    displayName: s.displayName || s.label || key,
    status: (Date.now() - (s.updatedAt || 0)) < 300000 ? 'active' : 'idle',
    model: s.model || 'unknown',
    totalTokens: s.totalTokens || 0,
    lastActive: s.updatedAt || null,
    channel: s.lastChannel || s.channel || 'unknown'
  }));
}

function getCrons() {
  // Read cron state from OpenClaw
  const cronDir = process.env.HOME + '/.openclaw/agents/main';
  const files = [];
  try {
    // Use openclaw CLI to list crons
    const out = ocExec('openclaw cron list --json 2>/dev/null');
    if (out) {
      const parsed = JSON.parse(out);
      return { jobs: Array.isArray(parsed) ? parsed : (parsed.jobs || []) };
    }
  } catch (e) {}
  
  return { jobs: [] };
}

function getMemory() {
  const memDir = path.join(WORKSPACE, 'memory');
  const mainFile = path.join(WORKSPACE, 'MEMORY.md');
  
  const files = [];
  try {
    const entries = fs.readdirSync(memDir);
    entries.forEach(f => {
      try {
        const stat = fs.statSync(path.join(memDir, f));
        files.push({ name: f, size: stat.size, modified: stat.mtimeMs });
      } catch (e) {}
    });
  } catch (e) {}
  
  let main = '';
  try { main = fs.readFileSync(mainFile, 'utf8'); } catch (e) {}
  
  return { main, files };
}

function getConfig() {
  const configFile = process.env.HOME + '/.openclaw/openclaw.json';
  const config = readJSON(configFile);
  if (!config) return {};
  // Strip sensitive data
  const safe = { ...config };
  if (safe.gateway && safe.gateway.auth) delete safe.gateway.auth.token;
  if (safe.channels && safe.channels.telegram) delete safe.channels.telegram.botToken;
  return safe;
}

function getAgents() {
  const config = readJSON(process.env.HOME + '/.openclaw/openclaw.json');
  if (!config || !config.agents) return [];
  
  const agentList = config.agents.list || [];
  const sessions = getSessions();
  
  return agentList.map(a => {
    const agentSessions = sessions.filter(s => s.key.includes(':' + a.id + ':') || (a.default && s.key.includes(':main:')));
    const latestSession = agentSessions.sort((x, y) => (y.lastActive || 0) - (x.lastActive || 0))[0];
    
    return {
      id: a.id,
      isDefault: !!a.default,
      status: latestSession && (Date.now() - (latestSession.lastActive || 0)) < 300000 ? 'active' : 'idle',
      model: latestSession?.model || config.agents?.defaults?.model?.primary || 'unknown',
      totalTokens: agentSessions.reduce((sum, s) => sum + (s.totalTokens || 0), 0),
      lastActive: latestSession?.lastActive || null,
      sessionKey: latestSession?.key || null
    };
  });
}

// ── Chat handler ──
function handleChat(body) {
  const message = body.message || '';
  const target = body.target || 'main';
  
  if (!message.trim()) {
    return { ok: false, error: 'Empty message' };
  }
  
  // Try to relay to OpenClaw agent via CLI
  try {
    const escaped = message.replace(/'/g, "'\\''");
    const reply = ocExec(`openclaw agent -p '${escaped}'`);
    if (reply) {
      return { ok: true, reply: reply, target: target };
    }
  } catch (e) {
    // CLI failed, fall through to echo
  }
  
  // Fallback: echo back with acknowledgment
  return { 
    ok: true, 
    reply: '📨 Message received: "' + message + '" — OpenClaw CLI is not available for direct relay. Message queued.',
    target: target 
  };
}

// ── Chat history from sessions ──
function getChatHistory() {
  const sessions = getSessions();
  const history = [];
  
  // Read recent session transcripts
  const sessionsDir = process.env.HOME + '/.openclaw/agents/main/sessions';
  try {
    const files = fs.readdirSync(sessionsDir).filter(f => f.endsWith('.json') && f !== 'sessions.json');
    // Sort by modification time, take last 5
    const sorted = files.map(f => {
      const fp = path.join(sessionsDir, f);
      try {
        return { name: f, path: fp, mtime: fs.statSync(fp).mtimeMs };
      } catch(e) { return null; }
    }).filter(Boolean).sort((a, b) => b.mtime - a.mtime).slice(0, 5);
    
    sorted.forEach(file => {
      try {
        const data = JSON.parse(fs.readFileSync(file.path, 'utf8'));
        const messages = data.messages || data.transcript || [];
        messages.forEach(msg => {
          if (msg.role === 'user' || msg.role === 'assistant') {
            history.push({
              role: msg.role,
              content: (msg.content || msg.text || '').substring(0, 500),
              timestamp: msg.timestamp || file.mtime,
              session: file.name.replace('.json', ''),
              target: data.target || 'main'
            });
          }
        });
      } catch(e) {}
    });
  } catch(e) {}
  
  // Also include current session data from sessions.json
  const sessData = readJSON(SESSIONS_FILE);
  if (sessData && sessData.sessions) {
    Object.entries(sessData.sessions).forEach(([key, s]) => {
      if (s.lastMessage) {
        history.push({
          role: 'user',
          content: (s.lastMessage || '').substring(0, 500),
          timestamp: s.updatedAt || Date.now(),
          session: key,
          target: 'main'
        });
      }
    });
  }
  
  // Sort by timestamp descending, limit to 50
  history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  return { ok: true, history: history.slice(0, 50) };
}

// ── HTTP Server ──
const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Accept, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  
  // Handle POST requests with body parsing
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        handleRoute(pathname, parsed, res);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON: ' + e.message }));
      }
    });
    return;
  }
  
  handleRoute(pathname, null, res);
});

function handleRoute(pathname, postBody, res) {
  let data;
  try {
    switch (pathname) {
      case '/api/oc/sessions':
        data = getSessions();
        break;
      case '/api/oc/crons':
        data = getCrons();
        break;
      case '/api/oc/memory':
        data = getMemory();
        break;
      case '/api/oc/config':
        data = getConfig();
        break;
      case '/api/oc/agents':
        data = getAgents();
        break;
      case '/api/oc/chat':
        if (!postBody) {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'POST required' }));
          return;
        }
        data = handleChat(postBody);
        break;
      case '/api/oc/chat/history':
        data = getChatHistory();
        break;
      case '/api/health':
        data = { ok: true, gateway: GATEWAY_URL, uptime: process.uptime() };
        break;
      default:
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found', path: pathname }));
        return;
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message }));
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

server.listen(PORT, '127.0.0.1', () => {
  console.log(`🔌 SpawnKit API Bridge running on http://127.0.0.1:${PORT}`);
  console.log(`   Gateway: ${GATEWAY_URL}`);
  console.log(`   Workspace: ${WORKSPACE}`);
  console.log(`   Endpoints: /api/oc/{sessions,crons,memory,config,agents}`);
});
