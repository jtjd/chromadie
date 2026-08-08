const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;
const MAX_DAILY_VIEWS = 1000000;
const ENTRY_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]{0,31}$/;

export const PROFILE_INSIGHTS_RETENTION_DAYS = 90;

export function createEmptyProfileInsights() {
  return {
    success: true,
    enabled: false,
    windowDays: 30,
    totalViews: 0,
    totalClicks: 0,
    activeDays: 0,
    daily: [],
    devices: [],
    countries: [],
    referrers: [],
    topClicks: [],
    comparison: {
      views: { current: 0, previous: 0 },
      clicks: { current: 0, previous: 0 }
    }
  };
}

function boundedInteger(value, fallback = 0, maximum = MAX_DAILY_VIEWS) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(maximum, Math.floor(number)));
}

function normalizeDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function normalizeDimensionRows(value, key) {
  return (Array.isArray(value) ? value : [])
    .map(entry => ({
      [key]: String(entry?.[key] || '').trim().slice(0, 80),
      count: boundedInteger(entry?.count)
    }))
    .filter(entry => entry[key])
    .sort((left, right) => right.count - left.count || left[key].localeCompare(right[key]))
    .slice(0, 10);
}

function normalizeTopClicks(value) {
  return (Array.isArray(value) ? value : [])
    .map(entry => ({
      entryKey: String(entry?.entryKey || '').trim().toLowerCase(),
      clicks: boundedInteger(entry?.clicks)
    }))
    .filter(entry => ENTRY_KEY_PATTERN.test(entry.entryKey))
    .sort((left, right) => right.clicks - left.clicks || left.entryKey.localeCompare(right.entryKey))
    .slice(0, 20);
}

export function normalizeProfileInsights(value) {
  const source = value && typeof value === 'object' ? value : {};
  const daily = Array.isArray(source.daily)
    ? source.daily
      .map(entry => ({
        date: normalizeDate(entry?.date),
        views: boundedInteger(entry?.views),
        clicks: boundedInteger(entry?.clicks)
      }))
      .filter(entry => entry.date)
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-MAX_WINDOW_DAYS)
    : [];

  const windowDays = Math.max(
    MIN_WINDOW_DAYS,
    Math.min(MAX_WINDOW_DAYS, boundedInteger(source.windowDays, 30, MAX_WINDOW_DAYS))
  );

  return {
    success: source.success !== false,
    enabled: source.enabled === true,
    windowDays,
    totalViews: boundedInteger(source.totalViews),
    totalClicks: boundedInteger(source.totalClicks),
    activeDays: Math.min(windowDays, boundedInteger(source.activeDays, daily.filter(entry => entry.views > 0).length, MAX_WINDOW_DAYS)),
    daily,
    devices: normalizeDimensionRows(source.devices, 'device'),
    countries: normalizeDimensionRows(source.countries, 'country'),
    referrers: normalizeDimensionRows(source.referrers, 'host'),
    topClicks: normalizeTopClicks(source.topClicks),
    comparison: {
      views: {
        current: boundedInteger(source.comparison?.views?.current, boundedInteger(source.totalViews)),
        previous: boundedInteger(source.comparison?.views?.previous)
      },
      clicks: {
        current: boundedInteger(source.comparison?.clicks?.current, boundedInteger(source.totalClicks)),
        previous: boundedInteger(source.comparison?.clicks?.previous)
      }
    }
  };
}

export function getProfileInsightsError(result, fallback = 'Profile insights could not be loaded.') {
  if (result?.error?.message) return result.error.message;
  if (result?.data?.error) return String(result.data.error);
  return fallback;
}

function csvCell(value) {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function createProfileInsightsCsv(insights) {
  const normalized = normalizeProfileInsights(insights);
  /** @type {any[]} */
  const devices = normalized.devices;
  /** @type {any[]} */
  const countries = normalized.countries;
  /** @type {any[]} */
  const referrers = normalized.referrers;
  const rows = [
    ['metric', 'value'],
    ['window_days', normalized.windowDays],
    ['total_views', normalized.totalViews],
    ['total_clicks', normalized.totalClicks],
    ['active_days', normalized.activeDays],
    [],
    ['date', 'views', 'clicks'],
    ...normalized.daily.map(entry => [entry.date, entry.views, entry.clicks]),
    [],
    ['device', 'count'],
    ...devices.map(entry => [entry.device, entry.count]),
    [],
    ['country', 'count'],
    ...countries.map(entry => [entry.country, entry.count]),
    [],
    ['referrer_host', 'count'],
    ...referrers.map(entry => [entry.host, entry.count]),
    [],
    ['entry_key', 'clicks'],
    ...normalized.topClicks.map(entry => [entry.entryKey, entry.clicks])
  ];
  return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
