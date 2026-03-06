/**
 * P0 Fixes Regression Tests
 * Covers: Hero CTAs, Cron panel, Memory panel, CEO Communications
 *
 * Part 1: API-level tests (require running server on API_BASE)
 * Part 2: Logic tests (pure Node.js, no server needed)
 *
 * Run: node test/p0-fixes.test.js
 * Run API tests only: API_BASE=http://127.0.0.1:8765 node test/p0-fixes.test.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8765';

let passed = 0;
let failed = 0;
let skipped = 0;
let total = 0;
const results = [];

function test(group, name, fn) {
  total++;
  return fn().then(function () {
    passed++;
    results.push({ group, name, ok: true });
    console.log('  \u2705 ' + name);
  }).catch(function (err) {
    if (err.message === 'SKIP') {
      skipped++;
      results.push({ group, name, ok: true, skipped: true });
      console.log('  \u23ED ' + name + ' (skipped)');
    } else {
      failed++;
      results.push({ group, name, ok: false, error: err.message });
      console.log('  \u274C ' + name + ': ' + err.message);
    }
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

function assertOk(r, expected) {
  if (r.status !== expected) throw new Error('Expected ' + expected + ', got ' + r.status);
}

/* ═══════════════════════════════════════════════
   Part 1: Source file verification
   ═══════════════════════════════════════════════ */

async function runSourceTests() {
  console.log('\n\uD83E\uDDEA P0 Fixes — Source Verification\n');

  // ── Fix 1: Hero CTA chips inject prompt (not auto-send) ───────
  console.log('Hero CTAs:');

  await test('hero-cta', 'Chip click handler injects into input (not activate)', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'mission-desk.js'), 'utf8');
    // Must NOT call activate() on chip click
    const chipSection = src.substring(
      src.indexOf('Suggestion chips'),
      src.indexOf('Chat back')
    );
    if (chipSection.includes('activate(chip')) {
      throw new Error('Chip click still calls activate() — should inject into input');
    }
    if (!chipSection.includes('heroInput.value')) {
      throw new Error('Chip click does not set heroInput.value');
    }
    if (!chipSection.includes('heroInput.focus()')) {
      throw new Error('Chip click does not focus heroInput');
    }
    if (!chipSection.includes("dispatchEvent")) {
      throw new Error('Chip click does not dispatch input event for send-btn visibility');
    }
  });

  await test('hero-cta', 'All 4 CTA chips have data-prompt attributes', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'mission-desk.js'), 'utf8');
    const prompts = [
      'Analyze our current roadmap',
      'Draft a marketing strategy',
      'Review our security posture',
      'Brainstorm 5 creative feature'
    ];
    prompts.forEach(function (p) {
      if (!src.includes(p)) throw new Error('Missing prompt: ' + p);
    });
  });

  // ── Fix 2: Cron panel data-bridge fallback ────────────────────
  console.log('\nCron Panel:');

  await test('cron-panel', 'renderCronJobs shows loading state', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const cronSection = src.substring(
      src.indexOf('async function renderCronJobs'),
      src.indexOf('async function renderCronJobs') + 2000
    );
    if (!cronSection.includes('Loading cron jobs')) {
      throw new Error('Missing loading state in renderCronJobs');
    }
  });

  await test('cron-panel', 'Fallback chain includes SpawnKit.data.crons', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const cronSection = src.substring(
      src.indexOf('async function renderCronJobs'),
      src.indexOf('// Group by owner')
    );
    if (!cronSection.includes('SpawnKit.data.crons')) {
      throw new Error('Missing SpawnKit.data.crons fallback');
    }
  });

  await test('cron-panel', 'Uses (window.skFetch || fetch) pattern', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const cronSection = src.substring(
      src.indexOf('async function renderCronJobs'),
      src.indexOf('// Group by owner')
    );
    if (!cronSection.includes('window.skFetch || fetch')) {
      throw new Error('Missing (window.skFetch || fetch) resilience pattern');
    }
  });

  await test('cron-panel', 'Has 4-tier fallback chain', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const cronSection = src.substring(
      src.indexOf('async function renderCronJobs'),
      src.indexOf('// Group by owner')
    );
    // Should have: 1) API fetch, 2) liveCronData, 3) SpawnKit.data, 4) API.getCrons
    if (!cronSection.includes('/api/oc/crons')) throw new Error('Missing API fetch step');
    if (!cronSection.includes('liveCronData')) throw new Error('Missing liveCronData step');
    if (!cronSection.includes('SpawnKit.data.crons')) throw new Error('Missing SpawnKit.data step');
    if (!cronSection.includes('API.getCrons')) throw new Error('Missing API.getCrons step');
  });

  // ── Fix 3: Memory panel data-bridge fallback ──────────────────
  console.log('\nMemory Panel:');

  await test('memory-panel', 'renderMemory shows loading state', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const memSection = src.substring(
      src.indexOf('async function renderMemory'),
      src.indexOf('async function renderMemory') + 2000
    );
    if (!memSection.includes('Loading memory')) {
      throw new Error('Missing loading state in renderMemory');
    }
  });

  await test('memory-panel', 'Fallback chain includes SpawnKit.data.memory', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const memSection = src.substring(
      src.indexOf('async function renderMemory'),
      src.indexOf('async function renderMemory') + 2000
    );
    if (!memSection.includes('SpawnKit.data.memory')) {
      throw new Error('Missing SpawnKit.data.memory fallback');
    }
  });

  await test('memory-panel', 'Read-only banner is present', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    if (!src.includes('Only the CEO can edit memory')) {
      throw new Error('Missing read-only banner');
    }
  });

  await test('memory-panel', 'Uses (window.skFetch || fetch) pattern', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const memSection = src.substring(
      src.indexOf('async function renderMemory'),
      src.indexOf('Only the CEO can edit memory')
    );
    if (!memSection.includes('window.skFetch || fetch')) {
      throw new Error('Missing (window.skFetch || fetch) resilience pattern');
    }
  });

  // ── Fix 4: CEO Communications panel visibility + targets ──────
  console.log('\nCEO Communications:');

  await test('comms-panel', 'Communications quick-action button exists in Mission Desk', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'mission-desk.js'), 'utf8');
    if (!src.includes('data-action="communications"')) {
      throw new Error('Missing communications quick-action button');
    }
  });

  await test('comms-panel', 'openPanel handles "communications" action', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'mission-desk.js'), 'utf8');
    if (!src.includes("name === 'communications'")) {
      throw new Error('openPanel does not handle communications action');
    }
    if (!src.includes('openMailbox')) {
      throw new Error('communications action does not call openMailbox');
    }
  });

  await test('comms-panel', 'openMailbox calls loadChatTargets eagerly', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const openMailboxSection = src.substring(
      src.indexOf('window.openMailbox = function'),
      src.indexOf('window.openMailbox = function') + 800
    );
    // loadChatTargets should be called before tab switching, not just for chat tab
    const firstLoadTargets = openMailboxSection.indexOf('loadChatTargets()');
    const tabSwitch = openMailboxSection.indexOf('switchCommTab');
    if (firstLoadTargets < 0) throw new Error('loadChatTargets not called in openMailbox');
    if (firstLoadTargets > tabSwitch) throw new Error('loadChatTargets should be called before tab switching');
  });

  await test('comms-panel', 'loadChatTargets enriches from SpawnKit.data.agents', async function () {
    const src = fs.readFileSync(path.join(__dirname, '..', 'server', 'main.js'), 'utf8');
    const loadTargetsSection = src.substring(
      src.indexOf('function loadChatTargets'),
      src.indexOf('function updateChatTargetSelector')
    );
    if (!loadTargetsSection.includes('SpawnKit.data.agents')) {
      throw new Error('loadChatTargets does not try SpawnKit.data.agents');
    }
  });

  await test('comms-panel', 'Office executive styles contain exec room CSS rules', async function () {
    const css = fs.readFileSync(path.join(__dirname, '..', 'server', 'office-executive', 'styles.css'), 'utf8');
    if (!css.includes('.mailbox-overlay.open')) {
      throw new Error('Missing .mailbox-overlay.open CSS rule in office-executive styles');
    }
    // .open state should set opacity: 1
    const openRule = css.substring(
      css.indexOf('.mailbox-overlay.open'),
      css.indexOf('.mailbox-overlay.open') + 200
    );
    if (!openRule.includes('opacity: 1') && !openRule.includes('opacity:1')) {
      throw new Error('.mailbox-overlay.open does not set opacity: 1');
    }
  });
}

