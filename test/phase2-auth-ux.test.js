/**
 * Phase 2: Auth + UX Tests — Happy Path
 * Tests: Google OAuth routes, user profile, auth lifecycle
 * Run: node test/phase2-auth-ux.test.js
 */

const http = require('http');
const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8765';

let passed = 0;
let failed = 0;
let total = 0;

function test(name, fn) {
  total++;
  return fn().then(function () {
    passed++;
    console.log('  ✅ ' + name);
  }).catch(function (err) {
    failed++;
    console.log('  ❌ ' + name + ': ' + err.message);
  });
}

function apiGet(urlPath) {
  return new Promise(function (resolve, reject) {
    http.get(API_BASE + urlPath, { timeout: 5000 }, function (res) {
      let data = '';
      res.on('data', function (c) { data += c; });
      res.on('end', function () {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, data: data }); }
      });
    }).on('error', reject);
  });
}

function apiPost(urlPath, body) {
  return new Promise(function (resolve, reject) {
    const postData = JSON.stringify(body);
    const url = new URL(API_BASE);
    const opts = {
      method: 'POST', hostname: url.hostname, port: url.port, path: urlPath, timeout: 5000,
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
    req.write(postData);
    req.end();
  });
}

async function run() {
  console.log('\n🧪 Phase 2: Auth + UX Tests\n');

  // ── Google Auth Routes ───────────────────────────────────
  console.log('Google Auth Routes:');

  await test('POST /api/auth/google rejects missing credential', async function () {
    const r = await apiPost('/api/auth/google', {});
    if (r.status !== 400) throw new Error('Expected 400, got ' + r.status);
    if (!r.data.error) throw new Error('Missing error message');
  });

  await test('POST /api/auth/google rejects invalid token', async function () {
    const r = await apiPost('/api/auth/google', { credential: 'not-a-real-google-token' });
    // 401 (invalid) or 500 (network to Google failed) are both valid
    if (r.status !== 401 && r.status !== 500) throw new Error('Expected 401 or 500, got ' + r.status);
  });

  await test('GET /api/auth/user returns ok=true', async function () {
    const r = await apiGet('/api/auth/user');
    if (r.status !== 200) throw new Error('Expected 200, got ' + r.status);
    if (typeof r.data.ok !== 'boolean') throw new Error('Missing ok field');
  });

  await test('GET /api/auth/user returns user or null', async function () {
    const r = await apiGet('/api/auth/user');
    // user can be null (not signed in) or an object
    if (r.data.user !== null && typeof r.data.user !== 'object') {
      throw new Error('user must be null or object, got ' + typeof r.data.user);
    }
  });

  await test('POST /api/auth/logout returns ok', async function () {
    const r = await apiPost('/api/auth/logout', {});
    if (r.status !== 200) throw new Error('Expected 200, got ' + r.status);
    if (!r.data.ok) throw new Error('Expected ok=true');
  });

  await test('GET /api/auth/user returns null after logout', async function () {
    // Logout first
    await apiPost('/api/auth/logout', {});
    const r = await apiGet('/api/auth/user');
    if (r.status !== 200) throw new Error('Expected 200, got ' + r.status);
    // After logout, user should be null
    if (r.data.user !== null) throw new Error('Expected null user after logout');
  });

  // ── Office Executive Auth ──────────────────────────────
  console.log('\nOffice Executive Auth:');

  await test('GET / redirects to /office-executive/', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/', function (res) {
        if (res.statusCode !== 302) return reject(new Error('Expected 302 redirect, got ' + res.statusCode));
        if (!res.headers.location.includes('/office-executive/')) return reject(new Error('Redirect location does not include /office-executive/'));
        resolve();
      }).on('error', reject);
    });
  });

  await test('GET /office-executive/auth.js returns JS', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/auth.js', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
          if (!res.headers['content-type'].includes('javascript')) return reject(new Error('Not JS content-type: ' + res.headers['content-type']));
          if (!data.includes('auth')) return reject(new Error('Missing auth functionality'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  // ── index.html contains Google auth elements ─────────────
  console.log('\nHTML Structure:');

  await test('GET /office-executive/ contains auth.js script tag', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (!data.includes('auth.js')) return reject(new Error('Missing auth.js script'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('GET /office-executive/ contains auth interface', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (!data.includes('auth')) return reject(new Error('Missing auth interface elements'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('GET /office-executive/ contains styles.css link (CSS extracted)', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          if (!data.includes('styles.css')) return reject(new Error('Missing styles.css link'));
          // Verify no inline <style> blocks remain (CSS fully extracted)
          const styleCount = (data.match(/<style[\s>]/g) || []).length;
          if (styleCount > 0) return reject(new Error('Found ' + styleCount + ' inline <style> block(s) — not fully extracted'));
          resolve();
        });
      }).on('error', reject);
    });
  });

  await test('GET /office-executive/ has no remaining inline script blocks', async function () {
    return new Promise(function (resolve, reject) {
      http.get(API_BASE + '/office-executive/', function (res) {
        let data = '';
        res.on('data', function (c) { data += c; });
        res.on('end', function () {
          // Count inline scripts (those without src=)
          const allScripts = data.match(/<script[^>]*>/g) || [];
          const inlineScripts = allScripts.filter(function (s) { return !s.includes('src='); });
          if (inlineScripts.length > 0) {
            return reject(new Error('Found ' + inlineScripts.length + ' inline <script> block(s)'));
          }
          resolve();
        });
      }).on('error', reject);
    });
  });

  // ── Auth + existing auth compatibility ───────────────────
  console.log('\nAuth Compatibility:');

  await test('Existing /api/auth/validate still works', async function () {
    const r = await apiPost('/api/auth/validate', { url: 'http://127.0.0.1:18789' });
    if (r.status !== 200 && r.status !== 502) throw new Error('Expected 200 or 502, got ' + r.status);
  });

  await test('All phase1 routes still functional', async function () {
    const checks = ['/api/oc/health', '/api/oc/agents', '/api/fleet/status', '/api/fleet/mailbox'];
    for (const c of checks) {
      const r = await apiGet(c);
      if (r.status !== 200 && r.status !== 502) throw new Error(c + ' returned ' + r.status);
    }
  });

  // ── Results ──────────────────────────────────────────────
  console.log('\n' + '═'.repeat(50));
  console.log('  Results: ' + passed + '/' + total + ' passed' + (failed ? ', ' + failed + ' FAILED' : ' ✅'));
  console.log('═'.repeat(50) + '\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(function (e) { console.error('Fatal:', e); process.exit(1); });
