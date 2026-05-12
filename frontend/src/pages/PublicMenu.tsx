import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getEffectiveMenuCategories, sortCategoriesByOrder } from '../utils/menuCategories';

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
  confirmedNoAllergens?: boolean;
  dietaryInfo?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
    dairyFree?: boolean;
    halal?: boolean;
    kosher?: boolean;
  };
  isAvailable: boolean;
}

interface PublicRestaurant {
  name: string;
  cuisineType?: string;
  tableCount?: number;
  logo?: string | null;
  welcomeMessage?: string;
  businessHours?: Record<string, { enabled?: boolean; open?: string; close?: string }>;
  menuCategories?: string[];
}

interface CartItem {
  item: PublicMenuItem;
  quantity: number;
}

type PaymentMethod = 'cash' | 'card';
type WeekdayKey =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

type PublicKitchenStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  status?: PublicKitchenStatus;
  tableNumber: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending_cash' | 'paid_demo';
  paymentReference?: string | null;
  totalAmount: number;
}

interface TrackedOrderState {
  orderId: string;
  orderNumber: string;
  status: PublicKitchenStatus;
  tableNumber: number;
  totalAmount: number;
  items: Array<{ name: string; quantity: number; lineTotal: number }>;
}

const formatPrice = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(value);

const DIETARY_LABELS: Array<{
  key: keyof NonNullable<PublicMenuItem['dietaryInfo']>;
  label: string;
  className: string;
}> = [
  { key: 'halal', label: 'Halal', className: 'bg-emerald-100 text-emerald-800' },
  { key: 'vegan', label: 'Vegan', className: 'bg-green-100 text-green-800' },
  { key: 'vegetarian', label: 'Vegetarian', className: 'bg-lime-100 text-lime-800' },
  { key: 'glutenFree', label: 'Gluten Free', className: 'bg-sky-100 text-sky-800' },
  { key: 'dairyFree', label: 'Dairy Free', className: 'bg-indigo-100 text-indigo-800' },
  { key: 'kosher', label: 'Kosher', className: 'bg-violet-100 text-violet-800' }
];

const dietaryBadges = (item: PublicMenuItem) =>
  DIETARY_LABELS.filter((cfg) => Boolean(item.dietaryInfo?.[cfg.key]));

type DietaryKey = (typeof DIETARY_LABELS)[number]['key'];

const statusProgressIndex = (status: string): number => {
  if (status === 'cancelled') return -1;
  if (status === 'placed') return 0;
  if (status === 'confirmed' || status === 'preparing') return 1;
  if (status === 'ready') return 2;
  if (status === 'completed') return 3;
  return 0;
};

const statusGuestLabel = (status: string): string => {
  switch (status) {
    case 'placed':
      return 'Order received';
    case 'confirmed':
    case 'preparing':
      return 'Being prepared';
    case 'ready':
      return 'Ready for you';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'In progress';
  }
};

const TRACK_STEPS = ['Received', 'Preparing', 'Ready', 'Done'] as const;

const terminalOrderStatus = (s: string) => s === 'completed' || s === 'cancelled';

/** Deterministic 0..1 — stable picks for the same inputs (per day + filters + item id). */
function stableUnitRandom(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Path for API serve-image (e.g. "uploads/filename.jpg") */
function imagePath(image: string | undefined): string | null {
  if (!image || typeof image !== 'string') return null;
  const s = image.trim().replace(/^\/+/, '');
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const url = new URL(image.trim());
      const pathFromUrl = url.pathname.replace(/^\/+/, '');
      // If this is an uploaded file URL, normalize to uploads path
      if (pathFromUrl.startsWith('uploads/')) return pathFromUrl;
      // External URLs are handled directly by the caller
      return null;
    } catch (_) {
      return null;
    }
  }
  return s.startsWith('uploads') ? s : `uploads/${s}`;
}

