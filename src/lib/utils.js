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

export function formatCount(n) {
    const value = Number(n);
    if (!Number.isFinite(value)) return '0';

    const absolute = Math.abs(value);
    const units = [
        { threshold: 1e12, suffix: 'T' },
        { threshold: 1e9, suffix: 'B' },
        { threshold: 1e6, suffix: 'M' },
        { threshold: 1e3, suffix: 'K' }
    ];
    const unit = units.find(entry => absolute >= entry.threshold);
    if (!unit) return Math.trunc(value).toLocaleString();

    const scaled = value / unit.threshold;
    const digits = Math.abs(scaled) >= 100 ? 0 : 1;
    return `${scaled.toFixed(digits).replace(/\.0$/, '')}${unit.suffix}`;
}
