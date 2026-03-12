import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@mdi/react';
import { mdiSilverwareForkKnife, mdiLeaf } from '@mdi/js';
import ProfileDropdown from '../components/ProfileDropdown';
import NotificationBell from '../components/NotificationBell';
import ShieldCheckIcon from '../components/ShieldCheckIcon';
import { authService } from '../services/authService';
import { qrService } from '../services/qrService';
import { useLanguage } from '../contexts/LanguageContext';

const QRCodes: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const userEmail = localStorage.getItem('userEmail') || '';
  const userName = localStorage.getItem('userName') || userEmail.split('@')[0] || 'User';
  const restaurantName = localStorage.getItem('restaurantName') || 'Your Restaurant';
  const userRole = (localStorage.getItem('userRole') || 'staff').toLowerCase();
  const [qrCodeImage, setQrCodeImage] = useState<string>(localStorage.getItem('qrCode') || '');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>(localStorage.getItem('qrCodeUrl') || '');
  const [qrLoading, setQrLoading] = useState(false);
  const [publicBaseUrl, setPublicBaseUrl] = useState<string>(() => {
    const saved = localStorage.getItem('publicBaseUrl');
    if (saved) return saved;
    return window.location.origin;
  });
  const [publicApiBaseUrl, setPublicApiBaseUrl] = useState<string>(() => {
    const saved = localStorage.getItem('publicApiBaseUrl');
    if (saved) return saved;
    return `${window.location.protocol}//${window.location.hostname}:5002/api`;
  });
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const [size, setSize] = useState('Large (300x300)');
  const [format, setFormat] = useState('PNG');
  const [includeLogo, setIncludeLogo] = useState(true);
  const [color, setColor] = useState('#000000');
  const [scanAnalytics, setScanAnalytics] = useState<{ date: string; label: string; count: number }[]>([]);
  const [scanSummary, setScanSummary] = useState<{ totalScansLast30?: number }>({});
  const isFirstUrlChange = useRef(true);
  const isFirstSizeColor = useRef(true);

  const displayRole = useMemo(
    () => userRole.charAt(0).toUpperCase() + userRole.slice(1),
    [userRole]
  );

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
    try {
      setQrLoading(true);
      const width = sizeToWidth[size] ?? 300;
      const response = await qrService.generateQR(publicBaseUrl, publicApiBaseUrl, {
        width,
        color: color || undefined
      });
      const nextQrImage = response?.qrCodeImage || '';
      const nextQrUrl = response?.qrCodeUrl || '';
      setQrCodeImage(nextQrImage);
      setQrCodeUrl(nextQrUrl);
      if (nextQrImage) localStorage.setItem('qrCode', nextQrImage);
      if (nextQrUrl) localStorage.setItem('qrCodeUrl', nextQrUrl);
      localStorage.setItem('publicBaseUrl', publicBaseUrl.replace(/\/$/, ''));
      localStorage.setItem('publicApiBaseUrl', publicApiBaseUrl.replace(/\/$/, ''));
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When user changes the public URLs, regenerate the QR so it always matches
  useEffect(() => {
    if (isFirstUrlChange.current) {
      isFirstUrlChange.current = false;
      return;
    }
    const t = setTimeout(() => generateQRCode(), 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicBaseUrl, publicApiBaseUrl]);

  // When size or color changes, regenerate the QR (skip first run to avoid double generate on load)
  useEffect(() => {
    if (isFirstSizeColor.current) {
      isFirstSizeColor.current = false;
      return;
    }
    if (!qrCodeUrl) return;
    const t = setTimeout(() => generateQRCode(), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, color]);

  const handleLogout = () => {
    authService.logout();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col qr-codes-page">
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
              <p className="text-sm text-gray-500 dark:text-gray-400">QR Code Management</p>
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
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Generate QR codes for dine-in menu access</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Your Restaurant QR Code</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">Customers scan this to view your menu. Works from any network when using a public URL (e.g. ngrok).</p>

                <div className="hidden print:hidden">
                  <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">To use on your phone (same Wi‑Fi)</h4>
                  <ol className="text-xs text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                    <li>Get your computer’s IP (e.g. Mac: run <code className="bg-green-100 dark:bg-gray-700 px-1 rounded">ipconfig getifaddr en0</code>).</li>
                    <li>Set <strong>Public app URL</strong> and <strong>Public API URL</strong> below using that IP.</li>
                    <li>The QR updates automatically; or click <strong>Regenerate</strong>.</li>
                    <li>Connect your phone to the <strong>same Wi‑Fi</strong> and scan the QR.</li>
                  </ol>
                </div>

                <div className="w-full max-w-xl mb-6 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Public app URL for QR
                    </label>
                    <input
                      type="text"
                      value={publicBaseUrl}
                      onChange={(e) => setPublicBaseUrl(e.target.value)}
                      placeholder="http://192.168.x.x:3000"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                    {publicBaseUrl.includes('localhost') && (
                      <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                        localhost works only on this computer. Use your laptop IP for phone scanning.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                      Public API URL for menu data
                    </label>
                    <input
                      type="text"
                      value={publicApiBaseUrl}
                      onChange={(e) => setPublicApiBaseUrl(e.target.value)}
                      placeholder="http://192.168.x.x:5002/api"
                      className="w-full px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                    />
                    {publicApiBaseUrl.includes('localhost') && (
                      <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400">
                          Phones cannot use localhost. Use your laptop IP (e.g. http://192.168.1.x:5002/api) or an ngrok URL, then the QR will update automatically.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center">
                  <div className="relative w-44 h-44 rounded-xl border-2 border-green-500 bg-white flex items-center justify-center p-2">
                    {qrCodeImage ? (
                      <>
                        <img src={qrCodeImage} alt="Restaurant QR Code" className="w-full h-full object-contain" />
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
                  <p className="mt-4 font-semibold text-gray-800 dark:text-white">{restaurantName} Menu</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 break-all text-center">
                    {qrCodeUrl || 'Generating menu link...'}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => qrService.downloadQR(publicBaseUrl, publicApiBaseUrl)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-2"
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
                      onClick={generateQRCode}
                      disabled={qrLoading}
                      className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition flex items-center gap-2 disabled:opacity-60"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {qrLoading ? 'Generating...' : 'Regenerate'}
                    </button>
                    {qrCodeUrl && (
                      <button
                        onClick={() => window.open(qrCodeUrl, '_blank')}
                        className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition"
                      >
                        Open Menu Link
                      </button>
                    )}
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
                  {(publicBaseUrl.includes('ngrok') || publicApiBaseUrl.includes('ngrok')) && (
                    <p className="mt-3 w-full max-w-xl text-xs text-gray-500 dark:text-gray-400">
                      Using ngrok: keep the tunnel running. Visitors may see a one-time ngrok warning before the menu; to remove it, upgrade to a paid ngrok plan.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
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

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
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

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
              <h4 className="font-semibold text-gray-800 dark:text-white">Customize QR Code</h4>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400">Show Smart Menu logo in center</p>
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

            <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 no-print">
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
