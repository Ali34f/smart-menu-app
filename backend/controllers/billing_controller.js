const Restaurant = require('../models/Restaurant');
const {
  normalizePlan,
  getGracePeriodMs
} = require('../config/plans');

let stripeClient;

const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  if (!stripeClient) {
    // eslint-disable-next-line global-require
    stripeClient = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return stripeClient;
};

const BILLING_ROLES = new Set(['owner', 'platform_admin', 'super_owner']);

const assertMayManageBilling = (req) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (!BILLING_ROLES.has(role)) {
    return { ok: false, status: 403, message: 'Only the restaurant owner (or platform admin) can manage billing.' };
  }
  if (!req.restaurantId) {
    return { ok: false, status: 400, message: 'No active restaurant workspace selected.' };
  }
  return { ok: true };
};

const mapStripeSubscriptionStatus = (stripeStatus) => {
  const s = String(stripeStatus || '').toLowerCase();
  if (s === 'trialing') return 'trialing';
  if (s === 'active' || s === 'incomplete' || s === 'paused') return 'active';
  if (s === 'past_due' || s === 'unpaid') return 'past_due';
  if (s === 'canceled' || s === 'incomplete_expired') return 'canceled';
  return 'inactive';
};

const priceIdForPlan = (plan) => {
  const p = normalizePlan(plan);
  if (p === 'premium') return process.env.STRIPE_PRICE_PREMIUM || null;
  if (p === 'basic') return process.env.STRIPE_PRICE_BASIC || null;
  return null;
};

const checkoutSuccessUrl = () => {
  const base = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const path = process.env.STRIPE_CHECKOUT_SUCCESS_PATH || '/settings?billing=success';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const checkoutCancelUrl = () => {
  const base = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
  const path = process.env.STRIPE_CHECKOUT_CANCEL_PATH || '/settings?billing=canceled';
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
};

const portalReturnUrl = () => {
  if (process.env.STRIPE_PORTAL_RETURN_URL) return process.env.STRIPE_PORTAL_RETURN_URL;
  return checkoutSuccessUrl().replace(/billing=success/, 'billing=portal');
};

exports.getBillingConfig = async (req, res) => {
  const stripe = getStripe();
  res.status(200).json({
    success: true,
    data: {
      stripeConfigured: Boolean(stripe && process.env.STRIPE_WEBHOOK_SECRET),
      prices: {
        basic: Boolean(process.env.STRIPE_PRICE_BASIC),
        premium: Boolean(process.env.STRIPE_PRICE_PREMIUM)
      }
    }
  });
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const gate = assertMayManageBilling(req);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Stripe billing is not configured on this server.' });
    }
    const plan = normalizePlan(req.body?.plan);
    if (plan === 'free') {
      return res.status(400).json({ success: false, message: 'Choose basic or premium to subscribe.' });
    }
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      return res.status(503).json({ success: false, message: 'Stripe price IDs are not configured.' });
    }

    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const status = String(restaurant.subscription?.status || 'active').toLowerCase();
    const subId = restaurant.subscription?.stripeSubscriptionId;
    if (
      subId &&
      (status === 'active' || status === 'trialing' || status === 'past_due')
    ) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active Stripe subscription for this restaurant. Use Manage billing to change plan or payment method.'
      });
    }

    const restaurantId = String(restaurant._id);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: restaurantId,
      ...(restaurant.subscription?.stripeCustomerId
        ? { customer: restaurant.subscription.stripeCustomerId }
        : { customer_email: restaurant.email }),
      metadata: { restaurantId, plan },
      subscription_data: {
        metadata: { restaurantId, plan }
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: checkoutSuccessUrl(),
      cancel_url: checkoutCancelUrl()
    });

    res.status(200).json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
};

exports.createPortalSession = async (req, res, next) => {
  try {
    const gate = assertMayManageBilling(req);
    if (!gate.ok) {
      return res.status(gate.status).json({ success: false, message: gate.message });
    }
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ success: false, message: 'Stripe billing is not configured on this server.' });
    }
    const restaurant = await Restaurant.findById(req.restaurantId);
    if (!restaurant?.subscription?.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        message: 'No Stripe customer on file. Complete checkout first to open the billing portal.'
      });
    }
    const session = await stripe.billingPortal.sessions.create({
      customer: restaurant.subscription.stripeCustomerId,
      return_url: portalReturnUrl()
    });
    res.status(200).json({ success: true, data: { url: session.url } });
  } catch (err) {
    next(err);
  }
};

