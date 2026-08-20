<script>
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import Surface from './foundation/Surface.svelte';
  import ProgressionRewardPreview from './ProgressionRewardPreview.svelte';
  import { getRankState } from './ranks.js';
  import { getProfileStoryUnlocks } from './profileStory.js';
  import { PROGRESSION_JOURNEY_LANES } from './progressionState.js';
  import { trackProductEvent } from './productAnalytics.js';

  export let profile = null;
  export let timelineEvents = [];
  export let collectionItems = [];
  export let allAchievements = [];
  export let unlockedAchievements = {};
  export let progression = {};
  export let featureFlags = {};
  export let pageMode = false;
  export let analyticsSurface = 'studio';

  /** @type {any} */
  let account;
  let expandedSections = new SvelteSet();

  $: account = profile || {};
  $: lifetimeEp = Math.max(0, Number(progression?.currentEp ?? account.lifetime_ep) || 0);
  $: totalRolls = Math.max(0, Number(progression?.totalRolls ?? account.total_rolls) || 0);
  $: currentStreak = Math.max(0, Number(progression?.currentStreak ?? account.current_streak) || 0);
  $: longestStreak = Math.max(0, Number(progression?.longestStreak ?? account.longest_streak) || 0);
  $: rankState = getRankState(lifetimeEp);
  $: storyUnlocks = getProfileStoryUnlocks(account);
  $: achievementTotal = Array.isArray(allAchievements) ? allAchievements.length : 0;
  $: achievementCount = unlockedAchievements && typeof unlockedAchievements === 'object'
    ? Object.keys(unlockedAchievements).length
    : 0;
  $: progressPercent = Math.round((rankState?.progress || 0) * 100);
  $: journeyEnabled = featureFlags?.progressionJourney !== false;
  $: journeyState = progression?.journeyState || 'unavailable';
  $: milestoneTrack = Array.isArray(progression?.milestones) ? progression.milestones : [];
  $: recentUnlocks = Array.isArray(progression?.recentUnlocks) ? progression.recentUnlocks : [];
  $: weeklyFocus = progression?.weeklyFocus || null;
  $: laneModels = [
    {
      id: 'rank',
      label: 'Rank / mastery',
      description: 'Lifetime EP turns steady play into a lasting profile record.',
      nodes: getTrackNodes('rank', progression, milestoneTrack)
    },
    ...PROGRESSION_JOURNEY_LANES.map(lane => ({ ...lane, nodes: getTrackNodes(lane.id, progression, milestoneTrack) }))
  ].map(lane => buildLaneModel(lane, progression));
  $: journeyGoalTotal = laneModels.reduce((total, lane) => total + lane.nodes.length, 0);
  $: journeyGoalComplete = laneModels.reduce((total, lane) => total + lane.completed.length, 0);
  $: safeCollectionItems = Array.isArray(collectionItems) ? collectionItems : [];
  $: safeTimelineEvents = Array.isArray(timelineEvents) ? timelineEvents : [];
  $: previewIdentity = account.display_name || account.username || 'You';
  $: previewColor = account.mood_color || '#8B7CF6';
  $: previewAvatar = account.avatar_url || account.avatar_path || '';

  const seenGoals = new SvelteSet();
  const weeklyFocusViewed = new SvelteSet();

  onMount(() => {
    if (journeyEnabled) {
      trackProductEvent('progression_viewed', { surface: analyticsSurface, accountMode: 'authenticated' });
    }
  });

  $: if (journeyEnabled && weeklyFocus) {
    const focusKey = weeklyFocus.weekStart || 'current';
    if (!weeklyFocusViewed.has(focusKey)) {
      weeklyFocusViewed.add(focusKey);
      trackProductEvent('progression_weekly_focus_viewed', { surface: analyticsSurface, accountMode: 'authenticated' });
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

  function getTrackNodes(track, currentProgression = progression, currentMilestones = milestoneTrack) {
    const source = track === 'rank'
      ? (Array.isArray(currentProgression?.rankNodes) ? currentProgression.rankNodes : currentMilestones.filter(node => node?.track === 'rank'))
      : (Array.isArray(currentProgression?.journeyByTrack?.[track])
        ? currentProgression.journeyByTrack[track]
        : currentMilestones.filter(node => node?.track === track));

    return source
      .filter(node => node && node.published !== false && node.status !== 'legacy')
      .slice(0, 32);
  }

  function isUnlocked(node) {
    return node?.unlocked === true || Boolean(node?.unlockedAt || node?.unlocked_at);
  }

  function explicitNodeState(node) {
    const state = String(node?.presentationState || node?.presentation_state || node?.state || '').toLowerCase();
    if (state === 'new' || state === 'active' || state === 'current') return state === 'new' ? 'new' : 'active';
    if (state === 'future') return 'future';
    return '';
  }

  function getNodeState(node, track, nodes, currentProgression = progression) {
    if (isUnlocked(node)) return 'complete';
    const explicit = explicitNodeState(node);
    if (explicit) return explicit;
    if (currentProgression?.nextJourney?.[track]?.id === node?.id) return 'active';
    if (Number(node?.progress?.current) > 0) return 'active';
    if (track === 'rank' && nodes.findIndex(candidate => !isUnlocked(candidate)) === nodes.indexOf(node)) return 'active';
    return 'future';
  }

  function buildLaneModel(lane, currentProgression = progression) {
    const decorated = lane.nodes.map(node => ({
      ...node,
      presentationState: getNodeState(node, lane.id, lane.nodes, currentProgression)
    }));
    const activeNodes = decorated.filter(node => node.presentationState === 'active' || node.presentationState === 'new');
    if (!activeNodes.length) {
      const fallback = decorated.find(node => !isUnlocked(node));
      if (fallback) {
        fallback.presentationState = 'active';
        activeNodes.push(fallback);
      }
    }
    return {
      ...lane,
      nodes: decorated,
      // Discovery conditions are independent stochastic opportunities. Keep
      // every server-published active condition visible instead of implying
      // that the first two are a sequential queue.
      activeNodes: lane.id === 'discovery' ? activeNodes : activeNodes.slice(0, 2),
      completed: decorated.filter(node => node.presentationState === 'complete'),
      future: decorated.filter(node => node.presentationState === 'future')
    };
  }

  function nodeTarget(node) {
    const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
    return Number.isFinite(target) && target > 0 ? target : null;
  }

  function nodeCurrent(node) {
    if (node?.progress?.current !== undefined) return Math.max(0, Number(node.progress.current) || 0);
    if (node?.track === 'rank') return lifetimeEp;
    return 0;
  }

  function nodePercent(node) {
    if (isUnlocked(node)) return 100;
    const target = nodeTarget(node);
    if (!target) return 0;
    return Math.min(100, Math.round((nodeCurrent(node) / target) * 100));
  }

  function nodeProgressLabel(node) {
    if (isUnlocked(node)) return 'Complete';
    const target = nodeTarget(node);
    if (target && (node?.progress || node?.track === 'rank')) {
      const unit = node?.progress?.unit || (node?.track === 'rank' ? 'EP' : '');
      return `${formatNumber(nodeCurrent(node))} / ${formatNumber(target)} ${unit}`.trim();
    }
    if (node?.paceBand || node?.pace_band) return node.paceBand || node.pace_band;
    if (Number(node?.expectedRolls ?? node?.expected_rolls) > 0) return `About ${formatNumber(node.expectedRolls ?? node.expected_rolls)} rolls`;
    return node?.metric === 'achievement' ? 'Not found yet' : 'Future goal';
  }

  function nodeStateLabel(node) {
    if (node?.presentationState === 'complete') return 'Complete';
    if (node?.presentationState === 'new') return 'New';
    if (node?.presentationState === 'active') return 'Active';
    return 'Future';
  }

  function toggleSection(track, section) {
    const key = `${track}:${section}`;
    const next = new SvelteSet(expandedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedSections = next;
  }

  function isSectionExpanded(sectionSet, track, section) {
    return sectionSet.has(track + ':' + section);
 }

  function recordGoalViewed(node) {
    if (!node?.track || seenGoals.has(node.id)) return;
    seenGoals.add(node.id);
    trackProductEvent('progression_goal_viewed', {
      surface: analyticsSurface,
      accountMode: 'authenticated',
      track: node.track
    });
  }

  function observeJourneyNode(element, node) {
    if (!node?.track || typeof IntersectionObserver === 'undefined') return {};
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) recordGoalViewed(node);
    }, { threshold: 0.5 });
    observer.observe(element);
    return { destroy: () => observer.disconnect() };
  }
