#!/usr/bin/env node
/**
 * Executive Office Production Server
 * Serves static files + API bridge on a single port
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = parseInt(process.env.PORT || '8765');
const WORKSPACE = process.env.WORKSPACE || process.env.HOME + '/.openclaw/workspace';
const SESSIONS_FILE = process.env.HOME + '/.openclaw/agents/main/sessions/sessions.json';
const STATIC_DIR = __dirname;
const API_TOKEN = process.env.SK_API_TOKEN || 'sk-spawnkit-kira-2026';

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf'
};

function readJSON(fp) { try { return JSON.parse(fs.readFileSync(fp, 'utf8')); } catch(e) { return null; } }

// Load brainstorm prompts at startup
const BRAINSTORM_PROMPTS_FILE = process.env.HOME + '/clawd/brainstorm-prompts.json';
const brainstormPrompts = readJSON(BRAINSTORM_PROMPTS_FILE) || {};
console.log('[brainstorm] Prompts loaded:', brainstormPrompts.name || 'unknown', '— agents:', Object.keys(brainstormPrompts.agents || {}).join(', '));

function getSessions() {
  const data = readJSON(SESSIONS_FILE);
  if (!data) return [];
  const sessions = data.sessions || data;
  if (typeof sessions !== 'object') return [];
  return Object.entries(sessions).map(([key, s]) => ({
    key, kind: key.includes(':subagent:') ? 'subagent' : (key.includes(':cron:') ? 'cron' : 'main'),
    label: s.label || s.displayName || key.split(':').pop(),
    displayName: s.displayName || s.label || key,
    status: (Date.now() - (s.updatedAt || 0)) < 300000 ? 'active' : 'idle',
    model: s.model || 'unknown', totalTokens: s.totalTokens || 0,
    lastActive: s.updatedAt || null, channel: s.lastChannel || s.channel || 'unknown'
  }));
}

function getMemory() {
  const memDir = path.join(WORKSPACE, 'memory');
  const mainFile = path.join(WORKSPACE, 'MEMORY.md');
  const todoFile = path.join(WORKSPACE, 'TODO.md');
  const files = [];
  try { fs.readdirSync(memDir).forEach(f => { try { const s = fs.statSync(path.join(memDir, f)); files.push({name:f,size:s.size,modified:s.mtimeMs}); } catch(e){} }); } catch(e){}
  let main = ''; try { main = fs.readFileSync(mainFile, 'utf8'); } catch(e){}
  let todo = ''; try { todo = fs.readFileSync(todoFile, 'utf8'); } catch(e){}
  return { main, todo, files };
}

function getChat() {
  // Read the main session transcript
  const agentsDir = process.env.HOME + '/.openclaw/agents/main/sessions';
  const sessionsFile = path.join(agentsDir, 'sessions.json');
  console.log('[chat] agentsDir:', agentsDir, 'exists:', fs.existsSync(agentsDir));
  const sessData = readJSON(sessionsFile);
  if (!sessData) { console.log('[chat] sessions.json not readable'); return { messages: [] }; }
  
  // Find main session transcript path
  const sessions = sessData.sessions || sessData;
  let transcriptPath = null;
  for (const [key, s] of Object.entries(sessions)) {
    if (key === 'agent:main:main') {
      if (s.transcriptPath) {
        transcriptPath = s.transcriptPath;
      } else if (s.sessionId) {
        // Construct from sessionId — standard OpenClaw layout
        transcriptPath = path.join(agentsDir, s.sessionId + '.jsonl');
      }
      break;
    }
  }
  
  if (!transcriptPath) {
    // Fallback: find newest .jsonl in sessions dir or workspace
    const searchDirs = [
      path.join(agentsDir),
      WORKSPACE
    ];
    for (const dir of searchDirs) {
      try {
        const jFiles = fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => ({
          name: f, path: path.join(dir, f), mtime: fs.statSync(path.join(dir, f)).mtimeMs
        })).sort((a, b) => b.mtime - a.mtime);
        if (jFiles.length > 0) { transcriptPath = jFiles[0].path; break; }
      } catch(e){}
    }
  }
  
  console.log('[chat] transcriptPath:', transcriptPath, 'exists:', transcriptPath ? fs.existsSync(transcriptPath) : 'null');
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return { messages: [] };
  
  try {
    const raw = fs.readFileSync(transcriptPath, 'utf8');
    const lines = raw.trim().split('\n').slice(-500); // Last 500 lines (each turn has many tool call lines)
    const messages = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        // OpenClaw format: { type, message: { role, content } }
        const msg = obj.message || obj;
        const role = msg.role;
        if (role && (role === 'user' || role === 'assistant')) {
          let content = '';
          if (typeof msg.content === 'string') {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            content = msg.content.filter(c => c.type === 'text').map(c => c.text).join('\n');
          }
          if (content && content.trim().length > 0) {
            // Clean up Telegram metadata from user messages
            if (role === 'user') {
              content = content.replace(/^\[Telegram [^\]]*\]\s*/g, '');
              content = content.replace(/\n?\[message_id:\s*\d+\]\s*$/g, '');
              content = content.replace(/\[Replying to [^\]]*\]\s*/g, '').replace(/\s*\[\/Replying\]/g, '');
              content = content.replace(/^\[Queued messages while agent was busy\]\s*---\s*/g, '');
              content = content.replace(/^Queued #\d+\s*/gm, '');
            }
            content = content.trim();
            if (content) {
              messages.push({ role, content: content.substring(0, 1000), timestamp: obj.timestamp || 0 });
            }
          }
        }
      } catch(e){}
    }
    return { messages: messages.slice(-50) };
  } catch(e) {
    return { messages: [] };
  }
}