const planFromStripePriceId = (priceId) => {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_PREMIUM) return 'premium';
  if (priceId === process.env.STRIPE_PRICE_BASIC) return 'basic';
  return null;
};

const applySubscriptionFromStripe = async (subscription) => {
  const meta = subscription.metadata || {};
  let restaurantId = meta.restaurantId;
  if (!restaurantId && subscription.customer) {
    const r = await Restaurant.findOne({ 'subscription.stripeSubscriptionId': subscription.id }).select('_id');
    if (r) restaurantId = String(r._id);
  }
  if (!restaurantId) {
    const r2 = await Restaurant.findOne({ 'subscription.stripeCustomerId': subscription.customer }).select('_id');
    if (r2) restaurantId = String(r2._id);
  }
  if (!restaurantId) return;

  const priceId = subscription.items?.data?.[0]?.price?.id;
  const planFromPrice = planFromStripePriceId(priceId);
  const metaPlan = normalizePlan(meta.plan);
  const existing = await Restaurant.findById(restaurantId).select('subscription.plan').lean();
  const existingPlan = normalizePlan(existing?.subscription?.plan);
  const plan = planFromPrice || (metaPlan !== 'free' ? metaPlan : existingPlan);
  const status = mapStripeSubscriptionStatus(subscription.status);
  const cpe = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  const update = {
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.stripeCustomerId': subscription.customer,
    'subscription.status': status,
    'subscription.currentPeriodEnd': cpe
  };
  if (plan === 'basic' || plan === 'premium') {
    update['subscription.plan'] = plan;
  }

  await Restaurant.findByIdAndUpdate(restaurantId, { $set: update });
};

exports.handleWebhook = async (req, res) => {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !whSecret) {
    return res.status(503).send('Billing not configured');
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        if (session.mode !== 'subscription') break;
        const restaurantId = session.metadata?.restaurantId || session.client_reference_id;
        const plan = normalizePlan(session.metadata?.plan);
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        if (!restaurantId || !subscriptionId) break;
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = sub.items?.data?.[0]?.price?.id;
        const resolvedPlan = planFromStripePriceId(priceId) || (plan === 'free' ? 'basic' : plan);
        await Restaurant.findByIdAndUpdate(restaurantId, {
          $set: {
            'subscription.stripeCustomerId': customerId,
            'subscription.stripeSubscriptionId': subscriptionId,
            'subscription.plan': resolvedPlan,
            'subscription.status': mapStripeSubscriptionStatus(sub.status),
            'subscription.currentPeriodEnd': sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            'subscription.gracePeriodEnd': null
          }
        });
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (event.type === 'customer.subscription.deleted') {
          const meta = subscription.metadata || {};
          let restaurantId = meta.restaurantId;
          if (!restaurantId) {
            const r = await Restaurant.findOne({
              'subscription.stripeSubscriptionId': subscription.id
            }).select('_id');
            if (r) restaurantId = String(r._id);
          }
          if (restaurantId) {
            await Restaurant.findByIdAndUpdate(restaurantId, {
              $set: {
                'subscription.plan': 'free',
                'subscription.status': 'canceled',
                'subscription.stripeSubscriptionId': null,
                'subscription.currentPeriodEnd': null,
                'subscription.gracePeriodEnd': null
              }
            });
          }
        } else {
          await applySubscriptionFromStripe(subscription);
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (!customerId) break;
        const restaurant = await Restaurant.findOne({ 'subscription.stripeCustomerId': customerId });
        if (!restaurant) break;
        const graceMs = getGracePeriodMs();
        const graceEnd =
          restaurant.subscription?.gracePeriodEnd && new Date(restaurant.subscription.gracePeriodEnd) > new Date()
            ? restaurant.subscription.gracePeriodEnd
            : new Date(Date.now() + graceMs);
        await Restaurant.findByIdAndUpdate(restaurant._id, {
          $set: {
            'subscription.status': 'past_due',
            'subscription.gracePeriodEnd': graceEnd
          }
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        if (!customerId) break;
        await Restaurant.updateMany(
          { 'subscription.stripeCustomerId': customerId },
          {
            $set: {
              'subscription.status': 'active',
              'subscription.gracePeriodEnd': null
            }
          }
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error('Webhook handler error', err);
    return res.status(500).json({ received: false });
  }

  res.json({ received: true });
};
