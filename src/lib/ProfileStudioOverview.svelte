<script>
  import Surface from './foundation/Surface.svelte';
  import { getRankState } from './ranks.js';
  import { getProfileStoryUnlocks } from './profileStory.js';

  export let profile = null;
  export let timelineEvents = [];
  export let collectionItems = [];
  export let allAchievements = [];
  export let unlockedAchievements = {};
  export let progression = {};
  export let featureFlags = {};

  /** @type {any} */
  let account;
  $: account = profile || {};
  $: displayName = account.display_name || account.username || 'Your profile';
  $: signatureColor = account.mood_color || '#8B7CF6';
  $: lifetimeEp = Math.max(0, Number(account.lifetime_ep) || 0);
  $: rankState = getRankState(lifetimeEp);
  $: storyUnlocks = getProfileStoryUnlocks(account);
  $: achievementTotal = Array.isArray(allAchievements) ? allAchievements.length : 0;
  $: achievementCount = unlockedAchievements && typeof unlockedAchievements === 'object'
    ? Object.keys(unlockedAchievements).length
    : 0;
  $: progressPercent = Math.round(rankState.progress * 100);
  $: nextReward = progression?.nextReward || null;
  $: recentUnlockCount = Array.isArray(progression?.recentUnlocks) ? progression.recentUnlocks.length : 0;
  $: journeyEnabled = featureFlags?.progressionJourney !== false;
  $: ritualNext = progression?.nextJourney?.ritual || null;
  $: discoveryNext = progression?.nextJourney?.discovery || null;
  $: weeklyFocus = progression?.weeklyFocus || null;

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function formatDate(value) {
    if (!value) return 'Recent roll';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Recent roll'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function eventLabel(event) {
    if (event?.eventType === 'profile_created') return 'Profile created';
    return event?.payload?.rarity ? `${event.payload.rarity} roll` : 'Color roll';
  }
</script>

