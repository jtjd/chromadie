<script>
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import Surface from './foundation/Surface.svelte';
  import { getRankState } from './ranks.js';
  import { getProfileStoryUnlocks } from './profileStory.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let profile = null;
  export let timelineEvents = [];
  export let collectionItems = [];
  export let allAchievements = [];
  export let unlockedAchievements = {};
  export let progression = {};
  export let featureFlags = {};

  const journeyLanes = Object.freeze([
    { id: 'ritual', label: 'Keep the ritual', description: 'Small promises that make a color identity last.' },
    { id: 'discovery', label: 'Find the strange', description: 'Rare conditions that make your profile unmistakably yours.' }
  ]);

  /** @type {any} */
  let account;
  $: account = profile || {};
  $: lifetimeEp = Math.max(0, Number(progression?.currentEp ?? account.lifetime_ep) || 0);
  $: totalRolls = Math.max(0, Number(progression?.totalRolls ?? account.total_rolls) || 0);
  $: currentStreak = Math.max(0, Number(progression?.currentStreak ?? account.current_streak) || 0);
  $: rankState = getRankState(lifetimeEp);
  $: storyUnlocks = getProfileStoryUnlocks(account);
  $: achievementTotal = Array.isArray(allAchievements) ? allAchievements.length : 0;
  $: achievementCount = unlockedAchievements && typeof unlockedAchievements === 'object'
    ? Object.keys(unlockedAchievements).length
    : 0;
  $: progressPercent = Math.round(rankState.progress * 100);
  $: journeyEnabled = featureFlags?.progressionJourney !== false;
  $: milestoneTrack = Array.isArray(progression?.milestones) ? progression.milestones : [];
  $: weeklyFocus = progression?.weeklyFocus || null;
  const weeklyFocusViewed = new SvelteSet();
  const seenUnlocks = new SvelteSet();

  onMount(() => {
    if (journeyEnabled) trackProductEvent('progression_viewed', { surface: 'studio', accountMode: 'authenticated' });
  });

  $: if (journeyEnabled && weeklyFocus) {
    const focusKey = weeklyFocus.weekStart || 'current';
    if (!weeklyFocusViewed.has(focusKey)) {
      weeklyFocusViewed.add(focusKey);
      trackProductEvent('progression_weekly_focus_viewed', { surface: 'studio', accountMode: 'authenticated' });
    }
  }

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

  function nodePercent(node) {
    if (node?.unlocked) return 100;
    if (!node?.progress?.target) return 0;
    return Math.min(100, Math.round((Number(node.progress.current) / Number(node.progress.target)) * 100));
  }

  function nodeProgressLabel(node) {
    if (node?.unlocked) return 'Unlocked';
    if (node?.progress?.target) return `${formatNumber(node.progress.current)} / ${formatNumber(node.progress.target)} ${node.progress.unit || ''}`.trim();
    return node?.metric === 'achievement' ? 'Discover the condition' : 'Keep rolling';
  }

  function recordUnlockSeen(node) {
    if (!node?.track) return;
    const key = `${node.id}:${node.unlocked ? 'unlocked' : 'locked'}`;
    if (seenUnlocks.has(key)) return;
    seenUnlocks.add(key);
    trackProductEvent('progression_unlock_seen', {
      surface: 'studio',
      accountMode: 'authenticated',
      track: node.track
    });
  }
</script>

