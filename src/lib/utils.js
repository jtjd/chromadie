// Global Helper for UTC Date String
export function getTodayString() {
    const today = new Date();
    const year = today.getUTCFullYear();
    const month = String(today.getUTCMonth() + 1).padStart(2, '0');
    const day = String(today.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Sleep helper for animations
export const sleep = ms => new Promise(r => setTimeout(r, ms));

const HEX_COLOR_RE = /^[0-9A-Fa-f]{6}$/;

export function isValidHexColor(value) {
    return HEX_COLOR_RE.test(String(value || ''));
}

export function normalizeHexColor(value, fallback = '#000000') {
    const normalized = String(value || '').trim().replace(/^#/, '');
    return isValidHexColor(normalized) ? `#${normalized.toUpperCase()}` : fallback;
}

// NEW: Format large numbers (e.g., 1250 -> 1.2K)
export function formatCount(n) {
    if (n < 1000) return n.toString();
    if (n < 10000) return (n / 1000).toFixed(1) + 'K';
    if (n < 1000000) return Math.floor(n / 1000) + 'K';
    return (n / 1000000).toFixed(1) + 'M';
}
