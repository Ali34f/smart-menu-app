import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { authService } from '../services/authService';
import { menuService } from '../services/menuService';
import { activityService, Activity } from '../services/activityService';
import { qrService } from '../services/qrService';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { useLanguage } from '../contexts/LanguageContext';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

type GuestOrderRow = {
  orderId: string;
  orderNumber: string;
  status: string;
  tableNumber: number;
  paymentMethod: string;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; lineTotal?: number }>;
  createdAt?: string;
};

const GUEST_ORDER_STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'confirmed', label: 'Confirmed (legacy)' }
] as const;

const formatGuestOrderMoney = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 2 }).format(
    Number(n) || 0
  );

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isAvailable: boolean;
  allergens?: Array<{ _id?: string; name?: string } | string>;
}


const getActivityIcon = (action: string) => {
  const iconConfig: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
    'menu_item_created': {
      bg: 'bg-green-100',
      color: 'text-green-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      )
    },
    'menu_item_updated': {
      bg: 'bg-blue-100',
      color: 'text-blue-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    'menu_item_deleted': {
      bg: 'bg-red-100',
      color: 'text-red-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )
    },
    'availability_changed': {
      bg: 'bg-orange-100',
      color: 'text-orange-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    },
    'allergen_updated': {
      bg: 'bg-yellow-100',
      color: 'text-yellow-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )
    },
    'price_updated': {
      bg: 'bg-purple-100',
      color: 'text-purple-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  };

  return iconConfig[action] || {
    bg: 'bg-gray-100',
    color: 'text-gray-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  };
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllergensPage = location.pathname === '/allergens';
  const { t } = useLanguage();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [welcomeAnimated, setWelcomeAnimated] = useState(false);

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  /** Last 7 days: dish detail views on public menu (from Restaurant.menuItemViewsByDay). */
  const [popularThisWeek, setPopularThisWeek] = useState<Array<{ name: string; views: number }>>([]);
  /** Menu loads today from dailyScans (UTC date key). */
  const [menuLoadsToday, setMenuLoadsToday] = useState<number | null>(null);
  const [mostViewedDishName, setMostViewedDishName] = useState<string | null>(null);
  const [guestOrders, setGuestOrders] = useState<GuestOrderRow[]>([]);
  const [guestOrdersLoading, setGuestOrdersLoading] = useState(false);
  const [guestOrderUpdatingId, setGuestOrderUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
      setProfilePicture(savedPic);
    }
  }, []);

  const getCurrentDateTime = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    const date = now.toLocaleDateString('en-GB', options);
    const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${date} | ${time}`;
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Small attention-grabber animation on first load.
    setWelcomeAnimated(true);
    const t = setTimeout(() => setWelcomeAnimated(false), 1600);
    return () => clearTimeout(t);
  }, []);

  const fetchGuestOrders = async () => {
    setGuestOrdersLoading(true);
    try {
      const res = await menuService.getPublicOrders();
      const rows = Array.isArray(res?.data) ? res.data : [];
      setGuestOrders(rows as GuestOrderRow[]);
    } catch {
      setGuestOrders([]);
    } finally {
      setGuestOrdersLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [menuData, activities, reportsRes, scansRes] = await Promise.all([
        menuService.getAllItems(),
        activityService.getActivities(50),
        qrService.getRestaurantReports({ range: '7d' }).catch(() => null),
        qrService.getScanAnalytics({ range: '7d' }).catch(() => null)
      ]);
      setMenuItems(menuData.data || []);
      setRecentActivity(activities || []);

      const top = reportsRes?.topDishes;
      if (Array.isArray(top) && top.length > 0) {
        setPopularThisWeek(
          top.slice(0, 5).map((d: { name: string; viewsInRange?: number }) => ({
            name: d.name,
            views: Number(d.viewsInRange ?? 0)
          }))
        );
        setMostViewedDishName(top[0]?.name ?? null);
      } else {
        setPopularThisWeek([]);
        setMostViewedDishName(null);
      }

      const todayKey = new Date().toISOString().slice(0, 10);
      const dayRows = scansRes?.data;
      if (Array.isArray(dayRows)) {
        const todayRow = dayRows.find((r: { date: string }) => r?.date === todayKey);
        setMenuLoadsToday(todayRow != null ? Number(todayRow.count ?? 0) : 0);
      } else {
        setMenuLoadsToday(null);
      }
    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);

      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) {
      void fetchGuestOrders();
    }
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const id = window.setInterval(() => {
      void fetchGuestOrders();
    }, 20000);
    return () => clearInterval(id);
  }, [loading]);

  const handleGuestOrderStatusChange = async (orderId: string, status: string) => {
    setGuestOrderUpdatingId(orderId);
    try {
      await menuService.updatePublicOrderStatus(orderId, status);
      await fetchGuestOrders();
    } catch (e) {
      console.error(e);
    } finally {
      setGuestOrderUpdatingId(null);
    }
  };

  const totalItems = menuItems.length;
  const activeItems = menuItems.filter(item => item.isAvailable).length;

  const maxPopularViews = Math.max(1, ...popularThisWeek.map((p) => p.views));

  const allergenColorMap: Record<string, string> = {
    Gluten: '#EF4444',
    Dairy: '#F59E0B',
    Nuts: '#6B7280',
    Other: '#3B82F6'
  };

  const normalizeAllergenName = (rawName: string): 'Gluten' | 'Dairy' | 'Nuts' | 'Other' => {
    const name = rawName.toLowerCase();
    if (name.includes('gluten') || name.includes('wheat') || name.includes('barley') || name.includes('rye')) return 'Gluten';
    if (name.includes('milk') || name.includes('dairy') || name.includes('lactose')) return 'Dairy';
    if (name.includes('nut') || name.includes('peanut') || name.includes('almond') || name.includes('cashew') || name.includes('hazelnut') || name.includes('pistachio') || name.includes('walnut')) return 'Nuts';
    return 'Other';
  };

  const allergenCounts = menuItems.reduce<Record<'Gluten' | 'Dairy' | 'Nuts' | 'Other', number>>(
    (acc, item) => {
      const allergens = Array.isArray(item.allergens) ? item.allergens : [];
      allergens.forEach((allergen) => {
        const label =
          typeof allergen === 'string'
            ? normalizeAllergenName(allergen)
            : normalizeAllergenName(allergen?.name || 'other');
        acc[label] += 1;
      });
      return acc;
    },
    { Gluten: 0, Dairy: 0, Nuts: 0, Other: 0 }
  );

  const totalAllergenTags = Object.values(allergenCounts).reduce((sum, count) => sum + count, 0);
  const chartSegments = (Object.entries(allergenCounts) as Array<[keyof typeof allergenCounts, number]>)
    .filter(([, count]) => count > 0)
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalAllergenTags > 0 ? Math.round((count / totalAllergenTags) * 100) : 0,
      color: allergenColorMap[name]
    }));

  const fallbackSegments = [
    { name: 'Gluten', count: 0, percentage: 35, color: allergenColorMap.Gluten },
    { name: 'Dairy', count: 0, percentage: 25, color: allergenColorMap.Dairy },
    { name: 'Nuts', count: 0, percentage: 13, color: allergenColorMap.Nuts },
    { name: 'Other', count: 0, percentage: 27, color: allergenColorMap.Other }
  ];
  const activeChartSegments = chartSegments.length > 0 ? chartSegments : fallbackSegments;

  const handleLogout = () => {
    authService.logout();
  };

  const displayedActivity = showAllActivity ? recentActivity : recentActivity.slice(0, 5);
  const displayRole = formatRoleLabel(userRole);
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title={t('smartMenu')} subtitle={t('dashboardOverview')} />
          </div>
          <WorkspaceContextBar restaurantName={restaurantName} />

          {/* Notifications and Profile */}
          <div className="flex items-center space-x-4">
            <NotificationBell />

            {/* Profile Dropdown */}
            <ProfileDropdown
              userName={userName}
              userEmail={userEmail}
              restaurantName={restaurantName}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        {/* Sidebar - COMPLETELY FIXED (NO SCROLL) */}
        <aside className="bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 w-64 min-w-[16rem]">
          {/* Navigation - scrollable so Allergens & Reports always reachable */}
          <nav className="p-6 flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-2">
              {/* Dashboard */}
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="flex-1 text-left">{t('dashboard')}</span>
              </button>

              {/* Menu Items */}
              <button
                onClick={() => navigate('/menu-items')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiSilverwareForkKnife} size={0.8} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">{t('menuItems')}</span>
              </button>

              {/* Allergens */}
              <button
                onClick={() => navigate('/allergens')}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg font-medium text-sm transition ${
                  isAllergensPage ? 'bg-green-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ShieldCheckIcon size={20} className={`flex-shrink-0 ${isAllergensPage ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                <span className="flex-1 text-left">{t('allergens')}</span>
              </button>

              {/* Ingredients */}
              <button
                onClick={() => navigate('/ingredients')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiLeaf} size={1} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">{t('ingredients')}</span>
              </button>

              {/* Staff Management */}
              <button
                onClick={() => navigate('/staff')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">{t('staffManagement')}</span>
              </button>

              {/* QR Codes */}
              <button
                onClick={() => navigate('/qr-codes')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="flex-1 text-left">{t('qrCodes')}</span>
              </button>
            </div>

            {/* Reports & Settings */}
            <div className="space-y-2 pt-4 mt-auto flex-shrink-0">
              {/* Reports */}
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">{t('reports')}</span>
              </button>

              {/* Settings */}
              <button
                onClick={() => navigate('/settings')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="flex-1 text-left">{t('settings')}</span>
              </button>
            </div>
          </nav>

          {/* Quick Stats Card */}
          <div className="mx-6 mb-4 p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl border border-green-200 dark:border-green-800">
            <p className="text-xs font-semibold text-green-800 dark:text-green-300 mb-2">{t('todaysOverview')}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 dark:text-green-400">{t('total')}</span>
                <span className="text-sm font-bold text-green-900 dark:text-green-200">{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 dark:text-green-400">{t('active')}</span>
                <span className="text-sm font-bold text-green-900 dark:text-green-200">{activeItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-green-700 dark:text-green-400">{t('queries')}</span>
                <span className="text-sm font-bold text-green-900 dark:text-green-200">
                  {menuLoadsToday === null ? '—' : menuLoadsToday}
                </span>
              </div>
            </div>
          </div>

          {/* Help Card */}
          <div className="mx-6 mb-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start space-x-2">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-0.5">{t('needHelp')}</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">Tips for managing your restaurant menu.</p>
                <button className="mt-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
                  {t('viewGuide')} →
                </button>
              </div>
            </div>
          </div>

          {/* Fixed User Card at Bottom */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-white dark:bg-gray-800 mt-auto pb-6">
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
                  <p className="text-sm font-medium text-gray-800 dark:text-white capitalize truncate">
                    {userName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{displayRole}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition flex-shrink-0"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content - */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
              </div>
            ) : (
              <>
            {/* Welcome Section */}
            <motion.div
              className="mb-8"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
            >
              <h2
                className={`text-3xl font-bold text-gray-800 dark:text-white mb-2 transition-transform duration-300 ${
                  welcomeAnimated ? 'animate-bounce' : ''
                }`}
              >
                {t('welcomeBack')}, {userName.charAt(0).toUpperCase() + userName.slice(1)}!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">{getCurrentDateTime()}</p>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Menu Items - REAL DATA ✅ */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.03 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('totalMenuItems')}</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{totalItems}</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* Active Items - REAL DATA ✅ */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.07 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('activeItems')}</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">{activeItems}</p>
                  </div>
                  <div className="w-14 h-14 bg-green-100 dark:bg-green-900/50 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* Menu loads today — from public QR menu opens (dailyScans, UTC day). */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.11 }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('queriesToday')}</p>
                    <p className="text-4xl font-bold text-gray-800 dark:text-white">
                      {menuLoadsToday === null ? '—' : menuLoadsToday}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/50 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </motion.div>

              {/* Top dish by detail views in the last 7 days (same source as Popular This Week). */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.24, delay: 0.15 }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{t('mostViewed')}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-white truncate" title={mostViewedDishName || undefined}>
                      {mostViewedDishName || '—'}
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/50 rounded-xl flex items-center justify-center">
                    <svg className="w-7 h-7 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Guest orders from public QR menu */}
            <motion.div
              className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Guest orders</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Orders placed from your public menu. Update status so guests see progress on their phones.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void fetchGuestOrders()}
                  disabled={guestOrdersLoading}
                  className="text-sm font-semibold text-green-600 dark:text-green-400 hover:text-green-700 disabled:opacity-50"
                >
                  {guestOrdersLoading ? 'Refreshing…' : 'Refresh'}
                </button>
              </div>
              <div className="overflow-x-auto">
                {guestOrdersLoading && guestOrders.length === 0 ? (
                  <div className="flex justify-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-green-500 border-t-transparent" />
                  </div>
                ) : guestOrders.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 px-6 py-8 text-center">
                    No guest orders yet. When customers order from the QR menu, they will appear here.
                  </p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Ref</th>
                        <th className="px-4 py-3">Table</th>
                        <th className="px-4 py-3">Items</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3 min-w-[10rem]">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {guestOrders.map((o) => {
                        const created = o.createdAt ? new Date(o.createdAt) : null;
                        const timeStr = created
                          ? created.toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '—';
                        const itemSummary = (o.items || [])
                          .map((it) => `${it.quantity}× ${it.name}`)
                          .slice(0, 2)
                          .join(', ');
                        const more =
                          (o.items || []).length > 2 ? ` +${(o.items || []).length - 2} more` : '';
                        const normalizedStatus = String(o.status || 'placed').toLowerCase();
                        return (
                          <tr key={o.orderId} className="text-gray-800 dark:text-gray-200">
                            <td className="px-4 py-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {timeStr}
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold">{o.orderNumber}</td>
                            <td className="px-4 py-3">{o.tableNumber}</td>
                            <td className="px-4 py-3 max-w-[14rem]">
                              <span className="line-clamp-2" title={(o.items || []).map((it) => `${it.quantity}× ${it.name}`).join(', ')}>
                                {itemSummary}
                                {more}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium tabular-nums">
                              {formatGuestOrderMoney(o.totalAmount)}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={
                                  GUEST_ORDER_STATUS_OPTIONS.some((opt) => opt.value === normalizedStatus)
                                    ? normalizedStatus
                                    : 'placed'
                                }
                                onChange={(e) =>
                                  void handleGuestOrderStatusChange(o.orderId, e.target.value)
                                }
                                disabled={guestOrderUpdatingId === o.orderId}
                                className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm py-2 px-2 focus:ring-2 focus:ring-green-500/30 focus:border-green-500"
                              >
                                {GUEST_ORDER_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </motion.div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Recent Activity - Left Column (2/3 width) */}
              <motion.div
                className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.12 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">{t('recentActivity')}</h3>
                  {recentActivity.length > 5 && (
                    <button
                      onClick={() => setShowAllActivity((prev) => !prev)}
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 text-sm font-medium"
                    >
                      {showAllActivity ? 'Show less' : t('viewAll')}
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {displayedActivity.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {displayedActivity.map((activity) => {
                        const iconStyle = getActivityIcon(activity.action);
                        return (
                        <motion.div
                          key={activity.id}
                          className="flex items-start space-x-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0"
                          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                          animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                          exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                          <div className={`flex-shrink-0 w-10 h-10 ${iconStyle.bg} rounded-lg flex items-center justify-center ${iconStyle.color}`}>
                            {iconStyle.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-800 dark:text-white font-medium">{activity.text}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{activity.time} · {activity.user}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    </AnimatePresence>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">No recent activity yet. Start by adding or editing menu items!</p>
                  )}
                </div>
              </motion.div>

              {/* Popular This Week - Right Column (1/3 width) */}
              <motion.div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.16 }}
              >
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-1">{t('popularThisWeek')}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Detail views on the public menu (last 7 days)
                </p>

                <div className="space-y-4">
                  {popularThisWeek.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No dish views in the last 7 days yet. Guests opening dish details from your QR menu will show up here.
                    </p>
                  ) : (
                    popularThisWeek.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300 font-medium truncate mr-2">{item.name}</span>
                          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">{item.views}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <motion.div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            initial={shouldReduceMotion ? false : { width: 0 }}
                            animate={
                              shouldReduceMotion
                                ? undefined
                                : { width: `${(item.views / maxPopularViews) * 100}%` }
                            }
                            transition={{ duration: 0.6, delay: 0.05 * index }}
                            style={{ width: `${(item.views / maxPopularViews) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6">{t('quickActions')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.button
                  onClick={() => navigate('/menu-items/new')}
                  className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3 transition shadow-sm hover:shadow-md"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span className="font-semibold">{t('addNewDish')}</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/allergens')}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3 transition shadow-sm hover:shadow-md"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-semibold">{t('updateAllergens')}</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/reports')}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3 transition shadow-sm hover:shadow-md"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="font-semibold">{t('viewReports')}</span>
                </motion.button>

                <motion.button
                  onClick={() => navigate('/staff')}
                  className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-6 flex flex-col items-center justify-center space-y-3 transition shadow-sm hover:shadow-md"
                  whileHover={shouldReduceMotion ? undefined : { y: -3, scale: 1.01 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="font-semibold">{t('manageStaff')}</span>
                </motion.button>
              </div>
            </div>

            {/* Most Filtered Allergens - Donut Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-8">{t('mostFilteredAllergens')}</h3>

              <div className="flex flex-col md:flex-row items-center justify-center gap-12">
                {/* Donut Chart */}
                <div className="relative w-64 h-64 flex-shrink-0">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {activeChartSegments.map((segment, index) => {
                      const previousPercentage = activeChartSegments
                        .slice(0, index)
                        .reduce((sum, seg) => sum + seg.percentage, 0);
                      return (
                        <circle
                          key={segment.name}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="20"
                          strokeDasharray={`${segment.percentage * 2.51} ${(100 - segment.percentage) * 2.51}`}
                          strokeDashoffset={`-${previousPercentage * 2.51}`}
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* Legend - Stacked Vertically */}
                <div className="space-y-4">
                  {activeChartSegments.map((allergen, index) => (
                    <div key={index} className="flex items-center space-x-4">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: allergen.color }}
                      ></div>
                      <div className="flex items-center justify-between min-w-[120px]">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">{allergen.name}</span>
                        <span className="text-gray-600 dark:text-gray-400 font-semibold ml-4">{allergen.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {totalAllergenTags > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-6 text-center">
                  Based on {totalAllergenTags} allergen tags across your current menu.
                </p>
              )}
            </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;