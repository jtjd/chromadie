export const PRODUCT_ANALYTICS_CONSENT_KEY = 'chromadie-product-analytics-consent';

export const PRODUCT_ANALYTICS_EVENTS = Object.freeze([
  'route_view',
  'public_profile_view',
  'roll_ready',
  'roll_completed',
  'profile_shared',
  'cosmetic_preview',
  'cosmetic_equip',
  'username_claim_started',
  'username_claim_completed',
  'example_profile_opened',
  'explore_clicked',
  'progression_viewed',
  'progression_roll_completed',
  'progression_goal_viewed',
  'progression_unlock_seen',
  'progression_weekly_focus_viewed',
  'progression_weekly_focus_completed',
  'progression_share_started',
  'progression_claim_started'
]);

const EVENT_PROPERTY_KEYS = Object.freeze({
  route_view: new Set(['route']),
  public_profile_view: new Set(['viewer']),
  roll_ready: new Set(['surface', 'accountMode']),
  roll_completed: new Set(['surface', 'accountMode', 'isReroll']),
  profile_shared: new Set(['surface', 'method']),
  cosmetic_preview: new Set(['slot', 'context']),
  cosmetic_equip: new Set(['slot', 'context']),
  username_claim_started: new Set(),
  username_claim_completed: new Set(),
  example_profile_opened: new Set(),
  explore_clicked: new Set(),
  progression_viewed: new Set(['surface', 'accountMode', 'rolloutStage']),
  progression_roll_completed: new Set(['surface', 'accountMode', 'rolloutStage']),
  progression_goal_viewed: new Set(['surface', 'accountMode', 'rolloutStage', 'track']),
  progression_unlock_seen: new Set(['surface', 'accountMode', 'rolloutStage', 'track']),
  progression_weekly_focus_viewed: new Set(['surface', 'accountMode', 'rolloutStage']),
  progression_weekly_focus_completed: new Set(['surface', 'accountMode', 'rolloutStage']),
  progression_share_started: new Set(['surface', 'accountMode', 'rolloutStage', 'method']),
  progression_claim_started: new Set(['surface', 'accountMode', 'rolloutStage'])
});

const CONSENT_VALUES = new Set(['granted', 'denied']);
const PROGRESSION_ANALYTICS_EVENTS = new Set([
  'progression_viewed',
  'progression_roll_completed',
  'progression_goal_viewed',
  'progression_unlock_seen',
  'progression_weekly_focus_viewed',
  'progression_weekly_focus_completed',
  'progression_share_started',
  'progression_claim_started'
]);
const ROLLOUT_STAGES = new Set(['off', 'staff', 'internal', 'cohort', 'all']);
let productAnalyticsAdapter = null;

function getStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

function safeString(value) {
  if (typeof value !== 'string') return null;
  const normalized = [...value]
    .filter(character => {
      const codePoint = character.codePointAt(0);
      return codePoint >= 0x20 && codePoint !== 0x7f;
    })
    .join('')
    .trim()
    .slice(0, 48);
  return normalized || null;
}

function normalizeProperties(eventName, properties) {
  const allowedKeys = EVENT_PROPERTY_KEYS[eventName];
  if (!allowedKeys || !properties || typeof properties !== 'object' || Array.isArray(properties)) return {};

  return Object.fromEntries(
    Object.entries(properties)
      .filter(([key]) => allowedKeys.has(key))
      .map(([key, value]) => {
        if (typeof value === 'boolean') return [key, value];
        const safeValue = safeString(value);
        return safeValue ? [key, safeValue] : [key, null];
      })
      .filter(([, value]) => value !== null)
  );
}

export function getProductAnalyticsConsent() {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const value = storage.getItem(PRODUCT_ANALYTICS_CONSENT_KEY);
    return CONSENT_VALUES.has(value) ? value : null;
  } catch {
    return null;
  }
}

export function setProductAnalyticsConsent(value) {
  if (!CONSENT_VALUES.has(value)) return null;
  const storage = getStorage();
  try {
    storage?.setItem(PRODUCT_ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Ignore storage failures; the current preference remains unknown.
  }
  return getProductAnalyticsConsent();
}

export function setProductAnalyticsAdapter(adapter) {
  productAnalyticsAdapter = adapter && typeof adapter.send === 'function' ? adapter : null;
}

export function createBrowserProductAnalyticsAdapter(target = null) {
  return {
    send(event) {
      const destination = target || (typeof window !== 'undefined' ? window : null);
      if (!destination || typeof destination.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return false;
      destination.dispatchEvent(new CustomEvent('chromadie:product-event', { detail: event }));
      return true;
    }
  };
}

function configuredRolloutStage() {
  const value = typeof import.meta !== 'undefined' && import.meta.env
    ? String(import.meta.env.VITE_CHROMADIE_ROLLOUT_STAGE || 'all').trim().toLowerCase()
    : 'all';
  return ROLLOUT_STAGES.has(value) ? value : 'all';
}

/**
 * Dispatch the existing page-local event and, for progression events only,
 * increment the bounded server aggregate. The RPC is observational and never
 * blocks a roll, auth flow, or profile render.
 */
export function createAggregateProductAnalyticsAdapter({ supabaseClient = null, target = null } = {}) {
  const browserAdapter = createBrowserProductAnalyticsAdapter(target);
  return {
    send(event) {
      const sent = browserAdapter.send(event);
      if (!PROGRESSION_ANALYTICS_EVENTS.has(event?.name) || !supabaseClient?.rpc) return sent;

      const properties = event.properties || {};
      const request = supabaseClient.rpc('record_progression_event', {
        p_event_name: event.name,
        p_surface: properties.surface || '',
        p_account_mode: properties.accountMode || '',
        p_rollout_stage: properties.rolloutStage || configuredRolloutStage(),
        p_track: properties.track || ''
      });
      Promise.resolve(request).catch(() => {
        // Product measurement must remain best-effort and gameplay-independent.
      });
      return sent;
    }
  };
}

export function createMemoryProductAnalyticsAdapter(limit = 50) {
  const events = [];
  return {
    send(event) {
      events.push(event);
      if (events.length > limit) events.splice(0, events.length - limit);
      return true;
    },
    getEvents() {
      return events.slice();
    }
  };
}

export function trackProductEvent(eventName, properties = {}) {
  if (!PRODUCT_ANALYTICS_EVENTS.includes(eventName)) {
    return { accepted: false, reason: 'invalid_event' };
  }
  if (getProductAnalyticsConsent() !== 'granted') {
    return { accepted: false, reason: 'consent_required' };
  }

  const event = {
    name: eventName,
    properties: normalizeProperties(eventName, properties),
    occurredAt: new Date().toISOString()
  };

  try {
    return {
      accepted: true,
      sent: productAnalyticsAdapter?.send(event) === true
    };
  } catch {
    return { accepted: true, sent: false };
  }
}
