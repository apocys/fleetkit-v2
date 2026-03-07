const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs').promises;
const path = require('path');

class AuthManager {
  constructor(opts = {}) {
    this.secret = opts.secret || process.env.SK_AUTH_SECRET;
    if (!this.secret) {
      throw new Error('SK_AUTH_SECRET environment variable required');
    }
    
    this.dataDir = opts.dataDir || process.env.SK_DATA_DIR || path.join(__dirname, '..', 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
    this.sessionsFile = path.join(this.dataDir, 'sessions.json');
    this.baseUrl = opts.baseUrl || process.env.SK_BASE_URL || 'https://app.spawnkit.ai';
    this._sendEmail = opts.sendEmail || null; // injectable for testing
    
    // Ensure data directory exists
    this.ensureDataDir();
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersFile, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  async saveUsers(users) {
    await fs.writeFile(this.usersFile, JSON.stringify(users, null, 2));
  }

  async loadSessions() {
    try {
      const data = await fs.readFile(this.sessionsFile, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') return {};
      throw err;
    }
  }

  async saveSessions(sessions) {
    await fs.writeFile(this.sessionsFile, JSON.stringify(sessions, null, 2));
  }

  generateMagicToken(email) {
    const payload = {
      email,
      type: 'magic_link',
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h expiry
    };
    return jwt.sign(payload, this.secret, { algorithm: 'HS256' });
  }

  verifyMagicToken(token) {
    try {
      const payload = jwt.verify(token, this.secret, { algorithms: ['HS256'] });
      if (payload.type !== 'magic_link') {
        throw new Error('Invalid token type');
      }
      return payload;
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }

  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  buildMagicLinkEmail(email) {
    const token = this.generateMagicToken(email);
    const magicLink = `${this.baseUrl}/api/auth/verify?token=${token}`;
    return {
      from: 'SpawnKit <noreply@spawnkit.ai>',
      to: [email],
      subject: 'Sign in to SpawnKit',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #007AFF; font-size: 28px; font-weight: 600; margin-bottom: 30px;">SpawnKit</h1>
          <p style="font-size: 16px; color: #1D1D1F; margin-bottom: 30px;">Click the link below to sign in to your SpawnKit account:</p>
          <a href="${magicLink}" style="display: inline-block; background: #007AFF; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin-bottom: 30px;">Sign In</a>
          <p style="font-size: 14px; color: #86868B; margin-bottom: 10px;">This link will expire in 24 hours.</p>
          <p style="font-size: 14px; color: #86868B;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
      _token: token,
      _magicLink: magicLink
    };
  }

  async sendMagicLink(email) {
    const emailPayload = this.buildMagicLinkEmail(email);

    // Allow injected sender for testing
    if (this._sendEmail) {
      return this._sendEmail(emailPayload);
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable required');
    }

    const { _token, _magicLink, ...payload } = emailPayload;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    return await response.json();
  }

  async createSession(email) {
    const users = await this.loadUsers();
    
    // Create user if doesn't exist
    if (!users[email]) {
      users[email] = {
        email,
        plan: 'free',
        createdAt: new Date().toISOString(),
        stripeCustomerId: null
      };
      await this.saveUsers(users);
    }

    // Create session
    const sessionId = this.generateSessionId();
    const sessions = await this.loadSessions();
    sessions[sessionId] = {
      email,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    };
    await this.saveSessions(sessions);

    return { sessionId, user: users[email] };
  }

  async getSessionUser(sessionId) {
    if (!sessionId) return null;

    const sessions = await this.loadSessions();
    const session = sessions[sessionId];
    
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) {
      // Session expired, clean up
      delete sessions[sessionId];
      await this.saveSessions(sessions);
      return null;
    }

    const users = await this.loadUsers();
    return users[session.email] || null;
  }

  async destroySession(sessionId) {
    if (!sessionId) return;

    const sessions = await this.loadSessions();
    delete sessions[sessionId];
    await this.saveSessions(sessions);
  }

  // Cleanup expired sessions
  async cleanupSessions() {
    const sessions = await this.loadSessions();
    const now = new Date();
    let changed = false;

    for (const [sessionId, session] of Object.entries(sessions)) {
      if (new Date(session.expiresAt) < now) {
        delete sessions[sessionId];
        changed = true;
      }
    }

    if (changed) {
      await this.saveSessions(sessions);
    }
  }
}

module.exports = AuthManager;