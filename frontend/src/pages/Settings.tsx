import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import Icon from '@mdi/react';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  mdiSilverwareForkKnife,
  mdiLeaf,
  mdiAccountCircleOutline,
  mdiStoreOutline,
  mdiClockOutline,
  mdiBellOutline,
  mdiShieldCheckOutline,
  mdiAlertCircleOutline,
  mdiCheckCircle,
  mdiInformationOutline,
  mdiPlaylistEdit,
  mdiDragVertical,
  mdiCreditCardOutline
} from '@mdi/js';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { restaurantService, CUISINE_OPTIONS, type SubscriptionSummary } from '../services/restaurantService';
import { billingService } from '../services/billingService';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';
import { getCategoriesForCuisine } from '../utils/menuCategories';
import { canCreateOrDeleteMenu } from '../utils/permissions';

const NOTIFICATIONS_MUTED_KEY = 'notificationsMuted';
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
type DayKey = (typeof DAY_KEYS)[number];
type HoursRow = { enabled: boolean; open: string; close: string };
const DEFAULT_HOURS: Record<DayKey, HoursRow> = {
  monday: { enabled: true, open: '12:00', close: '21:00' },
  tuesday: { enabled: true, open: '12:00', close: '21:00' },
  wednesday: { enabled: true, open: '12:00', close: '21:00' },
  thursday: { enabled: true, open: '12:00', close: '21:00' },
  friday: { enabled: true, open: '12:00', close: '21:00' },
  saturday: { enabled: true, open: '12:00', close: '21:00' },
  sunday: { enabled: true, open: '12:00', close: '21:00' }
};
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hh = String(Math.floor(i / 2)).padStart(2, '0');
  const mm = i % 2 === 0 ? '00' : '30';
  return `${hh}:${mm}`;
});

type MenuSectionRow = { id: string; name: string };

function newMenuSectionRowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function namesToMenuRows(names: string[]): MenuSectionRow[] {
  return names.map((name) => ({ id: newMenuSectionRowId(), name }));
}

