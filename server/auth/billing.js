const stripe = require('stripe');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class BillingManager {
  constructor(opts = {}) {
    const stripeSecretKey = opts.stripeKey || process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable required');
    }

    this.stripe = opts.stripeClient || stripe(stripeSecretKey);
    this.webhookSecret = opts.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;
    this.priceId = opts.priceId || process.env.STRIPE_PRICE_ID;
    this.baseUrl = opts.baseUrl || process.env.SK_BASE_URL || 'https://app.spawnkit.ai';
    
    this.dataDir = opts.dataDir || process.env.SK_DATA_DIR || path.join(__dirname, '..', 'data');
    this.usersFile = path.join(this.dataDir, 'users.json');
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

  async createCheckoutSession(email) {
    if (!this.priceId) {
      throw new Error('STRIPE_PRICE_ID environment variable required');
    }

    const users = await this.loadUsers();
    const user = users[email];
    
    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;
    
    // Create customer if doesn't exist
    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: email,
        metadata: {
          spawnkit_email: email
        }
      });
      customerId = customer.id;
      
      // Update user with Stripe customer ID
      user.stripeCustomerId = customerId;
      users[email] = user;
      await this.saveUsers(users);
    }

    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: this.priceId,
          quantity: 1
        }
      ],
      mode: 'subscription',
      success_url: this.baseUrl + '/?payment=success',
      cancel_url: this.baseUrl + '/?payment=cancelled',
      metadata: {
        spawnkit_email: email
      }
    });

    return session;
  }

  async createPortalSession(email) {
    const users = await this.loadUsers();
    const user = users[email];
    
    if (!user || !user.stripeCustomerId) {
      throw new Error('No Stripe customer found for user');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: this.baseUrl + '/'
    });

    return session;
  }

  async handleWebhook(rawBody, signature) {
    if (!this.webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET environment variable required');
    }

    let event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, this.webhookSecret);
    } catch (err) {
      throw new Error(`Webhook signature verification failed: ${err.message}`);
    }

    console.log(`Stripe webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionChange(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return { received: true };
  }

  async handleCheckoutCompleted(session) {
    const email = session.metadata?.spawnkit_email;
    if (!email) {
      console.error('No spawnkit_email in checkout session metadata');
      return;
    }

    const users = await this.loadUsers();
    const user = users[email];
    
    if (!user) {
      console.error(`User ${email} not found for checkout completion`);
      return;
    }

    // Update user plan to Pro
    user.plan = 'pro';
    user.stripeSessionId = session.id;
    user.updatedAt = new Date().toISOString();
    
    users[email] = user;
    await this.saveUsers(users);
    
    console.log(`User ${email} upgraded to Pro plan`);
  }

  async handleSubscriptionChange(subscription) {
    const customerId = subscription.customer;
    const users = await this.loadUsers();
    
    // Find user by Stripe customer ID
    const userEmail = Object.keys(users).find(email => users[email].stripeCustomerId === customerId);
    
    if (!userEmail) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    const user = users[userEmail];
    user.plan = subscription.status === 'active' ? 'pro' : 'free';
    user.stripeSubscriptionId = subscription.id;
    user.subscriptionStatus = subscription.status;
    user.updatedAt = new Date().toISOString();
    
    users[userEmail] = user;
    await this.saveUsers(users);
    
    console.log(`User ${userEmail} subscription updated: ${subscription.status}`);
  }

  async handleSubscriptionCancelled(subscription) {
    const customerId = subscription.customer;
    const users = await this.loadUsers();
    
    const userEmail = Object.keys(users).find(email => users[email].stripeCustomerId === customerId);
    
    if (!userEmail) {
      console.error(`No user found for Stripe customer ${customerId}`);
      return;
    }

    const user = users[userEmail];
    user.plan = 'free';
    user.subscriptionStatus = 'cancelled';
    user.updatedAt = new Date().toISOString();
    
    users[userEmail] = user;
    await this.saveUsers(users);
    
    console.log(`User ${userEmail} subscription cancelled`);
  }

  async handlePaymentSucceeded(invoice) {
    const customerId = invoice.customer;
    console.log(`Payment succeeded for customer ${customerId}`);
    // Payment success is already handled by subscription events
  }

  async handlePaymentFailed(invoice) {
    const customerId = invoice.customer;
    console.log(`Payment failed for customer ${customerId}`);
    // Could implement email notifications here
  }

  async getUserBillingStatus(email) {
    const users = await this.loadUsers();
    const user = users[email];
    
    if (!user) {
      throw new Error('User not found');
    }

    let subscription = null;
    if (user.stripeCustomerId && user.stripeSubscriptionId) {
      try {
        subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      } catch (err) {
        console.error(`Failed to retrieve subscription for ${email}:`, err.message);
      }
    }

    return {
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus || null,
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end
      } : null
    };
  }
}

module.exports = BillingManager;