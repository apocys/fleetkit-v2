const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Set required env
process.env.SK_AUTH_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_PRICE_ID = 'price_test_fake';

const BillingManager = require('./billing');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sk-billing-test-'));
}

// Mock Stripe client
function mockStripe(overrides = {}) {
  return {
    customers: {
      create: overrides.customersCreate || (async (data) => ({ id: 'cus_mock_123', email: data.email })),
    },
    checkout: {
      sessions: {
        create: overrides.checkoutCreate || (async (data) => ({ id: 'cs_mock_123', url: 'https://checkout.stripe.com/mock', ...data })),
      }
    },
    billingPortal: {
      sessions: {
        create: overrides.portalCreate || (async (data) => ({ id: 'bps_mock_123', url: 'https://billing.stripe.com/mock' })),
      }
    },
    subscriptions: {
      retrieve: overrides.subRetrieve || (async (id) => ({ id, status: 'active', current_period_end: 1234567890, cancel_at_period_end: false })),
    },
    webhooks: {
      constructEvent: overrides.constructEvent || ((body, sig, secret) => JSON.parse(body)),
    }
  };
}

describe('BillingManager', () => {
  let billing, dataDir;

  beforeEach(() => {
    dataDir = tmpDir();
    billing = new BillingManager({
      stripeKey: 'sk_test_fake',
      stripeClient: mockStripe(),
      priceId: 'price_test_123',
      dataDir,
      baseUrl: 'https://test.spawnkit.ai',
      webhookSecret: 'whsec_test'
    });
  });

  describe('constructor', () => {
    it('throws without stripe key', () => {
      const orig = process.env.STRIPE_SECRET_KEY;
      delete process.env.STRIPE_SECRET_KEY;
      assert.throws(() => new BillingManager({ stripeKey: undefined }), /STRIPE_SECRET_KEY/);
      process.env.STRIPE_SECRET_KEY = orig;
    });

    it('accepts custom config', () => {
      assert.equal(billing.dataDir, dataDir);
      assert.equal(billing.baseUrl, 'https://test.spawnkit.ai');
      assert.equal(billing.priceId, 'price_test_123');
    });
  });

  describe('createCheckoutSession', () => {
    it('creates checkout for existing user', async () => {
      // Seed user
      const users = { 'pay@test.com': { email: 'pay@test.com', plan: 'free', stripeCustomerId: null } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      const session = await billing.createCheckoutSession('pay@test.com');
      assert.ok(session.url);
      assert.equal(session.mode, 'subscription');
    });

    it('creates stripe customer if not exists', async () => {
      let customerCreated = false;
      billing.stripe.customers.create = async (data) => {
        customerCreated = true;
        return { id: 'cus_new_123', email: data.email };
      };

      const users = { 'new@test.com': { email: 'new@test.com', plan: 'free', stripeCustomerId: null } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await billing.createCheckoutSession('new@test.com');
      assert.ok(customerCreated);

      // Check customer ID was saved
      const savedUsers = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.equal(savedUsers['new@test.com'].stripeCustomerId, 'cus_new_123');
    });

    it('reuses existing stripe customer', async () => {
      let customerCreated = false;
      billing.stripe.customers.create = async () => { customerCreated = true; return { id: 'x' }; };

      const users = { 'old@test.com': { email: 'old@test.com', plan: 'free', stripeCustomerId: 'cus_existing' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await billing.createCheckoutSession('old@test.com');
      assert.equal(customerCreated, false);
    });

    it('throws for unknown user', async () => {
      fs.writeFileSync(path.join(dataDir, 'users.json'), '{}');
      await assert.rejects(() => billing.createCheckoutSession('nope@test.com'), /User not found/);
    });
  });

  describe('createPortalSession', () => {
    it('creates portal for user with stripe id', async () => {
      const users = { 'portal@test.com': { email: 'portal@test.com', stripeCustomerId: 'cus_abc' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      const session = await billing.createPortalSession('portal@test.com');
      assert.ok(session.url);
    });

    it('throws for user without stripe id', async () => {
      const users = { 'nostripe@test.com': { email: 'nostripe@test.com', stripeCustomerId: null } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await assert.rejects(() => billing.createPortalSession('nostripe@test.com'), /No Stripe customer/);
    });
  });

  describe('webhook handlers', () => {
    it('handleCheckoutCompleted upgrades user to pro', async () => {
      const users = { 'upgrade@test.com': { email: 'upgrade@test.com', plan: 'free' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await billing.handleCheckoutCompleted({
        id: 'cs_123',
        metadata: { spawnkit_email: 'upgrade@test.com' }
      });

      const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.equal(saved['upgrade@test.com'].plan, 'pro');
    });

    it('handleSubscriptionChange updates plan based on status', async () => {
      const users = { 'sub@test.com': { email: 'sub@test.com', plan: 'free', stripeCustomerId: 'cus_sub' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await billing.handleSubscriptionChange({
        id: 'sub_123',
        customer: 'cus_sub',
        status: 'active'
      });

      let saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.equal(saved['sub@test.com'].plan, 'pro');

      await billing.handleSubscriptionChange({
        id: 'sub_123',
        customer: 'cus_sub',
        status: 'past_due'
      });

      saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.equal(saved['sub@test.com'].plan, 'free');
    });

    it('handleSubscriptionCancelled downgrades to free', async () => {
      const users = { 'cancel@test.com': { email: 'cancel@test.com', plan: 'pro', stripeCustomerId: 'cus_cancel' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      await billing.handleSubscriptionCancelled({
        id: 'sub_c',
        customer: 'cus_cancel'
      });

      const saved = JSON.parse(fs.readFileSync(path.join(dataDir, 'users.json'), 'utf8'));
      assert.equal(saved['cancel@test.com'].plan, 'free');
      assert.equal(saved['cancel@test.com'].subscriptionStatus, 'cancelled');
    });
  });

  describe('getUserBillingStatus', () => {
    it('returns plan and subscription info', async () => {
      const users = { 'status@test.com': {
        email: 'status@test.com', plan: 'pro',
        stripeCustomerId: 'cus_s', stripeSubscriptionId: 'sub_s'
      }};
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      const status = await billing.getUserBillingStatus('status@test.com');
      assert.equal(status.plan, 'pro');
      assert.ok(status.subscription);
      assert.equal(status.subscription.status, 'active');
    });

    it('returns free plan for user without subscription', async () => {
      const users = { 'free@test.com': { email: 'free@test.com', plan: 'free' } };
      fs.writeFileSync(path.join(dataDir, 'users.json'), JSON.stringify(users));

      const status = await billing.getUserBillingStatus('free@test.com');
      assert.equal(status.plan, 'free');
      assert.equal(status.subscription, null);
    });

    it('throws for unknown user', async () => {
      fs.writeFileSync(path.join(dataDir, 'users.json'), '{}');
      await assert.rejects(() => billing.getUserBillingStatus('nope@test.com'), /User not found/);
    });
  });
});
