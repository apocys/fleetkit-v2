/**
 * Medieval Fixes Tests — 2026-03-06
 * Covers: Knight naming (no UUIDs), roster sub-agents, chat routing,
 *         weather badge placement, Sycopa→ApoMac rename
 *
 * Part 1: Logic/file tests (no server needed)
 * Part 2: API tests (require running server on API_BASE)
 *
 * Run: node test/medieval-fixes.test.js
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8765';
const SERVER_DIR = path.join(__dirname, '..', 'server');
const MEDIEVAL_DIR = path.join(SERVER_DIR, 'office-medieval');
const EXECUTIVE_DIR = path.join(SERVER_DIR, 'office-executive');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// ═══════════════════════════════════════════════════════════════
//  PART 1: File/Logic Tests (no server needed)
// ═══════════════════════════════════════════════════════════════

console.log('\n🏰 Medieval Fixes — File Tests\n');

// ── Knight Naming: No raw UUIDs ──
console.log('── Knight Naming ──');

test('medieval-integration.js detects UUIDs and replaces with Knight-N', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-integration.js'));
  assert(src.includes('isUUID'), 'Should have UUID detection regex');
  assert(src.includes('/^[0-9a-f]{8}-[0-9a-f]{4}/'), 'Should have UUID regex pattern');
  assert(src.includes("'Knight-'"), 'Should fallback to Knight-N naming');
});

test('medieval-integration.js stores sessionKey on character for reverse lookup', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-integration.js'));
  assert(src.includes('sessionKey: sid'), 'Character model should store sessionKey');
});

// ── Roster: Sub-agents in knight list ──
console.log('\n── Knight Roster ──');

test('index.html roster includes dynamically spawned sub-agents', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'index.html'));
  assert(src.includes("role: 'Sub-Agent'"), 'Should add sub-agents with Sub-Agent role');
  assert(src.includes('characterModels.forEach'), 'Should iterate characterModels for sub-agents');
  assert(src.includes("!app.agents.has(knightId)"), 'Should only add knights not in core agents');
});

// ── Chat Routing: Sub-agent vs Main ──
console.log('\n── Chat Routing ──');

test('medieval-integration.js shows mission panel for sub-agent selection', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-integration.js'));
  assert(src.includes('Mission'), 'Should show mission info for sub-agents');
  assert(src.includes('charData.sessionKey'), 'Should check for sessionKey');
  assert(src.includes('Mission complete'), 'Should show read-only for completed missions');
});

test('server.js accepts sessionKey param for sub-agent chat routing', () => {
  const src = readFile(path.join(SERVER_DIR, 'server.js'));
  assert(src.includes('targetSession'), 'Should extract targetSession from body');
  assert(src.includes("body?.sessionKey"), 'Should read sessionKey from request body');
  assert(src.includes('sessions/' + "' + encodeURIComponent(targetSession)"), 
    'Should route to session-specific endpoint');
});

test('theme-chat.js exposes _appendMsg for external message display', () => {
  const src = readFile(path.join(SERVER_DIR, 'lib', 'theme-chat.js'));
  assert(src.includes('self._appendMsg = appendMessage'), 'Should expose _appendMsg');
});

// ── Weather Badge: In header, not overlapping ──
console.log('\n── Weather Badge ──');

test('weather badge appends to castle-status-bar, not document.body', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-weather.js'));
  assert(src.includes("querySelector('.castle-status-bar')"), 'Should target status bar');
  assert(src.includes('statusBar.appendChild(badge)'), 'Should append to status bar');
  assert(!src.includes("position:fixed;top:44px"), 'Should NOT have old fixed positioning');
});

test('weather badge uses inline-flex style (not fixed position)', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-weather.js'));
  assert(src.includes('display:inline-flex'), 'Should use inline-flex for header flow');
});

// ── Sycopa → ApoMac Rename ──
console.log('\n── Sycopa → ApoMac Rename ──');

test('medieval-integration.js uses ApoMac not Sycopa for assistant label', () => {
  const src = readFile(path.join(MEDIEVAL_DIR, 'medieval-integration.js'));
  assert(src.includes("'🤖 ApoMac'"), 'assistantLabel should be ApoMac');
  // Check no Sycopa in user-visible labels (API mappings OK)
  const lines = src.split('\n');
  const sycopaLabels = lines.filter(l => l.includes('Sycopa') && (l.includes('Label') || l.includes('label') || l.includes('textContent')));
  assert(sycopaLabels.length === 0, 'Should NOT have Sycopa in any label/textContent: ' + sycopaLabels.join('; '));
});

test('executive index.html uses ApoMac not Sycopa in CEO room', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'index.html'));
  assert(src.includes('ApoMac'), 'Should have ApoMac in CEO room');
  assert(!src.includes('aria-label="CEO Office — Sycopa"'), 'Should NOT have Sycopa in aria-label');
});

test('executive mission-desk.js uses ApoMac as default CEO name', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'mission-desk.js'));
  assert(src.includes("'ApoMac'") || src.includes("ceoName"), 'Should use ApoMac or config-based name');
});

// ── Executive Quick Fixes ──
console.log('\n── Executive Quick Fixes ──');

test('user dropdown uses fixed positioning relative to button', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'mission-desk.js'));
  assert(src.includes('btnRect'), 'Should calculate button rect');
  assert(src.includes("position:fixed"), 'Should use position:fixed');
  assert(src.includes('getBoundingClientRect'), 'Should get bounding rect');
});

test('theme picker trigger uses correct overlay ID', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'mission-desk.js'));
  assert(src.includes("'themePickerOverlay'"), 'Should reference themePickerOverlay');
  assert(!src.includes("getElementById('themePicker')") || src.includes("getElementById('themePickerOverlay')"), 
    'Should NOT look for just #themePicker');
});

test('executive index.html has base href for correct relative paths', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'index.html'));
  assert(src.includes('<base href="/office-executive/">'), 'Should have base href tag');
});

test('executive index.html has version footer', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'index.html'));
  assert(src.includes('id="sk-version"'), 'Should have version footer element');
  assert(src.includes('v2.1.0'), 'Should show version 2.1.0');
});

test('version footer is visible during auth-pending', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'index.html'));
  assert(src.includes('body.sk-auth-pending #sk-version { visibility: visible'), 
    'Version footer should be visible during auth-pending');
});

// ── No SimCity References ──
console.log('\n── SimCity Removal ──');

test('no SimCity references in executive JS files', () => {
  const files = fs.readdirSync(EXECUTIVE_DIR).filter(f => f.endsWith('.js'));
  files.forEach(f => {
    const src = readFile(path.join(EXECUTIVE_DIR, f));
    assert(!src.match(/simcity/i), `${f} should not reference SimCity`);
  });
});

test('office-simcity directory does not exist', () => {
  assert(!fs.existsSync(path.join(SERVER_DIR, 'office-simcity')), 'office-simcity should be deleted');
});

// ── Semantic Buttons ──
console.log('\n── Semantic Buttons ──');

test('exec-room elements are <button> not <div role="button">', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'index.html'));
  assert(src.includes('<button class="exec-room'), 'Should use <button> for exec-room');
  assert(!src.match(/<div[^>]*class="exec-room[^>]*role="button"/), 'Should NOT have div with role=button for exec-room');
});

test('styles.css has button reset for exec-room', () => {
  const src = readFile(path.join(EXECUTIVE_DIR, 'styles.css'));
  assert(src.includes('button.exec-room'), 'Should have button reset CSS for exec-room');
});

// ═══════════════════════════════════════════════════════════════
//  PART 2: API Tests (require running server)
// ═══════════════════════════════════════════════════════════════

function fetch(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(API_BASE + urlPath, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
    }).on('error', reject);
  });
}

async function apiTests() {
  console.log('\n🌐 API Tests (server: ' + API_BASE + ')\n');

  try {
    // Test root redirect
    const root = await fetch('/');
    test('GET / serves office-executive content', () => {
      assert(root.status === 200 || root.status === 302, 'Should return 200 or 302');
      if (root.status === 200) {
        assert(root.body.includes('office-executive') || root.body.includes('SpawnKit'), 'Should serve executive page');
      }
    });

    // Test office-executive serves correctly
    const exec = await fetch('/office-executive/');
    test('GET /office-executive/ returns HTML', () => {
      assert(exec.status === 200, 'Should return 200');
      assert(exec.body.includes('<base href="/office-executive/">'), 'Should have base href');
      assert(exec.body.includes('sk-version'), 'Should have version footer');
    });

    // Test JS files resolve correctly
    const mainJs = await fetch('/office-executive/main.js');
    test('GET /office-executive/main.js returns JavaScript', () => {
      assert(mainJs.status === 200, 'Should return 200');
      assert(!mainJs.body.startsWith('<!'), 'Should NOT return HTML (was the old bug)');
      assert(mainJs.headers['content-type']?.includes('javascript'), 'Content-Type should be JS');
    });

    // Test SPA fallback returns 404 for JS, not HTML
    const fakeJs = await fetch('/nonexistent.js');
    test('GET /nonexistent.js returns 404 (not HTML)', () => {
      assert(fakeJs.status === 404, 'Should return 404 for missing .js files');
      assert(!fakeJs.body.startsWith('<!'), 'Should NOT return HTML for missing .js');
    });

    // Test medieval theme
    const medieval = await fetch('/office-medieval/');
    test('GET /office-medieval/ returns HTML', () => {
      assert(medieval.status === 200, 'Should return 200');
      assert(medieval.body.includes('Medieval') || medieval.body.includes('Castle'), 'Should be medieval theme');
    });

    // Test health endpoint
    const health = await fetch('/api/oc/health');
    test('GET /api/oc/health returns OK', () => {
      assert(health.status === 200, 'Should return 200');
    });

  } catch (e) {
    console.log('  ⚠️  API tests skipped (server not reachable): ' + e.message);
  }
}

// ═══════════════════════════════════════════════════════════════
//  Run
// ═══════════════════════════════════════════════════════════════

apiTests().then(() => {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
});
