<script>
  import { onMount } from 'svelte';
  import { getProductAnalyticsConsent, setProductAnalyticsConsent } from './productAnalytics.js';

  let consent = null;
  let notice = '';

  onMount(() => {
    consent = getProductAnalyticsConsent();
  });

  function choose(value) {
    consent = setProductAnalyticsConsent(value);
    notice = value === 'granted'
      ? 'Optional product-event measurement is allowed on this browser.'
      : 'Optional product-event measurement is off on this browser.';
  }
</script>

<div class="analytics-preferences" aria-labelledby="analytics-preferences-title">
  <div>
    <h3 id="analytics-preferences-title">Optional product-event measurement</h3>
    <p>
      This preference covers limited in-app events such as route views, profile shares, roll readiness, and cosmetic preview. It never includes your username, email, profile id, score, color, draft, entitlement, or moderation data. The current adapter keeps events in the page only; no product-event server or database is enabled yet.
    </p>
    <p class="analytics-preferences__status" role="status" aria-live="polite">
      Status: {consent === 'granted' ? 'allowed' : consent === 'denied' ? 'off' : 'not selected'}
    </p>
    {#if notice}<p class="analytics-preferences__notice" role="status" aria-live="polite">{notice}</p>{/if}
  </div>
  <div class="analytics-preferences__actions">
    <button type="button" class:active={consent === 'granted'} on:click={() => choose('granted')}>Allow product events</button>
    <button type="button" class:active={consent === 'denied'} on:click={() => choose('denied')}>Keep off</button>
  </div>
</div>

<style>
  .analytics-preferences {
    display: grid;
    gap: 1rem;
    padding: 1rem;
    border: 1px solid rgba(139,124,246,0.22);
    border-radius: 14px;
    background: rgba(139,124,246,0.06);
  }

  .analytics-preferences h3,
  .analytics-preferences p { margin: 0; }
  .analytics-preferences h3 { font-size: 1rem; }
  .analytics-preferences p { color: var(--text-muted); line-height: 1.55; }
  .analytics-preferences__status,
  .analytics-preferences__notice { font-size: 0.82rem; }
  .analytics-preferences__notice { color: #bdeedc; }
  .analytics-preferences__actions { display: flex; flex-wrap: wrap; gap: 0.55rem; }
  .analytics-preferences button {
    min-height: 2.6rem;
    padding: 0.55rem 0.8rem;
    border: 1px solid rgba(157,166,194,0.3);
    border-radius: 999px;
    background: rgba(255,255,255,0.04);
    color: #e6eaff;
    cursor: pointer;
    font-weight: 700;
  }
  .analytics-preferences button:hover,
  .analytics-preferences button:focus-visible,
  .analytics-preferences button.active {
    border-color: rgba(139,124,246,0.72);
    background: rgba(139,124,246,0.16);
  }
  .analytics-preferences button:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }

  @media (max-width: 520px) {
    .analytics-preferences__actions { flex-direction: column; }
  }
</style>
