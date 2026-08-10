<script>
  export let name = '';
</script>

<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  {#if name === 'overview'}
    <circle cx="12" cy="5" r="2.25" />
    <circle cx="6" cy="17" r="2.25" />
    <circle cx="18" cy="17" r="2.25" />
    <path d="M12 7.25v4M10.3 12.2 7.4 15M13.7 12.2l2.9 2.8" />
  {:else if name === 'customize'}
    <path d="m4 20 4.3-1 10.9-10.9a2.2 2.2 0 0 0-3.1-3.1L5.2 15.9 4 20Z" />
    <path d="m14.8 6.3 2.9 2.9" />
  {:else if name === 'links'}
    <path d="m9.4 14.6 5.2-5.2" />
    <path d="M7.1 16.9 5.6 18.4a3.6 3.6 0 0 1-5-5l3.1-3.1a3.6 3.6 0 0 1 5 0" transform="translate(3)" />
    <path d="m13.9 7.1 1.5-1.5a3.6 3.6 0 0 1 5 5l-3.1 3.1a3.6 3.6 0 0 1-5 0" />
  {:else if name === 'premium'}
    <path d="m3.5 8.5 3.4 3 5.1-7 5.1 7 3.4-3-1.6 9H5.1l-1.6-9Z" />
    <path d="M5.5 20h13" />
  {:else if name === 'profile-insights'}
    <path d="M4 20V10M9.3 20V4M14.7 20v-7M20 20V7" />
  {:else if name === 'profile-notifications'}
    <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
    <path d="M10 21h4" />
  {:else if name === 'profile-social'}
    <rect x="5" y="10" width="14" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2" />
  {:else if name === 'progression'}
    <path d="M8 3h8l1 4 3 2-2 4 .5 5-4.5 1-2 3-2-3-4.5-1L6 13 4 9l3-2 1-4Z" />
    <path d="m9 12 2 2 4-4" />
  {:else if name === 'account'}
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
  {:else}
    <circle cx="12" cy="12" r="2.5" />
  {/if}
</svg>

<style>
  svg { display: block; width: 1.05rem; height: 1.05rem; }
</style>
