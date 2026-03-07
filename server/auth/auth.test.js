const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set required env before requiring modules
const TEST_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.SK_AUTH_SECRET = TEST_SECRET;
process.env.RESEND_API_KEY = 'test_key';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PRICE_ID = 'price_test_fake';

const AuthManager = require('./auth');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sk-auth-test-'));
}

describe('AuthManager', () => {
  let auth, dataDir;

  beforeEach(() => {
    dataDir = tmpDir();
    auth = new AuthManager({
      secret: TEST_SECRET,
      dataDir,
      baseUrl: 'https://test.spawnkit.ai',
      sendEmail: async (payload) => ({ id: 'test-email-id', ...payload })
    });
  });

  after(() => {
    // Cleanup handled by OS for tmpdir
  });

  describe('constructor', () => {
    it('throws without secret', () => {
      const orig = process.env.SK_AUTH_SECRET;
      delete process.env.SK_AUTH_SECRET;
      assert.throws(() => new AuthManager({ secret: undefined }), /SK_AUTH_SECRET/);
      process.env.SK_AUTH_SECRET = orig;
    });

    it('accepts custom dataDir', () => {
      assert.equal(auth.dataDir, dataDir);
    });

    it('accepts custom baseUrl', () => {
      assert.equal(auth.baseUrl, 'https://test.spawnkit.ai');
    });
  });

  describe('generateMagicToken + verifyMagicToken', () => {
    it('generates and verifies a valid token', () => {
      const token = auth.generateMagicToken('test@example.com');
      assert.ok(typeof token === 'string');
      assert.ok(token.length > 20);

      const payload = auth.verifyMagicToken(token);
      assert.equal(payload.email, 'test@example.com');
      assert.equal(payload.type, 'magic_link');
    });

    it('rejects tampered token', () => {
      const token = auth.generateMagicToken('test@example.com');
      assert.throws(() => auth.verifyMagicToken(token + 'x'), /Invalid or expired/);
    });

    it('rejects token signed with different secret', () => {
      const other = new AuthManager({
        secret: 'other-secret-that-is-also-at-least-32-chars',
        dataDir,
        sendEmail: async () => ({})
      });
      const token = other.generateMagicToken('test@example.com');
      assert.throws(() => auth.verifyMagicToken(token), /Invalid or expired/);
    });
  });

  describe('buildMagicLinkEmail', () => {
    it('builds email with correct fields', () => {
      const email = auth.buildMagicLinkEmail('user@test.com');
      assert.equal(email.to[0], 'user@test.com');
      assert.equal(email.subject, 'Sign in to SpawnKit');
      assert.ok(email._magicLink.includes('https://test.spawnkit.ai/api/auth/verify?token='));
      assert.ok(email._token.length > 20);
      assert.ok(email.html.includes('Sign In'));
    });
  });

  describe('sendMagicLink', () => {
    it('uses injected sendEmail function', async () => {
      let captured = null;
      const a = new AuthManager({
        secret: TEST_SECRET,
        dataDir,
        sendEmail: async (p) => { captured = p; return { id: 'mock' }; }
      });
      const result = await a.sendMagicLink('test@x.com');
      assert.equal(result.id, 'mock');
      assert.equal(captured.to[0], 'test@x.com');
    });
  });

  describe('session lifecycle', () => {
    it('creates user + session', async () => {
      const { sessionId, user } = await auth.createSession('new@test.com');
      assert.ok(sessionId.length === 64); // 32 bytes hex
      assert.equal(user.email, 'new@test.com');
      assert.equal(user.plan, 'free');
    });

    it('retrieves user from session', async () => {
      const { sessionId } = await auth.createSession('lookup@test.com');
      const user = await auth.getSessionUser(sessionId);
      assert.equal(user.email, 'lookup@test.com');
    });

    it('returns null for unknown session', async () => {
      const user = await auth.getSessionUser('nonexistent');
      assert.equal(user, null);
    });

    it('returns null for null/undefined session', async () => {
      assert.equal(await auth.getSessionUser(null), null);
      assert.equal(await auth.getSessionUser(undefined), null);
    });

    it('destroys session', async () => {
      const { sessionId } = await auth.createSession('destroy@test.com');
      await auth.destroySession(sessionId);
      const user = await auth.getSessionUser(sessionId);
      assert.equal(user, null);
    });

    it('does not duplicate user on second session', async () => {
      await auth.createSession('dup@test.com');
      await auth.createSession('dup@test.com');
      const users = await auth.loadUsers();
      assert.equal(Object.keys(users).filter(k => k === 'dup@test.com').length, 1);
    });
  });

  describe('expired sessions', () => {
    it('rejects expired session', async () => {
      const { sessionId } = await auth.createSession('expired@test.com');
      // Manually expire the session
      const sessions = await auth.loadSessions();
      sessions[sessionId].expiresAt = new Date(Date.now() - 1000).toISOString();
      await auth.saveSessions(sessions);

      const user = await auth.getSessionUser(sessionId);
      assert.equal(user, null);
    });

    it('cleanupSessions removes expired', async () => {
      const { sessionId: s1 } = await auth.createSession('a@test.com');
      const { sessionId: s2 } = await auth.createSession('b@test.com');

      const sessions = await auth.loadSessions();
      sessions[s1].expiresAt = new Date(Date.now() - 1000).toISOString();
      await auth.saveSessions(sessions);

      await auth.cleanupSessions();

      const after = await auth.loadSessions();
      assert.equal(after[s1], undefined);
      assert.ok(after[s2]);
    });
  });

  describe('user persistence', () => {
    it('persists users to disk', async () => {
      await auth.createSession('persist@test.com');
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.ok(raw['persist@test.com']);
      assert.equal(raw['persist@test.com'].plan, 'free');
    });

    it('persists sessions to disk', async () => {
      const { sessionId } = await auth.createSession('sessfile@test.com');
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, 'sessions.json'), 'utf8'));
      assert.ok(raw[sessionId]);
      assert.equal(raw[sessionId].email, 'sessfile@test.com');
    });
  });

  describe('full magic link flow', () => {
    it('send → verify → session → user', async () => {
      let sentPayload = null;
      const a = new AuthManager({
        secret: TEST_SECRET,
        dataDir,
        baseUrl: 'https://test.local',
        sendEmail: async (p) => { sentPayload = p; return { id: 'ok' }; }
      });

      // 1. Send magic link
      await a.sendMagicLink('flow@test.com');
      assert.ok(sentPayload._token);

      // 2. Verify token
      const payload = a.verifyMagicToken(sentPayload._token);
      assert.equal(payload.email, 'flow@test.com');

      // 3. Create session
      const { sessionId, user } = await a.createSession(payload.email);
      assert.equal(user.email, 'flow@test.com');
      assert.equal(user.plan, 'free');

      // 4. Retrieve user
      const retrieved = await a.getSessionUser(sessionId);
      assert.equal(retrieved.email, 'flow@test.com');

      // 5. Destroy session
      await a.destroySession(sessionId);
      assert.equal(await a.getSessionUser(sessionId), null);
    });
  });
});
