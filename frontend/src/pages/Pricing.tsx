import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import AppHeaderBranding from '../components/AppHeaderBranding';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

const tiers = [
  {
    id: 'free',
    name: 'Free',
    price: '£0',
    blurb: 'Try the full dashboard on a small scale.',
    features: ['Up to 30 menu items', 'Up to 3 staff seats', '7-day reports', 'Standard QR (black, PNG)']
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 'Paid (Stripe)',
    blurb: 'Growing venues with more dishes and team members.',
    features: ['Up to 200 menu items', 'Up to 15 staff seats', '30-day reports', 'Ingredients module', 'Custom QR colours & SVG']
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 'Paid (Stripe)',
    blurb: 'Full analytics and unlimited scale.',
    features: ['Unlimited menu items & staff', 'Custom date reports & CSV export', 'All Basic features']
  }
] as const;

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title="Smart Menu" subtitle="Plans & pricing" />
          </div>
          <WorkspaceContextBar restaurantName={restaurantName} />
          <div className="flex items-center space-x-4">
            <NotificationBell />
            <ProfileDropdown userName={userName} userEmail={userEmail} restaurantName={restaurantName} />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-10 w-full">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Subscription tiers</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Smart Menu bills per restaurant workspace. Owners can start checkout or manage an existing subscription from{' '}
            <Link to="/settings" className="text-green-600 dark:text-green-400 font-medium hover:underline">
              Settings
            </Link>
            . Stripe test mode is supported for demos.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-2xl border p-6 flex flex-col ${
                tier.id === 'basic'
                  ? 'border-green-500 bg-white dark:bg-gray-800 shadow-lg ring-2 ring-green-500/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{tier.name}</h2>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{tier.price}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 flex-1">{tier.blurb}</p>
              <ul className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-green-500 shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier.id !== 'free' ? (
                <button
                  type="button"
                  onClick={() => navigate('/settings')}
                  className="mt-6 w-full rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Upgrade in Settings
                </button>
              ) : (
                <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">Included for every new workspace.</p>
              )}
            </motion.div>
          ))}
        </div>

        <p className="mt-10 text-sm text-gray-500 dark:text-gray-400">
          After a failed card payment, Stripe marks the subscription past due. This app allows a configurable grace period
          (default 7 days, <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1 rounded">SUBSCRIPTION_GRACE_DAYS</code>)
          before blocking dashboard writes.
        </p>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mt-8 text-sm font-medium text-green-600 dark:text-green-400 hover:underline"
        >
          ← Back to dashboard
        </button>
      </main>
    </div>
  );
};

export default Pricing;