<Surface variant="panel" padding="lg" className="profile-progression-surface">
  <section aria-labelledby="profile-progression-title">
    <div class="profile-progression-heading">
      <div>
        <h2 id="profile-progression-title">Progression</h2>
        <p>Your profile grows in two directions: show up, then find something strange.</p>
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
      <div><span>Daily rolls</span><strong>{formatNumber(totalRolls)}</strong><small>Colors in your story</small></div>
      <div><span>Current streak</span><strong>{formatNumber(currentStreak)} days</strong><small>Longest: {formatNumber(account.longest_streak)} days</small></div>
      <div><span>Achievements</span><strong>{formatNumber(achievementCount)}{achievementTotal ? ` / ${formatNumber(achievementTotal)}` : ''}</strong><small>Milestones claimed</small></div>
      <div><span>Story collection</span><strong>{formatNumber(collectionItems.length)}</strong><small>{storyUnlocks.collectionUnlocked ? 'Collection showcase unlocked' : `${storyUnlocks.collectionRollsRequired} rolls unlock the showcase`}</small></div>
    </div>

    {#if journeyEnabled && weeklyFocus}
      <section class="profile-progression-weekly" aria-labelledby="profile-progression-weekly-title">
        <div>
          <span class="profile-progression-label">This week</span>
          <h3 id="profile-progression-weekly-title">Color of the Week</h3>
          <p>{weeklyFocus.completed ? 'You found this week’s color. The bonus is already part of your account.' : 'Match this color in your daily roll to earn the existing EP bonus.'}</p>
        </div>
        <div class="profile-progression-weekly__target">
          <span class="profile-progression-weekly__swatch" style={`--weekly-color:${weeklyFocus.targetHex || '#8B7CF6'}`} aria-hidden="true"></span>
          <strong>{weeklyFocus.targetHex || 'Target loading'}</strong>
          <small>{weeklyFocus.completed ? 'Focus complete' : `+${formatNumber(weeklyFocus.bonusEp)} EP`}</small>
        </div>
      </section>
    {/if}

    {#if journeyEnabled}
      <section class="profile-progression-journey" aria-labelledby="profile-progression-journey-title">
        <div class="profile-progression-section-heading">
          <div><span class="profile-progression-label">Your journey</span><h3 id="profile-progression-journey-title">Make the profile yours.</h3></div>
          <span>{progression?.journeyNodes?.length || 0} expression goals</span>
        </div>
        <div class="profile-progression-lanes">
          {#each journeyLanes as lane (lane.id)}
            {@const nodes = progression?.journeyByTrack?.[lane.id] || []}
            <section class="profile-progression-lane" aria-labelledby={`profile-progression-lane-${lane.id}`}>
              <div class="profile-progression-lane__heading">
                <div><h4 id={`profile-progression-lane-${lane.id}`}>{lane.label}</h4><p>{lane.description}</p></div>
                <span>{nodes.filter(node => node.unlocked).length}/{nodes.length}</span>
              </div>
              {#if nodes.length}
                <ol>
                  {#each nodes as node (node.id)}
                    <li class:unlocked={node.unlocked} on:mouseenter={() => recordUnlockSeen(node)}>
                      <div class="profile-progression-node__head">
                        <span class="profile-progression-node__status" aria-hidden="true">{node.unlocked ? '✓' : '·'}</span>
                        <div><strong>{node.name}</strong><small>{node.reward?.name || 'Profile expression reward'}</small></div>
                        <span class="profile-progression-node__progress">{nodeProgressLabel(node)}</span>
                      </div>
                      <p>{node.description}</p>
                      <div class="profile-progression-node__bar" role="progressbar" aria-label={`${node.name} progression`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={nodePercent(node)}><span style={`width:${nodePercent(node)}%`}></span></div>
                    </li>
                  {/each}
                </ol>
              {:else}
                <p class="profile-progression-empty">Your next expression goals will appear here once the journey is published.</p>
              {/if}
            </section>
          {/each}
        </div>
      </section>
    {:else}
      <section class="profile-progression-track" aria-labelledby="profile-progression-track-title">
        <div class="profile-progression-section-heading">
          <div><span class="profile-progression-label">Expression track</span><h3 id="profile-progression-track-title">Expression rewards</h3></div>
          <span>Rank rewards</span>
        </div>
        <ol>
          {#each milestoneTrack.filter(milestone => milestone.track === 'rank') as milestone (milestone.id)}
            {@const milestoneProgress = Math.min(100, Math.round((lifetimeEp / Math.max(1, milestone.threshold)) * 100))}
            <li class:unlocked={milestone.unlocked}>
              <div class="profile-progression-node__head"><span class="profile-progression-node__status" aria-hidden="true">{milestone.unlocked ? '✓' : '·'}</span><div><strong>{milestone.name}</strong><small>{milestone.reward?.name || 'Profile expression reward'}</small></div><span class="profile-progression-node__progress">{milestone.unlocked ? 'Unlocked' : `${formatNumber(milestone.threshold)} EP`}</span></div>
              <div class="profile-progression-node__bar"><span style={`width:${milestone.unlocked ? 100 : milestoneProgress}%`}></span></div>
            </li>
          {/each}
        </ol>
      </section>
    {/if}

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
      <a href="#customize">Equip an expression <span aria-hidden="true">→</span></a>
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
  .profile-progression-rank__next-copy { display:flex; justify-content:space-between; gap:1rem; color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-bar, .profile-progression-node__bar { height:.34rem; overflow:hidden; border-radius:999px; background:var(--color-line-subtle); }
  .profile-progression-bar span, .profile-progression-node__bar span { display:block; height:100%; border-radius:inherit; background:var(--color-accent-bright); transition:width .4s ease; }
  .profile-progression-bar--complete span { background:var(--color-accent); }
  .profile-progression-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.55rem; margin-top:1rem; }
  .profile-progression-stats > div { display:grid; gap:.25rem; min-width:0; padding:.75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-inset); }
  .profile-progression-stats span, .profile-progression-stats small { overflow:hidden; color:var(--color-ink-muted); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-stats strong { color:var(--color-ink-strong); font:650 1.15rem var(--font-mono-stack); }
  .profile-progression-weekly { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1rem; padding:1rem; border:1px solid color-mix(in srgb,var(--color-accent) 32%,var(--color-line-subtle)); border-radius:var(--radius-md); background:color-mix(in srgb,var(--color-accent) 6%,var(--surface-inset)); }
  .profile-progression-weekly h3, .profile-progression-lane h4 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.15rem/1.1 var(--font-display-stack); }
  .profile-progression-weekly p, .profile-progression-lane p { max-width:36rem; margin:.45rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.5; }
  .profile-progression-weekly__target { display:grid; grid-template-columns:auto auto; align-items:center; gap:.2rem .55rem; min-width:9rem; }
  .profile-progression-weekly__swatch { grid-row:span 2; width:2.6rem; height:2.6rem; border:1px solid rgba(255,255,255,.55); border-radius:50%; background:var(--weekly-color); box-shadow:0 0 1.4rem color-mix(in srgb,var(--weekly-color) 45%,transparent); }
  .profile-progression-weekly__target strong { color:var(--color-ink-strong); font:650 .85rem var(--font-mono-stack); }
  .profile-progression-weekly__target small { color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-journey, .profile-progression-track, .profile-progression-history { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; }
  .profile-progression-section-heading h3 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.25rem/1.1 var(--font-display-stack); }
  .profile-progression-section-heading > span { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-lanes { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.75rem; margin-top:.8rem; }
  .profile-progression-lane { min-width:0; padding:.8rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-inset); }
  .profile-progression-lane__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; }
  .profile-progression-lane__heading h4 { margin:0; }
  .profile-progression-lane__heading > span { color:var(--color-ink-muted); font:600 .7rem var(--font-mono-stack); white-space:nowrap; }
  .profile-progression-lane ol, .profile-progression-track ol, .profile-progression-history ol { display:grid; gap:.45rem; margin:.75rem 0 0; padding:0; list-style:none; }
  .profile-progression-lane li, .profile-progression-track li { display:grid; gap:.42rem; padding:.7rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-panel-soft); }
  .profile-progression-lane li.unlocked, .profile-progression-track li.unlocked { border-color:color-mix(in srgb,var(--color-accent) 42%,var(--color-line-subtle)); }
  .profile-progression-node__head { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.55rem; min-width:0; }
  .profile-progression-node__head > div { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-node__head strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-node__head small { overflow:hidden; color:var(--color-ink-muted); font-size:.7rem; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-node__status { display:grid; place-items:center; width:1.35rem; height:1.35rem; border:1px solid var(--color-line-strong); border-radius:50%; color:var(--color-ink-faint); font:700 .7rem/1 var(--font-mono-stack); }
  .profile-progression-lane li.unlocked .profile-progression-node__status, .profile-progression-track li.unlocked .profile-progression-node__status { border-color:var(--color-accent); background:color-mix(in srgb,var(--color-accent) 18%,transparent); color:var(--color-accent-bright); }
  .profile-progression-node__progress { color:var(--color-ink-muted); font:600 .65rem/1 var(--font-mono-stack); text-align:right; white-space:nowrap; }
  .profile-progression-lane li > p { margin:0; color:var(--color-ink-muted); font-size:.72rem; }
  .profile-progression-node__bar { height:.25rem; }
  .profile-progression-history li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.65rem; min-width:0; padding:.65rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-progression-event-swatch { width:.7rem; height:.7rem; border-radius:50%; background:var(--event-color); box-shadow:0 0 .8rem color-mix(in srgb,var(--event-color) 48%,transparent); }
  .profile-progression-history li > span:nth-child(2) { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-history li strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-history li small, .profile-progression-history li em { color:var(--color-ink-muted); font:500 var(--type-small) var(--font-mono-stack); font-style:normal; }
  .profile-progression-empty, .profile-progression-footer p { color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.55; }
  .profile-progression-empty { margin:.8rem 0 0; }
  .profile-progression-footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1rem; padding-top:.9rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-footer p { max-width:42rem; margin:0; }
  .profile-progression-footer a { color:var(--color-ink-strong); font-size:var(--type-small); font-weight:650; text-decoration:none; white-space:nowrap; }
  .profile-progression-footer a:hover, .profile-progression-footer a:focus-visible { color:var(--color-accent-bright); }
  @media (max-width: 800px) { .profile-progression-rank { grid-template-columns:1fr; } .profile-progression-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } .profile-progression-lanes { grid-template-columns:1fr; } }
  @media (max-width: 520px) { .profile-progression-stats { grid-template-columns:1fr; } .profile-progression-footer, .profile-progression-section-heading, .profile-progression-weekly { align-items:flex-start; flex-direction:column; } .profile-progression-footer a { white-space:normal; } .profile-progression-weekly__target { align-self:stretch; } }
  @media (prefers-reduced-motion: reduce) { .profile-progression-bar span, .profile-progression-node__bar span { transition:none; } }
</style>
