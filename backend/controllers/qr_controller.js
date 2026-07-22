const QRCode = require('qrcode');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { assertReportRangeAllowed, assertQrPremiumAccess } = require('../config/plans');

const needsPremiumQr = (width, colorHex, fmt) => {
  const f = String(fmt || 'png').toLowerCase();
  return colorHex !== '#000000' || width !== 300 || f === 'svg' || f === 'pdf';
};

const enumerateDateKeysUTC = (start, end) => {
  const keys = [];
  const cur = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  while (cur <= last) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return keys;
};

const sumDays = (obj, keys) => {
  let n = 0;
  for (const k of keys) {
    n += Number((obj && obj[k]) || 0);
  }
  return n;
};

const mergeDailyAllergenUsage = (restaurant, dateKeys) => {
  const totals = {};
  const raw = restaurant.dailyAllergenUsage || {};
  for (const dk of dateKeys) {
    const day = raw[dk];
    if (!day || typeof day !== 'object') continue;
    for (const [name, c] of Object.entries(day)) {
      totals[name] = (totals[name] || 0) + Number(c || 0);
    }
  }
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12);
};

const sumItemViewsInRange = (menuItemViewsByDay, dateKeys) => {
  const totals = {};
  for (const dk of dateKeys) {
    const day = menuItemViewsByDay[dk];
    if (!day || typeof day !== 'object') continue;
    for (const [id, c] of Object.entries(day)) {
      totals[id] = (totals[id] || 0) + Number(c || 0);
    }
  }
  return totals;
};

const parseAnalyticsRange = (req) => {
  const range = String(req.query.range || '7d').toLowerCase();
  const now = new Date();
  if (range === 'custom' && req.query.startDate && req.query.endDate) {
    const s = new Date(String(req.query.startDate));
    const e = new Date(String(req.query.endDate));
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime()) && s <= e) {
      return { start: s, end: e, range: 'custom' };
    }
  }
  const end = new Date(now);
  const start = new Date(now);
  if (range === '30d') {
    start.setUTCDate(start.getUTCDate() - 29);
  } else {
    start.setUTCDate(start.getUTCDate() - 6);
  }
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(23, 59, 59, 999);
  return { start, end, range: range === '30d' ? '30d' : '7d' };
};

// Only http(s) + host — no path, query, or userinfo (keeps trusted bases narrow).
const parseSafeOrigin = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().replace(/\/$/, '');
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    if (u.pathname && u.pathname !== '/') return null;
    if (u.search || u.hash || u.username || u.password) return null;
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
};

const getFrontendBaseUrl = (req) => {
  const envUrl = process.env.FRONTEND_URL;
  const requested = parseSafeOrigin(req.query.publicBaseUrl);
  const origin = parseSafeOrigin(req.get('origin') || '');
  const fallback = 'http://localhost:3000';

  if (requested) return requested;

  const fromEnv = parseSafeOrigin(envUrl || '');
  if (fromEnv) return fromEnv;

  if (origin) return origin;

  return fallback.replace(/\/$/, '');
};

// Free ngrok URLs get an interstitial unless we append their skip flag.
const buildPublicMenuUrl = (frontendBase, restaurantId) => {
  const base = frontendBase.replace(/\/$/, '');
  const u = new URL(`/public/menu/${String(restaurantId)}`, `${base}/`);
  if (/ngrok/i.test(u.hostname)) {
    u.searchParams.set('ngrok-skip-browser-warning', 'true');
  }
  return u.toString();
};

const getPublicApiBaseUrl = (req) => {
  const requestedApiBaseUrl = req.query.publicApiBaseUrl;
  const envApiUrl = process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL;
  const fallback = 'http://localhost:5002/api';

  const isSafeHttpUrl = (value) => {
    if (typeof value !== 'string') return false;
    return /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=-]*)?$/.test(value);
  };

  if (isSafeHttpUrl(requestedApiBaseUrl)) {
    return requestedApiBaseUrl.replace(/\/$/, '');
  }

  if (isSafeHttpUrl(envApiUrl)) {
    return envApiUrl.replace(/\/$/, '');
  }

  return fallback;
};

