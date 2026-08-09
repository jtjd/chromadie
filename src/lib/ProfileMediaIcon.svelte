<script>
  export let kind = 'avatar';
</script>

{#if kind === 'background'}
  <svg class="profile-media-icon profile-media-icon--background" viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <rect width="320" height="120" fill="currentColor" opacity=".05" />
    <circle cx="238" cy="32" r="17" fill="currentColor" opacity=".5" />
    <path d="M0 96 55 45l43 41 45-54 68 66 47-40 62 44v18H0Z" fill="currentColor" opacity=".18" />
    <path d="M0 108 49 76l42 27 48-31 58 29 47-34 76 32v21H0Z" fill="currentColor" opacity=".34" />
  </svg>
{:else if kind === 'audio'}
  <svg class="profile-media-icon profile-media-icon--audio" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <circle cx="48" cy="48" r="35" fill="none" stroke="currentColor" stroke-width="2" opacity=".18" />
    <path d="M39 62V30l25-6v29" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="32" cy="64" r="8" fill="currentColor" />
    <circle cx="57" cy="58" r="8" fill="currentColor" />
    <path d="M17 77h6m7 0h6m7 0h6m7 0h6m7 0h6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity=".55" />
  </svg>
{:else if kind === 'cursor'}
  <svg class="profile-media-icon profile-media-icon--cursor" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <path d="m24 13 49 44-21 2 16 25-11 7-16-26-13 15Z" fill="currentColor" opacity=".18" />
    <path d="m24 13 6 67 11-15 16 26 11-7-16-25 21-2Z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
  </svg>
{:else if kind === 'upload'}
  <svg class="profile-media-icon profile-media-icon--upload" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 16V4m0 0L7 9m5-5 5 5M5 20h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
{:else}
  <svg class="profile-media-icon profile-media-icon--avatar" viewBox="0 0 96 96" aria-hidden="true" focusable="false">
    <circle cx="48" cy="48" r="35" fill="currentColor" opacity=".12" />
    <circle cx="48" cy="37" r="11" fill="none" stroke="currentColor" stroke-width="3" />
    <path d="M25 71c3-12 12-18 23-18s20 6 23 18" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="48" cy="48" r="35" fill="none" stroke="currentColor" stroke-width="1.5" opacity=".34" />
  </svg>
{/if}

<style>
  .profile-media-icon { display: block; width: 3.25rem; height: 3.25rem; color: var(--color-accent-bright); }
  .profile-media-icon--background { width: 100%; height: 100%; color: var(--color-accent-bright); }
  .profile-media-icon--upload { width: 1rem; height: 1rem; color: var(--color-ink-strong); }
</style>
