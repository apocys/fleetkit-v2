/**
 * Phase 3: Full Happy-Path Test Suite
 * Covers: auth, chat, relay, agents, sessions, crons, memory, skills, health, static
 * Run: node test/phase3-full-coverage.test.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8765';

let passed = 0;
let failed = 0;
let total = 0;
const results = [];

function test(group, name, fn) {
  total++;
  return fn().then(function () {
    passed++;
    results.push({ group, name, ok: true });
    console.log('  ✅ ' + name);
  }).catch(function (err) {
    failed++;
    results.push({ group, name, ok: false, error: err.message });
    console.log('  ❌ ' + name + ': ' + err.message);
  });
}

function apiGet(urlPath) {
  return new Promise(function (resolve, reject) {
    http.get(API_BASE + urlPath, { timeout: 5000 }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers }); }
        catch (e) { resolve({ status: res.statusCode, data: data, headers: res.headers }); }
      });
    }).on('error', reject).on('timeout', function () { reject(new Error('timeout')); });
  });
}

function apiPost(urlPath, body) {
  return new Promise(function (resolve, reject) {
    const postData = JSON.stringify(body);
    const url = new URL(API_BASE);
    const opts = {
      method: 'POST', hostname: url.hostname, port: url.port, path: urlPath, timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = http.request(opts, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    });
    req.on('error', reject);
    req.on('timeout', function () { req.destroy(); reject(new Error('timeout')); });
    req.write(postData);
    req.end();
  });
}

function assertOk(r, expected) {
  if (r.status !== expected) throw new Error('Expected ' + expected + ', got ' + r.status);
}

function assertType(val, type, label) {
  if (typeof val !== type) throw new Error(label + ' expected ' + type + ', got ' + typeof val);
}

async function run() {
  console.log('\n🧪 Phase 3: Full Happy-Path Test Suite\n');

  // ═══ AUTH ═══════════════════════════════════════════════
  console.log('Auth:');

  await test('auth', 'POST /api/auth/validate rejects missing URL', async function () {
    const r = await apiPost('/api/auth/validate', {});
    assertOk(r, 400);
  });

  await test('auth', 'POST /api/auth/validate accepts valid format', async function () {
    const r = await apiPost('/api/auth/validate', { url: 'http://127.0.0.1:18789' });
    // 200 or 502 — both valid (gateway may not be running)
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502, got ' + r.status);
  });

  // ═══ HEALTH ════════════════════════════════════════════
  console.log('\nHealth:');

  await test('health', 'GET /api/oc/health returns ok=true', async function () {
    const r = await apiGet('/api/oc/health');
    assertOk(r, 200);
    if (!r.data.ok) throw new Error('Health not ok');
    assertType(r.data.uptime, 'number', 'uptime');
  });

  // ═══ AGENTS ════════════════════════════════════════════
  console.log('\nAgents:');

  await test('agents', 'GET /api/oc/agents returns agent list', async function () {
    const r = await apiGet('/api/oc/agents');
    assertOk(r, 200);
    if (!r.data.agents || !Array.isArray(r.data.agents)) throw new Error('Missing agents array');
    if (r.data.agents.length < 1) throw new Error('Expected at least 1 agent');
  });

  await test('agents', 'Each agent has id, name, role', async function () {
    const r = await apiGet('/api/oc/agents');
    for (const a of r.data.agents) {
      if (!a.id) throw new Error('Agent missing id');
      if (!a.name) throw new Error('Agent ' + a.id + ' missing name');
      if (!a.role) throw new Error('Agent ' + a.id + ' missing role');
    }
  });

  // ═══ SESSIONS ══════════════════════════════════════════
  console.log('\nSessions:');

  await test('sessions', 'GET /api/oc/sessions returns array', async function () {
    const r = await apiGet('/api/oc/sessions');
    assertOk(r, 200);
    if (!Array.isArray(r.data)) throw new Error('Expected array');
  });

  await test('sessions', 'Sessions have key and kind fields', async function () {
    const r = await apiGet('/api/oc/sessions');
    if (r.data.length > 0) {
      const s = r.data[0];
      if (!s.key) throw new Error('Session missing key');
      if (!s.kind) throw new Error('Session missing kind');
    }
  });

  // ═══ CHAT ══════════════════════════════════════════════
  console.log('\nChat:');

  await test('chat', 'GET /api/oc/chat returns messages', async function () {
    const r = await apiGet('/api/oc/chat');
    assertOk(r, 200);
    if (!r.data.messages) throw new Error('Missing messages field');
  });

  await test('chat', 'GET /api/oc/chat/transcript returns messages', async function () {
    const r = await apiGet('/api/oc/chat/transcript?last=5');
    assertOk(r, 200);
    if (!r.data.messages) throw new Error('Missing messages field');
    if (!Array.isArray(r.data.messages)) throw new Error('Messages not array');
  });

  await test('chat', 'POST /api/oc/chat rejects empty body', async function () {
    const r = await apiPost('/api/oc/chat', {});
    assertOk(r, 400);
  });

  await test('chat', 'POST /api/oc/chat rejects non-string message', async function () {
    const r = await apiPost('/api/oc/chat', { message: 123 });
    assertOk(r, 400);
  });

  await test('chat', 'POST /api/oc/chat accepts persona prefix format', async function () {
    const r = await apiPost('/api/oc/chat', { message: '[Speaking to Atlas] test' });
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502, got ' + r.status);
  });

  // ═══ FLEET RELAY ═══════════════════════════════════════
  console.log('\nFleet Relay:');

  await test('fleet', 'GET /api/fleet/status returns instances', async function () {
    const r = await apiGet('/api/fleet/status');
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502, got ' + r.status);
    if (r.status === 200 && !Array.isArray(r.data.instances)) throw new Error('Missing instances array');
  });

  await test('fleet', 'GET /api/fleet/mailbox returns messages', async function () {
    const r = await apiGet('/api/fleet/mailbox?limit=5');
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502');
    if (r.status === 200 && !r.data.messages) throw new Error('Missing messages');
  });

  await test('fleet', 'GET /api/fleet/peers returns data', async function () {
    const r = await apiGet('/api/fleet/peers');
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502');
  });

  await test('fleet', 'GET /api/remote/offices returns offices array', async function () {
    const r = await apiGet('/api/remote/offices');
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502');
    if (r.status === 200 && !r.data.offices) throw new Error('Missing offices');
  });

  // ═══ CRONS ═════════════════════════════════════════════
  console.log('\nCrons:');

  await test('crons', 'GET /api/oc/crons returns jobs array', async function () {
    const r = await apiGet('/api/oc/crons');
    assertOk(r, 200);
    if (!r.data.jobs) throw new Error('Missing jobs field');
    if (!Array.isArray(r.data.jobs)) throw new Error('Jobs not array');
  });

  // ═══ MEMORY ════════════════════════════════════════════
  console.log('\nMemory:');

  await test('memory', 'GET /api/oc/memory returns main + files', async function () {
    const r = await apiGet('/api/oc/memory');
    assertOk(r, 200);
    if (typeof r.data.main !== 'string') throw new Error('Missing main field');
    if (!Array.isArray(r.data.files)) throw new Error('Missing files array');
  });

  // ═══ SKILLS ════════════════════════════════════════════
  console.log('\nSkills:');

  await test('skills', 'GET /api/oc/skills returns skills array', async function () {
    const r = await apiGet('/api/oc/skills');
    assertOk(r, 200);
    if (!r.data.skills) throw new Error('Missing skills');
    if (!Array.isArray(r.data.skills)) throw new Error('Skills not array');
  });

  await test('skills', 'Each skill has id + description', async function () {
    const r = await apiGet('/api/oc/skills');
    for (const s of r.data.skills) {
      if (!s.id) throw new Error('Skill missing id');
      if (typeof s.description !== 'string') throw new Error('Skill ' + s.id + ' missing description');
    }
  });

  // ═══ VERSION ═══════════════════════════════════════════
  console.log('\nVersion:');

  await test('version', 'GET /api/oc/version returns version info', async function () {
    const r = await apiGet('/api/oc/version');
    assertOk(r, 200);
    if (!r.data.current) throw new Error('Missing current field');
  });

  // ═══ CHANNELS ══════════════════════════════════════════
  console.log('\nChannels:');

  await test('channels', 'GET /api/oc/channels/status returns channels', async function () {
    const r = await apiGet('/api/oc/channels/status');
    assertOk(r, 200);
    if (!r.data.channels) throw new Error('Missing channels');
  });

  await test('channels', 'POST /api/oc/channels/verify rejects missing channel', async function () {
    const r = await apiPost('/api/oc/channels/verify', {});
    assertOk(r, 400);
  });

  // ═══ WIZARD ════════════════════════════════════════════
  console.log('\nWizard:');

  await test('wizard', 'GET /api/wizard/providers returns provider list', async function () {
    const r = await apiGet('/api/wizard/providers');
    assertOk(r, 200);
    if (!r.data.providers) throw new Error('Missing providers');
    if (r.data.providers.length < 2) throw new Error('Expected multiple providers');
  });

  await test('wizard', 'GET /api/wizard/status returns configured state', async function () {
    const r = await apiGet('/api/wizard/status');
    assertOk(r, 200);
    assertType(r.data.configured, 'boolean', 'configured');
  });

  await test('wizard', 'POST /api/wizard/providers/setup rejects missing fields', async function () {
    const r = await apiPost('/api/wizard/providers/setup', {});
    assertOk(r, 400);
  });

  // ═══ STATIC FILES ══════════════════════════════════════
  console.log('\nStatic Files:');

  await test('static', 'GET / returns executive office HTML', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          if (!data.includes('<html')) return reject(new Error('Not HTML'));
          if (!data.includes('SpawnKit')) return reject(new Error('Missing SpawnKit branding'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('static', 'GET /office-medieval/ returns medieval HTML', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-medieval/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          if (!data.includes('<html')) return reject(new Error('Not HTML'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('static', 'GET /office-executive/styles.css returns CSS', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/styles.css', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          if (!res.headers['content-type'].includes('css')) return reject(new Error('Not CSS content-type'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('static', 'Extracted JS files are served', async function () {
    var jsFiles = ['auth.js', 'app.js', 'main.js', 'mission-desk.js', 'agents.js', 'mc-core.js'];
    for (var f of jsFiles) {
      const r = await new Promise(function (resolve, reject) {
        http.get(API_BASE + '/office-executive/' + f, function (res) {
          resolve({ status: res.statusCode, ct: res.headers['content-type'] });
        }).on('error', reject);
      });
      if (r.status !== 200) throw new Error(f + ' returned ' + r.status);
    }
  });

  // ═══ CORS ══════════════════════════════════════════════
  console.log('\nCORS:');

  await test('cors', 'OPTIONS returns 204 with CORS headers', async function () {
    return new Promise(function (resolve, reject) {
      const url = new URL(API_BASE);
      const opts = { method: 'OPTIONS', hostname: url.hostname, port: url.port, path: '/api/oc/health' };
      const req = http.request(opts, function (res) {
        if (res.statusCode !== 204) return reject(new Error('Expected 204, got ' + res.statusCode));
        if (!res.headers['access-control-allow-origin']) return reject(new Error('Missing CORS header'));
        resolve();
      });
      req.on('error', reject);
      req.end();
    });
  });

  // ═══ RESULTS ═══════════════════════════════════════════
  console.log('\n' + '═'.repeat(50));
  console.log('  Results: ' + passed + '/' + total + ' passed' + (failed ? ', ' + failed + ' FAILED' : ' ✅'));
  console.log('═'.repeat(50));

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(function (r) { return !r.ok; }).forEach(function (r) {
      console.log('  ❌ [' + r.group + '] ' + r.name + ': ' + r.error);
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function (e) {
  console.error('Fatal:', e);
  process.exit(1);
});