exports.generateQRImage = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    // QR encodes the SPA public menu route, not a direct API URL.
    const publicMenuUrl = buildPublicMenuUrl(getFrontendBaseUrl(req), restaurant._id);

    if (restaurant.qrCode !== publicMenuUrl) {
      restaurant.qrCode = publicMenuUrl;
      await restaurant.save();
    }

    const width = Math.min(400, Math.max(200, parseInt(req.query.width, 10) || 300));
    const colorHex = typeof req.query.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(req.query.color)
      ? req.query.color
      : '#000000';

    if (needsPremiumQr(width, colorHex, 'png')) {
      const gate = assertQrPremiumAccess(restaurant);
      if (!gate.ok) {
        return res.status(403).json({ success: false, message: gate.message });
      }
    }

    // High ECC: still scannable if part of the code is covered (logo, print damage).
    const qrCodeDataUrl = await QRCode.toDataURL(publicMenuUrl, {
      width,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: colorHex,
        light: '#FFFFFF'
      }
    });

    res.status(200).json({
      success: true,
      qrCodeUrl: publicMenuUrl,
      qrCodeImage: qrCodeDataUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating QR code',
      error: error.message
    });
  }
};

exports.downloadQR = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    const publicMenuUrl = buildPublicMenuUrl(getFrontendBaseUrl(req), restaurant._id);

    if (restaurant.qrCode !== publicMenuUrl) {
      restaurant.qrCode = publicMenuUrl;
      await restaurant.save();
    }

    const width = Math.min(400, Math.max(200, parseInt(req.query.width, 10) || 300));
    const colorHex =
      typeof req.query.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(req.query.color)
        ? req.query.color
        : '#000000';
    const fmt = String(req.query.format || 'png').toLowerCase();

    if (needsPremiumQr(width, colorHex, fmt)) {
      const gate = assertQrPremiumAccess(restaurant);
      if (!gate.ok) {
        return res.status(403).json({ success: false, message: gate.message });
      }
    }

    if (fmt === 'svg') {
      const svg = await QRCode.toString(publicMenuUrl, {
        type: 'svg',
        width,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: colorHex, light: '#FFFFFF' }
      });
      res.set('Content-Type', 'image/svg+xml; charset=utf-8');
      res.set(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(restaurant.name)}-qr-code.svg"`
      );
      return res.send(svg);
    }

    const qrCodeBuffer = await QRCode.toBuffer(publicMenuUrl, {
      width,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: colorHex, light: '#FFFFFF' }
    });

    res.set('Content-Type', 'image/png');
    res.set(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(restaurant.name)}-qr-code.png"`
    );
    res.send(qrCodeBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error downloading QR code',
      error: error.message
    });
  }
};

