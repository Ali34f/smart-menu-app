/**
 * Subscription tier limits and grace-period rules (single source of truth).
 * Aligns with Restaurant.subscription.plan: free | basic | premium
 *
 * Grace period: after invoice.payment_failed (Stripe past_due), writes are allowed
 * until subscription.gracePeriodEnd (typically 7 days from first failure).
 */

const GRACE_DAYS = Number(process.env.SUBSCRIPTION_GRACE_DAYS || 7);

const PLANS = {
  free: {
    maxMenuItems: 30,
    maxStaffSeats: 3,
    /** '7d' | '30d' | 'custom' — max report range allowed */
    maxReportRange: '7d',
    customReports: false,
    ingredientsFull: false,
    qrPremium: false
  },
  basic: {
    maxMenuItems: 200,
    maxStaffSeats: 15,
    maxReportRange: '30d',
    customReports: false,
    ingredientsFull: true,
    qrPremium: true
  },
  premium: {
    maxMenuItems: Infinity,
    maxStaffSeats: Infinity,
    maxReportRange: 'custom',
    customReports: true,
    ingredientsFull: true,
    qrPremium: true
  }
};

const PLAN_ORDER = { free: 0, basic: 1, premium: 2 };

const normalizePlan = (plan) => {
  const p = String(plan || 'free').toLowerCase();
  return p === 'basic' || p === 'premium' ? p : 'free';
};

const normalizeStatus = (status) => {
  const s = String(status || 'active').toLowerCase();
  const allowed = new Set(['inactive', 'trialing', 'active', 'past_due', 'canceled']);
  return allowed.has(s) ? s : 'active';
};

/**
 * @param {import('mongoose').Document | object} restaurant
 */
const getSubscriptionSlice = (restaurant) => {
  const raw = restaurant?.subscription || {};
  return {
    plan: normalizePlan(raw.plan),
    status: normalizeStatus(raw.status),
    startDate: raw.startDate,
    endDate: raw.endDate,
    currentPeriodEnd: raw.currentPeriodEnd || null,
    gracePeriodEnd: raw.gracePeriodEnd || null,
    stripeCustomerId: raw.stripeCustomerId || null,
    stripeSubscriptionId: raw.stripeSubscriptionId || null
  };
};

/**
 * Whether the restaurant may perform mutating dashboard operations (menu, staff, etc.).
 */
const canPerformWrites = (restaurant) => {
  const { status, gracePeriodEnd } = getSubscriptionSlice(restaurant);
  if (status === 'active' || status === 'trialing' || status === 'inactive') {
    return true;
  }
  if (status === 'past_due' && gracePeriodEnd) {
    return new Date(gracePeriodEnd).getTime() > Date.now();
  }
  return false;
};

/**
 * Plan key used for limit checks (downgrades to free limits when writes are blocked).
 */
const getEffectivePlanKey = (restaurant) => {
  const { plan } = getSubscriptionSlice(restaurant);
  if (!canPerformWrites(restaurant)) {
    return 'free';
  }
  return plan;
};

const getLimitsForPlanKey = (planKey) => PLANS[normalizePlan(planKey)] || PLANS.free;

const getEffectiveLimits = (restaurant) => getLimitsForPlanKey(getEffectivePlanKey(restaurant));

/**
 * Report range: '7d' | '30d' | 'custom' from query — allowed max for effective plan.
 */
const assertReportRangeAllowed = (restaurant, requestedRange) => {
  const limits = getEffectiveLimits(restaurant);
  const r = String(requestedRange || '7d').toLowerCase();
  const max = limits.maxReportRange;
  const rank = (x) => (x === 'custom' ? 2 : x === '30d' ? 1 : 0);
  if (rank(r) > rank(max)) {
    return {
      ok: false,
      message: `Your plan allows reports up to ${max === 'custom' ? 'custom dates' : max === '30d' ? '30 days' : '7 days'}. Upgrade to unlock longer ranges.`
    };
  }
  return { ok: true };
};

const assertMenuItemCapacity = async (restaurant, MenuItem, restaurantId) => {
  const limits = getEffectiveLimits(restaurant);
  if (!Number.isFinite(limits.maxMenuItems)) {
    return { ok: true };
  }
  const count = await MenuItem.countDocuments({ restaurantId });
  if (count >= limits.maxMenuItems) {
    return {
      ok: false,
      message: `Menu item limit reached (${limits.maxMenuItems} on your plan). Upgrade to add more dishes.`
    };
  }
  return { ok: true };
};

const assertStaffCapacity = async (restaurant, User, restaurantId) => {
  const limits = getEffectiveLimits(restaurant);
  if (!Number.isFinite(limits.maxStaffSeats)) {
    return { ok: true };
  }
  const count = await User.countDocuments({ restaurantId });
  if (count >= limits.maxStaffSeats) {
    return {
      ok: false,
      message: `Staff seat limit reached (${limits.maxStaffSeats} on your plan). Upgrade to invite more team members.`
    };
  }
  return { ok: true };
};

const assertIngredientsFullAccess = (restaurant) => {
  const limits = getEffectiveLimits(restaurant);
  if (!limits.ingredientsFull) {
    return {
      ok: false,
      message: 'Ingredients management is available on Basic and Premium plans. Upgrade to create and edit ingredients.'
    };
  }
  return { ok: true };
};

const assertQrPremiumAccess = (restaurant) => {
  const limits = getEffectiveLimits(restaurant);
  if (!limits.qrPremium) {
    return {
      ok: false,
      message: 'Advanced QR options (custom colours, PDF) require Basic or Premium. Upgrade your plan.'
    };
  }
  return { ok: true };
};

const getGracePeriodMs = () => GRACE_DAYS * 24 * 60 * 60 * 1000;

const publicSubscriptionPayload = (restaurant) => {
  const slice = getSubscriptionSlice(restaurant);
  const effectivePlan = getEffectivePlanKey(restaurant);
  const limits = getEffectiveLimits(restaurant);
  return {
    plan: slice.plan,
    status: slice.status,
    effectivePlan,
    canPerformWrites: canPerformWrites(restaurant),
    currentPeriodEnd: slice.currentPeriodEnd,
    gracePeriodEnd: slice.gracePeriodEnd,
    hasStripeCustomer: Boolean(slice.stripeCustomerId),
    limits: {
      maxMenuItems: limits.maxMenuItems === Infinity ? null : limits.maxMenuItems,
      maxStaffSeats: limits.maxStaffSeats === Infinity ? null : limits.maxStaffSeats,
      maxReportRange: limits.maxReportRange,
      customReports: limits.customReports,
      ingredientsFull: limits.ingredientsFull,
      qrPremium: limits.qrPremium
    }
  };
};

module.exports = {
  PLANS,
  PLAN_ORDER,
  GRACE_DAYS,
  normalizePlan,
  normalizeStatus,
  getSubscriptionSlice,
  canPerformWrites,
  getEffectivePlanKey,
  getEffectiveLimits,
  assertReportRangeAllowed,
  assertMenuItemCapacity,
  assertStaffCapacity,
  assertIngredientsFullAccess,
  assertQrPremiumAccess,
  getGracePeriodMs,
  publicSubscriptionPayload
};
