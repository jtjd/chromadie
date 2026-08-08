<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { supabase } from './supabase';
  import { getProfileAliasPath } from './routeContract.js';
  import { getBrowserPublicOrigin } from './siteOrigin.js';

  export let open = false;
  export let username = '';
  export let profilePath = '';
  export let isOwner = false;
  export let title = '';
  export let description = '';

  const dispatch = createEventDispatcher();
  let aliases = [];
  let selectedAlias = '';
  let qrDataUrl = '';
  let loadingAliases = false;
  let copied = false;
  let error = '';
  let qrRequest = 0;
  let keyListenerAttached = false;

  const origin = getBrowserPublicOrigin({ configuredOrigin: import.meta.env.VITE_SITE_URL || '', currentOrigin: typeof window !== 'undefined' ? window.location.origin : '' });
  $: canonicalUrl = profilePath ? new URL(profilePath, origin).toString() : origin;
  $: shareUrl = selectedAlias ? new URL(getProfileAliasPath(selectedAlias), origin).toString() : canonicalUrl;
  $: if (open) void prepareShare();
  $: if (open && shareUrl) void updateQr(shareUrl);

  async function prepareShare() {
    error = '';
    copied = false;
    if (isOwner && !aliases.length && !loadingAliases) {
      loadingAliases = true;
      try {
        const response = await supabase.rpc('get_my_profile_aliases');
        aliases = Array.isArray(response.data?.aliases)
          ? response.data.aliases.map(item => String(item?.alias || '').toLowerCase()).filter(Boolean).slice(0, 3)
          : [];
      } catch {
        aliases = [];
      } finally {
        loadingAliases = false;
      }
    }
  }

  async function updateQr(value) {
    const request = ++qrRequest;
    try {
      // Keep the QR encoder out of the public profile's critical route graph;
      // sharing is an explicit interaction and can pay the small lazy-load cost.
      const qrModule = await import('qrcode');
      const QRCode = qrModule.default || qrModule;
      const dataUrl = await QRCode.toDataURL(value, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#11141B', light: '#F4F6FB' }
      });
      if (request === qrRequest && open) qrDataUrl = dataUrl;
    } catch {
      if (request === qrRequest && open) {
        qrDataUrl = '';
        error = 'The QR kit could not be prepared in this browser.';
      }
    }
  }

  async function copyLink() {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(shareUrl);
      else {
        const input = document.createElement('input');
        input.value = shareUrl;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      copied = true;
    } catch {
      error = 'The link could not be copied. Select it manually.';
    }
  }

  function close() {
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') close();
  }

  $: if (typeof window !== 'undefined' && open !== keyListenerAttached) {
    if (open) window.addEventListener('keydown', handleKeydown);
    else window.removeEventListener('keydown', handleKeydown);
    keyListenerAttached = open;
  }
  onDestroy(() => {
    if (typeof window !== 'undefined' && keyListenerAttached) window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div class="share-dialog__backdrop" role="presentation" on:click|self={close}>
    <div class="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-dialog-title">
      <header class="share-dialog__header">
        <div><p class="share-dialog__eyebrow">Share identity</p><h2 id="share-dialog-title">{title || username || 'Profile'}</h2><p>{description || 'A public ChromaDie profile shaped by daily rolls.'}</p></div>
        <button type="button" class="share-dialog__close" aria-label="Close share dialog" on:click={close}>×</button>
      </header>

      {#if isOwner && aliases.length}
        <label class="share-dialog__field"><span>Use a share path</span><select bind:value={selectedAlias}><option value="">Canonical /{username.toLowerCase()}</option>{#each aliases as alias (alias)}<option value={alias}>Alias /a/{alias}</option>{/each}</select></label>
      {/if}
      <div class="share-dialog__preview"><span class="share-dialog__preview-mark" aria-hidden="true">✦</span><div><strong>{title || `${username} | ChromaDie`}</strong><span>{shareUrl}</span></div></div>
      <div class="share-dialog__qr">
        {#if qrDataUrl}<img src={qrDataUrl} alt={`QR code for ${shareUrl}`} />{:else}<span role="status">Preparing QR…</span>{/if}
      </div>
      <input class="share-dialog__url" aria-label="Profile share URL" readonly value={shareUrl} on:focus={event => event.currentTarget.select()} />
      <div class="share-dialog__actions">
        <button type="button" on:click={copyLink}>{copied ? 'Copied' : 'Copy link'}</button>
        {#if qrDataUrl}<a class="share-dialog__download" href={qrDataUrl} download={`${username || 'profile'}-qr.png`}>Download QR</a>{/if}
        <button type="button" class="share-dialog__secondary" on:click={close}>Done</button>
      </div>
      {#if error}<p class="share-dialog__error" role="alert">{error}</p>{/if}
    </div>
  </div>
{/if}

<style>
  .share-dialog__backdrop { position: fixed; inset: 0; z-index: 160; display: grid; place-items: center; padding: 1rem; background: rgba(0,0,0,.7); }
  .share-dialog { width: min(30rem, 100%); max-height: min(90vh, 44rem); overflow: auto; padding: 1.2rem; border: 1px solid rgba(255,255,255,.14); border-radius: .8rem; background: #11141b; color: #f4f6fb; box-shadow: 0 2rem 5rem rgba(0,0,0,.5); }
  .share-dialog__header { display: flex; justify-content: space-between; gap: 1rem; }
  .share-dialog__eyebrow { margin: 0 0 .3rem; color: #cdd2ff; font: .6rem/1 var(--font-mono-stack, monospace); letter-spacing: .13em; text-transform: uppercase; }
  .share-dialog h2 { margin: 0; font-size: 1.15rem; }
  .share-dialog__header p:last-child { margin: .4rem 0 0; color: rgba(220,230,248,.68); font-size: .72rem; line-height: 1.45; }
  .share-dialog__close { flex: 0 0 auto; width: 2rem; height: 2rem; border: 1px solid rgba(255,255,255,.14); border-radius: 50%; background: transparent; color: inherit; font-size: 1.2rem; cursor: pointer; }
  .share-dialog__field { display: grid; gap: .4rem; margin-top: 1rem; color: rgba(220,230,248,.7); font-size: .68rem; }
  .share-dialog__field select, .share-dialog__url { min-height: 2.3rem; border: 1px solid rgba(255,255,255,.14); border-radius: .35rem; padding: .55rem .6rem; background: #090a0d; color: #f4f6fb; font: .7rem/1 var(--font-mono-stack, monospace); }
  .share-dialog__preview { display: flex; align-items: center; gap: .7rem; margin-top: 1rem; padding: .7rem; border: 1px solid rgba(205,210,255,.2); border-radius: .45rem; background: rgba(205,210,255,.06); }
  .share-dialog__preview-mark { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: .4rem; background: #cdd2ff; color: #11141b; }
  .share-dialog__preview div { display: grid; gap: .25rem; min-width: 0; }
  .share-dialog__preview strong, .share-dialog__preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .share-dialog__preview strong { font-size: .75rem; }
  .share-dialog__preview span { color: rgba(220,230,248,.6); font: .62rem/1.2 var(--font-mono-stack, monospace); }
  .share-dialog__qr { display: grid; place-items: center; min-height: 12rem; margin: 1rem auto; padding: .65rem; border-radius: .5rem; background: #f4f6fb; color: #11141b; }
  .share-dialog__qr img { display: block; width: min(16rem, 100%); height: auto; image-rendering: pixelated; }
  .share-dialog__url { width: 100%; box-sizing: border-box; }
  .share-dialog__actions { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .7rem; }
  .share-dialog__actions button, .share-dialog__download { min-height: 2.2rem; padding: .55rem .7rem; border: 1px solid #cdd2ff; border-radius: .35rem; background: #cdd2ff; color: #11141b; font-size: .68rem; font-weight: 700; text-decoration: none; cursor: pointer; }
  .share-dialog__actions .share-dialog__secondary { border-color: rgba(255,255,255,.16); background: transparent; color: #f4f6fb; }
  .share-dialog__error { margin: .7rem 0 0; color: #ffb4bd; font-size: .68rem; }
  @media (max-width: 34rem) { .share-dialog__actions > * { flex: 1 1 8rem; text-align: center; } }
  @media (prefers-reduced-motion: reduce) { .share-dialog__backdrop { scroll-behavior: auto; } }
</style>
