const {
  canPerformWrites,
  getEffectivePlanKey,
  assertReportRangeAllowed,
  getGracePeriodMs,
  PLANS
} = require('../../config/plans');

describe('config/plans', () => {
  const prevGrace = process.env.SUBSCRIPTION_GRACE_DAYS;

  afterAll(() => {
    process.env.SUBSCRIPTION_GRACE_DAYS = prevGrace;
  });

  it('exposes finite limits for free tier', () => {
    expect(PLANS.free.maxMenuItems).toBe(30);
    expect(PLANS.free.maxReportRange).toBe('7d');
  });

  it('allows writes for active subscription', () => {
    expect(canPerformWrites({ subscription: { plan: 'premium', status: 'active' } })).toBe(true);
  });

  it('allows writes during past_due grace window', () => {
    const future = new Date(Date.now() + getGracePeriodMs());
    expect(
      canPerformWrites({
        subscription: { plan: 'basic', status: 'past_due', gracePeriodEnd: future }
      })
    ).toBe(true);
  });

  it('blocks writes after past_due grace expires', () => {
    const past = new Date(Date.now() - 1000);
    expect(
      canPerformWrites({
        subscription: { plan: 'basic', status: 'past_due', gracePeriodEnd: past }
      })
    ).toBe(false);
  });

  it('uses free limits when writes are blocked', () => {
    const r = { subscription: { plan: 'premium', status: 'canceled' } };
    expect(getEffectivePlanKey(r)).toBe('free');
  });

  it('rejects report ranges above plan max', () => {
    const r = { subscription: { plan: 'free', status: 'active' } };
    expect(assertReportRangeAllowed(r, '30d').ok).toBe(false);
    expect(assertReportRangeAllowed(r, '7d').ok).toBe(true);
  });
});