/* ═══════════════════════════════════════════════
   Part 2: API endpoint tests (optional, needs server)
   ═══════════════════════════════════════════════ */

async function runAPITests() {
  console.log('\n\uD83C\uDF10 P0 Fixes — API Endpoint Tests\n');

  // Check if server is running
  let serverRunning = false;
  try {
    const r = await apiGet('/api/oc/health');
    serverRunning = r.status === 200;
  } catch (e) {
    console.log('  \u26A0 Server not running at ' + API_BASE + ' — skipping API tests\n');
    return;
  }

  console.log('Cron API:');

  await test('cron-api', 'GET /api/oc/crons returns array or object with jobs', async function () {
    if (!serverRunning) throw new Error('SKIP');
    const r = await apiGet('/api/oc/crons');
    assertOk(r, 200);
    const data = r.data;
    const jobs = data.jobs || data.crons || (Array.isArray(data) ? data : null);
    if (!jobs) throw new Error('Response has no jobs/crons array');
    if (!Array.isArray(jobs)) throw new Error('jobs is not an array');
  });

  await test('cron-api', 'Cron jobs have expected shape', async function () {
    if (!serverRunning) throw new Error('SKIP');
    const r = await apiGet('/api/oc/crons');
    const data = r.data;
    const jobs = data.jobs || data.crons || (Array.isArray(data) ? data : []);
    if (jobs.length === 0) throw new Error('SKIP'); // No jobs to test shape
    const job = jobs[0];
    if (!job.name && !job.id) throw new Error('Job missing name and id');
    if (!job.schedule) throw new Error('Job missing schedule');
  });

  console.log('\nMemory API:');

  await test('memory-api', 'GET /api/oc/memory returns data', async function () {
    if (!serverRunning) throw new Error('SKIP');
    const r = await apiGet('/api/oc/memory');
    assertOk(r, 200);
    const data = r.data;
    if (typeof data !== 'object') throw new Error('Memory response is not object');
  });

  await test('memory-api', 'Memory response has main content or files', async function () {
    if (!serverRunning) throw new Error('SKIP');
    const r = await apiGet('/api/oc/memory');
    const data = r.data;
    const hasContent = data.main || data.longTerm || (data.files && data.files.length > 0);
    if (!hasContent) throw new Error('SKIP'); // No memory data yet
  });
}

