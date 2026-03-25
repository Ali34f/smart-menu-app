import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../services/authService';

interface RestaurantOption {
  id: string;
  name: string;
  qrCode?: string;
  isActive?: boolean;
}

function venueInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function publicMenuHref(qrCode?: string): string | null {
  if (!qrCode?.trim()) return null;
  const q = qrCode.trim();
  if (/^https?:\/\//i.test(q)) return q;
  return null;
}

const PlatformDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<RestaurantOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const response = await authService.getMyRestaurants();
        setRestaurants(response?.data || []);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Could not load restaurants');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const venueCountLabel = useMemo(() => {
    const n = restaurants.length;
    return `${n} venue${n === 1 ? '' : 's'}`;
  }, [restaurants.length]);

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success('Venue ID copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const openRestaurantWorkspace = async (restaurant: RestaurantOption) => {
    try {
      await authService.switchRestaurant(restaurant.id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Could not switch restaurant');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-green-500 transition hover:bg-green-600"
              title="Platform home"
            >
              <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-gray-800">Smart Menu</h1>
              <p className="truncate text-sm text-gray-500">Platform admin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => authService.logout()}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-12 pt-8">
        <div className="flex flex-col gap-2 border-b border-gray-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Workspaces</h2>
            <p className="mt-1 text-sm text-gray-600">Open a restaurant to work in its dashboard.</p>
          </div>
          <p className="text-sm text-gray-500">{venueCountLabel}</p>
        </div>

        {loading ? (
          <div className="mt-10 py-16 text-center text-sm text-gray-500">Loading…</div>
        ) : error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
        ) : restaurants.length === 0 ? (
          <div className="mt-10 rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
            <p className="text-sm font-medium text-gray-900">No venues yet</p>
            <p className="mt-2 text-sm text-gray-600">Restaurants will appear here after they register.</p>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {restaurants.map((restaurant) => {
              const live = restaurant.isActive !== false;
              const menuUrl = publicMenuHref(restaurant.qrCode);
              return (
                <li key={restaurant.id}>
                  <article className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700"
                        aria-hidden
                      >
                        {venueInitials(restaurant.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{restaurant.name}</h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              live ? 'bg-emerald-50 text-emerald-800' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {live ? 'Live' : 'Inactive'}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          {menuUrl ? (
                            <a
                              href={menuUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                            >
                              Public menu
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => copyId(restaurant.id)}
                            className="text-gray-500 hover:text-gray-800 hover:underline"
                            title={restaurant.id}
                          >
                            Copy venue ID
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openRestaurantWorkspace(restaurant)}
                      className="w-full shrink-0 rounded-lg bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-600 sm:w-auto sm:min-w-[10rem]"
                    >
                      Open workspace
                    </button>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
};

export default PlatformDashboard;