<Surface variant="panel" padding="lg" className="profile-studio-overview-surface">
  <section class="profile-studio-overview" aria-labelledby="profile-studio-overview-title" style={`--profile-overview-accent:${signatureColor}`}>
    <header class="profile-studio-overview__header">
      <div>
        <h2 id="profile-studio-overview-title">Profile overview</h2>
        <p>Review identity, progression, and recent profile history.</p>
      </div>
      <div class="profile-studio-overview__header-actions">
        <a class="profile-studio-overview__header-action--quiet" href="#progression">Open progression <span aria-hidden="true">→</span></a>
      </div>
    </header>

    <div class="profile-studio-overview__hero">
      <div class="profile-studio-overview__identity">
        <span class="profile-studio-overview__color" aria-label={`Signature color ${signatureColor}`} style={`--signature-color:${signatureColor}`}></span>
        <div>
          <span class="profile-studio-overview__label">Live identity</span>
          <h3>{displayName}</h3>
          <p>{account.bio || 'Your profile is ready for its next chapter.'}</p>
        </div>
      </div>

      <div class="profile-studio-overview__rank" aria-label={`${rankState.current.name} rank and EP progress`}>
        <div class="profile-studio-overview__rank-copy">
          <span class="profile-studio-overview__label">{rankState.current.name} rank</span>
          <strong>{formatNumber(lifetimeEp)} <small>EP</small></strong>
          {#if rankState.next}<span>{formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} EP to {rankState.next.name}</span>{:else}<span>Final rank reached</span>{/if}
        </div>
        <div class="profile-studio-overview__bar" role="progressbar" aria-label={`Progress toward ${rankState.next?.name || 'final rank'}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={rankState.next ? progressPercent : 100}>
          <span style={`width:${rankState.next ? progressPercent : 100}%`}></span>
        </div>
      </div>
    </div>

    <nav class="profile-studio-overview__actions" aria-label="Profile studio actions">
      <a href="#customize"><strong>Customize</strong><span>Identity & presence</span><b aria-hidden="true">→</b></a>
      <a href="#customize"><strong>Expression</strong><span>Media & cosmetics</span><b aria-hidden="true">→</b></a>
      <a href="#progression"><strong>Progression</strong><span>Rolls & milestones</span><b aria-hidden="true">→</b></a>
      <a href="#customize-links"><strong>Links</strong><span>Sharing & aliases</span><b aria-hidden="true">→</b></a>
    </nav>

    <div class="profile-studio-overview__lower">
      <section class="profile-studio-overview__trace" aria-labelledby="profile-studio-trace-title">
        <div class="profile-studio-overview__section-heading">
          <div><span class="profile-studio-overview__label">Recent history</span><h3 id="profile-studio-trace-title">Recent rolls</h3></div>
          <a href="#progression">See all <span aria-hidden="true">→</span></a>
        </div>
        {#if timelineEvents.length}
          <ol>
            {#each timelineEvents.slice(0, 3) as event (event.id)}
              <li>
                <span class="profile-studio-overview__event-dot" style={`--event-color:${event.payload?.hex || signatureColor}`} aria-hidden="true"></span>
                <span><strong>{eventLabel(event)}</strong><small>{formatDate(event.occurredAt)}</small></span>
                {#if event.payload?.score}<em>{formatNumber(event.payload.score)} pts</em>{/if}
              </li>
            {/each}
          </ol>
        {:else}
          <p class="profile-studio-overview__empty">No rolls recorded yet.</p>
        {/if}
      </section>

      <section class="profile-studio-overview__summary" aria-labelledby="profile-studio-summary-title">
        <div class="profile-studio-overview__section-heading">
          <div><span class="profile-studio-overview__label">Summary</span><h3 id="profile-studio-summary-title">Profile status</h3></div>
        </div>
        <dl>
          <div><dt>Daily rolls</dt><dd>{formatNumber(account.total_rolls)}</dd></div>
          <div><dt>Current streak</dt><dd>{formatNumber(account.current_streak)} days</dd></div>
          <div><dt>Achievements</dt><dd>{formatNumber(achievementCount)}{achievementTotal ? ` / ${formatNumber(achievementTotal)}` : ''}</dd></div>
          <div><dt>Story collection</dt><dd>{storyUnlocks.collectionUnlocked ? 'Unlocked' : `${storyUnlocks.collectionRollsRequired} rolls`}</dd></div>
          <div><dt>Next expression</dt><dd>{journeyEnabled ? (ritualNext?.reward?.name || discoveryNext?.reward?.name || nextReward?.name || 'Journey complete') : (nextReward?.name || 'Rank track')}</dd></div>
        </dl>
        <p>{weeklyFocus?.completed ? 'This week’s color is complete. ' : ''}{recentUnlockCount ? `${formatNumber(recentUnlockCount)} progression reward${recentUnlockCount === 1 ? '' : 's'} recently unlocked.` : collectionItems.length ? `${formatNumber(collectionItems.length)} collection item${collectionItems.length === 1 ? '' : 's'} recorded.` : 'No collection items recorded yet.'}</p>
      </section>
    </div>
  </section>
</Surface>

<style>
  :global(.profile-studio-overview-surface) { width:100%; box-sizing:border-box; }
  .profile-studio-overview { display:grid; gap:1rem; }
  .profile-studio-overview__header, .profile-studio-overview__section-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; }
  .profile-studio-overview__header h2 { max-width:42rem; margin:0; color:var(--color-ink-strong); font:600 var(--type-h2)/1.05 var(--font-display-stack); letter-spacing:-.03em; }
  .profile-studio-overview__header p { max-width:42rem; margin:.7rem 0 0; color:var(--color-ink-muted); line-height:1.55; }
  .profile-studio-overview__header-actions { display:grid; justify-items:end; gap:.4rem; flex:0 0 auto; }
  .profile-studio-overview a { color:var(--color-ink-strong); font-size:var(--type-small); font-weight:650; text-decoration:none; }
  .profile-studio-overview a:hover, .profile-studio-overview a:focus-visible { color:var(--color-accent-bright); }
  .profile-studio-overview__header-action--quiet, .profile-studio-overview__section-heading > a { color:var(--color-ink-muted)!important; font-weight:550!important; }
  .profile-studio-overview__hero { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(15rem,.85fr); gap:1rem; padding:1.15rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .profile-studio-overview__identity { display:flex; align-items:center; gap:.85rem; min-width:0; }
  .profile-studio-overview__color { flex:0 0 3.35rem; width:3.35rem; height:3.35rem; border:1px solid color-mix(in srgb,var(--signature-color) 72%,white); border-radius:50%; background:var(--signature-color); box-shadow:0 0 1.8rem color-mix(in srgb,var(--signature-color) 38%,transparent); }
  .profile-studio-overview__identity > div { min-width:0; }
  .profile-studio-overview__label { color:color-mix(in srgb,var(--profile-overview-accent) 72%,var(--color-ink-muted)); font:700 var(--type-label)/1.2 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .profile-studio-overview h3 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.25rem/1.1 var(--font-display-stack); }
  .profile-studio-overview__identity p { overflow:hidden; max-width:34rem; margin:.45rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-studio-overview__rank { display:grid; align-content:center; gap:.65rem; min-width:0; }
  .profile-studio-overview__rank-copy { display:grid; gap:.25rem; }
  .profile-studio-overview__rank-copy strong { color:var(--color-ink-strong); font:650 1.5rem var(--font-mono-stack); }
  .profile-studio-overview__rank-copy strong small { color:var(--color-ink-muted); font-size:.7rem; }
  .profile-studio-overview__rank-copy > span:last-child { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-studio-overview__bar { height:.5rem; overflow:hidden; border-radius:999px; background:var(--color-line-subtle); }
  .profile-studio-overview__bar span { display:block; height:100%; border-radius:inherit; background:var(--profile-overview-accent); }
  .profile-studio-overview__actions { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.55rem; }
  .profile-studio-overview__actions a { position:relative; display:grid; gap:.3rem; min-width:0; padding:.85rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-inset); }
  .profile-studio-overview__actions a:hover, .profile-studio-overview__actions a:focus-visible { border-color:color-mix(in srgb,var(--profile-overview-accent) 54%,var(--color-line-subtle)); background:var(--surface-panel-soft); }
  .profile-studio-overview__actions strong { color:var(--color-ink-strong); font-size:var(--type-small); }
  .profile-studio-overview__actions span { color:var(--color-ink-muted); font-size:.72rem; }
  .profile-studio-overview__actions b { position:absolute; right:.75rem; bottom:.75rem; color:var(--profile-overview-accent); font-weight:500; }
  .profile-studio-overview__lower { display:grid; grid-template-columns:minmax(0,1.15fr) minmax(15rem,.85fr); gap:1rem; }
  .profile-studio-overview__trace, .profile-studio-overview__summary { min-width:0; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-studio-overview__section-heading h3 { margin-top:.3rem; }
  .profile-studio-overview__section-heading > a { white-space:nowrap; }
  .profile-studio-overview ol { display:grid; gap:.4rem; margin:.75rem 0 0; padding:0; list-style:none; }
  .profile-studio-overview li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.65rem; padding:.6rem .7rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-studio-overview__event-dot { width:.65rem; height:.65rem; border-radius:50%; background:var(--event-color); box-shadow:0 0 .75rem color-mix(in srgb,var(--event-color) 42%,transparent); }
  .profile-studio-overview li > span:nth-child(2) { display:grid; gap:.15rem; min-width:0; }
  .profile-studio-overview li strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-studio-overview li small, .profile-studio-overview li em { color:var(--color-ink-muted); font:500 var(--type-small) var(--font-mono-stack); font-style:normal; }
  .profile-studio-overview dl { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.5rem; margin:.75rem 0 0; }
  .profile-studio-overview dl div { display:grid; gap:.2rem; padding:.65rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-studio-overview dt { color:var(--color-ink-muted); font-size:.72rem; }
  .profile-studio-overview dd { margin:0; color:var(--color-ink-strong); font:650 .9rem var(--font-mono-stack); }
  .profile-studio-overview__summary > p, .profile-studio-overview__empty { margin:.7rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.5; }
  @media (max-width:800px) { .profile-studio-overview__hero, .profile-studio-overview__lower { grid-template-columns:1fr; } .profile-studio-overview__actions { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width:520px) { .profile-studio-overview__header, .profile-studio-overview__section-heading { align-items:flex-start; flex-direction:column; } .profile-studio-overview__header-actions { justify-items:start; } .profile-studio-overview__actions { grid-template-columns:1fr; } .profile-studio-overview__identity p { white-space:normal; } }
  @media (prefers-reduced-motion:reduce) { .profile-studio-overview__bar span { transition:none; } }
</style>
