<script>
  export let kind = 'image';
</script>

{#if kind === 'audio'}
  <svg class="profile-media-icon profile-media-icon--audio" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <path d="M3 7.5c0-1.1.9-2 2-2h12.2l3.1 3H27c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2Z" fill="currentColor" />
    <path d="M21 15v6.2a2.8 2.8 0 1 1-1.5-2.5V13l6-1.4v6.1a2.8 2.8 0 1 1-1.5-2.5v-1.8Z" fill="var(--surface-inset, #0b0b0b)" />
  </svg>
{:else if kind === 'upload'}
  <svg class="profile-media-icon profile-media-icon--upload" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else}
  <svg class="profile-media-icon profile-media-icon--image" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect x="3" y="4" width="26" height="24" rx="2.5" fill="currentColor" />
    <circle cx="10" cy="11" r="2.25" fill="var(--surface-inset, #0b0b0b)" />
    <path d="m5.5 25 7.2-8.2 4.2 4.1 3.5-4.1 6.1 8.2Z" fill="var(--surface-inset, #0b0b0b)" />
  </svg>
{/if}

<style>
  .profile-media-icon { display: block; width: 2.35rem; height: 2.35rem; color: var(--color-ink-strong); }
  .profile-media-icon--upload { width: 1rem; height: 1rem; color: var(--color-ink-strong); }
</style>
