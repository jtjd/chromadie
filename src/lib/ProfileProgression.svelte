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

  /** @type {any} */
  let account;
  $: account = profile || {};
  $: lifetimeEp = Math.max(0, Number(account.lifetime_ep) || 0);
  $: rankState = getRankState(lifetimeEp);
  $: storyUnlocks = getProfileStoryUnlocks(account);
  $: achievementTotal = Array.isArray(allAchievements) ? allAchievements.length : 0;
  $: achievementCount = unlockedAchievements && typeof unlockedAchievements === 'object'
    ? Object.keys(unlockedAchievements).length
    : 0;
  $: progressPercent = Math.round(rankState.progress * 100);
  $: milestoneTrack = Array.isArray(progression?.milestones) ? progression.milestones : [];
  $: recentUnlocks = Array.isArray(progression?.recentUnlocks) ? progression.recentUnlocks : [];

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function formatDate(value) {
    if (!value) return 'Recent roll';
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'Recent roll'
      : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function eventLabel(event) {
    if (event?.eventType === 'profile_created') return 'Profile created';
    return event?.payload?.rarity ? `${event.payload.rarity} roll` : 'Color roll';
  }
</script>

<Surface variant="panel" padding="lg" className="profile-progression-surface">
  <section aria-labelledby="profile-progression-title">
    <div class="profile-progression-heading">
      <div>
        <h2 id="profile-progression-title">Progression</h2>
        <p>Track rank, rolls, achievements, and collection milestones.</p>
      </div>
    </div>

    <div class="profile-progression-rank">
      <div class="profile-progression-rank__identity">
        <span class="profile-progression-rank__mark" style={`--rank-color:${rankState.current.color}`}>{rankState.current.name.slice(0, 1)}</span>
        <div>
          <span class="profile-progression-label">Current rank</span>
          <strong>{rankState.current.name}</strong>
          <small>{formatNumber(lifetimeEp)} lifetime EP</small>
        </div>
      </div>
      <div class="profile-progression-rank__next">
        {#if rankState.next}
          <div class="profile-progression-rank__next-copy">
            <span><strong>{progressPercent}%</strong> toward {rankState.next.name}</span>
            <span>{formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} EP remaining</span>
          </div>
          <div class="profile-progression-bar" aria-label={`${progressPercent}% toward ${rankState.next.name}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent}>
            <span style={`width:${progressPercent}%`}></span>
          </div>
        {:else}
          <div class="profile-progression-rank__next-copy"><span>Final rank reached</span><span>No higher rank is available.</span></div>
          <div class="profile-progression-bar profile-progression-bar--complete" aria-label="Final rank reached" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div>
        {/if}
      </div>
    </div>

    <div class="profile-progression-stats" aria-label="Progression summary">
      <div><span>Daily rolls</span><strong>{formatNumber(account.total_rolls)}</strong><small>Colors in your story</small></div>
      <div><span>Current streak</span><strong>{formatNumber(account.current_streak)} days</strong><small>Longest: {formatNumber(account.longest_streak)} days</small></div>
      <div><span>Achievements</span><strong>{formatNumber(achievementCount)}{achievementTotal ? ` / ${formatNumber(achievementTotal)}` : ''}</strong><small>Milestones claimed</small></div>
      <div><span>Story collection</span><strong>{formatNumber(collectionItems.length)}</strong><small>{storyUnlocks.collectionUnlocked ? 'Collection showcase unlocked' : `${storyUnlocks.collectionRollsRequired} rolls unlock the showcase`}</small></div>
    </div>

    <section class="profile-progression-track" aria-labelledby="profile-progression-track-title">
      <div class="profile-progression-section-heading">
        <div><span class="profile-progression-label">Expression track</span><h3 id="profile-progression-track-title">Expression rewards</h3></div>
        <span>{recentUnlocks.length ? `${recentUnlocks.length} recent unlock${recentUnlocks.length === 1 ? '' : 's'}` : 'Rank rewards'}</span>
      </div>
      {#if milestoneTrack.length}
        <ol>
          {#each milestoneTrack as milestone (milestone.id)}
            {@const milestoneProgress = Math.min(100, Math.round((lifetimeEp / Math.max(1, milestone.threshold)) * 100))}
            <li class:unlocked={milestone.unlocked}>
              <div class="profile-progression-milestone__head">
                <span class="profile-progression-milestone__status" aria-hidden="true">{milestone.unlocked ? '✓' : '·'}</span>
                <div><strong>{milestone.name}</strong><small>{milestone.reward?.name || 'Profile expression reward'}</small></div>
                <span class="profile-progression-milestone__threshold">{milestone.unlocked ? 'Unlocked' : `${formatNumber(milestone.threshold)} EP`}</span>
              </div>
              <div class="profile-progression-milestone__bar" role="progressbar" aria-label={`${milestone.name} progression`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={milestone.unlocked ? 100 : milestoneProgress}><span style={`width:${milestone.unlocked ? 100 : milestoneProgress}%`}></span></div>
            </li>
          {/each}
        </ol>
      {:else}
        <p class="profile-progression-empty">Rank expression rewards will appear here as the server publishes your progression track.</p>
      {/if}
    </section>

    <div class="profile-progression-history">
      <div class="profile-progression-section-heading">
        <div><span class="profile-progression-label">Recent trace</span><h3>Your colors leave a record.</h3></div>
        <span>{timelineEvents.length ? `${timelineEvents.length} recorded events` : 'No history yet'}</span>
      </div>
      {#if timelineEvents.length}
        <ol>
          {#each timelineEvents.slice(0, 3) as event (event.id)}
            <li>
              <span class="profile-progression-event-swatch" style={`--event-color:${event.payload?.hex || '#8B7CF6'}`} aria-hidden="true"></span>
              <span><strong>{eventLabel(event)}</strong><small>{formatDate(event.occurredAt)}</small></span>
              {#if event.payload?.score}<em>{formatNumber(event.payload.score)} pts</em>{/if}
            </li>
          {/each}
        </ol>
      {:else}
        <p class="profile-progression-empty">No progression events recorded yet.</p>
      {/if}
    </div>

    <div class="profile-progression-footer">
      <p>Rewards, rank, and history stay server-authoritative.</p>
      <a href="#profile-collection">Review collection <span aria-hidden="true">→</span></a>
    </div>
  </section>
</Surface>

<style>
  :global(.profile-progression-surface) { width:100%; box-sizing:border-box; }
  .profile-progression-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.2rem; }
  .profile-progression-heading h2 { max-width:42rem; margin:0; color:var(--color-ink-strong); font:600 var(--type-h2)/1.05 var(--font-display-stack); }
  .profile-progression-heading p { max-width:42rem; margin:.75rem 0 0; color:var(--color-ink-muted); line-height:1.55; }
  .profile-progression-rank { display:grid; grid-template-columns:minmax(13rem,.8fr) minmax(18rem,1.2fr); gap:1rem; align-items:center; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .profile-progression-rank__identity { display:flex; align-items:center; gap:.8rem; min-width:0; }
  .profile-progression-rank__mark { display:grid; place-items:center; flex:0 0 3.1rem; width:3.1rem; height:3.1rem; border:1px solid color-mix(in srgb,var(--rank-color) 65%,var(--color-line-subtle)); border-radius:50%; color:var(--rank-color); background:color-mix(in srgb,var(--rank-color) 13%,transparent); font:700 1.3rem var(--font-display-stack); }
  .profile-progression-rank__identity > div { display:grid; gap:.2rem; min-width:0; }
  .profile-progression-label { color:var(--color-accent-bright); font:700 var(--type-label)/1.2 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .profile-progression-rank strong { color:var(--color-ink-strong); font-size:1.2rem; }
  .profile-progression-rank small { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-rank__next { display:grid; gap:.55rem; min-width:0; }
  .profile-progression-rank__next-copy { display:flex; justify-content:space-between; gap:.75rem; color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-rank__next-copy strong { color:var(--color-ink-strong); font:700 var(--type-small) var(--font-mono-stack); }
  .profile-progression-bar { height:.5rem; overflow:hidden; border-radius:999px; background:var(--color-line-subtle); }
  .profile-progression-bar span { display:block; height:100%; border-radius:inherit; background:var(--color-accent-bright); }
  .profile-progression-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.65rem; margin-top:.75rem; }
  .profile-progression-stats > div { display:grid; gap:.28rem; min-width:0; padding:.85rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-progression-stats span, .profile-progression-stats small { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-stats strong { color:var(--color-ink-strong); font:650 1.15rem var(--font-mono-stack); }
  .profile-progression-stats small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-history { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-track { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; }
  .profile-progression-section-heading h3 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.25rem/1.1 var(--font-display-stack); }
  .profile-progression-section-heading > span { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-history ol { display:grid; gap:.4rem; margin: .75rem 0 0; padding:0; list-style:none; }
  .profile-progression-history li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.65rem; min-width:0; padding:.65rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-progression-event-swatch { width:.7rem; height:.7rem; border-radius:50%; background:var(--event-color); box-shadow:0 0 .8rem color-mix(in srgb,var(--event-color) 48%,transparent); }
  .profile-progression-history li > span:nth-child(2) { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-history li strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-history li small, .profile-progression-history li em { color:var(--color-ink-muted); font:500 var(--type-small) var(--font-mono-stack); font-style:normal; }
  .profile-progression-track ol { display:grid; gap:.45rem; margin:.75rem 0 0; padding:0; list-style:none; }
  .profile-progression-track li { display:grid; gap:.45rem; padding:.65rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-inset); }
  .profile-progression-track li.unlocked { border-color:color-mix(in srgb,var(--color-accent) 42%,var(--color-line-subtle)); }
  .profile-progression-milestone__head { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.6rem; min-width:0; }
  .profile-progression-milestone__head > div { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-milestone__head strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-milestone__head small { overflow:hidden; color:var(--color-ink-muted); font-size:.7rem; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-milestone__status { display:grid; place-items:center; width:1.35rem; height:1.35rem; border:1px solid var(--color-line-strong); border-radius:50%; color:var(--color-ink-faint); font:700 .7rem/1 var(--font-mono-stack); }
  .profile-progression-track li.unlocked .profile-progression-milestone__status { border-color:var(--color-accent); background:color-mix(in srgb,var(--color-accent) 18%,transparent); color:var(--color-accent-bright); }
  .profile-progression-milestone__threshold { color:var(--color-ink-muted); font:600 .65rem/1 var(--font-mono-stack); white-space:nowrap; }
  .profile-progression-milestone__bar { height:.28rem; overflow:hidden; border-radius:999px; background:var(--color-line-subtle); }
  .profile-progression-milestone__bar span { display:block; height:100%; border-radius:inherit; background:var(--color-accent-bright); }
  .profile-progression-empty, .profile-progression-footer p { color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.55; }
  .profile-progression-empty { margin:.8rem 0 0; }
  .profile-progression-footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1rem; padding-top:.9rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-footer p { max-width:42rem; margin:0; }
  .profile-progression-footer a { color:var(--color-ink-strong); font-size:var(--type-small); font-weight:650; text-decoration:none; white-space:nowrap; }
  .profile-progression-footer a:hover, .profile-progression-footer a:focus-visible { color:var(--color-accent-bright); }
  @media (max-width: 800px) { .profile-progression-rank { grid-template-columns:1fr; } .profile-progression-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  @media (max-width: 520px) { .profile-progression-stats { grid-template-columns:1fr; } .profile-progression-footer, .profile-progression-section-heading { align-items:flex-start; flex-direction:column; } .profile-progression-footer a { white-space:normal; } }
  @media (prefers-reduced-motion: reduce) { .profile-progression-bar span { transition:none; } }
</style>
