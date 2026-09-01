import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { renderPublicProfilePage } from '../functions/_profilePage.js';
import { onRequestGet as renderProfileSitemap } from '../functions/sitemap-profiles.xml.js';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('discoverability is an additive public projection and bounded sitemap contract', async () => {
  const migration = await read('supabase/migrations/20260831130000_discoverability_indexing_contract.sql');

  assert.match(migration, /'discoverable', COALESCE/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_public_profile_sitemap_page/);
  assert.match(migration, /p_limit integer DEFAULT 1000/);
  assert.match(migration, /p_limit < 1 OR p_limit > 1000/);
  assert.match(migration, /p\.lifetime_ep > 0/);
  assert.match(migration, /settings\.discoverable/);
  assert.match(migration, /ORDER BY p\.username_key ASC/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_public_profile_sitemap_page\(text, integer\) TO anon/);
});

test('the generated sitemap requests only the bounded discoverable RPC page', async () => {
  const previousFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (input, init = {}) => {
    requests.push({ input: String(input), init });
    return Response.json([{ username: 'NeonUser' }]);
  };

  try {
    const response = await renderProfileSitemap({
      request: new Request('https://chm.lol/sitemap-profiles.xml'),
      env: { VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_KEY: 'anon-key' }
    });
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(body, /https:\/\/chm\.lol\/neonuser/);
    assert.equal(requests.length, 1);
    assert.match(requests[0].input, /\/rest\/v1\/rpc\/get_public_profile_sitemap_page$/);
    assert.equal(requests[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(requests[0].init.body), { p_after: null, p_limit: 1000 });
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('a discoverability opt-out preserves the direct SSR profile while setting noindex', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async input => {
    const pathname = new URL(String(input)).pathname;
    if (pathname.endsWith('/rpc/get_public_profile_identity')) {
      return Response.json({ id: 'profile-1', username: 'NeonUser', discoverable: false, lifetime_ep: 5 });
    }
    if (pathname.endsWith('/rpc/get_public_profile_configuration')) return Response.json({});
    if (pathname === '/index.html') {
      return new Response('<!doctype html><html><head><title>ChromaDie</title><meta name="description" content=""><meta name="robots" content="index,follow"><link rel="canonical" href="/"><meta property="og:title" content=""><meta property="og:description" content=""><meta property="og:url" content=""><meta property="og:image" content=""><meta property="og:image:alt" content=""><meta name="theme-color" content="#000"><meta name="twitter:title" content=""><meta name="twitter:description" content=""><meta name="twitter:image" content=""><meta name="twitter:url" content=""><link rel="icon" href="/"></head><body><div id="app"></div></body></html>');
    }
    throw new Error(`Unexpected fetch: ${pathname}`);
  };

  try {
    const response = await renderPublicProfilePage({
      request: new Request('https://chm.lol/neonuser'),
      env: { VITE_SITE_URL: 'https://chm.lol', VITE_SUPABASE_URL: 'https://project.supabase.co', VITE_SUPABASE_KEY: 'anon-key' },
      username: 'NeonUser'
    });

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate');
    assert.match(await response.text(), /<meta name="robots" content="noindex,follow"/);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test('client metadata starts noindex and is updated only by the profile projection', async () => {
  const [app, metadata, outlet, shell, social, privacy, terms, fonts, headers, publicPage] = await Promise.all([
    read('src/App.svelte'),
    read('src/lib/routeMetadata.js'),
    read('src/lib/RouteOutlet.svelte'),
    read('src/lib/ProfileShell.svelte'),
    read('src/lib/ProfileSocial.svelte'),
    read('src/lib/PrivacyPolicy.svelte'),
    read('src/lib/TermsOfService.svelte'),
    read('src/styles/fonts.css'),
    read('public/_headers'),
    read('functions/_publicPage.js')
  ]);

  assert.match(app, /let profileIndexingAllowed = false/);
  assert.match(app, /profileIndexingAllowed = false;/);
  assert.match(app, /on:metadata=\{handleProfileMetadata\}/);
  assert.match(metadata, /view === 'profile' && \(!selectedProfileUsername \|\| !profileIndexingAllowed\)/);
  assert.match(outlet, /on:metadata=\{event => forward\('metadata', event\)\}/);
  assert.match(shell, /dispatch\('metadata', \{ robots: targetProfile\?\.discoverable === true \? 'index,follow' : 'noindex,follow' \}\)/);
  assert.match(social, /Show my profile in ChromaDie discovery and allow search indexing/);
  assert.match(social, /Your direct link still works when this is off\./);
  assert.match(privacy, /Cloudflare Pages delivers the site; Cloudflare R2 stores supported profile media/);
  assert.match(privacy, /Fontshare serves the remote fonts/);
  assert.match(privacy, /Stripe processes Plus checkout/);
  assert.match(terms, /one-time payment for lifetime access/);
  assert.match(terms, /Refunds and chargebacks may revoke Plus access/);
  assert.doesNotMatch(fonts, /cdn\.jsdelivr|Geist Mono/);
  assert.doesNotMatch(headers, /cdn\.jsdelivr/);
  assert.doesNotMatch(publicPage, /cdn\.jsdelivr/);
});