function directImageUrl(image: string | undefined, publicOriginBaseUrl: string): string | null {
  if (!image || typeof image !== 'string') return null;
  const raw = image.trim();
  if (!raw) return null;

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const url = new URL(raw);
      const pathFromUrl = url.pathname.replace(/^\/+/, '');
      const host = (url.hostname || '').toLowerCase();
      const isLocalHost =
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === 'backend' ||
        host === 'smart-menu-backend';

      // Copied local upload URLs cannot be reached by phone; remap to public origin
      if (isLocalHost && pathFromUrl.startsWith('uploads/')) {
        return `${publicOriginBaseUrl}/${pathFromUrl}`;
      }
      // Keep external URLs unchanged
      return raw;
    } catch (_) {
      return null;
    }
  }

  const normalizedPath = imagePath(raw);
  return normalizedPath ? `${publicOriginBaseUrl}/${normalizedPath}` : null;
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
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [showCartSheet, setShowCartSheet] = useState(false);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [checkoutError, setCheckoutError] = useState('');
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);
  const [placedOrderLines, setPlacedOrderLines] = useState<CartItem[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeEntered, setWelcomeEntered] = useState(false);
  const itemViewsSentRef = useRef<Set<string>>(new Set());
  /** Allergen ids the guest wants to avoid — dishes containing any of these are hidden */
  const [excludedAllergenIds, setExcludedAllergenIds] = useState<string[]>([]);
  /** Dietary flags — when non-empty, only dishes matching all selected options are shown */
  const [requiredDietaryKeys, setRequiredDietaryKeys] = useState<DietaryKey[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [trackedOrder, setTrackedOrder] = useState<TrackedOrderState | null>(null);
  const [showTrackerExpanded, setShowTrackerExpanded] = useState(false);

  const getPublicApiBaseUrl = () => {
    return `${window.location.origin}/api`;
  };

  const getPublicOriginBaseUrl = () => {
    const apiBase = getPublicApiBaseUrl();
    return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
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

  const trackingStorageKey = restaurantId ? `sm_track_order_${restaurantId}` : '';

  useEffect(() => {
    if (!restaurantId || loading || error || !trackingStorageKey) return;
    const oid = localStorage.getItem(trackingStorageKey);
    if (!oid) return;
    const apiBase = getPublicApiBaseUrl();
    axios
      .get(`${apiBase}/public/order/${oid}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      .then((res) => {
        const d = res.data?.data;
        if (!d) return;
        setTrackedOrder({
          orderId: String(d.orderId),
          orderNumber: d.orderNumber,
          status: d.status,
          tableNumber: d.tableNumber,
          totalAmount: d.totalAmount,
          items: Array.isArray(d.items) ? d.items : []
        });
      })
      .catch(() => {
        localStorage.removeItem(trackingStorageKey);
      });
  }, [restaurantId, loading, error, trackingStorageKey]);

  useEffect(() => {
    if (!trackedOrder || terminalOrderStatus(trackedOrder.status)) return;
    const { orderId } = trackedOrder;
    const apiBase = getPublicApiBaseUrl();
    const id = window.setInterval(() => {
      axios
        .get(`${apiBase}/public/order/${orderId}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
        .then((res) => {
          const d = res.data?.data;
          if (!d) return;
          setTrackedOrder({
            orderId: String(d.orderId),
            orderNumber: d.orderNumber,
            status: d.status,
            tableNumber: d.tableNumber,
            totalAmount: d.totalAmount,
            items: Array.isArray(d.items) ? d.items : []
          });
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(id);
    // Stop polling when orderId or terminal status changes (effect re-runs and clears interval).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only orderId + status should reset the poller
  }, [trackedOrder?.orderId, trackedOrder?.status]);

  useEffect(() => {
    if (!restaurantId || loading || error) return;
    const key = `sm_visit_day_${restaurantId}`;
    const today = new Date().toISOString().slice(0, 10);
    const prev = localStorage.getItem(key);
    if (prev === today) return;
    const apiBase = getPublicApiBaseUrl();
    axios
      .post(
        `${apiBase}/public/menu/${restaurantId}/visit`,
        { isFirstVisitToday: true },
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )
      .then(() => localStorage.setItem(key, today))
      .catch(() => {});
  }, [restaurantId, loading, error]);

  useEffect(() => {
    if (!restaurantId) return;
    const started = Date.now();
    const flush = () => {
      const sec = Math.round((Date.now() - started) / 1000);
      if (sec < 2) return;
      const apiBase = getPublicApiBaseUrl();
      fetch(`${apiBase}/public/menu/${restaurantId}/session-duration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ durationSeconds: sec }),
        keepalive: true
      }).catch(() => {});
    };
    window.addEventListener('pagehide', flush);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (showWelcome && !loading && !error) {
      const id = window.requestAnimationFrame(() => setWelcomeEntered(true));
      return () => {
        window.cancelAnimationFrame(id);
        setWelcomeEntered(false);
      };
    }
    setWelcomeEntered(false);
  }, [showWelcome, loading, error]);

  const tableOptions = useMemo(() => {
    const count = Number(restaurant?.tableCount) > 0 ? Number(restaurant?.tableCount) : 20;
    const capped = Math.min(200, Math.max(1, Math.floor(count)));
    return Array.from({ length: capped }, (_, i) => i + 1);
  }, [restaurant?.tableCount]);

  const businessHoursRows = useMemo(() => {
    const source = restaurant?.businessHours || {};
    const order: WeekdayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return order.map((day) => ({
      day,
      label: day.charAt(0).toUpperCase() + day.slice(1),
      enabled: Boolean(source?.[day]?.enabled),
      open: source?.[day]?.open || '12:00',
      close: source?.[day]?.close || '21:00'
    }));
  }, [restaurant?.businessHours]);

  const openNow = useMemo(() => {
    const d = new Date();
    const dayIdx = (d.getDay() + 6) % 7; // Monday=0 ... Sunday=6
    const today = businessHoursRows[dayIdx];
    if (!today || !today.enabled) return false;
    const now = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return now >= today.open && now <= today.close;
  }, [businessHoursRows]);

  useEffect(() => {
    if (!tableOptions.length) return;
    if (!tableOptions.includes(selectedTable)) {
      setSelectedTable(tableOptions[0]);
    }
  }, [tableOptions, selectedTable]);

  const allergensOnMenu = useMemo(() => {
    const map = new Map<string, PublicAllergen>();
    items.forEach((item) => {
      (item.allergens || []).forEach((a) => {
        if (a?._id && !map.has(a._id)) map.set(a._id, a);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  }, [items]);

  const dietaryOptionsOnMenu = useMemo(() => {
    const present = new Set<DietaryKey>();
    items.forEach((item) => {
      DIETARY_LABELS.forEach(({ key }) => {
        if (item.dietaryInfo?.[key]) present.add(key);
      });
    });
    return DIETARY_LABELS.filter((d) => present.has(d.key));
  }, [items]);

  const visibleItems = useMemo(() => {
    let list = items;
    if (excludedAllergenIds.length) {
      const ex = new Set(excludedAllergenIds);
      list = list.filter((item) => {
        const tags = item.allergens || [];
        return !tags.some((a) => ex.has(a._id));
      });
    }
    if (requiredDietaryKeys.length) {
      list = list.filter((item) =>
        requiredDietaryKeys.every((key) => Boolean(item.dietaryInfo?.[key]))
      );
    }
    return list;
  }, [items, excludedAllergenIds, requiredDietaryKeys]);

  const toggleExcludedAllergen = (allergenId: string) => {
    setExcludedAllergenIds((prev) => {
      const wasOn = prev.includes(allergenId);
      const next = wasOn ? prev.filter((id) => id !== allergenId) : [...prev, allergenId];
      // Track only "enable filter" actions so reports reflect customer filter usage.
      if (!wasOn && restaurantId) {
        const apiBase = getPublicApiBaseUrl();
        axios
          .post(
            `${apiBase}/public/menu/${restaurantId}/filter-event`,
            { allergenIds: [allergenId] },
            { headers: { 'ngrok-skip-browser-warning': 'true' } }
          )
          .catch(() => {});
      }
      return next;
    });
  };

  const clearAllergenFilters = () => setExcludedAllergenIds([]);

  const toggleRequiredDietary = (key: DietaryKey) => {
    setRequiredDietaryKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const clearDietaryFilters = () => setRequiredDietaryKeys([]);

  const openMenuItemDetail = (item: PublicMenuItem) => {
    setSelectedItem(item);
    if (!restaurantId || itemViewsSentRef.current.has(item._id)) return;
    itemViewsSentRef.current.add(item._id);
    const apiBase = getPublicApiBaseUrl();
    axios
      .post(
        `${apiBase}/public/menu/${restaurantId}/item-view`,
        { menuItemId: item._id },
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      )
      .catch(() => {});
  };

  // Load images via API (with ngrok header) so they display when using ngrok
  useEffect(() => {
    const apiBase = getPublicApiBaseUrl();
    const opts = { headers: { 'ngrok-skip-browser-warning': 'true' } as HeadersInit };
    let cancelled = false;
    visibleItems.forEach((item) => {
      const path = imagePath(item.image);
      if (!path || failedImages.has(item._id)) return;
      if (imageBlobUrls[item._id]) return; // already loaded
      fetch(`${apiBase}/public/serve-image?path=${encodeURIComponent(path)}`, opts)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error('Not ok'))))
        .then((blob) => {
          if (cancelled) return;
          setImageBlobUrls((prev) => ({ ...prev, [item._id]: URL.createObjectURL(blob) }));
        })
        .catch(() => {});
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleItems]);

  const blobUrlsRef = React.useRef<Record<string, string>>({});
  blobUrlsRef.current = imageBlobUrls;
  useEffect(() => {
    return () => {
      Object.values(blobUrlsRef.current).forEach(URL.revokeObjectURL);
    };
  }, []);

  const groupedItems = useMemo(() => {
    const grouped: Record<string, PublicMenuItem[]> = {};
    visibleItems.forEach((item) => {
      if (!grouped[item.category]) grouped[item.category] = [];
      grouped[item.category].push(item);
    });
    const entries = Object.entries(grouped);
    const keys = entries.map(([k]) => k);
    const order = getEffectiveMenuCategories(
      restaurant?.cuisineType,
      restaurant?.menuCategories?.length ? restaurant.menuCategories : null
    );
    const sortedKeys = sortCategoriesByOrder(keys, order);
    return sortedKeys.map((k) => [k, grouped[k]] as [string, PublicMenuItem[]]);
  }, [visibleItems, restaurant?.cuisineType, restaurant?.menuCategories]);
  const categoryNames = useMemo(() => ['All', ...groupedItems.map(([category]) => category)], [groupedItems]);

  useEffect(() => {
    if (!categoryNames.includes(activeCategory)) {
      setActiveCategory('All');
    }
  }, [categoryNames, activeCategory]);

  const filteredGroupedItems = useMemo(() => {
    if (activeCategory === 'All') return groupedItems;
    return groupedItems.filter(([category]) => category === activeCategory);
  }, [groupedItems, activeCategory]);

  const cartCount = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.quantity, 0),
    [cart]
  );

  const cartTotal = useMemo(
    () => cart.reduce((sum, ci) => sum + ci.item.price * ci.quantity, 0),
    [cart]
  );

  /**
   * Dish picks that respect allergen + dietary filters, prefer items not already in cart,
   * boost variety vs dominant cart category, clearer dietary labelling, and fewer listed allergens.
   */
  const recommendedDishes = useMemo(() => {
    const eligible = visibleItems.filter((i) => i.isAvailable);
    if (eligible.length === 0) return [];

    const cartIdSet = new Set(cart.map((c) => c.item._id));
    const categoryQty = new Map<string, number>();
    cart.forEach((c) => {
      categoryQty.set(c.item.category, (categoryQty.get(c.item.category) || 0) + c.quantity);
    });
    let dominantCartCategory: string | null = null;
    let maxCatQty = 0;
    categoryQty.forEach((qty, cat) => {
      if (qty > maxCatQty) {
        maxCatQty = qty;
        dominantCartCategory = cat;
      }
    });

    const dayKey = new Date().toISOString().slice(0, 10);
    const filterKey = [
      restaurantId || '',
      dayKey,
      [...excludedAllergenIds].sort().join(','),
      [...requiredDietaryKeys].sort().join(',')
    ].join('|');

    const hasAllergenFilters = excludedAllergenIds.length > 0;
    const hasDietaryFilters = requiredDietaryKeys.length > 0;
    const cartLines = cart.length;

    const scoreOne = (item: PublicMenuItem) => {
      let score = 0;
      const badges = dietaryBadges(item);
      score += badges.length * 2.5;
      const allergenTagCount = item.allergens?.length ?? 0;
      if (allergenTagCount === 0) score += 4;
      else score += Math.max(0, 3 - allergenTagCount * 0.4);

      if (cartLines > 0) {
        if (cartIdSet.has(item._id)) score -= 80;
        if (dominantCartCategory) {
          if (item.category === dominantCartCategory) score += 1.5;
          else score += 5;
        }
      } else if (!cartIdSet.has(item._id)) {
        score += 0.5;
      }

      if (hasDietaryFilters) score += 3;
      if (hasAllergenFilters) score += 2;

      score += stableUnitRandom(`${filterKey}|${item._id}`) * 1.2;
      return score;
    };

    const buildReasons = (item: PublicMenuItem): string[] => {
      const lines: string[] = [];
      if (hasDietaryFilters) lines.push('Matches your dietary filters');
      else if (hasAllergenFilters) lines.push('Suited to your allergen choices');
      if ((item.allergens?.length ?? 0) === 0) lines.push('No listed allergens');
      if (cartLines > 0 && dominantCartCategory) {
        if (item.category !== dominantCartCategory) lines.push('Try another course');
        else lines.push('Same course as your picks');
      }
      if (lines.length === 0) lines.push('Great place to start');
      return Array.from(new Set(lines)).slice(0, 2);
    };

    const notInCart = eligible.filter((i) => !cartIdSet.has(i._id));
    const pool = notInCart.length > 0 ? notInCart : eligible;

    const ranked = pool
      .map((item) => ({ item, score: scoreOne(item), reasons: buildReasons(item) }))
      .sort((a, b) => b.score - a.score);

    const seen = new Set<string>();
    const out: Array<{ item: PublicMenuItem; reasons: string[] }> = [];
    for (const row of ranked) {
      if (seen.has(row.item._id)) continue;
      seen.add(row.item._id);
      out.push({ item: row.item, reasons: row.reasons });
      if (out.length >= 6) break;
    }

    if (notInCart.length === 0 && eligible.length > 0) {
      return out.map((row) => ({
        ...row,
        reasons: ['Already in your cart', 'Open cart to review or keep browsing']
      }));
    }
    return out;
  }, [visibleItems, cart, excludedAllergenIds, requiredDietaryKeys, restaurantId]);

  useEffect(() => {
    if (cartCount === 0) setShowCartSheet(false);
  }, [cartCount]);

  const addToCart = (item: PublicMenuItem) => {
    if (!item.isAvailable) return;
    setCart((prev) => {
      const existing = prev.find((ci) => ci.item._id === item._id);
      if (!existing) {
        return [...prev, { item, quantity: 1 }];
      }
      return prev.map((ci) =>
        ci.item._id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci
      );
    });
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((ci) => ci.item._id !== id));
  };

  const handlePlaceOrder = async () => {
    if (!cartCount || !restaurantId) return;
    setCheckoutError('');
    setIsPlacingOrder(true);
    try {
      const apiBase = getPublicApiBaseUrl();
      const payload = {
        tableNumber: selectedTable,
        paymentMethod,
        items: cart.map((ci) => ({
          menuItemId: ci.item._id,
          quantity: ci.quantity
        }))
      };
      const response = await axios.post(
        `${apiBase}/public/menu/${restaurantId}/order`,
        payload,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );
      const data = response.data?.data || null;
      setPlacedOrder(data);
      setPlacedOrderLines(cart);
      setShowCartSheet(false);
      setShowOrderSummary(true);
      setCart([]);
      if (data?.orderId && trackingStorageKey) {
        localStorage.setItem(trackingStorageKey, String(data.orderId));
        setTrackedOrder({
          orderId: String(data.orderId),
          orderNumber: data.orderNumber,
          status: (data.status as PublicKitchenStatus) || 'placed',
          tableNumber: data.tableNumber,
          totalAmount: data.totalAmount,
          items: cart.map((ci) => ({
            name: ci.item.name,
            quantity: ci.quantity,
            lineTotal: Number((ci.item.price * ci.quantity).toFixed(2))
          }))
        });
        setShowTrackerExpanded(false);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Could not place order. Please try again.';
      setCheckoutError(message);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const closeOrderSummary = () => {
    setShowOrderSummary(false);
    setPlacedOrder(null);
    setPlacedOrderLines([]);
    setCheckoutError('');
  };

  const dismissOrderTracking = () => {
    setTrackedOrder(null);
    setShowTrackerExpanded(false);
    if (trackingStorageKey) localStorage.removeItem(trackingStorageKey);
  };

  const incrementCartLine = (id: string) => {
    setCart((prev) =>
      prev.map((ci) =>
        ci.item._id === id ? { ...ci, quantity: ci.quantity + 1 } : ci
      )
    );
  };

  const decrementCartLine = (id: string) => {
    setCart((prev) =>
      prev
        .map((ci) =>
          ci.item._id === id ? { ...ci, quantity: ci.quantity - 1 } : ci
        )
        .filter((ci) => ci.quantity > 0)
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
        {showWelcome && !loading && !error && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 transition-opacity duration-500 ease-out ${
            welcomeEntered ? 'opacity-100' : 'opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-menu-title"
        >
          <div
            className="absolute inset-0 bg-gradient-to-b from-emerald-950/75 via-gray-900/80 to-black/85 backdrop-blur-[2px]"
            aria-hidden
          />
          <div
            className={`relative w-full max-w-md transform transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              welcomeEntered ? 'translate-y-0 scale-100' : 'translate-y-6 scale-[0.98]'
            }`}
          >
            <div className="rounded-[1.75rem] bg-white shadow-[0_25px_60px_-15px_rgba(6,78,59,0.45)] ring-1 ring-emerald-900/10 overflow-hidden">
              <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 px-6 pt-8 pb-10 text-white">
                <div
                  className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-teal-400/20 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex items-start gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-white/20">
                    <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-100/95">
                      Digital menu
                    </p>
                    <h2
                      id="welcome-menu-title"
                      className="mt-2 text-2xl sm:text-[1.65rem] font-semibold tracking-tight leading-tight text-white drop-shadow-sm"
                    >
                      {restaurant?.name || 'Our Restaurant'}
                    </h2>
                  </div>
                </div>
                <p className="relative mt-5 text-[15px] leading-relaxed text-emerald-50/95 sm:pr-2">
                  {restaurant?.welcomeMessage || 'Welcome to our menu. We are glad to have you here.'}
                </p>
              </div>

              <div className="bg-gradient-to-b from-white to-emerald-50/40 px-6 py-6 sm:px-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/90">Before you begin</p>
                <ul className="mt-4 space-y-3.5">
                  {[
                    'Use category tabs to jump to starters, mains, drinks, and more.',
                    'Filter allergens to hide dishes that are not suitable—your cart stays separate.',
                    'Use dietary filters to show only dishes that match your preferences (e.g. vegan).',
                    'Recommended for you suggests dishes that match your filters and cart—tap for details.',
                    'Tap any dish for details, dietary tags, and to add to your order.'
                  ].map((line) => (
                    <li key={line} className="flex gap-3 text-left">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      <span className="text-sm leading-snug text-gray-700">{line}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setShowWelcome(false)}
                  className="mt-7 w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-emerald-700/25 transition hover:from-emerald-500 hover:to-teal-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99]"
                >
                  <span>Enter menu</span>
                  <svg className="h-5 w-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
                <p className="mt-4 text-center text-[11px] text-gray-500">
                  Filters and your order can be changed anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6 flex items-start gap-4">
          <div className="h-12 w-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z" />
            </svg>
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
            {!loading && businessHoursRows.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${openNow ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-700'}`}>
                  {openNow ? 'Open now' : 'Closed now'}
                </span>
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-emerald-700">Business hours</summary>
                  <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    {businessHoursRows.map((row) => (
                      <p key={row.day} className="leading-6">
                        <span className="inline-block w-24 font-medium text-gray-700">{row.label}</span>
                        <span>{row.enabled ? `${row.open} - ${row.close}` : 'Closed'}</span>
                      </p>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-4 pb-16 pt-4">
        {!loading && !error && allergensOnMenu.length > 0 && (
          <section
            className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/90 px-4 py-4 shadow-sm"
            aria-label="Allergen filters"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-amber-950">Avoid these allergens</h2>
              {excludedAllergenIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllergenFilters}
                  className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950"
                >
                  Show all dishes
                </button>
              )}
            </div>
            <p className="text-xs text-amber-900/85 mb-3">
              Tap an allergen to <strong>hide</strong> every dish that lists it. Your order list is unchanged.
            </p>
            <div className="flex flex-wrap gap-2">
              {allergensOnMenu.map((a) => {
                const on = excludedAllergenIds.includes(a._id);
                return (
                  <button
                    key={a._id}
                    type="button"
                    onClick={() => toggleExcludedAllergen(a._id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                      on
                        ? 'bg-amber-700 text-white border-amber-800 shadow-sm'
                        : 'bg-white text-amber-900 border-amber-200 hover:border-amber-400'
                    }`}
                    aria-pressed={on}
                  >
                    {on ? '✓ ' : ''}
                    {a.name}
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {!loading && !error && dietaryOptionsOnMenu.length > 0 && (
          <section
            className="mb-6 rounded-2xl border border-teal-100 bg-teal-50/90 px-4 py-4 shadow-sm"
            aria-label="Dietary filters"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h2 className="text-sm font-semibold text-teal-950">Show dishes that match</h2>
              {requiredDietaryKeys.length > 0 && (
                <button
                  type="button"
                  onClick={clearDietaryFilters}
                  className="text-xs font-semibold text-teal-800 underline underline-offset-2 hover:text-teal-950"
                >
                  Clear dietary filters
                </button>
              )}
            </div>
            <p className="text-xs text-teal-900/85 mb-3">
              Tap options to <strong>only show</strong> dishes that include <strong>all</strong> selected dietary tags. Leave none
              selected to show every dish (after allergen filters).
            </p>
            <div className="flex flex-wrap gap-2">
              {dietaryOptionsOnMenu.map((d) => {
                const on = requiredDietaryKeys.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleRequiredDietary(d.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold border transition ${
                      on
                        ? 'bg-teal-700 text-white border-teal-800 shadow-sm'
                        : 'bg-white text-teal-900 border-teal-200 hover:border-teal-400'
                    }`}
                    aria-pressed={on}
                  >
                    {on ? '✓ ' : ''}
                    {d.label}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {!loading && !error && recommendedDishes.length > 0 && (
          <section
            className="mb-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/60 px-4 py-4 shadow-sm"
            aria-label="Recommended dishes"
          >
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-emerald-950 tracking-tight">Recommended for you</h2>
              <p className="text-xs text-emerald-900/80 mt-1 leading-relaxed">
                Picks that match your allergen and dietary filters, avoid what you already added, and suggest variety
                across courses when your cart has items.
              </p>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory">
              {recommendedDishes.map(({ item, reasons }) => {
                const blobUrl = imageBlobUrls[item._id];
                const normalizedPath = imagePath(item.image);
                const hasImagePath = !!normalizedPath;
                const imageSrc = blobUrl || directImageUrl(item.image, getPublicOriginBaseUrl());
                const showImg = !!imageSrc && !failedImages.has(item._id);
                return (
                  <article
                    key={item._id}
                    className="snap-start shrink-0 w-[min(17.5rem,calc(100vw-2.5rem))] rounded-2xl border border-emerald-100/90 bg-white shadow-sm flex flex-col overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() => openMenuItemDetail(item)}
                      className="text-left flex flex-1 flex-col min-h-0"
                    >
                      <div className="relative h-28 w-full bg-gray-100">
                        {showImg ? (
                          <img
                            src={imageSrc || undefined}
                            alt={item.name}
                            className="h-full w-full object-cover"
                            onError={() => setFailedImages((prev) => new Set(prev).add(item._id))}
                          />
                        ) : hasImagePath ? (
                          <div className="h-full w-full flex items-center justify-center">
                            <div className="animate-pulse rounded-full bg-gray-200 w-9 h-9" />
                          </div>
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <NoImageIcon className="w-12 h-12 text-gray-300" />
                          </div>
                        )}
                        <span className="absolute top-2 left-2 rounded-full bg-emerald-600/95 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm">
                          Pick
                        </span>
                      </div>
                      <div className="p-3 flex flex-col flex-1 min-h-0">
                        <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{item.name}</h3>
                        <p className="text-xs text-emerald-700 font-semibold mt-1">{formatPrice(item.price)}</p>
                        <ul className="mt-2 space-y-0.5 flex-1">
                          {reasons.map((r) => (
                            <li key={r} className="text-[11px] text-gray-600 leading-snug flex gap-1.5">
                              <span className="text-emerald-500 shrink-0" aria-hidden>
                                ·
                              </span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </button>
                    {item.isAvailable && (
                      <div className="px-3 pb-3 pt-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          Add to order
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {!loading && !error && groupedItems.length > 0 ? (
          <section className="sticky top-0 z-20 mb-5 -mx-3 sm:-mx-4 bg-gray-50/95 backdrop-blur border-y border-gray-100">
            <div className="px-3 sm:px-4 py-2.5 overflow-x-auto">
              <div className="flex items-center gap-2 min-w-max">
                {categoryNames.map((category) => {
                  const active = category === activeCategory;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                        active
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-300 hover:text-emerald-700'
                      }`}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

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
        ) : items.length > 0 && groupedItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm px-5 py-8 text-center">
            <p className="text-sm text-gray-800 font-medium">No dishes match your current filters.</p>
            <p className="text-xs text-gray-600 mt-2">
              Try relaxing allergen or dietary filters, or ask staff for options.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {excludedAllergenIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllergenFilters}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700"
                >
                  Clear allergen filters
                </button>
              )}
              {requiredDietaryKeys.length > 0 && (
                <button
                  type="button"
                  onClick={clearDietaryFilters}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700"
                >
                  Clear dietary filters
                </button>
              )}
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
          <div className="space-y-8 pb-24">
            {filteredGroupedItems.map(([category, categoryItems]) => (
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
                    const normalizedPath = imagePath(item.image);
                    const hasImagePath = !!normalizedPath;
                    const imageSrc = blobUrl || directImageUrl(item.image, getPublicOriginBaseUrl());
                    const showImg = !!imageSrc && !failedImages.has(item._id);
                    return (
                      <article
                        key={item._id}
                        onClick={() => openMenuItemDetail(item)}
                        className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden flex gap-0 shadow-sm hover:border-emerald-300 hover:shadow-md transition-all duration-200 cursor-pointer"
                      >
                        {showImg ? (
                          <div className="w-24 h-24 sm:w-28 sm:h-28 flex-shrink-0 bg-gray-100">
                            <img
                              src={imageSrc || undefined}
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
                          {(!item.allergens || item.allergens.length === 0) && item.confirmedNoAllergens === true && (
                            <div className="mt-2">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-medium border border-emerald-200">
                                No listed allergens (kitchen confirmed)
                              </span>
                            </div>
                          )}
                          {dietaryBadges(item).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {dietaryBadges(item).map((d) => (
                                <span key={d.key} className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${d.className}`}>
                                  {d.label}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.isAvailable && (
                            <div className="mt-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  addToCart(item);
                                }}
                                className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition"
                              >
                                <span className="mr-1.5">Add to order</span>
                                <svg
                                  className="w-4 h-4"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4v16m8-8H4"
                                  />
                                </svg>
                              </button>
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
              {(() => {
                const selectedDirectUrl = directImageUrl(selectedItem.image, getPublicOriginBaseUrl());
                const selectedImageSrc = imageBlobUrls[selectedItem._id] || selectedDirectUrl;
                return selectedImageSrc && !failedImages.has(selectedItem._id);
              })() ? (
                <div className="aspect-[16/10] bg-gray-100">
                  <img
                    src={imageBlobUrls[selectedItem._id] || directImageUrl(selectedItem.image, getPublicOriginBaseUrl()) || undefined}
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
              <div className="p-5 space-y-4">
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
              {selectedItem.isAvailable && (
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="w-full mt-3 inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition"
                >
                  Add to order
                </button>
              )}
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
              {(!selectedItem.allergens || selectedItem.allergens.length === 0) &&
                selectedItem.confirmedNoAllergens === true && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Allergens</p>
                    <p className="text-sm text-emerald-800 bg-emerald-50 rounded-lg px-3 py-2 border border-emerald-100">
                      This dish has none of the allergens listed on our menu. Information has been reviewed by the
                      kitchen.
                    </p>
                  </div>
                )}
              {dietaryBadges(selectedItem).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Dietary options</p>
                  <div className="flex flex-wrap gap-2">
                    {dietaryBadges(selectedItem).map((d) => (
                      <span key={d.key} className={`px-3 py-1 rounded-full text-sm font-medium ${d.className}`}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guest order status — polls until completed or cancelled */}
        {trackedOrder && (
          <div
            className="fixed inset-x-0 z-[38] max-w-4xl mx-auto px-3 sm:px-4 pointer-events-none"
            style={{
              bottom:
                cartCount > 0
                  ? 'calc(5.75rem + env(safe-area-inset-bottom, 0px))'
                  : 'calc(1rem + env(safe-area-inset-bottom, 0px))'
            }}
          >
            <div className="pointer-events-auto rounded-2xl border border-emerald-200 bg-white shadow-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTrackerExpanded((e) => !e)}
                className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-50/50 transition"
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    Order {trackedOrder.orderNumber}
                  </p>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {statusGuestLabel(trackedOrder.status)}
                  </p>
                  <p className="text-xs text-gray-500">Table {trackedOrder.tableNumber}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!terminalOrderStatus(trackedOrder.status) && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                  )}
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform ${showTrackerExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>
              {showTrackerExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50/80">
                  {trackedOrder.status === 'cancelled' ? (
                    <p className="text-sm text-amber-800 pt-3">This order was cancelled. Speak to staff if this is unexpected.</p>
                  ) : (
                    <>
                      <div className="flex justify-between gap-1 pt-3">
                        {TRACK_STEPS.map((label, i) => {
                          const activeIdx = statusProgressIndex(trackedOrder.status);
                          const done = activeIdx >= i;
                          const current = activeIdx === i;
                          return (
                            <div key={label} className="flex-1 text-center">
                              <div
                                className={`mx-auto h-2 rounded-full mb-1.5 transition-colors ${
                                  done ? 'bg-emerald-500' : 'bg-gray-200'
                                } ${current ? 'ring-2 ring-emerald-300 ring-offset-1' : ''}`}
                              />
                              <span
                                className={`text-[10px] font-semibold leading-tight block ${
                                  done ? 'text-emerald-800' : 'text-gray-400'
                                }`}
                              >
                                {label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {trackedOrder.items.length > 0 && (
                        <ul className="mt-3 text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                          {trackedOrder.items.map((line, idx) => (
                            <li key={`${line.name}-${idx}`} className="flex justify-between gap-2">
                              <span>
                                {line.quantity}× {line.name}
                              </span>
                              <span className="tabular-nums">{formatPrice(line.lineTotal)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                  {terminalOrderStatus(trackedOrder.status) && (
                    <button
                      type="button"
                      onClick={dismissOrderTracking}
                      className="mt-3 w-full rounded-xl bg-emerald-600 text-white text-sm font-semibold py-2.5 hover:bg-emerald-700"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      {/* Cart bar */}
      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40">
          <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-4">
            <button
              type="button"
              onClick={() => {
                setCheckoutError('');
                setShowCartSheet(true);
              }}
              className="w-full rounded-2xl bg-white shadow-lg border border-emerald-100 px-4 py-3 flex items-center justify-between gap-3 text-left hover:border-emerald-200 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-sm font-semibold flex-shrink-0">
                  {cartCount}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Your order
                  </p>
                  <p className="text-sm text-gray-800 truncate">
                    {cartCount} item{cartCount !== 1 ? 's' : ''} ·{' '}
                    <span className="font-semibold text-emerald-600">{formatPrice(cartTotal)}</span>
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-emerald-700 flex-shrink-0">View cart →</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart sheet — review lines, change quantities, place order */}
      {showCartSheet && cartCount > 0 && (
        <div
          className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:p-4 bg-black/50"
          onClick={() => setShowCartSheet(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-w-md w-full mx-auto max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Your order</h2>
              <button
                type="button"
                onClick={() => setShowCartSheet(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((ci) => (
                <div
                  key={ci.item._id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/80 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{ci.item.name}</p>
                    <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                      {formatPrice(ci.item.price)} each
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => decrementCartLine(ci.item._id)}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50"
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-sm font-semibold tabular-nums">{ci.quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementCartLine(ci.item._id)}
                      className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50"
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right w-16 flex-shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatPrice(ci.item.price * ci.quantity)}</p>
                    <button
                      type="button"
                      onClick={() => removeFromCart(ci.item._id)}
                      className="text-[11px] text-red-600 font-medium mt-1 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex-shrink-0 p-4 border-t border-gray-100 space-y-3 bg-white rounded-b-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Table
                  </span>
                  <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(Number(e.target.value))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  >
                    {tableOptions.map((t) => (
                      <option key={t} value={t}>
                        Table {t}
                      </option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                    Payment
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        paymentMethod === 'card'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      Card (demo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        paymentMethod === 'cash'
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-emerald-300'
                      }`}
                    >
                      Cash
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-base font-semibold text-gray-900">
                <span>Total</span>
                <span className="text-emerald-700">{formatPrice(cartTotal)}</span>
              </div>
              {paymentMethod === 'cash' ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Paying cash: show your order confirmation to a member of staff before paying.
                </p>
              ) : (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Demo payment only: card payments are simulated for testing.
                </p>
              )}
              {checkoutError ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {checkoutError}
                </p>
              ) : null}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
                className="w-full inline-flex items-center justify-center px-4 py-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isPlacingOrder
                  ? 'Processing…'
                  : paymentMethod === 'card'
                    ? 'Pay with card (demo)'
                    : 'Place cash order'}
              </button>
              <p className="text-[11px] text-center text-gray-500">
                Staff can confirm this by table number and order reference.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Order summary / confirmation */}
      {showOrderSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeOrderSummary}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Order placed</h2>
              <p className="mt-1 text-sm text-gray-600">
                Please show this screen to a member of staff so they can confirm and process your order.
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-700 space-y-1">
                <p>
                  <span className="font-semibold text-gray-900">Order ref:</span>{' '}
                  {placedOrder?.orderNumber || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Table:</span>{' '}
                  {placedOrder?.tableNumber || selectedTable}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">Payment:</span>{' '}
                  {(placedOrder?.paymentMethod || paymentMethod).toUpperCase()}
                  {placedOrder?.paymentReference ? ` (${placedOrder.paymentReference})` : ''}
                </p>
              </div>
              {(() => {
                const live =
                  trackedOrder &&
                  placedOrder &&
                  String(trackedOrder.orderId) === String(placedOrder.orderId)
                    ? trackedOrder
                    : null;
                const st = live?.status || placedOrder?.status || 'placed';
                const label = statusGuestLabel(st);
                return (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2.5">
                    <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">
                      Order status
                    </p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{label}</p>
                    {!terminalOrderStatus(st) && (
                      <p className="text-xs text-gray-600 mt-1">
                        Status updates automatically. You can also use the tracker at the bottom of this page.
                      </p>
                    )}
                  </div>
                );
              })()}
              {(placedOrder?.paymentMethod || paymentMethod) === 'cash' ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Cash payment selected: please show this order to staff before paying at the counter.
                </p>
              ) : (
                <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  Card demo payment approved for testing.
                </p>
              )}
              <div className="space-y-2 text-sm text-gray-800">
                {placedOrderLines.map((ci) => (
                  <div key={ci.item._id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                        {ci.quantity}
                      </span>
                      <span>{ci.item.name}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {formatPrice(ci.item.price * ci.quantity)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-sm font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatPrice(placedOrder?.totalAmount ?? cartTotal)}</span>
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={closeOrderSummary}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold shadow-sm hover:bg-emerald-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;
