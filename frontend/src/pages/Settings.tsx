import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import toast from 'react-hot-toast';
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
  mdiInformationOutline
} from '@mdi/js';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { restaurantService, CUISINE_OPTIONS } from '../services/restaurantService';

const NOTIFICATIONS_MUTED_KEY = 'notificationsMuted';

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
    phone: ''
  });
  const [restaurantSaving, setRestaurantSaving] = useState(false);

  const [hoursEnabled, setHoursEnabled] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true
  });

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
          phone: data.phone || ''
        });
        setRestaurantName(data.name || '');
      } catch (e) {
        console.error('Failed to load restaurant:', e);
      }
    };
    load();
  }, []);

  const roleLabel = useMemo(
    () => userRole.charAt(0).toUpperCase() + userRole.slice(1),
    [userRole]
  );

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
        phone: restaurantForm.phone.replace(/\D/g, '').slice(0, 15) || undefined
      });
      setRestaurantName(data.name || restaurantForm.name);
      localStorage.setItem('restaurantName', data.name || '');
      window.dispatchEvent(new CustomEvent('profileUpdated'));
      toast.success('Restaurant updated');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setRestaurantSaving(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center hover:bg-green-600 transition"
            >
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Smart Menu</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Settings</p>
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
          <nav className="p-6 flex flex-col flex-1 justify-between">
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
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </nav>

          <div className="border-t border-gray-200 dark:border-gray-700 p-5">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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
            </div>

            {/* Status cards — full width, balanced */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <StatCard label="Profile Status" value="Complete" accent="green" icon={mdiCheckCircle} />
              <StatCard label="Notifications" value={notificationPrefs.email ? 'Enabled' : 'Disabled'} accent="blue" icon={mdiBellOutline} />
              <StatCard label="Restaurant Status" value="Operational" accent="emerald" icon={mdiStoreOutline} />
            </div>

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
              </SectionCard>
            </div>

            {/* Section: Business Hours full width */}
            <SectionCard
              className="mb-6"
              title="Business Hours"
              icon={mdiClockOutline}
              actionLabel="Save Hours"
              onAction={() => {}}
            >
              <div className="overflow-x-auto">
                <div className="min-w-[280px] space-y-3">
                  {Object.entries(hoursEnabled).map(([day, enabled]) => (
                    <div key={day} className="grid grid-cols-[minmax(100px,110px)_56px_1fr] items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{day}</p>
                      <Toggle checked={enabled} onChange={() => setHoursEnabled(prev => ({ ...prev, [day]: !enabled }))} />
                      <div className="flex items-center gap-2 flex-wrap">
                        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500">
                          <option>12:00</option>
                          <option>13:00</option>
                          <option>14:00</option>
                        </select>
                        <span className="text-gray-400">–</span>
                        <select className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500">
                          <option>21:00</option>
                          <option>22:00</option>
                          <option>23:00</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>

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
                  <button className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    Change Password
                  </button>
                  <div className="flex items-center justify-between py-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300">Two-Factor Authentication</p>
                    <Toggle checked={false} onChange={() => {}} />
                  </div>
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
                  <button className="w-full px-4 py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                    Deactivate Account
                  </button>
                  <button className="w-full px-4 py-2.5 border border-red-200 dark:border-red-800 rounded-xl text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
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
          </div>
        </main>
      </div>
    </div>
  );
};

const SectionCard: React.FC<{
  title: string;
  icon: string;
  actionLabel: string;
  onAction: () => void;
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
      <button onClick={onAction} disabled={actionDisabled} className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition">
        {actionLabel}
      </button>
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
