import fs from 'node:fs';
import path from 'node:path';

const roots = ['src', 'index.html'];
const allowedPaths = new Set([
  '/', '/privacy', '/terms', '/how-to-play', '/shop', '/roll', '/leaderboard', '/profile', '/profile/settings', '/pricing',
  '/login', '/signup',
  '/auth/callback', '/reset-password', '/logo-mark.svg', '/favicon-16-v2.png', '/favicon-32-v2.png',
  '/apple-touch-icon-v2.png', '/site.webmanifest', '/icon-192-v2.png', '/icon-512-v2.png',
  '/icon-maskable-192-v2.png', '/icon-maskable-512-v2.png'
]);
const linkPattern = /href\s*=\s*["'](\/[A-Za-z0-9_./-]+)(?:[?#][^"']*)?["']/g;
const failures = [];

function filesIn(target) {
  if (target === 'index.html') return [target];
  return fs.readdirSync(target, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(target, entry.name);
    return entry.isDirectory() ? filesIn(entryPath) : [entryPath];
  });
}

for (const file of roots.flatMap(filesIn)) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(linkPattern)) {
    const href = match[1];
    if (!allowedPaths.has(href) && !href.startsWith('/u/') && !href.startsWith('/a/') && !href.startsWith('/c/')) {
      failures.push(`${file}: ${href}`);
    }
  }
}

if (failures.length) {
  console.error('Unknown internal links found:');
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('Internal link check passed.');