const SortableMenuSectionRow: React.FC<{
  row: MenuSectionRow;
  onRemove: (id: string) => void;
}> = ({ row, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.id
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : undefined
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2.5 ${
        isDragging ? 'shadow-lg ring-2 ring-green-400/60 dark:ring-green-600 opacity-95' : ''
      }`}
    >
      <button
        type="button"
        className="shrink-0 flex h-9 w-9 cursor-grab touch-none items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 active:cursor-grabbing dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
        aria-label={`Drag to reorder ${row.name}`}
        {...attributes}
        {...listeners}
      >
        <Icon path={mdiDragVertical} size={0.95} />
      </button>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 min-w-0 truncate" title={row.name}>
        {row.name}
      </span>
      <button
        type="button"
        onClick={() => onRemove(row.id)}
        className="shrink-0 rounded-lg border border-red-200 text-red-700 dark:border-red-800 dark:text-red-400 px-2 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        Remove
      </button>
    </li>
  );
};

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({
  checked,
  onChange
}) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      checked ? 'bg-green-500' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const userEmail = localStorage.getItem('userEmail') || '';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const profilePicture = localStorage.getItem('profilePicture');
  const [restaurantId, setRestaurantId] = useState(() => localStorage.getItem('restaurantId') || '');

  const [userName, setUserName] = useState(
    () => localStorage.getItem('userName') || userEmail.split('@')[0] || 'User'
  );
  const [restaurantName, setRestaurantName] = useState(
    () => localStorage.getItem('restaurantName') || 'Your Restaurant'
  );

  const [accountName, setAccountName] = useState('');
  const [accountSaving, setAccountSaving] = useState(false);

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    cuisineType: 'Indian',
    email: '',
    phone: '',
    welcomeMessage: ''
  });
  const [restaurantSaving, setRestaurantSaving] = useState(false);
  const [hoursForm, setHoursForm] = useState<Record<DayKey, HoursRow>>(DEFAULT_HOURS);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(localStorage.getItem('twoFactorEnabled') === 'true');
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ qrDataUrl: string; manualKey: string } | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [dangerModal, setDangerModal] = useState<'none' | 'deactivate' | 'delete'>('none');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [menuSectionRows, setMenuSectionRows] = useState<MenuSectionRow[]>([]);
  const [newSectionName, setNewSectionName] = useState('');
  const [menuSectionsSaving, setMenuSectionsSaving] = useState(false);

  const [subscriptionSummary, setSubscriptionSummary] = useState<SubscriptionSummary | null>(null);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<'basic' | 'premium' | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const menuSectionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [notificationPrefs, setNotificationPrefs] = useState({
    email: true,
    menuUpdates: true,
    allergenAlerts: true,
    weeklyReports: false
  });

  const [notificationsMuted, setNotificationsMuted] = useState(() => {
    return localStorage.getItem(NOTIFICATIONS_MUTED_KEY) === 'true';
  });

  useEffect(() => {
    setAccountName(localStorage.getItem('userName') || userEmail.split('@')[0] || '');
  }, [userEmail]);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await restaurantService.getRestaurant();
        if (data._id && !localStorage.getItem('restaurantId')) {
          localStorage.setItem('restaurantId', data._id);
          setRestaurantId(data._id);
        } else if (data._id) {
          setRestaurantId(data._id);
        }
        setRestaurantForm({
          name: data.name || '',
          cuisineType: data.cuisineType || 'Indian',
          email: data.email || '',
          phone: data.phone || '',
          welcomeMessage: data.welcomeMessage || ''
        });
        if (data.businessHours) {
          const next: Record<DayKey, HoursRow> = { ...DEFAULT_HOURS };
          DAY_KEYS.forEach((day) => {
            const row = data.businessHours?.[day];
            if (row) {
              next[day] = {
                enabled: Boolean(row.enabled),
                open: row.open || DEFAULT_HOURS[day].open,
                close: row.close || DEFAULT_HOURS[day].close
              };
            }
          });
          setHoursForm(next);
        }
        setRestaurantName(data.name || '');
        setSubscriptionSummary(data.subscription ?? null);
        const defaults = getCategoriesForCuisine(data.cuisineType || 'Indian');
        const names =
          data.menuCategories && data.menuCategories.length > 0 ? [...data.menuCategories] : [...defaults];
        setMenuSectionRows(namesToMenuRows(names));
      } catch (e) {
        console.error('Failed to load restaurant:', e);
      } finally {
        setBillingLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const billingFlag = searchParams.get('billing');
    if (!billingFlag) return;
    if (billingFlag === 'success') {
      toast.success('Checkout completed. Your plan updates when Stripe confirms payment.');
      restaurantService
        .getRestaurant()
        .then((d) => setSubscriptionSummary(d.subscription ?? null))
        .catch(() => {});
    } else if (billingFlag === 'canceled') {
      toast('Checkout was canceled.', { icon: 'ℹ️' });
    }
    const next = new URLSearchParams(searchParams);
    next.delete('billing');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const roleLabel = formatRoleLabel(userRole);
  const mayManageBilling = ['owner', 'platform_admin', 'super_owner'].includes(userRole);

  const startCheckout = async (plan: 'basic' | 'premium') => {
    setCheckoutLoading(plan);
    try {
      const res = await billingService.createCheckoutSession(plan);
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
      else toast.error((res.data as { message?: string })?.message || 'No checkout URL returned');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not start checkout');
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await billingService.createPortalSession();
      const url = res.data?.data?.url;
      if (url) window.location.assign(url);
      else toast.error((res.data as { message?: string })?.message || 'No portal URL');
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Could not open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };
  const shouldReduceMotion = useReducedMotion();

  const handleSaveAccount = async () => {
    if (!accountName.trim()) {
      toast.error('Name is required');
      return;
    }
    setAccountSaving(true);
    try {
      await authService.updateProfile({ name: accountName.trim() });
      setUserName(accountName.trim());
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      toast.success('Account updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update account');
    } finally {
      setAccountSaving(false);
    }
  };

  const handleSaveRestaurant = async () => {
    if (!restaurantForm.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }
    setRestaurantSaving(true);
    try {
      const { data } = await restaurantService.updateRestaurant({
        name: restaurantForm.name.trim(),
        cuisineType: restaurantForm.cuisineType,
        email: restaurantForm.email.trim() || undefined,
        phone: restaurantForm.phone.replace(/\D/g, '').slice(0, 15) || undefined,
        welcomeMessage: restaurantForm.welcomeMessage?.trim() || undefined
      });
      setRestaurantName(data.name || restaurantForm.name);
      localStorage.setItem('restaurantName', data.name || '');
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      window.dispatchEvent(new CustomEvent('restaurantUpdated'));
      toast.success('Restaurant updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setRestaurantSaving(false);
    }
  };

  const handleSaveMenuSections = async () => {
    const cleaned = menuSectionRows.map((r) => r.name.trim()).filter(Boolean);
    if (cleaned.length === 0) {
      toast.error('Add at least one menu section');
      return;
    }
    const seen = new Set<string>();
    const unique = cleaned.filter((s) => {
      const k = s.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setMenuSectionsSaving(true);
    try {
      await restaurantService.updateRestaurant({ menuCategories: unique });
      setMenuSectionRows(namesToMenuRows(unique));
      toast.success('Menu sections saved');
      window.dispatchEvent(new CustomEvent('restaurantUpdated'));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save menu sections');
    } finally {
      setMenuSectionsSaving(false);
    }
  };

  const handleMenuSectionsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setMenuSectionRows((prev) => {
      const oldIndex = prev.findIndex((r) => r.id === active.id);
      const newIndex = prev.findIndex((r) => r.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const removeMenuSection = (id: string) => {
    setMenuSectionRows((prev) => prev.filter((r) => r.id !== id));
  };

  const addMenuSection = () => {
    const t = newSectionName.trim();
    if (!t) {
      toast.error('Enter a section name');
      return;
    }
    if (menuSectionRows.some((r) => r.name.toLowerCase() === t.toLowerCase())) {
      toast.error('That section already exists');
      return;
    }
    if (t.length > 100) {
      toast.error('Section name is too long');
      return;
    }
    setMenuSectionRows((prev) => [...prev, { id: newMenuSectionRowId(), name: t }]);
    setNewSectionName('');
  };

  const resetMenuSectionsToCuisineDefault = () => {
    const defaults = getCategoriesForCuisine(restaurantForm.cuisineType || 'Indian');
    setMenuSectionRows(namesToMenuRows([...defaults]));
    toast.success('Reset to cuisine defaults (save to apply)');
  };

  const handleSaveBusinessHours = async () => {
    setHoursSaving(true);
    try {
      await restaurantService.updateRestaurant({ businessHours: hoursForm });
      toast.success('Business hours updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update business hours');
    } finally {
      setHoursSaving(false);
    }
  };

  const handleDeactivateAccount = async () => {
    try {
      await restaurantService.deactivateAccount();
      toast.success('Account deactivated');
      setTimeout(() => authService.logout(), 700);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to deactivate account');
    }
  };

  const handleDeleteAllData = async () => {
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Confirmation text did not match');
      return;
    }
    try {
      await restaurantService.deleteAllData();
      toast.success('All operational data deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete data');
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      toast.error('Please complete password fields');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await authService.updateProfile({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password updated successfully');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  const beginEnableTwoFactor = async () => {
    try {
      const res = await authService.setupTwoFactor();
      setTwoFactorSetup(res?.data || null);
      setTwoFactorCode('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to start 2FA setup');
    }
  };

  const confirmEnableTwoFactor = async () => {
    try {
      await authService.enableTwoFactor(twoFactorCode);
      setTwoFactorEnabled(true);
      localStorage.setItem('twoFactorEnabled', 'true');
      setTwoFactorSetup(null);
      setTwoFactorCode('');
      toast.success('Two-factor authentication enabled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
  };

  const disableTwoFactor = async () => {
    if (!twoFactorCode) {
      toast.error('Enter your authenticator code to disable 2FA');
      return;
    }
    try {
      await authService.disableTwoFactor(twoFactorCode);
      setTwoFactorEnabled(false);
      localStorage.setItem('twoFactorEnabled', 'false');
      setTwoFactorCode('');
      toast.success('Two-factor authentication disabled');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invalid code');
    }
  };

  const handleMuteNotifications = (muted: boolean) => {
    setNotificationsMuted(muted);
    localStorage.setItem(NOTIFICATIONS_MUTED_KEY, muted ? 'true' : 'false');
    window.dispatchEvent(new CustomEvent('notificationsMutedChanged', { detail: { muted } }));
  };

  const previewPublicProfileUrl = restaurantId
    ? `${window.location.origin}/public/menu/${restaurantId}`
    : null;

  const navItem =
    'w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition';

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title="Smart Menu" subtitle="Settings" />
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
              <button onClick={() => navigate('/dashboard')} className={navItem}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Dashboard</span>
              </button>
              <button onClick={() => navigate('/menu-items')} className={navItem}>
                <Icon path={mdiSilverwareForkKnife} size={0.9} className="flex-shrink-0" />
                <span>Menu Items</span>
              </button>
              <button onClick={() => navigate('/allergens')} className={navItem}>
                <ShieldCheckIcon size={20} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span>Allergens</span>
              </button>
              <button onClick={() => navigate('/ingredients')} className={navItem}>
                <Icon path={mdiLeaf} size={1} className="flex-shrink-0" />
                <span>Ingredients</span>
              </button>
              <button onClick={() => navigate('/staff')} className={navItem}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Staff Management</span>
              </button>
              <button onClick={() => navigate('/qr-codes')} className={navItem}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                <span>QR Codes</span>
              </button>
              <button onClick={() => navigate('/reports')} className={navItem}>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6m4 6V9m4 10V5M5 19h14" />
                </svg>
                <span>Reports</span>
              </button>
            </div>
            <div className="pt-2 mt-auto flex-shrink-0">
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 p-5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 min-w-0">
                {profilePicture ? (
                  <img src={profilePicture} alt={userName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">{userName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{roleLabel}</p>
                </div>
              </div>
              <button onClick={() => authService.logout()} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="p-8">
            {/* Page header */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26 }}
            >
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">Settings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage your account and restaurant preferences
                </p>
              </div>
              {previewPublicProfileUrl ? (
                <a
                  href={previewPublicProfileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 px-5 py-2.5 text-sm font-medium text-green-600 dark:text-green-400 border border-green-500 dark:border-green-600 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition inline-flex items-center gap-2"
                >
                  Preview Public Profile
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ) : (
                <span className="shrink-0 px-5 py-2.5 text-sm text-gray-500 dark:text-gray-400">Preview unavailable</span>
              )}
            </motion.div>

            {/* Status cards — full width, balanced */}
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.06 }}
            >
              <StatCard label="Profile Status" value="Complete" accent="green" icon={mdiCheckCircle} />
              <StatCard label="Notifications" value={notificationPrefs.email ? 'Enabled' : 'Disabled'} accent="blue" icon={mdiBellOutline} />
              <StatCard label="Restaurant Status" value="Operational" accent="emerald" icon={mdiStoreOutline} />
            </motion.div>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.26, delay: 0.1 }}
            >
            {/* Section: Account + Restaurant side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <SectionCard
                title="Account Information"
                icon={mdiAccountCircleOutline}
                actionLabel={accountSaving ? 'Saving...' : 'Save Changes'}
                onAction={handleSaveAccount}
                actionDisabled={accountSaving}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditableField label="Full Name" value={accountName} onChange={setAccountName} placeholder="Your name" />
                  <Field label="Email Address" value={userEmail || 'Not set'} readOnly />
                  <Field label="Role" value={roleLabel} readOnly />
                </div>
              </SectionCard>

              <SectionCard
                title="Restaurant Information"
                icon={mdiStoreOutline}
                actionLabel={restaurantSaving ? 'Saving...' : 'Update Restaurant Info'}
                onAction={handleSaveRestaurant}
                actionDisabled={restaurantSaving}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <EditableField label="Restaurant Name" value={restaurantForm.name} onChange={(v) => setRestaurantForm((prev) => ({ ...prev, name: v }))} placeholder="Restaurant name" />
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cuisine Type</label>
                    <select
                      value={restaurantForm.cuisineType}
                      onChange={(e) => setRestaurantForm((prev) => ({ ...prev, cuisineType: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      {CUISINE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <EditableField label="Contact Email" value={restaurantForm.email} onChange={(v) => setRestaurantForm((prev) => ({ ...prev, email: v }))} placeholder="contact@restaurant.com" />
                  <EditableField label="Phone" value={restaurantForm.phone} onChange={(v) => setRestaurantForm((prev) => ({ ...prev, phone: v }))} placeholder="e.g. 07123456789" />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Welcome message (public menu)</label>
                  <textarea
                    value={restaurantForm.welcomeMessage}
                    onChange={(e) => setRestaurantForm((prev) => ({ ...prev, welcomeMessage: e.target.value.slice(0, 300) }))}
                    rows={3}
                    placeholder="Welcome to our menu. We are glad to have you here."
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">{restaurantForm.welcomeMessage.length}/300</p>
                </div>
              </SectionCard>
            </div>

            {canCreateOrDeleteMenu() ? (
              <SectionCard
                className="mb-6"
                title="Menu sections & category order"
                icon={mdiPlaylistEdit}
                actionLabel={menuSectionsSaving ? 'Saving...' : 'Save menu sections'}
                onAction={handleSaveMenuSections}
                actionDisabled={menuSectionsSaving}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Drag the handle beside each section to reorder. The same order is used on the public menu (tabs and sections) and in the menu items category list. Add or remove sections below; remember to save.
                </p>
                <DndContext
                  sensors={menuSectionSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleMenuSectionsDragEnd}
                >
                  <SortableContext
                    items={menuSectionRows.map((r) => r.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-2 mb-4 max-w-3xl">
                      {menuSectionRows.map((row) => (
                        <SortableMenuSectionRow key={row.id} row={row} onRemove={removeMenuSection} />
                      ))}
                    </ul>
                  </SortableContext>
                </DndContext>
                <div className="flex flex-col sm:flex-row flex-wrap gap-2 max-w-3xl">
                  <input
                    type="text"
                    value={newSectionName}
                    onChange={(e) => setNewSectionName(e.target.value)}
                    placeholder="New section name (e.g. Chef specials)"
                    maxLength={100}
                    className="flex-1 min-w-[200px] rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addMenuSection}
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Add section
                  </button>
                  <button
                    type="button"
                    onClick={resetMenuSectionsToCuisineDefault}
                    className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Reset to {restaurantForm.cuisineType} default
                  </button>
                </div>
              </SectionCard>
            ) : null}

            {/* Section: Business Hours full width */}
            <SectionCard
              className="mb-6"
              title="Business Hours"
              icon={mdiClockOutline}
              actionLabel={hoursSaving ? 'Saving...' : 'Save Hours'}
              onAction={handleSaveBusinessHours}
              actionDisabled={hoursSaving}
            >
              <div className="overflow-x-auto">
                <div className="min-w-[280px] space-y-3">
                  {DAY_KEYS.map((day) => {
                    const row = hoursForm[day];
                    return (
                    <div key={day} className="grid grid-cols-[minmax(100px,110px)_56px_1fr] items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{day}</p>
                      <Toggle
                        checked={row.enabled}
                        onChange={() => setHoursForm((prev) => ({ ...prev, [day]: { ...prev[day], enabled: !prev[day].enabled } }))}
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={row.open}
                          onChange={(e) => setHoursForm((prev) => ({ ...prev, [day]: { ...prev[day], open: e.target.value } }))}
                          disabled={!row.enabled}
                          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        >
                          {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                        <span className="text-gray-400">–</span>
                        <select
                          value={row.close}
                          onChange={(e) => setHoursForm((prev) => ({ ...prev, [day]: { ...prev[day], close: e.target.value } }))}
                          disabled={!row.enabled}
                          className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:opacity-50"
                        >
                          {TIME_OPTIONS.map((time) => <option key={time} value={time}>{time}</option>)}
                        </select>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            </SectionCard>

            {mayManageBilling ? (
              <SectionCard
                className="mb-6"
                title="Billing & plan"
                icon={mdiCreditCardOutline}
              >
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Compare tiers on the{' '}
                  <button type="button" onClick={() => navigate('/pricing')} className="text-green-600 dark:text-green-400 font-medium hover:underline">
                    pricing page
                  </button>
                  . Checkout uses Stripe (configure price IDs and webhook in the backend environment).
                </p>
                {!billingLoaded ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading subscription…</p>
                ) : !subscriptionSummary ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Subscription details were not returned. Ensure the API exposes GET /api/restaurant with a subscription field.
                  </p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-1">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Current product</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">{subscriptionSummary.plan}</p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Status: <span className="font-medium">{subscriptionSummary.status}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-300">
                        Effective limits: <span className="font-medium capitalize">{subscriptionSummary.effectivePlan}</span>
                      </p>
                      {!subscriptionSummary.canPerformWrites ? (
                        <p className="text-amber-700 dark:text-amber-400 text-xs mt-2">
                          Dashboard edits are blocked until billing is resolved. Use Manage billing to update your card.
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-gray-200 dark:border-gray-600 p-4 space-y-2">
                      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Usage limits</p>
                      <ul className="text-gray-700 dark:text-gray-300 space-y-1">
                        <li>
                          Menu items:{' '}
                          {subscriptionSummary.limits.maxMenuItems == null
                            ? 'Unlimited'
                            : `up to ${subscriptionSummary.limits.maxMenuItems}`}
                        </li>
                        <li>
                          Staff seats:{' '}
                          {subscriptionSummary.limits.maxStaffSeats == null
                            ? 'Unlimited'
                            : `up to ${subscriptionSummary.limits.maxStaffSeats}`}
                        </li>
                        <li>Reports: up to {subscriptionSummary.limits.maxReportRange === 'custom' ? 'custom dates' : subscriptionSummary.limits.maxReportRange === '30d' ? '30 days' : '7 days'}</li>
                        <li>Ingredients: {subscriptionSummary.limits.ingredientsFull ? 'full' : 'not available on Free'}</li>
                        <li>Advanced QR: {subscriptionSummary.limits.qrPremium ? 'included' : 'Basic+ only'}</li>
                      </ul>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!!checkoutLoading}
                    onClick={() => startCheckout('basic')}
                    className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {checkoutLoading === 'basic' ? 'Redirecting…' : 'Upgrade to Basic'}
                  </button>
                  <button
                    type="button"
                    disabled={!!checkoutLoading}
                    onClick={() => startCheckout('premium')}
                    className="rounded-xl border border-green-600 text-green-700 dark:text-green-400 px-4 py-2.5 text-sm font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50"
                  >
                    {checkoutLoading === 'premium' ? 'Redirecting…' : 'Upgrade to Premium'}
                  </button>
                  {subscriptionSummary?.hasStripeCustomer ? (
                    <button
                      type="button"
                      disabled={portalLoading}
                      onClick={() => openPortal()}
                      className="rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                    >
                      {portalLoading ? 'Opening…' : 'Manage billing'}
                    </button>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            {/* Section: Notifications + Security + Danger in one row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                    <Icon path={mdiBellOutline} size={1.1} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">Notifications</h3>
                </div>
                <div className="p-5 space-y-4">
                  <PreferenceRow title="Mute notification sound" desc="No sound when new notifications arrive" value={notificationsMuted} onToggle={() => handleMuteNotifications(!notificationsMuted)} />
                  <PreferenceRow title="Email Notifications" desc="Receive email updates" value={notificationPrefs.email} onToggle={() => setNotificationPrefs(prev => ({ ...prev, email: !prev.email }))} />
                  <PreferenceRow title="Menu Updates" desc="Notify when menu items change" value={notificationPrefs.menuUpdates} onToggle={() => setNotificationPrefs(prev => ({ ...prev, menuUpdates: !prev.menuUpdates }))} />
                  <PreferenceRow title="Allergen Alerts" desc="Alert for allergen issues" value={notificationPrefs.allergenAlerts} onToggle={() => setNotificationPrefs(prev => ({ ...prev, allergenAlerts: !prev.allergenAlerts }))} />
                  <PreferenceRow title="Weekly Reports" desc="Weekly summary reports" value={notificationPrefs.weeklyReports} onToggle={() => setNotificationPrefs(prev => ({ ...prev, weeklyReports: !prev.weeklyReports }))} />
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    <Icon path={mdiShieldCheckOutline} size={1.1} />
                  </div>
                  <h3 className="text-base font-semibold text-gray-800 dark:text-white">Security & Privacy</h3>
                </div>
                <div className="p-5 space-y-4">
                  <input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
                  <input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))} placeholder="New password" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
                  <input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))} placeholder="Confirm new password" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700" />
                  <button onClick={handleChangePassword} disabled={passwordSaving} className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    {passwordSaving ? 'Updating...' : 'Change Password'}
                  </button>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Two-Factor Authentication</p>
                    <Toggle checked={twoFactorEnabled} onChange={() => { if (!twoFactorEnabled) beginEnableTwoFactor(); }} />
                  </div>
                  {twoFactorSetup ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 p-3 space-y-2">
                      <p className="text-xs text-green-700">Scan QR in Google Authenticator/Authy, then verify code.</p>
                      <img src={twoFactorSetup.qrDataUrl} alt="2FA setup QR" className="h-36 w-36 rounded border border-green-200 bg-white" />
                      <p className="text-xs break-all text-green-800">Manual key: {twoFactorSetup.manualKey}</p>
                      <input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="w-full rounded-lg border border-green-200 px-3 py-2 text-sm" />
                      <button onClick={confirmEnableTwoFactor} className="w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700">Enable 2FA</button>
                    </div>
                  ) : null}
                  {twoFactorEnabled ? (
                    <div className="rounded-xl border border-gray-200 p-3 space-y-2">
                      <p className="text-xs text-gray-600">To disable, enter a valid current authenticator code:</p>
                      <input value={twoFactorCode} onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                      <button onClick={disableTwoFactor} className="w-full rounded-lg border border-red-300 py-2 text-sm text-red-700 hover:bg-red-50">Disable 2FA</button>
                    </div>
                  ) : null}
                  <div className="pt-2 space-y-1.5 text-sm">
                    <button type="button" className="block w-full text-left text-green-600 dark:text-green-400 hover:underline">Login History</button>
                    <button type="button" className="block w-full text-left text-green-600 dark:text-green-400 hover:underline">Privacy Settings</button>
                  </div>
                </div>
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/50 flex items-center gap-3 bg-red-50/50 dark:bg-red-900/10">
                  <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                    <Icon path={mdiAlertCircleOutline} size={1.1} />
                  </div>
                  <h3 className="text-base font-semibold text-red-700 dark:text-red-400">Danger Zone</h3>
                </div>
                <div className="p-5 space-y-2">
                  <button onClick={() => setDangerModal('deactivate')} className="w-full px-4 py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    Deactivate Account
                  </button>
                  <button onClick={() => setDangerModal('delete')} className="w-full px-4 py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    Delete All Data
                  </button>
                  <button onClick={() => authService.logout()} className="w-full px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition mt-2">
                    Sign Out
                  </button>
                </div>
              </section>
            </div>

            {/* Footer: version & status */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 px-5 py-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Icon path={mdiInformationOutline} size={0.9} />
                <span>Version <span className="font-medium text-gray-700 dark:text-gray-200">1.0.0</span></span>
              </div>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="text-gray-500 dark:text-gray-400">Last updated <span className="font-medium text-gray-700 dark:text-gray-200">Oct 26, 2025</span></span>
              <span className="text-gray-400 dark:text-gray-500">·</span>
              <span className="text-green-600 dark:text-green-400 font-medium">System Operational</span>
            </section>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
    {dangerModal !== 'none' ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
          {dangerModal === 'deactivate' ? (
            <>
              <h4 className="text-lg font-semibold text-gray-900">Deactivate account?</h4>
              <p className="mt-2 text-sm text-gray-600">You can reactivate later from login using your email + password.</p>
              <div className="mt-5 flex gap-2">
                <button onClick={() => setDangerModal('none')} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm">Cancel</button>
                <button onClick={async () => { setDangerModal('none'); await handleDeactivateAccount(); }} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700">Deactivate</button>
              </div>
            </>
          ) : (
            <>
              <h4 className="text-lg font-semibold text-gray-900">Delete all data?</h4>
              <p className="mt-2 text-sm text-gray-600">Type <span className="font-semibold">DELETE</span> to confirm.</p>
              <input value={deleteConfirmation} onChange={(e) => setDeleteConfirmation(e.target.value)} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              <div className="mt-5 flex gap-2">
                <button onClick={() => { setDangerModal('none'); setDeleteConfirmation(''); }} className="flex-1 rounded-lg border border-gray-300 py-2 text-sm">Cancel</button>
                <button onClick={async () => { await handleDeleteAllData(); setDangerModal('none'); setDeleteConfirmation(''); }} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    ) : null}
    </>
  );
};

const SectionCard: React.FC<{
  title: string;
  icon: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ title, icon, actionLabel, onAction, actionDisabled = false, className = '', children }) => (
  <section className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden ${className}`}>
    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400">
          <Icon path={icon} size={1.1} />
        </div>
        <h3 className="text-base font-semibold text-gray-800 dark:text-white">{title}</h3>
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition"
        >
          {actionLabel}
        </button>
      ) : (
        <span className="w-px h-8" aria-hidden />
      )}
    </div>
    <div className="p-5">{children}</div>
  </section>
);

const Field: React.FC<{ label: string; value: string; readOnly?: boolean }> = ({ label, value, readOnly = true }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    <input readOnly={readOnly} value={value} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
  </div>
);

const EditableField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string }> = ({ label, value, onChange, placeholder }) => (
  <div>
    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500" />
  </div>
);

const PreferenceRow: React.FC<{ title: string; desc: string; value: boolean; onToggle: () => void }> = ({
  title,
  desc,
  value,
  onToggle
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
    </div>
    <Toggle checked={value} onChange={onToggle} />
  </div>
);

const StatCard: React.FC<{
  label: string;
  value: string;
  accent: 'green' | 'blue' | 'emerald';
  icon?: string;
}> = ({ label, value, accent, icon }) => {
  const styles = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
  };

  return (
    <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 ${styles[accent]}`}>
      {icon && (
        <div className="p-2.5 rounded-xl bg-white/60 dark:bg-black/20">
          <Icon path={icon} size={1.25} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium opacity-90">{label}</p>
        <p className="text-base font-semibold mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
};

export default Settings;
