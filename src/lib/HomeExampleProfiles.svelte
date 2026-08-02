<script>
  import { createEventDispatcher } from 'svelte';
  import { trackProductEvent } from './productAnalytics.js';
  import HomeExampleProfile from './HomeExampleProfile.svelte';
  import { HOMEPAGE_DEMO_PROFILES } from './homepageDemoData.js';

  const dispatch = createEventDispatcher();
  let selectedProfile = null;

  function openProfile(profile) {
    selectedProfile = profile;
    trackProductEvent('example_profile_opened');
  }

  function closeProfile() {
    selectedProfile = null;
  }

  function openLeaderboard(event) {
    event.preventDefault();
    trackProductEvent('explore_clicked');
    dispatch('navigate', { view: 'leaderboard', tab: 'today' });
  }

  function handleDialogKeydown(event) {
    if (event.key === 'Escape' && selectedProfile) closeProfile();
  }
</script>

<svelte:window on:keydown={handleDialogKeydown} />

<section class="home-examples" aria-labelledby="home-examples-title">
  <div class="home-examples__heading">
    <div>
      <span class="home-examples__kicker">Make it yours</span>
      <h2 id="home-examples-title">Example profiles</h2>
      <p>Backgrounds, music, links, colors, and effects can be combined in different ways.</p>
    </div>
  </div>

  <div class="home-examples__grid">
    {#each HOMEPAGE_DEMO_PROFILES as profile (profile.id)}
      <HomeExampleProfile {profile} on:open={() => openProfile(profile)}>
        <button slot="action" class="home-examples__open" type="button" on:click={() => openProfile(profile)}>Open example <span aria-hidden="true">↗</span></button>
      </HomeExampleProfile>
    {/each}
  </div>

  <a class="home-examples__leaderboard" href="/leaderboard" on:click={openLeaderboard}>Explore today’s leaderboard <span aria-hidden="true">→</span></a>

  {#if selectedProfile}
    <div class="home-examples__dialog-backdrop" role="presentation" on:click|self={closeProfile}>
      <div class="home-examples__dialog" role="dialog" aria-modal="true" aria-labelledby="home-example-dialog-title">
        <header class="home-examples__dialog-header">
          <div>
            <span>Example profile</span>
            <h3 id="home-example-dialog-title">chm.lol/{selectedProfile.username}</h3>
          </div>
          <button type="button" class="home-examples__close" aria-label="Close example profile" on:click={closeProfile}>×</button>
        </header>
        <HomeExampleProfile profile={selectedProfile} expanded={true} />
      </div>
    </div>
  {/if}
</section>

<style>
  .home-examples {
    display: grid;
    gap: 1.5rem;
    margin-top: clamp(5rem, 10vw, 8rem);
    padding-top: clamp(2.5rem, 5vw, 4rem);
    border-top: 1px solid var(--home-line);
  }

  .home-examples__kicker {
    color: var(--home-ink-faint);
    font: 600 0.64rem / 1.2 var(--home-mono);
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .home-examples h2 {
    margin: 0.55rem 0 0;
    color: var(--home-ink);
    font: 600 clamp(1.9rem, 3.8vw, 3rem) / 0.98 var(--home-font);
    letter-spacing: -0.055em;
  }

  .home-examples__heading p {
    max-width: 38rem;
    margin: 0.75rem 0 0;
    color: var(--home-ink-muted);
    font-size: 0.92rem;
    line-height: 1.55;
  }

  .home-examples__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }

  .home-examples__open {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--example-accent, var(--home-ink-muted));
    font: 600 0.66rem / 1 var(--home-mono);
    cursor: pointer;
  }

  .home-examples__open:hover { color: var(--home-link); }

  .home-examples__leaderboard {
    justify-self: start;
    color: var(--home-link);
    font: 600 0.7rem / 1.2 var(--home-mono);
    text-decoration: none;
  }

  .home-examples__leaderboard:hover { color: var(--color-accent-bright); }

  .home-examples__dialog-backdrop {
    position: fixed;
    z-index: 20;
    inset: 0;
    display: grid;
    place-items: center;
    padding: 1rem;
    overflow-y: auto;
    background: rgba(3, 4, 3, 0.78);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
  }

  .home-examples__dialog {
    width: min(100%, 48rem);
    max-height: min(90dvh, 48rem);
    overflow-y: auto;
    padding: clamp(1rem, 3vw, 1.5rem);
    border: 1px solid var(--home-line-strong);
    border-radius: 0.9rem;
    background: var(--home-surface);
    box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.48);
  }

  .home-examples__dialog-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .home-examples__dialog-header span {
    color: var(--home-color);
    font: 600 0.58rem / 1.2 var(--home-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .home-examples__dialog h3 {
    margin: 0.35rem 0 0;
    color: var(--home-ink);
    font: 600 clamp(1.35rem, 3vw, 2rem) / 1 var(--home-font);
    letter-spacing: -0.045em;
  }

  .home-examples__close {
    display: grid;
    place-items: center;
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid var(--home-line-strong);
    border-radius: 50%;
    background: transparent;
    color: var(--home-ink-muted);
    font-size: 1.25rem;
    cursor: pointer;
  }

  .home-examples__close:hover,
  .home-examples__close:focus-visible { border-color: var(--home-color); color: var(--home-ink); }

  @media (max-width: 56rem) {
    .home-examples__grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .home-examples__grid :global(.home-example-profile:last-child) { grid-column: 1 / -1; }
  }

  @media (max-width: 42rem) {
    .home-examples__grid { grid-template-columns: 1fr; }
    .home-examples__grid :global(.home-example-profile:last-child) { grid-column: auto; }
  }

  @media (prefers-reduced-motion: reduce) {
    .home-examples__dialog-backdrop { backdrop-filter: none; -webkit-backdrop-filter: none; }
  }
</style>
