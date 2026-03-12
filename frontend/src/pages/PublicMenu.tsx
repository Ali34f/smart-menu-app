import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface PublicAllergen {
  _id: string;
  name: string;
  icon?: string;
}

interface PublicMenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string;
  allergens?: PublicAllergen[];
  isAvailable: boolean;
}

interface PublicRestaurant {
  name: string;
  cuisineType?: string;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(value);

/** Path for API serve-image (e.g. "uploads/filename.jpg") */
function imagePath(image: string | undefined): string | null {
  if (!image || typeof image !== 'string') return null;
  const s = image.trim().replace(/^\/+/, '');
  if (!s) return null;
  if (s.startsWith('http')) return null;
  return s.startsWith('uploads') ? s : `uploads/${s}`;
}

/** Placeholder icon when a menu item has no image (SVG plate/dish, not emoji) */
const NoImageIcon: React.FC<{ className?: string }> = ({ className = 'w-12 h-12 text-gray-300' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="11" rx="7" ry="6" />
    <ellipse cx="12" cy="11" rx="5" ry="4" strokeDasharray="2 1.5" opacity="0.6" />
  </svg>
);

const PublicMenu: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<PublicRestaurant | null>(null);
  const [items, setItems] = useState<PublicMenuItem[]>([]);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState<PublicMenuItem | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const [imageBlobUrls, setImageBlobUrls] = useState<Record<string, string>>({});

  const getPublicApiBaseUrl = () => {
    const fromQuery = new URLSearchParams(window.location.search).get('apiBase');
    const isSafeHttpUrl = (value?: string | null) => {
      if (!value) return false;
      return /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/.test(value);
    };

    if (isSafeHttpUrl(fromQuery)) {
      return (fromQuery as string).replace(/\/$/, '');
    }
    return `${window.location.origin}/api`;
  };

  useEffect(() => {
    const loadMenu = async () => {
      if (!restaurantId) {
        setError('Restaurant not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const apiBase = getPublicApiBaseUrl();
        const response = await axios.get(`${apiBase}/public/menu/${restaurantId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        });
        setRestaurant(response.data?.restaurant || null);
        setItems(response.data?.data || []);
      } catch (err: any) {
        console.error('Error loading public menu:', err);
        const msg = err?.response?.data?.message || 'Could not load menu';
        const isNetwork = !err?.response && (err?.message === 'Network Error' || err?.code === 'ECONNABORTED');
        setError(
          isNetwork
            ? 'Cannot reach the menu server. Please try again in a moment or ask the restaurant team.'
            : msg
        );
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, [restaurantId]);

  // Load images via API (with ngrok header) so they display when using ngrok
  useEffect(() => {
    const apiBase = getPublicApiBaseUrl();
    const opts = { headers: { 'ngrok-skip-browser-warning': 'true' } as HeadersInit };
    let cancelled = false;
    items.forEach((item) => {
      const path = imagePath(item.image);
      if (!path || failedImages.has(item._id)) return;
      if (imageBlobUrls[item._id]) return; // already loaded
      fetch(`${apiBase}/public/serve-image?path=${encodeURIComponent(path)}`, opts)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('Not ok'))))
        .then((blob) => {
          if (cancelled) return;
          setImageBlobUrls((prev) => ({ ...prev, [item._id]: URL.createObjectURL(blob) }));
        })
        .catch(() => {
          if (!cancelled) setFailedImages((prev) => new Set(prev).add(item._id));
        });
    });
    return () => { cancelled = true; };
  }, [items]);

  const blobUrlsRef = React.useRef<Record<string, string>>({});
  blobUrlsRef.current = imageBlobUrls;
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  const groupedItems = useMemo(() => {
    const grouped: Record<string, PublicMenuItem[]> = {};
    items.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    return Object.entries(grouped);
  }, [items]);

  const heroInitial = restaurant?.name?.charAt(0).toUpperCase() || 'R';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-lg font-semibold text-emerald-700">
            {heroInitial}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-emerald-600 mb-1">Digital menu</p>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
              {loading ? 'Loading…' : (restaurant?.name || 'Restaurant Menu')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading
                ? 'Fetching menu…'
                : restaurant?.cuisineType
                  ? `${restaurant.cuisineType} cuisine · Tap a dish for details`
                  : 'Browse dishes, prices, and allergen details.'}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <p className="text-sm text-gray-600 tracking-wide uppercase">Loading menu…</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-lg px-6 py-7 text-center">
              <div className="mx-auto mb-4 h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-lg">!</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Menu unavailable</h1>
              <p className="text-sm text-gray-600 mt-2">{error}</p>
              <p className="text-xs text-gray-500 mt-4">
                If this keeps happening, please let a member of staff know and they&apos;ll refresh the QR code.
              </p>
            </div>
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-8 text-center">
            <p className="text-sm text-gray-700 font-medium">No dishes are available right now.</p>
            <p className="text-xs text-gray-500 mt-2">
              Please ask a member of staff if you&apos;d like to see today&apos;s specials.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedItems.map(([category, categoryItems]) => (
              <section key={category} className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-gradient-to-r from-emerald-400/50 to-transparent" />
                  <h2 className="text-sm font-semibold tracking-widest uppercase text-gray-500 whitespace-nowrap">
                    {category}
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-l from-emerald-400/50 to-transparent" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {categoryItems.map((item) => {
                    const blobUrl = imageBlobUrls[item._id];
                    const hasImagePath = imagePath(item.image);
                    const showImg = !!blobUrl && !failedImages.has(item._id);
                    return (
                      <article
                        key={item._id}
                        onClick={() => setSelectedItem(item)}
                        className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden flex gap-0 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        {showImg ? (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-100">
                            <img
                              src={blobUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={() => setFailedImages((prev) => new Set(prev).add(item._id))}
                            />
                          </div>
                        ) : hasImagePath ? (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <div className="animate-pulse rounded-full bg-gray-200 w-8 h-8" />
                          </div>
                        ) : (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                            <NoImageIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 p-4 flex flex-col justify-center">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-sm font-semibold text-gray-900 tracking-tight">
                                {item.name}
                              </h3>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.description}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              <div className="text-sm font-semibold text-emerald-600">
                                {formatPrice(item.price)}
                              </div>
                              {!item.isAvailable && (
                                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                                  Not available
                                </span>
                              )}
                            </div>
                          </div>
                          {item.allergens && item.allergens.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {item.allergens.map((a) => (
                                <span
                                  key={a._id}
                                  className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium"
                                >
                                  {a.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center pr-3 text-gray-400 group-hover:text-emerald-500 transition">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}

        <footer className="mt-10 text-center text-xs text-gray-500">
          Powered by <span className="font-medium text-emerald-600">Smart Menu</span>
        </footer>
      </main>

      {/* Item detail modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {imageBlobUrls[selectedItem._id] && !failedImages.has(selectedItem._id) ? (
                <div className="aspect-[16/10] bg-gray-100">
                  <img
                    src={imageBlobUrls[selectedItem._id]}
                    alt={selectedItem.name}
                    className="w-full h-full object-cover rounded-t-2xl"
                    onError={() => setFailedImages((prev) => new Set(prev).add(selectedItem._id))}
                  />
                </div>
              ) : imagePath(selectedItem.image) ? (
                <div className="aspect-[16/10] bg-gray-100 rounded-t-2xl flex items-center justify-center">
                  <div className="animate-pulse rounded-full bg-gray-200 w-12 h-12" />
                </div>
              ) : (
                <div className="aspect-[16/10] bg-gray-100 rounded-t-2xl flex items-center justify-center">
                  <NoImageIcon className="w-16 h-16 text-gray-300" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:bg-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">{selectedItem.category}</p>
              <h2 className="text-xl font-semibold text-gray-900 mt-1">{selectedItem.name}</h2>
              <p className="text-sm text-gray-600 mt-2">{selectedItem.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-emerald-600">{formatPrice(selectedItem.price)}</span>
                {!selectedItem.isAvailable && (
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                    Not available
                  </span>
                )}
              </div>
              {selectedItem.allergens && selectedItem.allergens.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.allergens.map((a) => (
                      <span
                        key={a._id}
                        className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-sm font-medium"
                      >
                        {a.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