function getInstalledSkills() {
  const skillsDir = process.env.OPENCLAW_SKILLS || '/mnt/HC_Volume_104509196/home_apocyz_runner/.npm-global/lib/node_modules/openclaw/skills';
  try {
    const dirs = fs.readdirSync(skillsDir).filter(d => {
      try { return fs.statSync(path.join(skillsDir, d)).isDirectory(); } catch { return false; }
    });
    return dirs.map(id => {
      let name = id, description = '';
      try {
        const md = fs.readFileSync(path.join(skillsDir, id, 'SKILL.md'), 'utf8');
        const nm = md.match(/name:\s*(.+)/); if (nm) name = nm[1].trim();
        const desc = md.match(/description:\s*(.+)/); if (desc) description = desc[1].trim();
      } catch {}
      return { id, name, description };
    });
  } catch { return []; }
}

function getConfig() {
  const c = readJSON(process.env.HOME + '/.openclaw/openclaw.json');
  if (!c) return {};
  const safe = {...c};
  if (safe.gateway?.auth) delete safe.gateway.auth.token;
  if (safe.channels?.telegram) delete safe.channels.telegram.botToken;
  return safe;
}

// getCrons — async: fetch from local fleet relay (faster & reliable vs CLI execSync)
async function getCrons() {
  try {
    const http = require('http');
    const data = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:18790/api/oc/crons', {
        headers: { 'Authorization': 'Bearer sk-oc-proxy-spawnkit-2026' },
        timeout: 5000
      }, (resp) => {
        let body = '';
        resp.on('data', c => body += c);
        resp.on('end', () => {
          try { resolve(JSON.parse(body)); } catch(e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    });
    const jobs = Array.isArray(data) ? data : (data.jobs || []);
    return { jobs };
  } catch(e) {
    console.warn('[getCrons] relay fetch failed, trying CLI:', e.message);
    // Fallback to CLI
    try {
      const ocPath = [process.env.HOME + '/.npm-global/bin/openclaw', '/usr/local/bin/openclaw']
        .find(p => fs.existsSync(p));
      if (ocPath) {
        const out = execSync(ocPath + ' cron list --json 2>/dev/null', {timeout:8000, encoding:'utf8', env: {...process.env, PATH: process.env.HOME + '/.npm-global/bin:' + (process.env.PATH || '')}});
        const parsed = JSON.parse(out);
        return { jobs: Array.isArray(parsed) ? parsed : (parsed.jobs || []) };
      }
    } catch(e2) { console.warn('[getCrons] CLI fallback also failed:', e2.message); }
    return { jobs: [] };
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Helper: read POST body as JSON
function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch(e) { resolve(null); } });
  });
}

