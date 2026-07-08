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
