import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { menuService } from '../services/menuService';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

interface MenuItemForReport {
  _id: string;
  name: string;
  views?: number;
  image?: string | null;
}

interface AllergenUsage {
  name: string;
  value: number;
  color: string;
}

interface ComplianceItem {
  key: string;
  label: string;
  detail: string;
  value: number;
  colorClass: string;
}

const ALLERGEN_USAGE: AllergenUsage[] = [
  { name: 'Milk', value: 45, color: '#ef4444' },
  { name: 'Gluten', value: 32, color: '#f59e0b' },
  { name: 'Peanuts', value: 18, color: '#eab308' },
  { name: 'Soy', value: 12, color: '#3b82f6' },
  { name: 'Eggs', value: 8, color: '#8b5cf6' },
  { name: 'Others', value: 5, color: '#94a3b8' }
];

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { key: 'tagged', label: 'Menu Items Tagged', detail: '45 of 47 items', value: 95, colorClass: 'text-green-600' },
  { key: 'training', label: 'Staff Training Complete', detail: 'All staff certified', value: 100, colorClass: 'text-green-600' },
  { key: 'docs', label: 'Documentation Updated', detail: 'Last updated 3 days ago', value: 87, colorClass: 'text-amber-600' },
  { key: 'kitchen', label: 'Kitchen Procedures', detail: 'Cross-contamination protocols', value: 100, colorClass: 'text-green-600' }
];

