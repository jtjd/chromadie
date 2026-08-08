const MIN_WINDOW_DAYS = 7;
const MAX_WINDOW_DAYS = 90;
const MAX_DAILY_VIEWS = 1000000;

export const PROFILE_INSIGHTS_RETENTION_DAYS = 90;

export function createEmptyProfileInsights() {
  return {
    success: true,
    enabled: false,
    windowDays: 30,
    totalViews: 0,
    activeDays: 0,
    daily: []
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

export function normalizeProfileInsights(value) {
  const source = value && typeof value === 'object' ? value : {};
  const daily = Array.isArray(source.daily)
    ? source.daily
      .map(entry => ({
        date: normalizeDate(entry?.date),
        views: boundedInteger(entry?.views)
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
    activeDays: Math.min(windowDays, boundedInteger(source.activeDays, daily.filter(entry => entry.views > 0).length, MAX_WINDOW_DAYS)),
    daily
  };
}

export function getProfileInsightsError(result, fallback = 'Profile insights could not be loaded.') {
  if (result?.error?.message) return result.error.message;
  if (result?.data?.error) return String(result.data.error);
  return fallback;
}
