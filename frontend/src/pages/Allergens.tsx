import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { allergenService } from '../services/allergenService';
import { menuService } from '../services/menuService';
import { activityService } from '../services/activityService';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { AllergenDetail, getAllergenDetail } from '../data/allergenDetails';
import Icon from '@mdi/react';
import {
  mdiSilverwareForkKnife,
  mdiLeaf,
  mdiEgg,
  mdiFish,
  mdiNut,
  mdiGrain,
  mdiCarrot,
  mdiSeed,
  mdiFlask,
  mdiBottleTonic,
  mdiAlert,
  mdiBottleWineOutline
} from '@mdi/js';
import { useLanguage } from '../contexts/LanguageContext';

interface Allergen {
  _id: string;
  name: string;
  icon?: string;
  description: string;
  category?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  allergens?: { _id: string; name: string }[] | string[];
}

const ALLERGEN_ICON_MAP: Record<string, string> = {
  milk: mdiBottleTonic,
  eggs: mdiEgg,
  fish: mdiFish,
  crustaceans: mdiFish,
  molluscs: mdiFish,
  peanuts: mdiNut,
  'tree-nuts': mdiNut,
  soy: mdiSeed,
  gluten: mdiGrain,
  celery: mdiCarrot,
  mustard: mdiFlask,
  sesame: mdiSeed,
  sulphites: mdiBottleWineOutline,
  lupin: mdiLeaf
};

/** Background and icon color classes per allergen for a polished, recognizable look */
const ALLERGEN_COLORS: Record<string, { bg: string; icon: string }> = {
  milk: { bg: 'bg-sky-100 dark:bg-sky-900/40', icon: 'text-sky-600 dark:text-sky-400' },
  eggs: { bg: 'bg-amber-100 dark:bg-amber-900/40', icon: 'text-amber-700 dark:text-amber-400' },
  fish: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', icon: 'text-cyan-600 dark:text-cyan-400' },
  crustaceans: { bg: 'bg-rose-100 dark:bg-rose-900/40', icon: 'text-rose-600 dark:text-rose-400' },
  molluscs: { bg: 'bg-teal-100 dark:bg-teal-900/40', icon: 'text-teal-600 dark:text-teal-400' },
  peanuts: { bg: 'bg-amber-100 dark:bg-amber-900/40', icon: 'text-amber-800 dark:text-amber-300' },
  'tree-nuts': { bg: 'bg-orange-100 dark:bg-orange-900/40', icon: 'text-orange-700 dark:text-orange-400' },
  soy: { bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: 'text-emerald-600 dark:text-emerald-400' },
  gluten: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', icon: 'text-yellow-700 dark:text-yellow-400' },
  celery: { bg: 'bg-green-100 dark:bg-green-900/40', icon: 'text-green-600 dark:text-green-400' },
  mustard: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', icon: 'text-yellow-600 dark:text-yellow-500' },
  sesame: { bg: 'bg-stone-100 dark:bg-stone-700/50', icon: 'text-stone-600 dark:text-stone-300' },
  sulphites: { bg: 'bg-violet-100 dark:bg-violet-900/40', icon: 'text-violet-600 dark:text-violet-400' },
  lupin: { bg: 'bg-lime-100 dark:bg-lime-900/40', icon: 'text-lime-700 dark:text-lime-400' }
};

const DEFAULT_ALLERGEN_COLORS = { bg: 'bg-gray-100 dark:bg-gray-700', icon: 'text-gray-600 dark:text-gray-300' };

