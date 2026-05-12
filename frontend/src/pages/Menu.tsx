import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { menuService } from '../services/menuService';
import { authService } from '../services/authService';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';
import { canCreateOrDeleteMenu, canEditMenuItems } from '../utils/permissions';
import { restaurantService } from '../services/restaurantService';
import {
  getEffectiveMenuCategories,
  mergeCategoriesForDropdown
} from '../utils/menuCategories';

interface Allergen {
  _id?: string;
  name: string;
  icon?: string;
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  allergens: (string | Allergen)[];
  confirmedNoAllergens?: boolean;
  dietaryInfo: string[];
  isAvailable: boolean;
}

type ColumnKey = 'select' | 'image' | 'name' | 'category' | 'price' | 'allergens' | 'status' | 'actions';

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAllergensPage = location.pathname === '/allergens';
  const { toasts, removeToast, error: showError } = useToast();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Status');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [columnWidths, setColumnWidths] = useState<Record<ColumnKey, number>>({
    select: 56,
    image: 96,
    name: 260,
    category: 180,
    price: 110,
    allergens: 220,
    status: 150,
    actions: 140
  });
  const [resizingColumn, setResizingColumn] = useState<ColumnKey | null>(null);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /** Row to flash + scroll into view after Add/Edit returns here. */
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [highlightedItemKind, setHighlightedItemKind] = useState<'added' | 'updated' | null>(null);
  const highlightHandledRef = useRef(false);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const navState = (location.state ?? null) as
    | { highlightId?: string; highlightMessage?: string; highlightKind?: 'added' | 'updated' }
    | null;

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) {
      setProfilePicture(savedPic);
    }
  }, []);

  const [restaurantCuisineType, setRestaurantCuisineType] = useState<string>('Other');
  const [restaurantMenuCategories, setRestaurantMenuCategories] = useState<string[] | null>(null);

  useEffect(() => {
    const loadRestaurantCuisine = async () => {
      try {
        const r = await restaurantService.getRestaurant();
        setRestaurantCuisineType(r?.cuisineType || 'Other');
        setRestaurantMenuCategories(
          r?.menuCategories && r.menuCategories.length > 0 ? r.menuCategories : null
        );
      } catch (e) {
        // Keep default if the restaurant request fails
      }
    };
    loadRestaurantCuisine();
  }, []);

  useEffect(() => {
    const onRestaurantUpdated = () => {
      restaurantService
        .getRestaurant()
        .then((r) => {
          setRestaurantCuisineType(r?.cuisineType || 'Other');
          setRestaurantMenuCategories(
            r?.menuCategories && r.menuCategories.length > 0 ? r.menuCategories : null
          );
        })
        .catch(() => {});
    };
    window.addEventListener('restaurantUpdated', onRestaurantUpdated);
    return () => window.removeEventListener('restaurantUpdated', onRestaurantUpdated);
  }, []);

  const categories = useMemo(() => {
    const extras = menuItems.map((i) => i.category);
    const merged = mergeCategoriesForDropdown(restaurantCuisineType, restaurantMenuCategories, extras);
    return ['All Categories', ...merged];
  }, [restaurantCuisineType, restaurantMenuCategories, menuItems]);
  const statuses = ['All Status', 'Active', 'Inactive'];

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [menuItems, searchQuery, selectedCategory, selectedStatus]);

  const sortedFilteredItems = useMemo(() => {
    const order = getEffectiveMenuCategories(restaurantCuisineType, restaurantMenuCategories);
    const idx = (cat: string) => {
      const i = order.findIndex((o) => o.toLowerCase() === cat.toLowerCase());
      return i === -1 ? 9999 : i;
    };
    return [...filteredItems].sort((a, b) => {
      const d = idx(a.category) - idx(b.category);
      if (d !== 0) return d;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });
  }, [filteredItems, restaurantCuisineType, restaurantMenuCategories]);

  useEffect(() => {
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('All Categories');
    }
  }, [categories, selectedCategory]);

  useEffect(() => {
    setSelectedItemIds((prevSelected) => {
      const validIds = new Set(menuItems.map((item) => item._id));
      const nextSelected = new Set(
        Array.from(prevSelected).filter((id) => validIds.has(id))
      );
      return nextSelected.size === prevSelected.size ? prevSelected : nextSelected;
    });
  }, [menuItems]);

  const fetchMenuItems = async () => {
    try {
      const response = await menuService.getAllItems();
      setMenuItems(response.data || []);
    } catch (error: any) {
      console.error('Error fetching menu items:', error);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = [...menuItems];

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCategory !== 'All Categories') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (selectedStatus !== 'All Status') {
      const isActive = selectedStatus === 'Active';
      filtered = filtered.filter(item => item.isAvailable === isActive);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const handleToggleAvailability = async (itemId: string) => {
    try {
      const item = menuItems.find(i => i._id === itemId);
      await menuService.toggleAvailability(itemId);

      const newStatus = item?.isAvailable ? 'hidden' : 'visible';
      toast.success(`Item is now ${newStatus}`);
      fetchMenuItems();
    } catch (error) {
      console.error('Error toggling availability:', error);
      showError('Could not update status');
    }
  };

  const handleDeleteItem = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleteLoading(true);
    try {
      if (itemToDelete.id === '__bulk__') {
        const selectedIds = Array.from(selectedItemIds);
        const results = await Promise.allSettled(
          selectedIds.map((id) => menuService.deleteItem(id))
        );
        const deletedCount = results.filter((r) => r.status === 'fulfilled').length;
        const failedCount = results.length - deletedCount;

        if (deletedCount > 0) {
          toast.success(`${deletedCount} item${deletedCount > 1 ? 's' : ''} deleted`);
        }
        if (failedCount > 0) {
          showError(`Could not delete ${failedCount} item${failedCount > 1 ? 's' : ''}`);
        }
        setSelectedItemIds(new Set());
      } else {
        await menuService.deleteItem(itemToDelete.id);
        toast.success(`${itemToDelete.name} deleted`);
        setSelectedItemIds((prevSelected) => {
          const nextSelected = new Set(prevSelected);
          nextSelected.delete(itemToDelete.id);
          return nextSelected;
        });
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      showError('Could not delete item');
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setItemToDelete(null);
  };

  const handleLogout = () => {
    authService.logout();
  };

  const totalPages = Math.ceil(sortedFilteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = sortedFilteredItems.slice(startIndex, endIndex);
  const selectedFilteredCount = filteredItems.filter((item) =>
    selectedItemIds.has(item._id)
  ).length;
  const allFilteredSelected =
    filteredItems.length > 0 && selectedFilteredCount === filteredItems.length;
  const partiallyFilteredSelected =
    selectedFilteredCount > 0 && selectedFilteredCount < filteredItems.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = partiallyFilteredSelected;
    }
  }, [partiallyFilteredSelected]);

  useEffect(() => {
    if (highlightHandledRef.current) return;
    if (loading) return;
    const targetId = navState?.highlightId;
    if (!targetId) return;

    const itemExistsInList = menuItems.some((it) => it._id === targetId);
    if (!itemExistsInList) return;

    const targetIndex = sortedFilteredItems.findIndex((it) => it._id === targetId);

    if (targetIndex === -1) {
      if (searchQuery !== '') setSearchQuery('');
      if (selectedCategory !== 'All Categories') setSelectedCategory('All Categories');
      if (selectedStatus !== 'All Status') setSelectedStatus('All Status');
      return;
    }

    const targetPage = Math.floor(targetIndex / itemsPerPage) + 1;
    setCurrentPage(targetPage);
    setHighlightedItemId(targetId);
    setHighlightedItemKind(navState.highlightKind ?? null);
    highlightHandledRef.current = true;

    if (navState.highlightMessage) {
      toast.success(navState.highlightMessage);
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [
    loading,
    menuItems,
    sortedFilteredItems,
    navState,
    searchQuery,
    selectedCategory,
    selectedStatus,
    itemsPerPage,
    navigate,
    location.pathname
  ]);

  useEffect(() => {
    if (!highlightedItemId) return;
    const scrollTimer = setTimeout(() => {
      const row = rowRefs.current[highlightedItemId];
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 60);
    const clearTimer = setTimeout(() => {
      setHighlightedItemId(null);
      setHighlightedItemKind(null);
    }, 5000);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
    };
  }, [highlightedItemId, currentPage]);
  useEffect(() => {
    if (!resizingColumn) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startX;
      const nextWidth = Math.max(80, startWidth + delta);
      setColumnWidths((prev) => ({ ...prev, [resizingColumn]: nextWidth }));
    };
    const handleMouseUp = () => {
      setResizingColumn(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [resizingColumn, startWidth, startX]);

  // Match Ingredients page allergen pill colors (same mapping + fallback).
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

  const normalizeAllergenGroup = (rawName: string): keyof typeof ALLERGEN_COLORS | 'Other' => {
    const name = rawName.toLowerCase();
    if (name.includes('gluten') || name.includes('wheat') || name.includes('barley') || name.includes('rye')) return 'Gluten';
    if (name.includes('milk') || name.includes('dairy') || name.includes('lactose')) return 'Milk';
    if (name.includes('peanut')) return 'Peanuts';
    if (name.includes('tree nut') || name.includes('almond') || name.includes('cashew') || name.includes('hazelnut') || name.includes('walnut') || name.includes('pistachio')) {
      return 'Tree Nuts';
    }
    if (name.includes('egg')) return 'Eggs';
    if (name.includes('fish')) return 'Fish';
    if (
      name.includes('shellfish') ||
      name.includes('crustace') ||
      name.includes('mollusc') ||
      name.includes('molluscs')
    ) {
      return 'Shellfish';
    }
    if (name.includes('soy')) return 'Soy';
    if (name.includes('sesame')) return 'Sesame';
    return 'Other';
  };

  const getAllergenBadges = (item: MenuItem) => {
    const list = Array.isArray(item.allergens) ? item.allergens : [];
    const seen = new Set<string>();
    const out: Array<{ key: string; label: string; colorClass: string }> = [];
    list.forEach((a) => {
      const rawName = (typeof a === 'string' ? a : a?.name || '').trim();
      if (!rawName) return;
      const lower = rawName.toLowerCase();
      if (seen.has(lower)) return;
      seen.add(lower);
      const group = normalizeAllergenGroup(rawName);
      const colorClass = group === 'Other' ? 'bg-gray-500' : ALLERGEN_COLORS[group];
      out.push({
        key: typeof a === 'string' ? rawName : a?._id || rawName,
        label: rawName,
        colorClass
      });
    });
    return out;
  };

  const displayRole = formatRoleLabel(userRole);
  const allowCreateDelete = canCreateOrDeleteMenu();
  const allowEdit = canEditMenuItems();
  const shouldReduceMotion = useReducedMotion();

  const getCategoryBadgeClasses = (category: string) => {
    const normalized = category.toLowerCase();
    if (normalized.includes('starter')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300';
    if (normalized.includes('main')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300';
    if (normalized.includes('dessert')) return 'bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-300';
    if (normalized.includes('drink')) return 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300';
    if (normalized.includes('side')) return 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
  };

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prevSelected) => {
      const nextSelected = new Set(prevSelected);
      if (nextSelected.has(itemId)) {
        nextSelected.delete(itemId);
      } else {
        nextSelected.add(itemId);
      }
      return nextSelected;
    });
  };

  const handleToggleSelectAllFiltered = () => {
    setSelectedItemIds((prevSelected) => {
      const nextSelected = new Set(prevSelected);
      if (allFilteredSelected) {
        filteredItems.forEach((item) => nextSelected.delete(item._id));
      } else {
        filteredItems.forEach((item) => nextSelected.add(item._id));
      }
      return nextSelected;
    });
  };

  const handleDeleteSelectedItems = () => {
    if (selectedItemIds.size === 0) return;
    setItemToDelete({
      id: '__bulk__',
      name: `${selectedItemIds.size} selected item${selectedItemIds.size > 1 ? 's' : ''}`,
    });
    setDeleteModalOpen(true);
  };

  const startColumnResize = (column: ColumnKey, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setResizingColumn(column);
    setStartX(e.clientX);
    setStartWidth(columnWidths[column]);
  };

  return (
    <>
      {/* Toast Notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title="Smart Menu" subtitle="Menu Items Management" />
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
        {/* Sidebar */}
        <aside className="bg-white dark:bg-gray-800 shadow-sm flex flex-col h-full flex-shrink-0 border-r border-gray-200 dark:border-gray-700 w-64 min-w-[16rem]">
          <nav className="flex-1 p-6 flex flex-col justify-between">
            {/* Main Navigation */}
            <div className="space-y-2">
              {/* Dashboard */}
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="flex-1 text-left">Dashboard</span>
              </button>

              {/* Menu Items - Active */}
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm shadow-sm">
                <Icon path={mdiSilverwareForkKnife} size={1} className="flex-shrink-0" />
                <span className="flex-1 text-left">Menu Items Management</span>
              </button>

              {/* Allergens */}
              <button
                onClick={() => navigate('/allergens')}
                className={`w-full flex items-center space-x-4 px-4 py-3 rounded-lg font-medium text-sm transition ${
                  isAllergensPage ? 'bg-green-500 text-white shadow-sm' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ShieldCheckIcon size={20} className={`flex-shrink-0 ${isAllergensPage ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`} />
                <span className="flex-1 text-left">Allergens</span>
              </button>

              {/* Ingredients */}
              <button
                onClick={() => navigate('/ingredients')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <Icon path={mdiLeaf} size={1} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">Ingredients</span>
              </button>

              {/* Staff Management */}
              <button
                onClick={() => navigate('/staff')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">Staff Management</span>
              </button>

              {/* QR Codes */}
              <button
                onClick={() => navigate('/qr-codes')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span className="flex-1 text-left">QR Codes</span>
              </button>
            </div>

            {/* Bottom Navigation */}
            <div className="space-y-2 pt-4">
              {/* Reports */}
              <button
                onClick={() => navigate('/reports')}
                className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition"
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">Reports</span>
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
                <span className="flex-1 text-left">Settings</span>
              </button>
            </div>
          </nav>

          {/* User Card */}
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

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600" />
              </div>
            ) : (
              <>
            {/* Header */}
            <motion.div
              className="flex items-center justify-between mb-6"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26 }}
            >
              <div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Menu Items Management</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">Manage your dishes, allergens, and availability</p>
              </div>
              {allowCreateDelete && (
                <button 
                  onClick={() => navigate('/menu-items/new')}
                  className="flex items-center space-x-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add New Item</span>
                </button>
              )}
            </motion.div>

            {/* Filters */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 }}
            >
              <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      placeholder="Search dishes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Category Filter */}
                <div className="w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div className="w-40">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {statuses.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchQuery || selectedCategory !== 'All Categories' || selectedStatus !== 'All Status') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('All Categories');
                      setSelectedStatus('All Status');
                    }}
                    className="px-4 py-2 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {allowCreateDelete && selectedItemIds.size > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {selectedItemIds.size} item{selectedItemIds.size > 1 ? 's' : ''} selected
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedItemIds(new Set())}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                      Clear Selection
                    </button>
                    <button
                      onClick={handleDeleteSelectedItems}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition"
                    >
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full table-fixed min-w-[1180px] divide-y divide-gray-200 dark:divide-gray-700">
                <colgroup>
                  {allowCreateDelete && <col style={{ width: `${columnWidths.select}px` }} />}
                  <col style={{ width: `${columnWidths.image}px` }} />
                  <col style={{ width: `${columnWidths.name}px` }} />
                  <col style={{ width: `${columnWidths.category}px` }} />
                  <col style={{ width: `${columnWidths.price}px` }} />
                  <col style={{ width: `${columnWidths.allergens}px` }} />
                  <col style={{ width: `${columnWidths.status}px` }} />
                  <col style={{ width: `${columnWidths.actions}px` }} />
                </colgroup>
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    {allowCreateDelete && (
                      <th className="relative px-6 py-3 text-left">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allFilteredSelected}
                          onChange={handleToggleSelectAllFiltered}
                          className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                          aria-label="Select all filtered menu items"
                        />
                        <button
                          type="button"
                          onMouseDown={(e) => startColumnResize('select', e)}
                          className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                          aria-label="Resize select column"
                        />
                      </th>
                    )}
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Image
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('image', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize image column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Dish Name
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('name', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize dish name column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Category
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('category', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize category column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Price
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('price', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize price column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Allergens
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('allergens', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize allergens column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('status', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize status column"
                      />
                    </th>
                    <th className="relative px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                      <button
                        type="button"
                        onMouseDown={(e) => startColumnResize('actions', e)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize"
                        aria-label="Resize actions column"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {currentItems.length === 0 ? (
                    <tr>
                      <td colSpan={allowCreateDelete ? 8 : 7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No menu items found</p>
                          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Try adjusting your filters or add a new item</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <AnimatePresence initial={false}>
                      {currentItems.map((item) => {
                        const allergenBadges = getAllergenBadges(item);
                        return (
                      <motion.tr
                        key={item._id}
                        ref={(el) => {
                          rowRefs.current[item._id] = el;
                        }}
                        className={`transition-colors duration-700 ease-out ${
                          item._id === highlightedItemId
                            ? 'bg-emerald-50/90 dark:bg-emerald-900/25 border-l-4 border-l-emerald-500'
                            : 'border-l-4 border-l-transparent hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.18 }}
                        layout={!shouldReduceMotion}
                      >
                        {allowCreateDelete && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedItemIds.has(item._id)}
                              onChange={() => handleToggleItemSelection(item._id)}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              aria-label={`Select ${item.name}`}
                            />
                          </td>
                        )}

                        {/* Image */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            )}
                          </div>
                        </td>

                        {/* Dish Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                            {item._id === highlightedItemId && highlightedItemKind && (
                              <motion.span
                                initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.9 }}
                                animate={shouldReduceMotion ? undefined : { opacity: 1, scale: 1 }}
                                transition={{ duration: 0.18 }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wide"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                {highlightedItemKind === 'added' ? 'Just added' : 'Just updated'}
                              </motion.span>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryBadgeClasses(item.category)}`}>
                            {item.category}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">£{item.price.toFixed(2)}</div>
                        </td>

                        {/* Allergens */}
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                              {allergenBadges.map((a) => (
                                <span
                                  key={a.key}
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white ${a.colorClass}`}
                                  title={a.label}
                                >
                                  {a.label}
                                </span>
                              ))}
                              {allergenBadges.length === 0 && item.confirmedNoAllergens === true && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                                  Verified: no listed allergens
                                </span>
                              )}
                              {allergenBadges.length === 0 && item.confirmedNoAllergens !== true && (
                                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                                  Needs allergen review
                                </span>
                              )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          {allowEdit ? (
                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(item._id)}
                              className="flex items-center space-x-2 px-3 py-1.5 rounded-full transition-colors hover:shadow-md"
                              style={{
                                backgroundColor: item.isAvailable ? '#dcfce7' : '#fee2e2',
                                border: `2px solid ${item.isAvailable ? '#22c55e' : '#ef4444'}`
                              }}
                              title={`Click to mark as ${item.isAvailable ? 'inactive' : 'active'}`}
                            >
                              <div className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={`text-sm font-medium ${item.isAvailable ? 'text-green-700' : 'text-red-700'}`}>
                                {item.isAvailable ? 'Active' : 'Inactive'}
                              </span>
                            </button>
                          ) : (
                            <div
                              className="flex items-center space-x-2 px-3 py-1.5 rounded-full"
                              style={{
                                backgroundColor: item.isAvailable ? '#dcfce7' : '#fee2e2',
                                border: `2px solid ${item.isAvailable ? '#22c55e' : '#ef4444'}`
                              }}
                            >
                              <div className={`w-2 h-2 rounded-full ${item.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
                              <span className={`text-sm font-medium ${item.isAvailable ? 'text-green-700' : 'text-red-700'}`}>
                                {item.isAvailable ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            {/* View */}
                            <button
                              onClick={() => navigate(`/menu-items/${item._id}`)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="View Details"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            {/* Edit */}
                            {allowEdit && (
                              <button
                                type="button"
                                onClick={() => navigate(`/menu-items/edit/${item._id}`)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition"
                                title="Edit Item"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                            )}

                            {/* Delete */}
                            {allowCreateDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item._id, item.name)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                title="Delete Item"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                      );
                    })}
                    </AnimatePresence>
                  )}
                </tbody>
              </table>
              </div>

              {/* Pagination */}
              {filteredItems.length > 0 && (
                <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {startIndex + 1}-{Math.min(endIndex, filteredItems.length)} of {filteredItems.length} items
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Previous
                      </button>

                      {[...Array(totalPages)].map((_, index) => (
                        <button
                          key={index + 1}
                          onClick={() => setCurrentPage(index + 1)}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                            currentPage === index + 1
                              ? 'bg-green-500 text-white'
                              : 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {index + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      >
                        Next
                      </button>

                      <select
                        value={itemsPerPage}
                        onChange={(e) => {
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </> )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={closeDeleteModal}
        onConfirm={confirmDelete}
        itemName={itemToDelete?.name || ''}
        loading={deleteLoading}
      />
    </div>
    </>
  );
};

export default Menu;