</script>

<Surface variant="panel" padding="lg" className={`profile-progression-surface${pageMode ? ' profile-progression-surface--page' : ''}`}>
  <section aria-labelledby="profile-progression-title">
    <header class="profile-progression-heading">
      <div>
        <p class="profile-progression-label">Your profile / progression</p>
        <h2 id="profile-progression-title">A profile with history.</h2>
        <p>Every roll adds to the record. Rank, Ritual, and Discovery turn that record into expressions you can keep.</p>
      </div>
      <div class="profile-progression-heading__summary" aria-label="Progression completion">
        <strong>{formatNumber(journeyGoalComplete)}</strong>
        <span>of {formatNumber(journeyGoalTotal)} goals complete</span>
      </div>
    </header>

    <section class="profile-progression-rank" aria-labelledby="profile-progression-rank-title">
      <div class="profile-progression-rank__identity">
        <span class="profile-progression-rank__mark" aria-hidden="true">{(rankState.current?.name || 'U').slice(0, 1)}</span>
        <div>
          <span class="profile-progression-label">Rank / mastery</span>
          <h3 id="profile-progression-rank-title">{rankState.current?.name || 'Unranked'}</h3>
          <small>{formatNumber(lifetimeEp)} lifetime EP</small>
        </div>
      </div>
      <div class="profile-progression-rank__next">
        {#if rankState.next}
          <div class="profile-progression-rank__next-copy">
            <span><strong>{progressPercent}%</strong> toward {rankState.next.name}</span>
            <span>{formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} EP remaining</span>
          </div>
          <div class="profile-progression-bar" aria-label={`${progressPercent}% toward ${rankState.next.name}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent}><span style={`width:${progressPercent}%`}></span></div>
        {:else}
          <div class="profile-progression-rank__next-copy"><span>Highest rank reached</span><span>Mastery is recorded in your profile.</span></div>
          <div class="profile-progression-bar profile-progression-bar--complete" aria-label="Highest rank reached" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div>
        {/if}
      </div>
    </section>

    <div class="profile-progression-stats" aria-label="Progression summary">
      <div><span>Rolls</span><strong>{formatNumber(totalRolls)}</strong><small>Total colors</small></div>
      <div><span>Longest streak</span><strong>{formatNumber(longestStreak)} days</strong><small>Current: {formatNumber(currentStreak)} days</small></div>
      <div><span>Achievements</span><strong>{formatNumber(achievementCount)}{achievementTotal ? ` / ${formatNumber(achievementTotal)}` : ''}</strong><small>Unlocked</small></div>
      <div><span>Collection</span><strong>{formatNumber(safeCollectionItems.length)}</strong><small>{storyUnlocks.collectionUnlocked ? 'Showcase unlocked' : `${storyUnlocks.collectionRollsRequired} rolls to unlock`}</small></div>
    </div>

    {#if journeyEnabled}
      {#if weeklyFocus}
      <section class="profile-progression-weekly" aria-labelledby="profile-progression-weekly-title">
        <div>
          <span class="profile-progression-label">This week</span>
          <h3 id="profile-progression-weekly-title">Color of the Week</h3>
          <p>{weeklyFocus.completed ? 'Completed this week.' : 'Match this color once this week.'}</p>
        </div>
        <div class="profile-progression-weekly__target">
          <span class="profile-progression-weekly__swatch" style={`--weekly-color:${weeklyFocus.targetHex || '#ffffff'}`} aria-hidden="true"></span>
          <strong>{weeklyFocus.targetHex || 'Color pending'}</strong>
          <small>{weeklyFocus.completed ? 'Focus complete' : `+${formatNumber(weeklyFocus.bonusEp)} EP`}</small>
        </div>
      </section>
      {/if}

      <section class="profile-progression-journey" aria-labelledby="profile-progression-journey-title">
      <div class="profile-progression-section-heading">
        <div><span class="profile-progression-label">The journey</span><h3 id="profile-progression-journey-title">Three ways to build a profile</h3></div>
        {#if journeyGoalTotal}<span>{journeyGoalComplete} of {journeyGoalTotal} complete</span>{/if}
      </div>

      <div class="profile-progression-lanes">
        {#each laneModels as lane (lane.id)}
          <section class="profile-progression-lane" aria-labelledby={`profile-progression-lane-${lane.id}`}>
            <div class="profile-progression-lane__heading">
              <div><h4 id={`profile-progression-lane-${lane.id}`}>{lane.label}</h4><p>{lane.description}</p></div>
              <span>{lane.completed.length} of {lane.nodes.length}</span>
            </div>

            {#if lane.activeNodes.length}
              <div class="profile-progression-active">
                <p class="profile-progression-subhead">Active goals</p>
                {#each lane.activeNodes as node (node.id)}
                  <article use:observeJourneyNode={node} class="profile-progression-node profile-progression-node--active">
                    <div class="profile-progression-node__head">
                      <span class="profile-progression-node__status" aria-hidden="true"></span>
                      <div><strong>{node.name || 'Published goal'}</strong><small>{node.reward?.name || 'Profile expression reward'}</small></div>
                      <span class="profile-progression-node__progress">{nodeStateLabel(node)}</span>
                    </div>
                    <p>{node.description || 'A server-published goal for your profile.'}</p>
                    {#if nodeTarget(node)}
                      <div class="profile-progression-node__bar" role="progressbar" aria-label={`${node.name || 'Goal'} progression`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={nodePercent(node)}><span style={`width:${nodePercent(node)}%`}></span></div>
                    {/if}
                    <div class="profile-progression-node__meta">
                      <span>{nodeProgressLabel(node)}</span>
                      {#if node.reward}<ProgressionRewardPreview reward={node.reward} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={node.id} track={lane.id} analyticsSurface={analyticsSurface} />{/if}
                    </div>
                  </article>
                {/each}
              </div>
            {:else if lane.nodes.length}
              <p class="profile-progression-empty">All published goals in this lane are complete.</p>
            {:else if lane.id === 'rank'}
              <p class="profile-progression-empty">Rank is calculated from lifetime EP and remains part of your profile record.</p>
            {:else if journeyState === 'partial' || journeyState === 'unavailable'}
              <p class="profile-progression-empty">Some goals unavailable right now. Your saved progress is safe.</p>
            {:else}
              <p class="profile-progression-empty">No goals are published yet.</p>
            {/if}

            {#if lane.completed.length}
              <div class="profile-progression-collapsed-row">
                <span>{lane.completed.length} completed goal{lane.completed.length === 1 ? '' : 's'}</span>
                <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'completed')} on:click={() => toggleSection(lane.id, 'completed')}>{isSectionExpanded(expandedSections, lane.id, 'completed') ? 'Hide completed' : 'View completed'}</button>
              </div>
              {#if isSectionExpanded(expandedSections, lane.id, 'completed')}
                <ol class="profile-progression-condensed-list">
                  {#each lane.completed as node (node.id)}
                    <li><span class="profile-progression-node__status profile-progression-node__status--complete" aria-hidden="true"></span><span><strong>{node.name || 'Completed goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>Complete</em></li>
                  {/each}
                </ol>
              {/if}
            {/if}

            {#if lane.future.length}
              <div class="profile-progression-collapsed-row">
                <span>{lane.future.length} future goal{lane.future.length === 1 ? '' : 's'}</span>
                <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'future')} on:click={() => toggleSection(lane.id, 'future')}>{isSectionExpanded(expandedSections, lane.id, 'future') ? 'Hide future' : 'Show future goals'}</button>
              </div>
              {#if isSectionExpanded(expandedSections, lane.id, 'future')}
                <ol class="profile-progression-condensed-list">
                  {#each lane.future as node (node.id)}
                    <li><span class="profile-progression-node__status" aria-hidden="true"></span><span><strong>{node.name || 'Future goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                  {/each}
                </ol>
              {/if}
            {/if}
          </section>
        {/each}
      </div>
      </section>

      {#if recentUnlocks.length}
        <section class="profile-progression-unlocks" aria-labelledby="profile-progression-unlocks-title">
        <div class="profile-progression-section-heading">
          <div><span class="profile-progression-label">Recent unlocks</span><h3 id="profile-progression-unlocks-title">Expressions added to your record</h3></div>
          <span>{recentUnlocks.length} recent</span>
        </div>
        <ol>
          {#each recentUnlocks.slice(0, 3) as unlock (unlock.id)}
            <li><div><strong>{unlock.name || 'Milestone complete'}</strong><small>{unlock.reward?.name || 'Expression reward'}</small></div>{#if unlock.reward}<ProgressionRewardPreview reward={unlock.reward} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={unlock.id} track={unlock.track} analyticsSurface={analyticsSurface} />{/if}</li>
          {/each}
        </ol>
        </section>
      {/if}
    {/if}

    <div class="profile-progression-history">
      <div class="profile-progression-section-heading">
        <div><span class="profile-progression-label">History</span><h3>Recent rolls</h3></div>
        <span>{safeTimelineEvents.length ? `${safeTimelineEvents.length} recorded events` : 'No history yet'}</span>
      </div>
      {#if safeTimelineEvents.length}
        <ol>
          {#each timelineEvents.slice(0, 3) as event (event.id)}
            <li><span class="profile-progression-event-swatch" style={`--event-color:${event.payload?.hex || '#ffffff'}`} aria-hidden="true"></span><span><strong>{eventLabel(event)}</strong><small>{formatDate(event.occurredAt)}</small></span>{#if event.payload?.score}<em>{formatNumber(event.payload.score)} pts</em>{/if}</li>
          {/each}
        </ol>
      {:else}
        <p class="profile-progression-empty">No rolls recorded yet.</p>
      {/if}
    </div>

    <footer class="profile-progression-footer">
      <p>Rewards and progress are verified on the server.</p>
      <a href={pageMode ? '/profile/settings#customize-effects' : '#customize-effects'}>Equip an expression</a>
    </footer>
  </section>
</Surface>

<style>
  :global(.profile-progression-surface) { width:100%; box-sizing:border-box; }
  .profile-progression-heading { display:flex; align-items:flex-end; justify-content:space-between; gap:1.5rem; flex-wrap:wrap; margin-bottom:1.2rem; }
  .profile-progression-heading h2 { max-width:42rem; margin:.35rem 0 0; color:var(--color-ink-strong); font:600 clamp(1.9rem,4vw,3.1rem)/1 var(--font-display-stack); letter-spacing:-.04em; }
  .profile-progression-heading p:not(.profile-progression-label) { max-width:42rem; margin:.75rem 0 0; color:var(--color-ink-muted); line-height:1.55; }
  .profile-progression-heading__summary { display:grid; gap:.2rem; min-width:9rem; padding:.75rem; border-left:1px solid var(--color-line-strong); }
  .profile-progression-heading__summary strong { color:var(--color-ink-strong); font:650 1.35rem/1 var(--font-mono-stack); }
  .profile-progression-heading__summary span { color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-label { margin:0; color:var(--color-ink-muted); font:700 var(--type-label)/1.2 var(--font-mono-stack); letter-spacing:.12em; text-transform:uppercase; }
  .profile-progression-rank { display:grid; grid-template-columns:minmax(13rem,.8fr) minmax(18rem,1.2fr); gap:1rem; align-items:center; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-panel-soft); }
  .profile-progression-rank__identity { display:flex; align-items:center; gap:.8rem; min-width:0; }
  .profile-progression-rank__mark { display:grid; place-items:center; flex:0 0 3.1rem; width:3.1rem; height:3.1rem; border:1px solid var(--color-line-strong); border-radius:50%; color:var(--color-ink-strong); background:var(--surface-inset); font:700 1.3rem var(--font-display-stack); }
  .profile-progression-rank__identity > div { display:grid; gap:.2rem; min-width:0; }
  .profile-progression-rank h3 { margin:0; color:var(--color-ink-strong); font:600 1.2rem/1.1 var(--font-display-stack); }
  .profile-progression-rank small { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-rank__next { display:grid; gap:.55rem; min-width:0; }
  .profile-progression-rank__next-copy { display:flex; justify-content:space-between; gap:1rem; color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-rank__next-copy strong { color:var(--color-ink-strong); }
  .profile-progression-bar, .profile-progression-node__bar { height:.34rem; overflow:hidden; border-radius:999px; background:var(--color-line-subtle); }
  .profile-progression-bar span, .profile-progression-node__bar span { display:block; height:100%; border-radius:inherit; background:var(--color-ink-strong); transition:width .4s ease; }
  .profile-progression-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:.55rem; margin-top:1rem; }
  .profile-progression-stats > div { display:grid; gap:.25rem; min-width:0; padding:.75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-inset); }
  .profile-progression-stats span, .profile-progression-stats small { overflow:hidden; color:var(--color-ink-muted); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-stats strong { color:var(--color-ink-strong); font:650 1.15rem var(--font-mono-stack); }
  .profile-progression-weekly { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1rem; padding:1rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-inset); }
  .profile-progression-weekly h3, .profile-progression-lane h4 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.15rem/1.1 var(--font-display-stack); }
  .profile-progression-weekly p, .profile-progression-lane p { max-width:36rem; margin:.45rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.5; }
  .profile-progression-weekly__target { display:grid; grid-template-columns:auto auto; align-items:center; gap:.2rem .55rem; min-width:9rem; }
  .profile-progression-weekly__swatch { grid-row:span 2; width:2.6rem; height:2.6rem; border:1px solid var(--color-line-strong); border-radius:var(--radius-sm); background:var(--weekly-color); }
  .profile-progression-weekly__target strong { color:var(--color-ink-strong); font:650 .85rem var(--font-mono-stack); }
  .profile-progression-weekly__target small { color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-journey, .profile-progression-unlocks, .profile-progression-history { margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-section-heading { display:flex; align-items:end; justify-content:space-between; gap:1rem; }
  .profile-progression-section-heading h3 { margin:.35rem 0 0; color:var(--color-ink-strong); font:600 1.25rem/1.1 var(--font-display-stack); }
  .profile-progression-section-heading > span { color:var(--color-ink-muted); font-size:var(--type-small); }
  .profile-progression-lanes { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:.75rem; margin-top:.8rem; }
  .profile-progression-lane { display:grid; align-content:start; gap:.75rem; min-width:0; padding:.8rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-md); background:var(--surface-inset); }
  .profile-progression-lane__heading { display:flex; align-items:flex-start; justify-content:space-between; gap:.75rem; }
  .profile-progression-lane__heading h4 { margin:0; }
  .profile-progression-lane__heading > span { color:var(--color-ink-muted); font:600 .7rem var(--font-mono-stack); white-space:nowrap; }
  .profile-progression-active { display:grid; gap:.45rem; }
  .profile-progression-subhead { margin:0!important; color:var(--color-ink-muted); font:700 .65rem/1 var(--font-mono-stack)!important; letter-spacing:.1em; text-transform:uppercase; }
  .profile-progression-node { display:grid; gap:.5rem; padding:.75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-panel-soft); }
  .profile-progression-node--active { border-color:var(--color-line-strong); }
  .profile-progression-node__head { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.55rem; min-width:0; }
  .profile-progression-node__head > div { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-node__head strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-node__head small { overflow:hidden; color:var(--color-ink-muted); font-size:.7rem; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-node__status { display:block; width:1.35rem; height:1.35rem; border:1px solid var(--color-line-strong); border-radius:50%; background:transparent; }
  .profile-progression-node__status--complete { background:var(--color-ink-strong); }
  .profile-progression-node__progress { color:var(--color-ink-muted); font:600 .65rem/1 var(--font-mono-stack); text-align:right; white-space:nowrap; }
  .profile-progression-node > p { margin:0; color:var(--color-ink-muted); font-size:.72rem; line-height:1.45; }
  .profile-progression-node__bar { height:.25rem; }
  .profile-progression-node__meta { display:grid; grid-template-columns:minmax(0,1fr) minmax(7rem,.8fr); gap:.45rem; align-items:start; color:var(--color-ink-muted); font:600 .68rem/1.3 var(--font-mono-stack); }
  .profile-progression-node__meta > span { padding-top:.75rem; }
  .profile-progression-collapsed-row { display:flex; align-items:center; justify-content:space-between; gap:.5rem; padding-top:.25rem; color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-collapsed-row button { min-height:2.75rem; padding:.45rem .55rem; border:0; background:transparent; color:var(--color-ink-strong); font:650 .7rem var(--font-body-stack); text-decoration:underline; text-underline-offset:.2em; cursor:pointer; }
  .profile-progression-collapsed-row button:focus-visible { outline:2px solid var(--color-ink-strong); outline-offset:2px; }
  .profile-progression-condensed-list { display:grid; gap:.35rem; margin:0; padding:0; list-style:none; }
  .profile-progression-condensed-list li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.5rem; min-width:0; padding:.55rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-condensed-list li > span:nth-child(2) { display:grid; gap:.1rem; min-width:0; }
  .profile-progression-condensed-list strong, .profile-progression-condensed-list small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-condensed-list strong { color:var(--color-ink-strong); font-size:.72rem; }
  .profile-progression-condensed-list small, .profile-progression-condensed-list em { color:var(--color-ink-muted); font-size:.65rem; font-style:normal; }
  .profile-progression-unlocks ol, .profile-progression-history ol { display:grid; gap:.45rem; margin:.75rem 0 0; padding:0; list-style:none; }
  .profile-progression-unlocks ol { grid-template-columns:repeat(3,minmax(0,1fr)); }
  .profile-progression-unlocks li { display:grid; gap:.5rem; min-width:0; padding:.65rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); background:var(--surface-inset); }
  .profile-progression-unlocks li > div:first-child { display:grid; gap:.2rem; min-width:0; }
  .profile-progression-unlocks strong, .profile-progression-unlocks small { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-unlocks strong { color:var(--color-ink-strong); font-size:var(--type-small); }
  .profile-progression-unlocks small { color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-history li { display:grid; grid-template-columns:auto minmax(0,1fr) auto; align-items:center; gap:.65rem; min-width:0; padding:.65rem .75rem; border:1px solid var(--color-line-subtle); border-radius:var(--radius-sm); }
  .profile-progression-event-swatch { width:.7rem; height:.7rem; border:1px solid var(--color-line-strong); border-radius:var(--radius-sm); background:var(--event-color); }
  .profile-progression-history li > span:nth-child(2) { display:grid; gap:.15rem; min-width:0; }
  .profile-progression-history li strong { overflow:hidden; color:var(--color-ink-strong); font-size:var(--type-small); text-overflow:ellipsis; white-space:nowrap; }
  .profile-progression-history li small, .profile-progression-history li em { color:var(--color-ink-muted); font:500 var(--type-small) var(--font-mono-stack); font-style:normal; }
  .profile-progression-empty, .profile-progression-footer p { color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.55; }
  .profile-progression-empty { margin:0; }
  .profile-progression-footer { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-top:1rem; padding-top:.9rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-footer p { max-width:42rem; margin:0; }
  .profile-progression-footer a { min-height:2.75rem; display:inline-flex; align-items:center; color:var(--color-ink-strong); font-size:var(--type-small); font-weight:650; text-decoration:none; white-space:nowrap; }
  .profile-progression-footer a:hover, .profile-progression-footer a:focus-visible { text-decoration:underline; text-underline-offset:.2em; }
  .profile-progression-footer a:focus-visible { outline:2px solid var(--color-ink-strong); outline-offset:2px; }
  @media (max-width:980px) { .profile-progression-lanes { grid-template-columns:1fr 1fr; } }
  @media (max-width:800px) { .profile-progression-rank { grid-template-columns:1fr; } .profile-progression-stats { grid-template-columns:repeat(2,minmax(0,1fr)); } .profile-progression-lanes { grid-template-columns:1fr; } .profile-progression-unlocks ol { grid-template-columns:1fr; } }
  @media (max-width:520px) { .profile-progression-heading__summary { width:100%; border-top:1px solid var(--color-line-subtle); border-left:0; } .profile-progression-stats { grid-template-columns:1fr; } .profile-progression-footer, .profile-progression-section-heading, .profile-progression-weekly { align-items:flex-start; flex-direction:column; } .profile-progression-footer a { white-space:normal; } .profile-progression-weekly__target { align-self:stretch; } .profile-progression-node__meta { grid-template-columns:1fr; } }
  @media (prefers-reduced-motion:reduce) { .profile-progression-bar span, .profile-progression-node__bar span { transition:none; } }
</style>