const KPI_CARDS = [
  { label: 'Avg. Dish Rating', value: '4.6', trend: '+0.2 vs last month', icon: '★' },
  { label: 'Active Users', value: '1,247', trend: '+18% vs last month', icon: '👥' },
  { label: 'Allergen Checks', value: '234', trend: '+8% vs last month', icon: '🛡️' },
  { label: 'Items with Full Data', value: '95%', trend: '+5% vs last month', icon: '📊' }
];

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [topDishes, setTopDishes] = useState<MenuItemForReport[]>([]);
  const [topDishesLoading, setTopDishesLoading] = useState(true);

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const profilePicture = localStorage.getItem('profilePicture');
  const displayRole = formatRoleLabel(userRole);

  const maxAllergenValue = Math.max(...ALLERGEN_USAGE.map((x) => x.value), 1);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await menuService.getAllItems();
        const items: MenuItemForReport[] = res?.data ?? [];
        const sorted = [...items].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
        setTopDishes(sorted.slice(0, 5));
      } catch (_) {
        setTopDishes([]);
      } finally {
        setTopDishesLoading(false);
      }
    };
    load();
  }, []);

  const maxViews = useMemo(() => Math.max(...topDishes.map((d) => d.views ?? 0), 1), [topDishes]);

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title="Smart Menu" subtitle="Reports & Analytics" />
          </div>
          <WorkspaceContextBar restaurantName={restaurantName} />

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <ProfileDropdown userName={userName} userEmail={userEmail} restaurantName={restaurantName} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        <aside className="bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 w-64 min-w-[16rem]">
          <nav className="p-6 flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2">
              <button onClick={() => navigate('/dashboard')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="flex-1 text-left">Dashboard</span>
              </button>
              <button onClick={() => navigate('/menu-items')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <Icon path={mdiSilverwareForkKnife} size={0.9} className="flex-shrink-0" />
                <span className="flex-1 text-left">Menu Items</span>
              </button>
              <button onClick={() => navigate('/allergens')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <ShieldCheckIcon size={20} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">Allergens</span>
              </button>
              <button onClick={() => navigate('/ingredients')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <Icon path={mdiLeaf} size={1} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">Ingredients</span>
              </button>
              <button onClick={() => navigate('/staff')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">Staff Management</span>
              </button>
              <button onClick={() => navigate('/qr-codes')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="flex-1 text-left">QR Codes</span>
              </button>
            </div>

            <div className="space-y-2 pt-4 mt-auto flex-shrink-0">
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">Reports</span>
              </button>
              <button onClick={() => navigate('/settings')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="flex-1 text-left">Settings</span>
              </button>
            </div>
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 pb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {profilePicture ? (
                  <img src={profilePicture} alt={userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white capitalize truncate">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayRole}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition flex-shrink-0" title="Logout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Reports & Analytics</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track menu performance and allergen compliance health</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRange('7d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === '7d' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setRange('30d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === '30d' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                >
                  Last 30 Days
                </button>
                <button
                  onClick={() => setRange('custom')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === 'custom' ? 'bg-green-500 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
                >
                  Custom
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-gray-300 text-gray-700 hover:bg-gray-50">
                  Export Report
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Performing Dishes</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Most viewed (by menu item views)</p>

                {topDishesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topDishes.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-4">No menu items yet. Add dishes to see top performers here.</p>
                    ) : (
                      topDishes.map((dish, index) => {
                        const views = dish.views ?? 0;
                        const growthPct = maxViews > 0 ? Math.round((views / maxViews) * 100) : 0;
                        return (
                          <div key={dish._id} className="grid grid-cols-[32px_44px_1fr_70px_48px] items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-bold flex items-center justify-center">{index + 1}</span>
                            <div className="relative w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {dish.image ? (
                                <img src={dish.image} alt={dish.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; const next = e.currentTarget.parentElement?.querySelector('.top-dish-placeholder'); if (next) (next as HTMLElement).classList.remove('hidden'); }} />
                              ) : null}
                              <span className={`top-dish-placeholder w-full h-full flex items-center justify-center text-gray-400 text-xl ${dish.image ? 'hidden absolute inset-0' : ''}`}>🍽</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{dish.name}</p>
                              <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-500" style={{ width: `${growthPct}%` }} />
                              </div>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{views} views</p>
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400 text-right">{growthPct}%</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Most Filtered Allergens</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customer filter usage</p>

                <div className="h-48 flex items-end gap-4 px-2">
                  {ALLERGEN_USAGE.map((item) => (
                    <div key={item.name} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full rounded-t-md" style={{ height: `${(item.value / maxAllergenValue) * 100}%`, backgroundColor: item.color }} />
                      <p className="text-[11px] text-gray-500 -rotate-12">{item.name}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Views & Engagement</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Last 30 days</p>
                <div className="h-60">
                  <svg viewBox="0 0 960 260" className="w-full h-full">
                    <g stroke="#e5e7eb" strokeWidth="1">
                      <line x1="60" y1="20" x2="60" y2="210" />
                      <line x1="60" y1="210" x2="920" y2="210" />
                      {[180, 300, 420, 540, 660, 780, 900].map((x) => <line key={x} x1={x} y1="20" x2={x} y2="210" />)}
                      {[170, 130, 90, 50].map((y) => <line key={y} x1="60" y1={y} x2="920" y2={y} />)}
                    </g>
                    <polyline fill="none" stroke="#10b981" strokeWidth="3.5" points="60,165 180,150 300,140 420,130 540,112 660,98 780,90 900,80" />
                    <polyline fill="none" stroke="#3b82f6" strokeWidth="3.5" points="60,190 180,182 300,174 420,166 540,156 660,146 780,136 900,128" />
                    {['Oct 1', 'Oct 5', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 25', 'Oct 30'].map((d, i) => (
                      <text key={d} x={60 + i * 140} y={236} fontSize="12" textAnchor="middle" fill="#6b7280">{d}</text>
                    ))}
                  </svg>
                </div>
                <div className="mt-2 flex items-center gap-5 text-xs">
                  <span className="text-blue-600">↔ Allergen Filtered Views</span>
                  <span className="text-green-600">↔ Total Views</span>
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Allergen Compliance</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">UK Food Information Regulations 2014</p>

                <div className="space-y-4">
                  {COMPLIANCE_ITEMS.map((item) => (
                    <div key={item.key}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <p className="font-medium text-gray-800 dark:text-white">{item.label}</p>
                        <p className="text-gray-500">{item.detail}</p>
                        <p className={`font-semibold ${item.colorClass}`}>{item.value}%</p>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div
                          className={`h-full ${item.value >= 95 ? 'bg-green-500' : item.value >= 85 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${item.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-green-100 text-green-700 px-4 py-1.5 text-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> COMPLIANT
                  </span>
                  <p className="text-xs text-gray-500 mt-1">Overall status: Good</p>
                </div>

                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm font-semibold text-red-700">2 items need allergen tagging</p>
                  <button className="mt-2 text-xs px-3 py-1 bg-white border border-red-300 text-red-700 rounded-md">Review Now</button>
                </div>
              </section>
            </div>

            <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
              {KPI_CARDS.map((card) => (
                <div key={card.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                  <p className="text-xl">{card.icon}</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{card.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                  <p className="text-xs font-medium text-green-600 mt-1">{card.trend}</p>
                </div>
              ))}
            </section>

            <section className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Data Wiring Guide (Connect Later)</h3>
              <p className="text-sm text-gray-500 mt-1">Use this mapping when replacing dummy data with live data.</p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="font-semibold text-gray-800">Top Performing Dishes</p>
                  <p className="text-gray-600 mt-1">Source: menu views / analytics table</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="font-semibold text-gray-800">Most Filtered Allergens</p>
                  <p className="text-gray-600 mt-1">Source: public filter events per allergen</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="font-semibold text-gray-800">Views & Engagement Trend</p>
                  <p className="text-gray-600 mt-1">Source: daily menu page views + filter interactions</p>
                </div>
                <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
                  <p className="font-semibold text-gray-800">Compliance Metrics</p>
                  <p className="text-gray-600 mt-1">Source: menu tagging completeness + staff training records</p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