const Allergens: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activities, setActivities] = useState<{ id: string; action: string; text: string; time: string; user: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedAllergen, setSelectedAllergen] = useState<AllergenDetail | null>(null);

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const isAllergensPage = location.pathname === '/allergens';

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePicture(savedPic);
  }, []);

  useEffect(() => {
    if (!selectedAllergen) return undefined;

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedAllergen(null);
    };

    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [selectedAllergen]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [allergenRes, menuRes] = await Promise.all([
          allergenService.getAll(),
          menuService.getAllItems().catch(() => ({ data: [] }))
        ]);
        setAllergens(allergenRes?.data ?? []);
        setMenuItems(menuRes?.data ?? []);
        try {
          const act = await activityService.getActivities(5);
          setActivities(act ?? []);
        } catch {
          setActivities([]);
        }
      } catch (e) {
        console.error(e);
        if ((e as any)?.response?.status === 401) navigate('/login');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const filteredAllergens = searchQuery
    ? allergens.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : allergens;

  const totalDishes = menuItems.length;
  const itemsWithAllergens = menuItems.filter((m) => m.allergens && Array.isArray(m.allergens));
  const fullyTagged = itemsWithAllergens.length;
  const needAttention = Math.max(0, totalDishes - fullyTagged);
  const fullyTaggedPct = totalDishes ? Math.round((fullyTagged / totalDishes) * 100) : 0;
  const needAttentionPct = totalDishes ? Math.round((needAttention / totalDishes) * 100) : 0;
  const partiallyTagged = 0;
  const partiallyTaggedPct = totalDishes ? Math.round((partiallyTagged / totalDishes) * 100) : 0;
  const untaggedCount = needAttention;
  const untaggedPct = needAttentionPct;

  const allergenCounts: Record<string, number> = {};
  menuItems.forEach((item) => {
    const list = item.allergens;
    if (Array.isArray(list)) {
      list.forEach((a) => {
        const name = typeof a === 'string' ? a : (a as { name: string }).name;
        if (name) allergenCounts[name] = (allergenCounts[name] || 0) + 1;
      });
    }
  });
  const mostTagged = Object.entries(allergenCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxTagged = Math.max(...mostTagged.map(([, c]) => c), 1);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('restaurantName');
    localStorage.removeItem('userRole');
    localStorage.removeItem('qrCode');
    localStorage.removeItem('invitationAccepted');
    navigate('/login');
  };

  const getAllergenIconPath = (iconKey?: string): string => {
    if (!iconKey) return mdiAlert;
    return ALLERGEN_ICON_MAP[iconKey.toLowerCase()] ?? mdiAlert;
  };

  const getAllergenColors = (iconKey?: string) => {
    if (!iconKey) return DEFAULT_ALLERGEN_COLORS;
    return ALLERGEN_COLORS[iconKey.toLowerCase()] ?? DEFAULT_ALLERGEN_COLORS;
  };

  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center hover:bg-green-600 transition cursor-pointer"
              title="Go to Dashboard"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
              </svg>
            </button>
            <div className="text-left">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">{t('smartMenu')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allergens</p>
            </div>
          </div>

          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={t('searchMenuItems')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <ProfileDropdown userName={userName} userEmail={userEmail} restaurantName={restaurantName} />
          </div>
        </div>
      </header>

      <div className="flex flex-1 h-[calc(100vh-80px)]">
        <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full min-w-[16rem]">
          <nav className="flex-1 p-6 flex flex-col min-h-0 overflow-y-auto">
            <div className="space-y-2">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="flex-1 text-left">{t('dashboard')}</span>
              </button>

              <button
                onClick={() => navigate('/menu-items')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiSilverwareForkKnife} size={1} className="flex-shrink-0" />
                <span className="flex-1 text-left">{t('menuItems')}</span>
              </button>

              <button
                onClick={() => navigate('/allergens')}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg font-medium text-sm transition ${
                  isAllergensPage ? 'bg-green-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ShieldCheckIcon size={20} className={`flex-shrink-0 ${isAllergensPage ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                <span className="flex-1 text-left">{t('allergens')}</span>
              </button>

              <button
                onClick={() => navigate('/ingredients')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiLeaf} size={1} className="flex-shrink-0" />
                <span className="flex-1 text-left">{t('ingredients')}</span>
              </button>

              <button
                onClick={() => navigate('/staff')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">{t('staffManagement')}</span>
              </button>

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

            <div className="space-y-2 pt-4 mt-auto flex-shrink-0">
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">{t('reports')}</span>
              </button>
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

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Allergen Management</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">UK Food Information Regulations 2014</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <button
                  onClick={() => navigate('/allergens/compliance')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-white rounded-lg font-medium transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>View Compliance Report</span>
                </button>
                <button
                  onClick={() => navigate('/menu-items')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-sm"
                >
                  <span>Review Now</span>
                </button>
              </div>
            </div>

            <div className="flex gap-8">
              <div className="flex-1 min-w-0">
                <section className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">The 14 UK Allergens</h3>
                  {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-36 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredAllergens.map((a) => {
                        const colors = getAllergenColors(a.icon);
                        return (
                        <div
                          key={a._id}
                          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition"
                        >
                          <div className="flex items-start gap-4">
                            <span
                              className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${colors.bg} ${colors.icon}`}
                              aria-label={a.name}
                            >
                              <Icon path={getAllergenIconPath(a.icon)} size={1.5} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-semibold text-gray-800 dark:text-white">{a.name}</h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                                {a.description?.split('.')[0] || a.name}
                              </p>
                              <button
                                type="button"
                                onClick={() => setSelectedAllergen(getAllergenDetail(a.name, a.description))}
                                className="mt-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                              >
                                Learn More
                              </button>
                            </div>
                          </div>
                        </div>
                      ); })}
                    </div>
                  )}
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Allergen Tagging Status</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Fully Tagged Items</span>
                        <span className="font-medium text-gray-800 dark:text-white">{fullyTagged} of {totalDishes} dishes</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full" style={{ width: `${fullyTaggedPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{fullyTaggedPct}% Complete</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Partially Tagged</span>
                        <span className="font-medium text-gray-800 dark:text-white">{partiallyTagged} of {totalDishes} dishes</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${partiallyTaggedPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{partiallyTaggedPct}% Needs Review</p>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Untagged Items</span>
                        <span className="font-medium text-gray-800 dark:text-white">{untaggedCount} of {totalDishes} dishes</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${untaggedPct}%` }} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{untaggedPct}% Incomplete</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="w-80 flex-shrink-0 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Quick Stats</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <ShieldCheckIcon size={16} className="text-green-600 dark:text-green-400" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{totalDishes} Total Dishes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{fullyTagged} Fully Compliant</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{needAttention} Need Attention</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Most Tagged Allergens</h4>
                  <div className="space-y-3">
                    {mostTagged.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No dishes tagged yet.</p>
                    ) : (
                      mostTagged.map(([name, count]) => (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-700 dark:text-gray-300">{name}</span>
                            <span className="font-medium text-gray-800 dark:text-white">{count} dishes</span>
                          </div>
                          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-500 rounded-full"
                              style={{ width: `${(count / maxTagged) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-3">Recent Changes</h4>
                  <div className="space-y-3">
                    {activities.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity.</p>
                    ) : (
                      activities.slice(0, 4).map((act) => (
                        <div key={act.id} className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                            {act.user?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 dark:text-white truncate">{act.text}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{act.time}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {needAttention > 0 && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 dark:text-white">{needAttention} dishes need allergen review</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Complete allergen tagging to ensure compliance</p>
                        <button
                          onClick={() => navigate('/menu-items')}
                          className="mt-3 w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium text-sm transition"
                        >
                          Review Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {selectedAllergen && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedAllergen(null)}
          />

          <aside className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-800 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between">
              <div className="pr-4">
                <p className="text-xs uppercase tracking-wide text-green-600 dark:text-green-400 font-semibold">
                  Allergen guidance
                </p>
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                  {selectedAllergen.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAllergen(null)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition"
                aria-label="Close allergen details"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Overview
                </h4>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                  {selectedAllergen.description}
                </p>
              </section>

              <section>
                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Common Sources</h4>
                <ul className="space-y-2 list-disc pl-5 text-gray-700 dark:text-gray-300">
                  {selectedAllergen.commonSources.map((source) => (
                    <li key={source}>{source}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                <h4 className="text-base font-semibold text-amber-700 dark:text-amber-300 mb-2">
                  Hidden Sources (Watch Out)
                </h4>
                <ul className="space-y-2 list-disc pl-5 text-amber-800 dark:text-amber-200">
                  {selectedAllergen.hiddenSources.map((source) => (
                    <li key={source}>{source}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Cross-Contamination Risks</h4>
                <ul className="space-y-2 list-disc pl-5 text-gray-700 dark:text-gray-300">
                  {selectedAllergen.crossContaminationRisks.map((risk) => (
                    <li key={risk}>{risk}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-2">Symptoms to Monitor</h4>
                <ul className="space-y-2 list-disc pl-5 text-gray-700 dark:text-gray-300">
                  {selectedAllergen.symptoms.map((symptom) => (
                    <li key={symptom}>{symptom}</li>
                  ))}
                </ul>
              </section>

              <section className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <h4 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2">Kitchen Safety Tips</h4>
                <ul className="space-y-2 list-disc pl-5 text-green-800 dark:text-green-200">
                  <li>Use separate preparation areas and utensils for allergen-sensitive orders.</li>
                  <li>Label storage containers clearly and update prep sheets every shift.</li>
                  <li>Sanitize surfaces, tools, and gloves before switching tasks.</li>
                </ul>
              </section>

              <section>
                <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-2">UK Regulation</h4>
                <p className="text-gray-700 dark:text-gray-300">{selectedAllergen.ukRegulation}</p>
              </section>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Allergens;
