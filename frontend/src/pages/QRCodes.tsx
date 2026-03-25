import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import QRCodeLib from 'qrcode';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { qrService } from '../services/qrService';
import { useLanguage } from '../contexts/LanguageContext';
import { formatRoleLabel } from '../utils/roleLabels';
import AppHeaderBranding from '../components/AppHeaderBranding';
import WorkspaceContextBar from '../components/WorkspaceContextBar';

/** Cached PNG data URL — never use `qrCode` for this (that key is the public menu URL for auth). */
const QR_IMAGE_STORAGE_KEY = 'smartMenuQrImage';

function readCachedQrImage(): string {
  const raw = localStorage.getItem(QR_IMAGE_STORAGE_KEY);
  return raw?.startsWith('data:image/') ? raw : '';
}

function readCachedMenuUrl(): string {
  const direct = localStorage.getItem('qrCodeUrl');
  if (direct?.startsWith('http')) return direct;
  const legacy = localStorage.getItem('qrCode');
  if (legacy?.startsWith('http')) return legacy;
  return '';
}

/** Earlier builds stored a huge data URL under `qrCode`, breaking quota and the rest of the app. */
function repairCorruptedQrStorage() {
  const q = localStorage.getItem('qrCode');
  if (q?.startsWith('data:image')) {
    localStorage.removeItem('qrCode');
  }
}