// Helper: proxy fetch to a remote gateway
async function proxyFetch(url, token) {
  const https = url.startsWith('https') ? require('https') : require('http');
  return new Promise((resolve) => {
    const req = https.get(url, { headers: token ? { 'Authorization': 'Bearer ' + token } : {}, timeout: 8000 }, (resp) => {
      let data = '';
      resp.on('data', c => data += c);
      resp.on('end', () => {
        try { resolve({ ok: resp.statusCode === 200, status: resp.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ ok: false, status: resp.statusCode, data: null }); }
      });
    });
    req.on('error', (e) => resolve({ ok: false, status: 0, error: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, status: 0, error: 'timeout' }); });
  });
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // ─── API Auth middleware ─────────────────────────────────
  if (req.url.startsWith('/api/')) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (token !== API_TOKEN) {
      res.writeHead(401, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  // ─── Auth validation endpoint ────────────────────────────
  if (req.url === '/api/auth/validate' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body || !body.url) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ ok: false, error: 'Missing gateway URL' }));
      return;
    }
    // Try to reach the gateway's health endpoint
    const gatewayUrl = body.url.replace(/\/+$/, '');
    const token = body.token || '';
    const result = await proxyFetch(gatewayUrl + '/api/oc/health', token);
    res.setHeader('Content-Type', 'application/json');
    if (result.ok) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, gateway: gatewayUrl, health: result.data }));
    } else {
      res.writeHead(502);
      res.end(JSON.stringify({ ok: false, error: result.error || 'Gateway unreachable', status: result.status }));
    }
    return;
  }

  // ─── Tasks endpoint ──────────────────────────────────────
  if (req.url === '/api/tasks' && req.method === 'GET') {
    try {
      // Fetch sessions from fleet relay
      const sessResp = await new Promise((resolve) => {
        const hreq = require('http').request('http://127.0.0.1:18790/api/oc/sessions', {
          headers: { 'Authorization': 'Bearer sk-oc-proxy-spawnkit-2026' },
          timeout: 5000
        }, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve([]); } });
        });
        hreq.on('error', () => resolve([]));
        hreq.on('timeout', () => { hreq.destroy(); resolve([]); });
        hreq.end();
      });

      // Fetch memory for milestones
      const memResp = await new Promise((resolve) => {
        const hreq = require('http').request('http://127.0.0.1:18790/api/oc/memory', {
          headers: { 'Authorization': 'Bearer sk-oc-proxy-spawnkit-2026' },
          timeout: 5000
        }, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({}); } });
        });
        hreq.on('error', () => resolve({}));
        hreq.on('timeout', () => { hreq.destroy(); resolve({}); });
        hreq.end();
      });

      // Load persistent tasks from tasks.json
      const TASKS_FILE = path.join(__dirname, 'tasks.json');
      const persistedTasks = readJSON(TASKS_FILE);
      const tasks = (persistedTasks && persistedTasks.tasks) || [];

      // Merge live sub-agent sessions
      const sessions = Array.isArray(sessResp) ? sessResp : [];
      sessions.forEach(s => {
        if (s.kind === 'subagent') {
          const isActive = s.status === 'active';
          const id = s.key || s.sessionKey;
          const already = tasks.some(t => t.id === id);
          if (!already) {
            tasks.push({
              id,
              text: s.label || s.displayName || s.key?.split(':').pop() || 'Sub-agent',
              status: isActive ? 'active' : 'done',
              icon: isActive ? '🔥' : '✅',
              agent: s.key?.split(':')[1] || 'main',
              startedAt: s.created || null,
              completedAt: isActive ? null : s.lastActive || null,
              subtasks: []
            });
          }
        }
      });

      // Parse milestones from MEMORY.md
      const milestones = [];
      const memContent = memResp.main || '';
      const memLines = memContent.split('\n');
      let currentSection = '';
      for (const line of memLines) {
        if (/^##\s/.test(line)) currentSection = line.replace(/^##\s*/, '').trim();
        if (/^- \*\*/.test(line)) {
          const text = line.replace(/^- /, '').replace(/\*\*/g, '').trim();
          milestones.push({ section: currentSection, text });
        }
      }

      // Sort: active first, then by completedAt/startedAt descending
      tasks.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (b.status === 'active' && a.status !== 'active') return 1;
        const aTime = a.completedAt || a.startedAt || '';
        const bTime = b.completedAt || b.startedAt || '';
        return bTime > aTime ? 1 : bTime < aTime ? -1 : 0;
      });

      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, tasks, milestones, sessionCount: sessions.length }));
    } catch(e) {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ─── Brainstorm endpoint ──────────────────────────────────
  if (req.url === '/api/brainstorm' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body || !body.question) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'Missing question' }));
      return;
    }
    const complexity = body.complexity || 'quick';
    const context = body.context || '';
    const complexityGuide = {
      quick: 'Give a direct, well-reasoned answer with key considerations.',
      deep: 'Decompose the question, analyze multiple perspectives, identify uncertainties.',
      thorough: 'Full multi-perspective analysis with explicit uncertainty mapping and evidence weighing.'
    };
    const message = `🧠 BRAINSTORM MISSION

Question: ${body.question}${context ? '\nContext: ' + context : ''}
Complexity: ${complexity}

Your team is ready:
- 📡 Echo (Research) — gathers data and sources
- 🔬 Forge (Verification) — stress-tests claims
- 😈 Sentinel (Challenge) — plays devil's advocate

${complexityGuide[complexity] || complexityGuide.quick}

Adapt your output format to the question type:
- Strategy → Pros / Cons / Recommendation
- Technical → Analysis / Verification / Implementation
- Research → Findings / Sources / Gaps
- Decision → Options / Tradeoffs / Recommendation

Use headers, bullets, and bold for key points.
End with: **Confidence:** 🟢 High / 🟡 Medium / 🔴 Low — [brief justification]`;

    try {
      const postData = JSON.stringify({ message, sessionKey: 'agent:main:main' });
      const result = await new Promise((resolve) => {
        const hreq = require('http').request('http://127.0.0.1:18790/api/oc/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData), 'Authorization': 'Bearer sk-oc-proxy-spawnkit-2026' },
          timeout: 90000
        }, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve({ reply: data }); } });
        });
        hreq.on('error', e => resolve({ error: e.message }));
        hreq.on('timeout', () => { hreq.destroy(); resolve({ error: 'timeout' }); });
        hreq.write(postData);
        hreq.end();
      });
      res.setHeader('Content-Type', 'application/json');
      if (result.reply || result.ok) {
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true, answer: result.reply || 'Processing...', brainstormId: 'bm_' + Date.now(), complexity }));
      } else {
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: result.error || 'No response' }));
      }
    } catch(e) {
      res.writeHead(500, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // ─── Remote proxy endpoint ───────────────────────────────
  // GET /api/remote/offices — fetch real data from fleet relay
  if (req.url === '/api/remote/offices' && req.method === 'GET') {
    try {
      const result = await new Promise((resolve) => {
        const hreq = require('http').get('http://127.0.0.1:18790/api/fleet/stats', { timeout: 5000 }, (resp) => {
          let data = '';
          resp.on('data', c => data += c);
          resp.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { resolve(null); } });
        });
        hreq.on('error', () => resolve(null));
        hreq.on('timeout', () => { hreq.destroy(); resolve(null); });
      });
      if (result && result.offices) {
        const offices = Object.entries(result.offices).map(([id, o]) => ({
          id,
          name: o.name || id,
          emoji: o.emoji || '🏢',
          status: o.status || 'offline',
          lastSeen: o.lastSeen,
          registeredAt: o.registeredAt,
          wsConnections: (result.wsDetails || {})[id] || 0
        }));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, offices, relay: { version: result.version, uptime: result.uptime, messages: result.messageCount, wsTotal: result.wsConnectionCount } }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, offices: [], error: 'Fleet relay unavailable' }));
      }
    } catch(e) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, offices: [], error: e.message }));
    }
    return;
  }

  if (req.url.startsWith('/api/remote/') && req.method === 'POST') {
    const body = await readBody(req);
    if (!body || !body.url || !body.endpoint) {
      res.writeHead(400, {'Content-Type':'application/json'});
      res.end(JSON.stringify({ error: 'Missing url or endpoint' }));
      return;
    }
    const gatewayUrl = body.url.replace(/\/+$/, '');
    const token = body.token || '';
    const result = await proxyFetch(gatewayUrl + body.endpoint, token);
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(result.ok ? 200 : 502);
    res.end(JSON.stringify(result.ok ? result.data : { error: result.error || 'Remote fetch failed' }));
    return;
  }

  // ─── Local API routes ────────────────────────────────────
  if (req.url.startsWith('/api/oc/')) {
    res.setHeader('Content-Type', 'application/json');
    const route = req.url.replace(/\?.*/, '');

    // POST /api/oc/chat — proxy to fleet relay which talks to OpenClaw
    if (route === '/api/oc/chat' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body || !body.message) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Missing message' }));
        return;
      }
      try {
        const postData = JSON.stringify({ message: body.message, sessionKey: body.target || 'agent:main:main' });
        const result = await new Promise((resolve) => {
          const hreq = require('http').request('http://127.0.0.1:18790/api/oc/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData),
              'Authorization': 'Bearer sk-oc-proxy-spawnkit-2026'
            },
            timeout: 60000
          }, (resp) => {
            let data = '';
            resp.on('data', c => data += c);
            resp.on('end', () => {
              try { resolve({ ok: resp.statusCode === 200, status: resp.statusCode, data: JSON.parse(data) }); }
              catch(e) { resolve({ ok: resp.statusCode === 200, status: resp.statusCode, data: { reply: data } }); }
            });
          });
          hreq.on('error', e => resolve({ ok: false, error: e.message }));
          hreq.on('timeout', () => { hreq.destroy(); resolve({ ok: false, error: 'timeout' }); });
          hreq.write(postData);
          hreq.end();
        });
        if (result.ok && result.data) {
          res.writeHead(200);
          res.end(JSON.stringify(result.data));
        } else {
          res.writeHead(200);
          res.end(JSON.stringify({ reply: '📨 Message queued (' + (result.error || 'relay unavailable') + ')', ok: true }));
        }
      } catch(e) {
        res.writeHead(200);
        res.end(JSON.stringify({ reply: '📨 Message recorded locally', ok: true }));
      }
      return;
    }

    let data;
    switch(route) {
      case '/api/oc/sessions': data = getSessions(); break;
      case '/api/oc/memory': data = getMemory(); break;
      case '/api/oc/config': data = getConfig(); break;
      case '/api/oc/crons': data = await getCrons(); break;
      case '/api/oc/chat': data = getChat(); break;
      case '/api/oc/chat/history': data = getChat(); break;
      case '/api/oc/agents': data = { agents: [] }; break;
      case '/api/oc/skills': data = getInstalledSkills(); break;
      case '/api/oc/health': data = { ok: true, uptime: process.uptime() }; break;
      default: res.writeHead(404); res.end(JSON.stringify({error:'not found'})); return;
    }
    res.writeHead(200);
    res.end(JSON.stringify(data));
    return;
  }

  // ─── Tasks endpoint ──────────────────────────────────────
  if (req.url === '/api/tasks' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json');
    try {
      // Read tasks from persistent file
      const tasksFile = path.join(__dirname, 'tasks.json');
      const tasksData = readJSON(tasksFile) || { tasks: [] };
      const tasks = tasksData.tasks || [];

      // Also merge in active sub-agents from sessions
      const sessData = readJSON(SESSIONS_FILE);
      const sessObj = sessData ? (sessData.sessions || sessData) : {};
      const allSessions = typeof sessObj === 'object' && !Array.isArray(sessObj) ? Object.entries(sessObj) : [];
      
      allSessions.forEach(([key, s]) => {
        if (key.includes(':subagent:') && s.status === 'active') {
          const already = tasks.some(t => t.id === key);
          if (!already) {
            tasks.push({
              id: key,
              text: s.label || s.displayName || key.split(':').pop(),
              status: 'active',
              icon: '🤖',
              agent: key.split(':')[1] || 'main',
              startedAt: s.createdAt || s.updatedAt,
              subtasks: []
            });
          }
        }
      });

      // Parse MEMORY.md for project milestones
      const memoryPath = path.join(process.env.HOME, 'clawd/MEMORY.md');
      const memory = fs.existsSync(memoryPath) ? fs.readFileSync(memoryPath, 'utf8') : '';
      const milestones = [];
      let currentSection = '';
      memory.split('\n').forEach(line => {
        if (/^## /.test(line)) currentSection = line.replace(/^## /, '');
        if (/^\- \*\*/.test(line)) {
          const text = line.replace(/^\- \*\*/, '').replace(/\*\*.*/, '').trim();
          milestones.push({ section: currentSection, text });
        }
      });

      res.writeHead(200);
      res.end(JSON.stringify({ 
        ok: true, 
        tasks, 
        milestones: milestones.slice(-15)
      }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // Static files
  let filePath = req.url.split('?')[0];
  if (filePath === '/' || filePath === '') filePath = '/index.html';
  // Directory URLs: append index.html (e.g. /office-medieval/ → /office-medieval/index.html)
  if (filePath.endsWith('/')) filePath += 'index.html';
  
  const fullPath = path.join(STATIC_DIR, filePath);
  // Security: prevent directory traversal
  if (!fullPath.startsWith(STATIC_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(fullPath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try as directory: /office-medieval → /office-medieval/index.html
        const dirIndex = path.join(STATIC_DIR, filePath, 'index.html');
        if (dirIndex.startsWith(STATIC_DIR) && fs.existsSync(dirIndex)) {
          fs.readFile(dirIndex, (e3, html) => {
            if (e3) { res.writeHead(500); res.end('Error'); return; }
            res.writeHead(200, {'Content-Type': 'text/html', 'Cache-Control': 'no-cache'}); res.end(html);
          });
          return;
        }
        // SPA fallback to root index.html
        fs.readFile(path.join(STATIC_DIR, 'index.html'), (e2, html) => {
          if (e2) { res.writeHead(500); res.end('Error'); return; }
          res.writeHead(200, {'Content-Type': 'text/html'}); res.end(html);
        });
      } else { res.writeHead(500); res.end('Error'); }
      return;
    }
    const ext = path.extname(fullPath);
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
    res.end(content);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🏢 Executive Office serving on http://0.0.0.0:${PORT}`);
  console.log(`   Static: ${STATIC_DIR}`);
  console.log(`   API: /api/oc/*`);
  console.log(`   Workspace: ${WORKSPACE}`);
});
