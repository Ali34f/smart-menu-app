import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ingredientService } from '../services/ingredientService';
import { authService } from '../services/authService';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { useLanguage } from '../contexts/LanguageContext';

interface AllergenRef {
  _id: string;
  name: string;
  icon?: string;
}

interface Ingredient {
  _id: string;
  name: string;
  category: string;
  allergens: AllergenRef[] | string[];
  dishCount?: number;
  createdAt?: string;
}

const INGREDIENT_CATEGORIES = ['Protein', 'Dairy', 'Grains', 'Vegetables', 'Fruits', 'Spices', 'Oils', 'Other'];

const ALLERGEN_COLORS: Record<string, string> = {
  Milk: 'bg-red-500',
  Gluten: 'bg-orange-500',
  Peanuts: 'bg-red-600',
  'Tree Nuts': 'bg-purple-500',
  Eggs: 'bg-amber-500',
  Fish: 'bg-blue-500',
  Shellfish: 'bg-teal-500',
  Soy: 'bg-lime-600',
  Sesame: 'bg-amber-700'
};

const Ingredients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { toasts, removeToast, success, error: showError } = useToast();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [filteredIngredients, setFilteredIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedAllergenFilter, setSelectedAllergenFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const isIngredientsPage = location.pathname === '/ingredients';
  const isAllergensPage = location.pathname === '/allergens';

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePicture(savedPic);
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, []);

  useEffect(() => {
    filterIngredients();
  }, [ingredients, searchQuery, selectedCategory, selectedAllergenFilter]);

  const fetchIngredients = async () => {
    try {
      const response = await ingredientService.getAll();
      setIngredients(response.data || []);
    } catch (error: any) {
      console.error('Error fetching ingredients:', error);
      if (error.response?.status === 401) navigate('/login');
    } finally {
      setLoading(false);
    }
  };

  const filterIngredients = () => {
    let filtered = [...ingredients];

    if (searchQuery) {
      filtered = filtered.filter((ing) =>
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter((ing) => ing.category === selectedCategory);
    }

    if (selectedAllergenFilter === 'With Allergens') {
      filtered = filtered.filter((ing) => ing.allergens && ing.allergens.length > 0);
    } else if (selectedAllergenFilter === 'Allergen-Free') {
      filtered = filtered.filter((ing) => !ing.allergens || ing.allergens.length === 0);
    }

    setFilteredIngredients(filtered);
    setCurrentPage(1);
  };

  const handleDeleteItem = (id: string, name: string) => {
    setItemToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setDeleteLoading(true);
    try {
      await ingredientService.delete(itemToDelete.id);
      success(`${itemToDelete.name} deleted`);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchIngredients();
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      showError('Could not delete ingredient');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getAllergenColor = (name: string) => {
    return ALLERGEN_COLORS[name] || 'bg-gray-500';
  };

  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

  const getIngredientName = (a: AllergenRef | string) =>
    typeof a === 'string' ? a : a.name;

  const totalIngredients = filteredIngredients.length;
  const withAllergens = ingredients.filter((i) => i.allergens && i.allergens.length > 0).length;
  const allergenFree = ingredients.filter((i) => !i.allergens || i.allergens.length === 0).length;
  const mostUsed = ingredients.length
    ? ingredients.reduce((a, b) => ((b.dishCount || 0) > (a.dishCount || 0) ? b : a))
    : null;

  const allergenCounts: Record<string, number> = {};
  ingredients.forEach((ing) => {
    (ing.allergens || []).forEach((a) => {
      const name = getIngredientName(a);
      allergenCounts[name] = (allergenCounts[name] || 0) + 1;
    });
  });
  const totalWithAllergens = Object.values(allergenCounts).reduce((s, c) => s + c, 0);
  const allergenDistribution = Object.entries(allergenCounts).map(([name, count]) => ({
    name,
    count,
    percentage: totalWithAllergens > 0 ? Math.round((count / totalWithAllergens) * 100) : 0
  }));
  const colors = ['#EF4444', '#F59E0B', '#3B82F6', '#8B5CF6', '#6B7280'];

  const recentlyAdded = [...ingredients]
    .sort((a, b) => (new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))
    .slice(0, 5);

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  const totalPages = Math.ceil(filteredIngredients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = filteredIngredients.slice(startIndex, endIndex);

  const handleLogout = () => authService.logout();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      {toasts.map((t) => (
        <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
      ))}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('ingredientsManagement')}</p>
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
                  placeholder="Search menu items..."
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
          <aside className="w-64 bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full">
            <nav className="flex-1 p-6 flex flex-col justify-between">
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
                  className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg font-medium text-sm transition ${
                    isIngredientsPage ? 'bg-green-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon path={mdiLeaf} size={1} className={`flex-shrink-0 ${isIngredientsPage ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
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

              <div className="space-y-2 pt-4">
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
              {/* Page Title and Action Button - full width row like Menu Items / Staff */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{t('ingredientsManagement')}</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Manage your ingredient library and allergen links</p>
                </div>
                <button
                  onClick={() => navigate('/ingredients/new')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{t('addNewIngredient')}</span>
                </button>
              </div>

              {/* Main content: table (left) + stats panel (right) */}
              <div className="flex gap-8">
                <div className="flex-1 min-w-0">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder={t('searchIngredients')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </div>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-48 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="All Categories">{t('allCategories')}</option>
                      {INGREDIENT_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <select
                      value={selectedAllergenFilter}
                      onChange={(e) => setSelectedAllergenFilter(e.target.value)}
                      className="w-40 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="All">{t('all')}</option>
                      <option value="With Allergens">{t('withAllergens')}</option>
                      <option value="Allergen-Free">{t('allergenFree')}</option>
                    </select>
                    {(searchQuery || selectedCategory !== 'All Categories' || selectedAllergenFilter !== 'All') && (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSelectedCategory('All Categories');
                          setSelectedAllergenFilter('All');
                        }}
                        className="px-4 py-2 text-green-600 dark:text-green-400 hover:text-green-700 font-medium"
                      >
                        {t('clearFilters')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input type="checkbox" className="rounded border-gray-300" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('ingredientName')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('category')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('containsAllergens')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('usedIn')}</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {currentItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Icon path={mdiLeaf} size={3} className="text-gray-300 dark:text-gray-600 mb-4" />
                              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">{t('noIngredientsFound')}</p>
                              <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters or add a new ingredient</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentItems.map((ing) => (
                          <tr key={ing._id} className="hover:bg-green-50 dark:hover:bg-green-900/10 transition">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input type="checkbox" className="rounded border-gray-300" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{ing.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
                                {ing.category}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex flex-wrap gap-1">
                                {ing.allergens && ing.allergens.length > 0 ? (
                                  ing.allergens.map((a, i) => (
                                    <span
                                      key={i}
                                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getAllergenColor(getIngredientName(a))}`}
                                    >
                                      {getIngredientName(a)}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-gray-400 dark:text-gray-500">—</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={() => {}}
                                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                              >
                                {(ing.dishCount ?? 0)} {t('dishes')}
                              </button>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => navigate(`/ingredients/${ing._id}`)}
                                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                  title="View"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => navigate(`/ingredients/edit/${ing._id}`)}
                                  className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                                  title="Edit"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(ing._id, ing.name)}
                                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                  title="Delete"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {filteredIngredients.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        Showing {startIndex + 1}-{Math.min(endIndex, filteredIngredients.length)} of {filteredIngredients.length} ingredients
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`px-3 py-1 rounded-lg text-sm font-medium ${
                              currentPage === i + 1
                                ? 'bg-green-500 text-white'
                                : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                        <span className="text-sm text-gray-600 dark:text-gray-400">Items per page:</span>
                        <select
                          value={itemsPerPage}
                          onChange={() => {}}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-80 flex-shrink-0 space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('quickStats')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('totalIngredients')}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{ingredients.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('withAllergens')}</span>
                      <span className="text-sm font-bold text-red-600 dark:text-red-400">{withAllergens}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('allergenFree')}</span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{allergenFree}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{t('mostUsed')}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px]" title={mostUsed?.name}>
                        {mostUsed?.name || '—'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('allergenDistribution')}</h3>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="relative w-40 h-40 flex-shrink-0">
                      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                        {allergenDistribution.length > 0 ? (
                          allergenDistribution.map((item, i) => {
                            const pct = item.percentage;
                            const circum = 2 * Math.PI * 35;
                            const segmentLen = (pct / 100) * circum;
                            const offset = allergenDistribution.slice(0, i).reduce((s, x) => s + (x.percentage / 100) * circum, 0);
                            return (
                              <circle
                                key={item.name}
                                cx="50"
                                cy="50"
                                r="35"
                                fill="none"
                                stroke={colors[i % colors.length]}
                                strokeWidth="18"
                                strokeDasharray={`${segmentLen} ${circum - segmentLen}`}
                                strokeDashoffset={`-${offset}`}
                              />
                            );
                          })
                        ) : (
                          <circle cx="50" cy="50" r="35" fill="none" stroke="#e5e7eb" strokeWidth="18" />
                        )}
                      </svg>
                    </div>
                    <div className="space-y-2 flex-1">
                      {allergenDistribution.length > 0 ? (
                        allergenDistribution.map((item, i) => (
                          <div key={item.name} className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: colors[i % colors.length] }}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{item.percentage}%</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No allergen data yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('recentlyAdded')}</h3>
                  <div className="space-y-3">
                    {recentlyAdded.length > 0 ? (
                      recentlyAdded.map((ing) => (
                        <div key={ing._id} className="flex items-center space-x-3">
                          <Icon path={mdiLeaf} size={1} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ing.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{formatTimeAgo(ing.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No ingredients yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </main>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => { setDeleteModalOpen(false); setItemToDelete(null); }}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name || ''}
        loading={deleteLoading}
        title="Delete Ingredient?"
      />
    </>
  );
};

export default Ingredients;