exports.getScanAnalytics = async (req, res, next) => {
  try {
    const { start, end, range } = parseAnalyticsRange(req);
    const restaurant = await Restaurant.findById(req.restaurantId).select(
      'subscription dailyScans dailyUniqueVisitors dailySessionSeconds dailySessionSamples dailyOrders'
    );
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const rangeCheck = assertReportRangeAllowed(restaurant, range);
    if (!rangeCheck.ok) {
      return res.status(403).json({ success: false, message: rangeCheck.message });
    }
    const dateKeys = enumerateDateKeysUTC(start, end);
    const dailyScans = restaurant.dailyScans || {};
    const days = dateKeys.map((dateKey) => {
      const d = new Date(`${dateKey}T12:00:00.000Z`);
      const count = dailyScans[dateKey] || 0;
      return {
        date: dateKey,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        count: Number(count)
      };
    });

    const du = restaurant.dailyUniqueVisitors || {};
    const dsSec = restaurant.dailySessionSeconds || {};
    const dsN = restaurant.dailySessionSamples || {};
    const dOrd = restaurant.dailyOrders || {};

    const totalScans = sumDays(dailyScans, dateKeys);
    const uniqueVisitors = sumDays(du, dateKeys);
    const sessionSeconds = sumDays(dsSec, dateKeys);
    const sessionSamples = sumDays(dsN, dateKeys);
    const conversions = sumDays(dOrd, dateKeys);
    const avgTimeSeconds =
      sessionSamples > 0 ? Math.round(sessionSeconds / sessionSamples) : 0;

    res.status(200).json({
      success: true,
      data: days,
      range,
      startDate: dateKeys[0],
      endDate: dateKeys[dateKeys.length - 1],
      summary: {
        totalScans,
        uniqueVisitors,
        avgTimeSeconds,
        conversions,
        totalScansLast30: (() => {
          const now = new Date();
          let t = 0;
          for (let i = 0; i < 30; i++) {
            const d = new Date(now);
            d.setUTCDate(d.getUTCDate() - i);
            const k = d.toISOString().slice(0, 10);
            t += Number(dailyScans[k] || 0);
          }
          return t;
        })()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};

exports.getRestaurantReports = async (req, res, next) => {
  try {
    const { start, end, range } = parseAnalyticsRange(req);
    const restaurant = await Restaurant.findById(req.restaurantId).lean();
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }
    const rangeCheck = assertReportRangeAllowed(restaurant, range);
    if (!rangeCheck.ok) {
      return res.status(403).json({ success: false, message: rangeCheck.message });
    }
    const dateKeys = enumerateDateKeysUTC(start, end);

    const dailyScans = restaurant.dailyScans || {};
    const dailyFiltered = restaurant.dailyFilteredViews || {};
    const engagement = dateKeys.map((dateKey) => {
      const d = new Date(`${dateKey}T12:00:00.000Z`);
      return {
        date: dateKey,
        label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        totalViews: Number(dailyScans[dateKey] || 0),
        filteredViews: Number(dailyFiltered[dateKey] || 0)
      };
    });

    const allergenUsage = mergeDailyAllergenUsage(restaurant, dateKeys);

    const itemTotals = sumItemViewsInRange(restaurant.menuItemViewsByDay || {}, dateKeys);
    const sortedIds = Object.entries(itemTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id);

    let topDishes = [];
    if (sortedIds.length) {
      const items = await MenuItem.find({
        _id: { $in: sortedIds },
        restaurantId: req.restaurantId
      })
        .select('name image views')
        .lean();
      const byId = new Map(items.map((m) => [String(m._id), m]));
      topDishes = sortedIds
        .map((id) => {
          const m = byId.get(id);
          if (!m) return null;
          return {
            _id: String(m._id),
            name: m.name,
            image: m.image || null,
            viewsInRange: Number(itemTotals[id] || 0),
            views: m.views ?? 0
          };
        })
        .filter(Boolean);
    }

    const menuStats = await MenuItem.aggregate([
      { $match: { restaurantId: req.restaurantId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          tagged: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $gt: [{ $size: { $ifNull: ['$allergens', []] } }, 0] },
                    { $eq: ['$confirmedNoAllergens', true] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);
    const totalItems = menuStats[0]?.total || 0;
    const taggedItems = menuStats[0]?.tagged || 0;
    const taggedPct = totalItems > 0 ? Math.round((taggedItems / totalItems) * 1000) / 10 : 100;
    const untaggedCount = Math.max(0, totalItems - taggedItems);

    const totalScans = sumDays(dailyScans, dateKeys);
    const uniqueVisitors = sumDays(restaurant.dailyUniqueVisitors || {}, dateKeys);
    const sessionSeconds = sumDays(restaurant.dailySessionSeconds || {}, dateKeys);
    const sessionSamples = sumDays(restaurant.dailySessionSamples || {}, dateKeys);
    const orders = sumDays(restaurant.dailyOrders || {}, dateKeys);
    const filterEvents = sumDays(dailyFiltered, dateKeys);
    const avgTimeSeconds = sessionSamples > 0 ? Math.round(sessionSeconds / sessionSamples) : 0;

    res.status(200).json({
      success: true,
      range,
      startDate: dateKeys[0],
      endDate: dateKeys[dateKeys.length - 1],
      engagement,
      allergenUsage,
      topDishes,
      compliance: {
        menuItemsTaggedPct: taggedPct,
        menuItemsTaggedDetail: `${taggedItems} of ${totalItems} items`,
        untaggedCount,
        overallOk: untaggedCount === 0
      },
      kpis: {
        totalScans,
        uniqueVisitors,
        avgTimeSeconds,
        orders,
        filterEvents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reports',
      error: error.message
    });
  }
};

exports.getAllergenFilterAnalytics = async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.restaurantId).select('allergenFilterUsage');
    if (!restaurant) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    const usage = restaurant.allergenFilterUsage || {};
    // Field is a Mongoose Map in memory; Object.entries would be wrong without branching.
    const entries = usage instanceof Map ? Array.from(usage.entries()) : Object.entries(usage);
    const normalized = entries
      .map(([name, count]) => ({
        name: String(name || '').trim(),
        value: Number(count || 0)
      }))
      .filter((row) => row.name && row.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    res.status(200).json({
      success: true,
      data: normalized
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching allergen analytics',
      error: error.message
    });
  }
};