function isLoopbackPublicUrl(url: string): boolean {
  if (!url || !url.includes('://')) return false;
  try {
    const u = new URL(url.trim());
    const h = u.hostname.toLowerCase();
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0';
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

/**
 * If the saved "website" is loopback but API base is a real public URL (e.g. ngrok),
 * the QR would encode 127.0.0.1 and fail on phones. Align website with API origin.
 */
function reconcilePublicUrlPair(website: string, api: string): { website: string; api: string } {
  const w = website.trim().replace(/\/$/, '');
  let a = api.trim().replace(/\/$/, '');
  if (!isLoopbackPublicUrl(w)) {
    return { website: w, api: a };
  }
  if (!a.startsWith('http://') && !a.startsWith('https://')) {
    return { website: w, api: a };
  }
  try {
    const apiUrl = new URL(a);
    const origin = `${apiUrl.protocol}//${apiUrl.host}`;
    if (isLoopbackPublicUrl(origin)) {
      return { website: w, api: a };
    }
    const path = (apiUrl.pathname || '').replace(/\/$/, '') || '';
    let newWebsite = origin;
    let newApi = a;
    if (path === '/api' || path.endsWith('/api')) {
      newWebsite = a.replace(/\/api\/?$/i, '').replace(/\/$/, '') || origin;
      newApi = `${newWebsite}/api`;
    } else if (!path || path === '/') {
      newWebsite = origin;
      newApi = `${origin}/api`;
    } else {
      newWebsite = origin;
      newApi = `${origin}/api`;
    }
    return { website: newWebsite, api: newApi };
  } catch {
    return { website: w, api: a };
  }
}

/** Optional: set in `.env.local` so QR defaults to your tunnel without pasting each time (ngrok free URLs change when you restart ngrok). */
function envDefaultWebsite(): string | null {
  const v = process.env.REACT_APP_DEFAULT_PUBLIC_WEBSITE_URL;
  return v?.trim().startsWith('http') ? v.trim().replace(/\/$/, '') : null;
}

function envDefaultApi(): string | null {
  const v = process.env.REACT_APP_DEFAULT_PUBLIC_API_BASE_URL;
  return v?.trim().startsWith('http') ? v.trim().replace(/\/$/, '') : null;
}

function initialPublicUrlPair(): { website: string; api: string } {
  const envW = envDefaultWebsite();
  const envA = envDefaultApi();
  if (envW) {
    const w = envW.replace(/\/$/, '');
    const a = (envA || `${w}/api`).replace(/\/$/, '');
    return reconcilePublicUrlPair(w, a);
  }
  let website = window.location.origin.replace(/\/$/, '');
  const savedW = localStorage.getItem('publicBaseUrl');
  if (savedW?.trim().startsWith('http')) {
    website = savedW.trim().replace(/\/$/, '');
  }
  let api = `${window.location.origin.replace(/\/$/, '')}/api`;
  const savedA = localStorage.getItem('publicApiBaseUrl');
  if (savedA?.trim().startsWith('http')) {
    api = savedA.trim().replace(/\/$/, '');
  }
  return reconcilePublicUrlPair(website, api);
}

const QRCodes: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [qrCodeImage, setQrCodeImage] = useState<string>(() => {
    repairCorruptedQrStorage();
    return readCachedQrImage();
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(readCachedMenuUrl);
  const [qrLoading, setQrLoading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const [size, setSize] = useState('Large (300x300)');
  const [format, setFormat] = useState('PNG');
  /** Default off — a centre logo overlay blocks QR modules and breaks most phone cameras. */
  const [includeLogo, setIncludeLogo] = useState(false);
  const [color, setColor] = useState('#000000');
  const [scanAnalytics, setScanAnalytics] = useState<{ date: string; label: string; count: number }[]>([]);
  const [scanSummary, setScanSummary] = useState<{ totalScansLast30?: number }>({});
  const isFirstSizeColor = useRef(true);

  const initialUrls = initialPublicUrlPair();
  const [publicWebsiteUrl] = useState<string>(initialUrls.website);
  const [publicApiBaseUrl] = useState<string>(initialUrls.api);

  /** Build the QR image in the browser from the exact URL string so the code always matches the link. */
  const renderQrDataUrl = async (menuUrl: string, width: number, colorHex: string): Promise<string | null> => {
    if (!menuUrl.startsWith('http')) return null;
    try {
      return await QRCodeLib.toDataURL(menuUrl, {
        width,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: colorHex || '#000000', light: '#FFFFFF' }
      });
    } catch (e) {
      console.error('QR render failed', e);
      return null;
    }
  };

  const displayRole = formatRoleLabel(userRole);

  useEffect(() => {
    const savedPic = localStorage.getItem('profilePicture');
    if (savedPic) setProfilePicture(savedPic);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await qrService.getScanAnalytics();
        setScanAnalytics(res?.data ?? []);
        setScanSummary(res?.summary ?? {});
      } catch {
        setScanAnalytics([]);
        setScanSummary({});
      }
    };
    load();
  }, []);

  const sizeToWidth: Record<string, number> = {
    'Small (200x200)': 200,
    'Medium (250x250)': 250,
    'Large (300x300)': 300
  };

  const generateQRCode = async () => {
    const base = publicWebsiteUrl.trim().replace(/\/$/, '');
    const apiBase = publicApiBaseUrl.trim().replace(/\/$/, '');
    if (!base.startsWith('http://') && !base.startsWith('https://')) {
      toast.error('Public website URL must start with http:// or https://');
      return;
    }
    if (!apiBase.startsWith('http://') && !apiBase.startsWith('https://')) {
      toast.error('Public API base URL must start with http:// or https://');
      return;
    }
    try {
      setQrLoading(true);
      const width = sizeToWidth[size] ?? 300;
      const response = await qrService.generateQR(base, apiBase, {
        width,
        color: color || undefined
      });
      const nextQrUrl = response?.qrCodeUrl || '';
      const serverImage = response?.qrCodeImage || '';
      const clientImage = await renderQrDataUrl(nextQrUrl, width, color);
      const nextQrImage = clientImage || serverImage;
      setQrCodeImage(nextQrImage);
      setQrCodeUrl(nextQrUrl);
      if (nextQrUrl) {
        localStorage.setItem('qrCode', nextQrUrl);
        localStorage.setItem('qrCodeUrl', nextQrUrl);
      }
      if (nextQrImage) {
        try {
          localStorage.setItem(QR_IMAGE_STORAGE_KEY, nextQrImage);
        } catch {
          toast.error('Could not cache QR image (storage full). It will still work until you leave this page.');
        }
      }
      localStorage.setItem('publicBaseUrl', base);
      localStorage.setItem('publicApiBaseUrl', apiBase);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Could not generate QR code. Check your connection and try again.');
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstSizeColor.current) {
      isFirstSizeColor.current = false;
      return;
    }
    if (!qrCodeUrl) return;
    const t = setTimeout(() => generateQRCode(), 450);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, color]);

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col qr-codes-page">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between px-6 py-4 gap-4">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AppHeaderBranding title={t('smartMenu')} subtitle="QR Code Management" />
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
                <span className="flex-1 text-left">{t('dashboard')}</span>
              </button>
              <button onClick={() => navigate('/menu-items')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <Icon path={mdiSilverwareForkKnife} size={0.9} className="flex-shrink-0" />
                <span className="flex-1 text-left">{t('menuItems')}</span>
              </button>
              <button onClick={() => navigate('/allergens')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <ShieldCheckIcon size={20} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">{t('allergens')}</span>
              </button>
              <button onClick={() => navigate('/ingredients')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <Icon path={mdiLeaf} size={1} className="text-gray-700 dark:text-gray-300 flex-shrink-0" />
                <span className="flex-1 text-left">{t('ingredients')}</span>
              </button>
              <button onClick={() => navigate('/staff')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="flex-1 text-left">{t('staffManagement')}</span>
              </button>
              <button className="w-full flex items-center space-x-4 px-4 py-3 bg-green-500 text-white rounded-lg font-medium text-sm shadow-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h4v4H4V7zm0 6h4v4H4v-4zm6-6h4v4h-4V7zm6 0h4v4h-4V7zm-6 6h10v4H10v-4z" />
                </svg>
                <span className="flex-1 text-left">{t('qrCodes')}</span>
              </button>
            </div>

            <div className="space-y-2">
              <button onClick={() => navigate('/reports')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <span className="flex-1 text-left">{t('reports')}</span>
              </button>
              <button onClick={() => navigate('/settings')} className="w-full flex items-center space-x-4 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm transition">
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
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white">QR Code Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Clean, ready-to-print QR for menu access</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 self-start bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Your Restaurant QR Code</h3>

                {qrLoading ? (
                  <p className="mb-3 text-xs font-medium text-emerald-700 dark:text-emerald-400">Updating QR…</p>
                ) : null}

                <div className="w-full max-w-xl mb-4" />

                <div className="flex flex-col items-center">
                  <div className="relative w-52 h-52 rounded-2xl border border-green-200 dark:border-green-800 bg-gradient-to-b from-green-50 to-white dark:from-gray-800 dark:to-gray-800 flex items-center justify-center p-4 shadow-sm">
                    <div className="w-full h-full rounded-xl border border-white bg-white p-2 shadow-sm">
                    {qrCodeImage ? (
                      <>
                        <img src={qrCodeImage} alt="Restaurant QR Code" className="w-full h-full object-contain rounded-lg" />
                        {includeLogo && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-10 h-10 rounded-lg bg-white border-2 border-green-500 flex items-center justify-center shadow-sm">
                              <span className="text-green-600 font-bold text-xs">SM</span>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <svg viewBox="0 0 120 120" className="w-full h-full">
                        <rect width="120" height="120" fill="#fff" />
                        <rect x="8" y="8" width="30" height="30" fill="#000" />
                        <rect x="12" y="12" width="22" height="22" fill="#fff" />
                        <rect x="16" y="16" width="14" height="14" fill="#000" />
                        <rect x="82" y="8" width="30" height="30" fill="#000" />
                        <rect x="86" y="12" width="22" height="22" fill="#fff" />
                        <rect x="90" y="16" width="14" height="14" fill="#000" />
                        <rect x="8" y="82" width="30" height="30" fill="#000" />
                        <rect x="12" y="86" width="22" height="22" fill="#fff" />
                        <rect x="16" y="90" width="14" height="14" fill="#000" />
                        <rect x="50" y="50" width="8" height="8" fill="#10b981" />
                        <rect x="45" y="10" width="6" height="6" fill="#000" />
                        <rect x="56" y="10" width="6" height="6" fill="#000" />
                        <rect x="67" y="10" width="6" height="6" fill="#000" />
                        <rect x="45" y="24" width="6" height="6" fill="#000" />
                        <rect x="67" y="24" width="6" height="6" fill="#000" />
                        <rect x="45" y="36" width="6" height="6" fill="#000" />
                        <rect x="56" y="36" width="6" height="6" fill="#000" />
                        <rect x="67" y="36" width="6" height="6" fill="#000" />
                        <rect x="45" y="50" width="6" height="6" fill="#000" />
                        <rect x="67" y="50" width="6" height="6" fill="#000" />
                        <rect x="45" y="62" width="6" height="6" fill="#000" />
                        <rect x="56" y="62" width="6" height="6" fill="#000" />
                        <rect x="67" y="62" width="6" height="6" fill="#000" />
                        <rect x="82" y="50" width="6" height="6" fill="#000" />
                        <rect x="94" y="50" width="6" height="6" fill="#000" />
                        <rect x="106" y="50" width="6" height="6" fill="#000" />
                        <rect x="82" y="62" width="6" height="6" fill="#000" />
                        <rect x="106" y="62" width="6" height="6" fill="#000" />
                        <rect x="82" y="74" width="6" height="6" fill="#000" />
                        <rect x="94" y="74" width="6" height="6" fill="#000" />
                        <rect x="106" y="74" width="6" height="6" fill="#000" />
                        <rect x="45" y="82" width="6" height="6" fill="#000" />
                        <rect x="56" y="82" width="6" height="6" fill="#000" />
                        <rect x="67" y="82" width="6" height="6" fill="#000" />
                        <rect x="45" y="94" width="6" height="6" fill="#000" />
                        <rect x="67" y="94" width="6" height="6" fill="#000" />
                        <rect x="45" y="106" width="6" height="6" fill="#000" />
                        <rect x="56" y="106" width="6" height="6" fill="#000" />
                        <rect x="67" y="106" width="6" height="6" fill="#000" />
                      </svg>
                    )}
                    </div>
                  </div>
                  <p className="mt-5 font-semibold text-gray-800 dark:text-white text-lg">{restaurantName} Menu</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scan to view menu</p>
                  <p className="mt-2 max-w-md text-center text-[11px] text-gray-600 dark:text-gray-400">
                    If a logo is turned on in the options below, it sits on top of the code and can stop phones from scanning — leave it off unless you&apos;re sure.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() =>
                        qrService.downloadQR(
                          publicWebsiteUrl.trim().replace(/\/$/, ''),
                          publicApiBaseUrl.trim().replace(/\/$/, '')
                        )
                      }
                      disabled={qrLoading}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-2 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 12l1.41 1.41L11 7.83V20h2V7.83l5.59 5.58L20 12" />
                      </svg>
                      Download QR Code
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6v-8z" />
                      </svg>
                      Print QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => generateQRCode()}
                      disabled={qrLoading}
                      title="Fetch the latest menu URL from the server and redraw the QR"
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition flex items-center gap-2 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {qrLoading ? 'Working…' : 'Regenerate'}
                    </button>
                  </div>

                  {/* Print-only: shown only in print preview */}
                  <div className="qr-print-only hidden">
                    {qrCodeImage && (
                      <>
                        <img src={qrCodeImage} alt="Restaurant QR Code" className="max-w-[280px] w-full h-auto mx-auto block" />
                        <p className="text-center text-lg font-semibold text-black mt-3">{restaurantName} Menu</p>
                        <p className="text-center text-sm text-gray-600 mt-1">Scan to view menu</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h4 className="font-semibold text-gray-800 dark:text-white mb-4">How to Use</h4>
                  <div className="space-y-4">
                    {[
                      'Download or print the QR code',
                      'Place it on restaurant tables',
                      'Customers scan to view menu',
                      'They can filter by allergens instantly'
                    ].map((step, idx) => (
                      <div key={step} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-green-500 text-white text-xs flex items-center justify-center font-semibold">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800 dark:text-white">{step}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {idx === 0 && 'Choose your preferred format and size'}
                            {idx === 1 && 'Display at entry and each table'}
                            {idx === 2 && 'Works with any smartphone camera'}
                            {idx === 3 && 'Safer dining for all customers'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
                  <h4 className="font-semibold text-gray-800 dark:text-white">QR Code Scans</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Last 30 days</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Total Scans</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">
                        {typeof scanSummary.totalScansLast30 === 'number' ? scanSummary.totalScansLast30 : '0'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Unique Visitors</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1" title="Not tracked yet">—</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Avg Time</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1" title="Not tracked yet">—</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-700 p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Conversions</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1" title="Not tracked yet">—</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h4 className="font-semibold text-gray-800 dark:text-white">Customize QR Code</h4>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Size and colour update the QR automatically after a moment, or tap Regenerate.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Size</label>
                  <select value={size} onChange={(e) => setSize(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg">
                    <option>Small (200x200)</option>
                    <option>Medium (250x250)</option>
                    <option>Large (300x300)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
                  <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg">
                    <option>PNG</option>
                    <option>SVG</option>
                    <option>PDF</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Include Logo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Overlay on the QR — often breaks scanning; off by default</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeLogo((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${includeLogo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${includeLogo ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-8 w-10 border border-gray-300 dark:border-gray-600 rounded cursor-pointer" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{color}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 no-print">
              <h4 className="font-semibold text-gray-800 dark:text-white">Daily Scans</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">QR code scan activity over the last 7 days (from today)</p>
              <div className="w-full h-56">
                {scanAnalytics.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                    No scan data yet. Scans will appear when customers open the menu via the QR link.
                  </div>
                ) : (
                  <svg viewBox="0 0 960 220" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                    <defs>
                      <linearGradient id="scanLine" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
                      </linearGradient>
                    </defs>
                    <g stroke="#e5e7eb" strokeWidth="1">
                      <line x1="60" y1="20" x2="60" y2="190" />
                      <line x1="60" y1="190" x2="920" y2="190" />
                      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                        <line key={i} x1={60 + (i + 1) * 120} y1="20" x2={60 + (i + 1) * 120} y2="190" />
                      ))}
                      <line x1="60" y1="150" x2="920" y2="150" />
                      <line x1="60" y1="110" x2="920" y2="110" />
                      <line x1="60" y1="70" x2="920" y2="70" />
                      <line x1="60" y1="30" x2="920" y2="30" />
                    </g>
                    {(() => {
                      const maxCount = Math.max(1, ...scanAnalytics.map((d) => d.count));
                      const points = scanAnalytics.map((d, i) => {
                        const x = 60 + (i + 1) * 120;
                        const y = 190 - (d.count / maxCount) * 160;
                        return `${x},${y}`;
                      }).join(' ');
                      const circles = scanAnalytics.map((d, i) => {
                        const x = 60 + (i + 1) * 120;
                        const y = 190 - (d.count / maxCount) * 160;
                        return { x, y };
                      });
                      return (
                        <>
                          {points && <polyline fill="none" stroke="url(#scanLine)" strokeWidth="3" points={points} />}
                          {circles.map((c, i) => (
                            <circle key={i} cx={c.x} cy={c.y} r="4" fill="#10b981" />
                          ))}
                        </>
                      );
                    })()}
                    {scanAnalytics.map((d, i) => (
                      <text key={d.date} x={60 + (i + 1) * 120} y={210} fontSize="12" textAnchor="middle" fill="#6b7280" className="dark:fill-gray-400">
                        {d.label}
                      </text>
                    ))}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QRCodes;
