import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { qrService } from '../services/qrService';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

interface TopDishRow {
  _id: string;
  name: string;
  image?: string | null;
  viewsInRange: number;
  views?: number;
}

interface AllergenUsage {
  name: string;
  value: number;
  color: string;
}

interface EngagementRow {
  date: string;
  label: string;
  totalViews: number;
  filteredViews: number;
}

interface ReportKpis {
  totalScans: number;
  uniqueVisitors: number;
  avgTimeSeconds: number;
  orders: number;
  filterEvents: number;
}

interface Compliance {
  menuItemsTaggedPct: number;
  menuItemsTaggedDetail: string;
  untaggedCount: number;
  overallOk: boolean;
}

const BAR_COLORS = ['#ef4444', '#f59e0b', '#eab308', '#3b82f6', '#8b5cf6', '#14b8a6', '#94a3b8'];

const defaultCustomDates = () => {
  const end = new Date();
  const start = new Date();
  start.setUTCDate(start.getUTCDate() - 6);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10)
  };
};

const Reports: React.FC = () => {
  const navigate = useNavigate();
  const [range, setRange] = useState<'7d' | '30d' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [topDishes, setTopDishes] = useState<TopDishRow[]>([]);
  const [allergenUsage, setAllergenUsage] = useState<AllergenUsage[]>([]);
  const [engagement, setEngagement] = useState<EngagementRow[]>([]);
  const [kpis, setKpis] = useState<ReportKpis | null>(null);
  const [compliance, setCompliance] = useState<Compliance | null>(null);
  const [rangeLabel, setRangeLabel] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const profilePicture = localStorage.getItem('profilePicture');
  const displayRole = formatRoleLabel(userRole);

  const maxAllergenValue = Math.max(...allergenUsage.map((x) => x.value), 1);
  const maxViewsRange = Math.max(...topDishes.map((d) => d.viewsInRange ?? 0), 1);

  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (range === 'custom') {
        const s = customStart || defaultCustomDates().startDate;
        const e = customEnd || defaultCustomDates().endDate;
        params.range = 'custom';
        params.startDate = s;
        params.endDate = e;
      } else {
        params.range = range === '30d' ? '30d' : '7d';
      }

      const res = await qrService.getRestaurantReports(params);
      const rows: Array<{ name: string; value: number }> = res?.allergenUsage ?? [];
      const withColors: AllergenUsage[] = rows.map((row, idx) => ({
        name: row.name,
        value: Number(row.value || 0),
        color: BAR_COLORS[idx % BAR_COLORS.length]
      }));
      setAllergenUsage(withColors);
      setTopDishes(res?.topDishes ?? []);
      setEngagement(res?.engagement ?? []);
      setKpis(res?.kpis ?? null);
      setCompliance(res?.compliance ?? null);
      setPeriodStart(res?.startDate ?? '');
      setPeriodEnd(res?.endDate ?? '');
      const r = res?.range || params.range;
      if (r === 'custom') {
        setRangeLabel(`${res?.startDate ?? ''} → ${res?.endDate ?? ''}`);
      } else if (r === '30d') {
        setRangeLabel('Last 30 days');
      } else {
        setRangeLabel('Last 7 days');
      }
    } catch {
      setAllergenUsage([]);
      setTopDishes([]);
      setEngagement([]);
      setKpis(null);
      setCompliance(null);
    } finally {
      setLoading(false);
    }
  }, [range, customStart, customEnd]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleCustomClick = () => {
    const d = defaultCustomDates();
    setCustomStart(d.startDate);
    setCustomEnd(d.endDate);
    setRange('custom');
  };

  const chartData = useMemo(
    () =>
      engagement.map((row) => ({
        name: row.label,
        totalViews: row.totalViews,
        filteredViews: row.filteredViews
      })),
    [engagement]
  );

  const formatDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  };

  const exportCsv = () => {
    if (!kpis || !periodStart) {
      return;
    }
    const lines: string[][] = [
      ['Smart Menu — Reports export'],
      ['Restaurant', restaurantName],
      ['Period', `${periodStart} to ${periodEnd}`],
      ['Range', rangeLabel],
      [],
      ['Metric', 'Value'],
      ['Total menu loads (scans)', String(kpis.totalScans)],
      ['Unique visitors (approx.)', String(kpis.uniqueVisitors)],
      ['Avg. session time', kpis.avgTimeSeconds > 0 ? formatDuration(kpis.avgTimeSeconds) : '—'],
      ['Orders placed', String(kpis.orders)],
      ['Allergen filter events', String(kpis.filterEvents)],
      [],
      ['Top dishes (detail views in range)', 'Views'],
      ...topDishes.map((d) => [d.name, String(d.viewsInRange)]),
      [],
      ['Allergen', 'Filter uses in range'],
      ...allergenUsage.map((a) => [a.name, String(a.value)])
    ];
    if (compliance) {
      lines.push(
        [],
        ['Allergen tagging', compliance.menuItemsTaggedDetail],
        ['Untagged items', String(compliance.untaggedCount)]
      );
    }
    const csv = lines
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-menu-report-${periodStart}-to-${periodEnd}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const compliancePct = compliance?.menuItemsTaggedPct ?? 0;

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
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {rangeLabel ? `${rangeLabel} · ` : ''}
                  Live data from QR menu visits, dish views, filters, and orders
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setRange('7d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === '7d' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                >
                  Last 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => setRange('30d')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === '30d' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={handleCustomClick}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${range === 'custom' ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200'}`}
                >
                  Custom
                </button>
                {range === 'custom' && (
                  <>
                    <input
                      type="date"
                      value={customStart || defaultCustomDates().startDate}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="date"
                      value={customEnd || defaultCustomDates().endDate}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="px-2 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-sm"
                    />
                  </>
                )}
                <button
                  type="button"
                  onClick={exportCsv}
                  disabled={loading || !kpis}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Export CSV
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Top Performing Dishes</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Most opened from the public menu in this period (detail views)
                    </p>

                    <div className="space-y-3">
                      {topDishes.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
                          No dish views in this period yet. Customers opening dish details will appear here.
                        </p>
                      ) : (
                        topDishes.map((dish, index) => {
                          const views = dish.viewsInRange ?? 0;
                          const growthPct = maxViewsRange > 0 ? Math.round((views / maxViewsRange) * 100) : 0;
                          const imgSrc = dish.image
                            ? dish.image.startsWith('http')
                              ? dish.image
                              : `${window.location.origin}${dish.image.startsWith('/') ? dish.image : `/${dish.image}`}`
                            : null;
                          return (
                            <div key={dish._id} className="grid grid-cols-[32px_44px_1fr_70px_48px] items-center gap-3">
                              <span className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <div className="relative w-11 h-11 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 overflow-hidden flex items-center justify-center flex-shrink-0">
                                {imgSrc ? (
                                  <img
                                    src={imgSrc}
                                    alt={dish.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.style.display = 'none';
                                      const next = e.currentTarget.parentElement?.querySelector('.top-dish-placeholder');
                                      if (next) (next as HTMLElement).classList.remove('hidden');
                                    }}
                                  />
                                ) : null}
                                <span
                                  className={`top-dish-placeholder w-full h-full flex items-center justify-center text-gray-400 text-xl ${imgSrc ? 'hidden absolute inset-0' : ''}`}
                                >
                                  🍽
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">{dish.name}</p>
                                <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-cyan-500"
                                    style={{ width: `${growthPct}%` }}
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 text-right">{views} views</p>
                              <p className="text-xs font-semibold text-green-600 dark:text-green-400 text-right">{growthPct}%</p>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Most Filtered Allergens</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Customer filter usage in this period</p>

                    {allergenUsage.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400 py-8">
                        No allergen filter usage in this period. Data appears when guests exclude allergens on the public menu.
                      </p>
                    ) : (
                      <div className="h-48 flex items-end gap-4 px-2">
                        {allergenUsage.map((item) => (
                          <div key={item.name} className="flex-1 flex flex-col items-center gap-2 min-w-0">
                            <div
                              className="w-full rounded-t-md min-h-[8px]"
                              style={{
                                height: `${(item.value / maxAllergenValue) * 100}%`,
                                backgroundColor: item.color
                              }}
                              title={`${item.name}: ${item.value}`}
                            />
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate w-full text-center" title={item.name}>
                              {item.name}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Views & Engagement</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{rangeLabel}</p>
                    <div className="h-60 w-full">
                      {chartData.length === 0 ? (
                        <p className="text-sm text-gray-500 py-8">No activity in this period.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-600" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="text-gray-500" />
                            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                            <Tooltip
                              contentStyle={{ borderRadius: 8 }}
                              labelFormatter={(label) => String(label)}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="totalViews" name="Menu loads" stroke="#10b981" strokeWidth={2} dot={false} />
                            <Line
                              type="monotone"
                              dataKey="filteredViews"
                              name="Allergen filter uses"
                              stroke="#3b82f6"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </section>

                  <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Allergen Compliance</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Based on dishes that have at least one allergen tag in your menu
                    </p>

                    {compliance && (
                      <>
                        <div className="space-y-4">
                          <div>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <p className="font-medium text-gray-800 dark:text-white">Menu items with allergen tags</p>
                              <p className="text-gray-500 dark:text-gray-400">{compliance.menuItemsTaggedDetail}</p>
                              <p
                                className={`font-semibold ${compliancePct >= 95 ? 'text-green-600' : compliancePct >= 80 ? 'text-amber-600' : 'text-red-600'}`}
                              >
                                {compliancePct}%
                              </p>
                            </div>
                            <div className="mt-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              <div
                                className={`h-full ${compliancePct >= 95 ? 'bg-green-500' : compliancePct >= 80 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, compliancePct)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 text-center">
                          <span
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${
                              compliance.overallOk
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${compliance.overallOk ? 'bg-green-500' : 'bg-amber-500'}`} />
                            {compliance.overallOk ? 'ALL ITEMS TAGGED' : 'ACTION NEEDED'}
                          </span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {compliance.overallOk
                              ? 'Every menu item has allergen information.'
                              : 'Add allergen tags so guests see accurate information.'}
                          </p>
                        </div>

                        {compliance.untaggedCount > 0 && (
                          <div className="mt-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3">
                            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                              {compliance.untaggedCount} item{compliance.untaggedCount === 1 ? '' : 's'} need allergen tagging
                            </p>
                            <button
                              type="button"
                              onClick={() => navigate('/menu-items')}
                              className="mt-2 text-xs px-3 py-1 bg-white dark:bg-gray-800 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-md"
                            >
                              Review menu items
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </section>
                </div>

                <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
                  {kpis && (
                    <>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <p className="text-xl">📱</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{kpis.totalScans}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Menu loads</p>
                        <p className="text-xs text-gray-400 mt-1">{rangeLabel}</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <p className="text-xl">👤</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{kpis.uniqueVisitors}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Unique visitors (approx.)</p>
                        <p className="text-xs text-gray-400 mt-1">First visit per device, per day</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <p className="text-xl">⏱</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">
                          {kpis.avgTimeSeconds > 0 ? formatDuration(kpis.avgTimeSeconds) : '—'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Avg. session time</p>
                        <p className="text-xs text-gray-400 mt-1">When guests leave the menu</p>
                      </div>
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
                        <p className="text-xl">🧾</p>
                        <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{kpis.orders}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Orders placed</p>
                        <p className="text-xs text-gray-400 mt-1">{kpis.filterEvents} allergen filter uses</p>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Reports;