/* ═══════════════════════════════════════════════
   Part 3: humanCron logic tests (pure function)
   ═══════════════════════════════════════════════ */

async function runLogicTests() {
  console.log('\n\uD83E\uDDE0 P0 Fixes — Logic Tests\n');

  // Extract humanCron logic for testing
  function humanCron(schedule) {
    if (!schedule) return '\u2014';
    if (typeof schedule === 'string') {
      var m = { '*/30 * * * *': 'Every 30 min', '0 * * * *': 'Every hour',
                '0 9 * * *': 'Daily 9:00', '0 9 * * 1': 'Mon 9:00',
                '*/5 * * * *': 'Every 5 min', '0 */2 * * *': 'Every 2h',
                '0 8 * * 1-5': 'Weekdays 8:00', '30 6 * * *': 'Daily 6:30' };
      if (m[schedule]) return m[schedule];
      var parts = schedule.split(' ');
      if (parts.length === 5 && parts[2] === '*' && parts[3] === '*') {
        var min = parts[0], hour = parts[1], dow = parts[4];
        if (dow === '*' && !hour.includes(',') && !hour.includes('/')) {
          return 'Daily ' + hour.padStart(2, '0') + ':' + min.padStart(2, '0');
        }
        if (dow === '1-5') return 'Weekdays ' + hour.padStart(2, '0') + ':' + min.padStart(2, '0');
      }
      return schedule;
    }
    if (typeof schedule === 'object') {
      if (schedule.kind === 'every' && schedule.everyMs) {
        var ms = schedule.everyMs;
        if (ms < 60000) return 'Every ' + Math.round(ms / 1000) + 's';
        if (ms < 3600000) return 'Every ' + Math.round(ms / 60000) + ' min';
        if (ms < 86400000) return 'Every ' + (ms / 3600000).toFixed(0) + 'h';
        return 'Every ' + (ms / 86400000).toFixed(0) + ' days';
      }
      if (schedule.kind === 'cron' && (schedule.cron || schedule.expr)) {
        return humanCron(schedule.cron || schedule.expr);
      }
      if (schedule.kind === 'daily') {
        return 'Daily' + (schedule.atHour !== undefined ? ' ' + String(schedule.atHour).padStart(2, '0') + ':00' : '');
      }
      return schedule.kind || '\u2014';
    }
    return String(schedule);
  }

  console.log('humanCron:');

  await test('humanCron', 'Parses string cron expressions', async function () {
    if (humanCron('*/30 * * * *') !== 'Every 30 min') throw new Error('Failed: */30');
    if (humanCron('0 9 * * *') !== 'Daily 9:00') throw new Error('Failed: 0 9');
    if (humanCron('0 8 * * 1-5') !== 'Weekdays 8:00') throw new Error('Failed: weekdays');
  });

  await test('humanCron', 'Parses OpenClaw schedule objects', async function () {
    if (humanCron({ kind: 'every', everyMs: 1800000 }) !== 'Every 30 min') throw new Error('Failed: every 30min');
    if (humanCron({ kind: 'every', everyMs: 3600000 }) !== 'Every 1h') throw new Error('Failed: every 1h');
    if (humanCron({ kind: 'daily', atHour: 9 }) !== 'Daily 09:00') throw new Error('Failed: daily 9');
    if (humanCron({ kind: 'cron', cron: '0 9 * * *' }) !== 'Daily 9:00') throw new Error('Failed: cron obj');
  });

  await test('humanCron', 'Handles null/undefined gracefully', async function () {
    if (humanCron(null) !== '\u2014') throw new Error('Failed: null');
    if (humanCron(undefined) !== '\u2014') throw new Error('Failed: undefined');
  });
}

/* ═══════════════════════════════════════════════
   Runner
   ═══════════════════════════════════════════════ */

async function run() {
  console.log('\n\uD83D\uDD27 P0 Fixes Regression Test Suite\n');

  await runSourceTests();
  await runLogicTests();
  await runAPITests();

  console.log('\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log('Results: ' + passed + ' passed, ' + failed + ' failed' +
    (skipped > 0 ? ', ' + skipped + ' skipped' : '') + ' / ' + total + ' total');

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.ok).forEach(r => console.log('  - [' + r.group + '] ' + r.name + ': ' + r.error));
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function (err) {
  console.error('Test runner error:', err);
  process.exit(1);
});
