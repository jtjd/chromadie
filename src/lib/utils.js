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

// NEW: Format large numbers (e.g., 1250 -> 1.2K)
export function formatCount(n) {
    if (n < 1000) return n.toString();
    if (n < 10000) return (n / 1000).toFixed(1) + 'K';
    if (n < 1000000) return Math.floor(n / 1000) + 'K';
    return (n / 1000000).toFixed(1) + 'M';
}
