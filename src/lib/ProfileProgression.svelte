<script>
  import { onMount } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import Surface from './foundation/Surface.svelte';
  import ProgressionPathIcon from './ProgressionPathIcon.svelte';
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
  let expandedLane = '';
  const rankRingRadius = 31;
  const rankRingCircumference = 2 * Math.PI * rankRingRadius;

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
  $: rankRingDashOffset = rankRingCircumference * (1 - progressPercent / 100);
  $: journeyEnabled = featureFlags?.progressionJourney !== false;
  $: journeyState = progression?.journeyState || 'unavailable';
  $: milestoneTrack = Array.isArray(progression?.milestones) ? progression.milestones : [];
  $: recentUnlocks = Array.isArray(progression?.recentUnlocks) ? progression.recentUnlocks : [];
  $: weeklyFocus = progression?.weeklyFocus || null;
  $: laneModels = [
    {
      id: 'rank',
      label: 'Rank / mastery',
      description: 'Lifetime experience points turn steady play into a lasting profile record.',
      nodes: getTrackNodes('rank', progression, milestoneTrack)
    },
    ...PROGRESSION_JOURNEY_LANES.map(lane => ({ ...lane, nodes: getTrackNodes(lane.id, progression, milestoneTrack) }))
  ].map(lane => buildLaneModel(lane, progression));
  $: journeyGoalTotal = laneModels.reduce((total, lane) => total + lane.nodes.length, 0);
  $: journeyGoalComplete = laneModels.reduce((total, lane) => total + lane.completed.length, 0);
  $: earnedExpressionCount = laneModels.reduce((total, lane) => total + lane.completed.filter(node => node.reward).length, 0);
  $: safeCollectionItems = Array.isArray(collectionItems) ? collectionItems : [];
  $: safeTimelineEvents = Array.isArray(timelineEvents) ? timelineEvents : [];
  $: previewIdentity = account.display_name || account.username || 'You';
  $: hasTodayColor = /^#[0-9a-f]{6}$/i.test(account.mood_color || '');
  $: todayColor = hasTodayColor ? account.mood_color.toUpperCase() : '';
  // The canonical expression renderer accepts a color for data previews. A neutral
  // fallback keeps the page grayscale when the profile has no current roll.
  $: previewColor = todayColor || '#FFFFFF';
  $: previewAvatar = account.avatar_url || account.avatar_path || '';
  $: focusGoal = resolveFocusGoal(progression);

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

  function formatCompactNumber(value) {
    const numeric = Math.max(0, Number(value) || 0);
    if (numeric >= 1000000) return `${(Math.floor(numeric / 100000) / 10).toFixed(1).replace(/\.0$/, '')}M`;
    if (numeric >= 1000) return `${Math.floor(numeric / 1000)}K`;
    return Math.round(numeric).toLocaleString();
  }

  function rankDistanceLabel() {
    if (!rankState.next) return 'Top rank reached';
    return `${formatCompactNumber(Math.max(0, rankState.next.min - lifetimeEp))} to ${rankState.next.name.toLowerCase()}`;
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
      activeNodes: lane.id === 'discovery' ? activeNodes : activeNodes.slice(0, 2),
      featuredNode: activeNodes[0] || null,
      additionalActive: activeNodes.slice(1),
      completed: decorated.filter(node => node.presentationState === 'complete'),
      future: decorated.filter(node => node.presentationState === 'future')
    };
  }

  function resolveFocusGoal(currentProgression = progression) {
    const candidates = [
      currentProgression?.nextJourney?.ritual,
      currentProgression?.nextJourney?.discovery,
      currentProgression?.nextJourney?.rank,
      currentProgression?.nextObjective
    ];
    return candidates.find(node => node && !isUnlocked(node)) || null;
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
      const rawUnit = node?.progress?.unit || (node?.track === 'rank' ? 'points' : 'rolls');
      const unit = String(rawUnit).toLowerCase() === 'ep' ? 'points' : rawUnit;
      return `${formatNumber(nodeCurrent(node))} / ${formatNumber(target)} ${unit}`.trim();
    }
    return goalPaceLabel(node);
  }

  function goalPaceLabel(node) {
    const expectedRolls = Number(node?.expectedRolls ?? node?.expected_rolls);
    if (Number.isFinite(expectedRolls) && expectedRolls > 0 && expectedRolls <= 90) {
      return `Often within ${formatNumber(expectedRolls)} rolls`;
    }
    const pace = String(node?.paceBand || node?.pace_band || '').toLowerCase();
    if (pace === 'days') return 'A few days of rolling';
    if (pace === 'weeks') return 'A few weeks of rolling';
    if (pace === 'months') return 'A longer-term goal';
    if (pace === 'years' || pace === 'lifetime') return 'A rare, long-term find';
    return node?.metric === 'achievement' ? 'Find it whenever it appears' : 'Coming later';
  }

  function nodeStateLabel(node) {
    if (node?.presentationState === 'complete') return 'Complete';
    if (node?.presentationState === 'new') return 'New in your profile';
    if (node?.track === 'discovery') return 'Find anytime';
    if (node?.presentationState === 'active') return 'In progress';
    return 'Coming later';
  }

  function laneKicker(track) {
    return {
      rank: 'Build mastery',
      ritual: 'Keep your streak',
      discovery: 'Find rare colors'
    }[track] || 'Build your profile';
  }

  function focusDescription(node) {
    if (!node) return 'Roll today to add another piece to your profile story.';
    if (node.track === 'discovery') return `${node.description || 'Find a rare color or pattern.'} Each discovery is independent.`;
    return node.description || 'Keep rolling to move your profile forward.';
  }

  function focusActionLabel(node) {
    if (!node) return 'Roll today';
    if (node.track === 'discovery') return 'Roll and explore';
    return 'Roll today';
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

  function toggleLane(track) {
    expandedLane = expandedLane === track ? '' : track;
  }

  function laneProgressPercent(lane) {
    if (lane.id === 'rank') return progressPercent;
    const target = nodeTarget(lane.featuredNode);
    if (target) return nodePercent(lane.featuredNode);
    return lane.nodes.length ? Math.round((lane.completed.length / lane.nodes.length) * 100) : 0;
  }

  function laneProgressLabel(lane) {
    if (lane.id === 'rank') return `${progressPercent}%`;
    const target = nodeTarget(lane.featuredNode);
    if (target) return `${formatNumber(nodeCurrent(lane.featuredNode))}/${formatNumber(target)}`;
    return `${formatNumber(lane.completed.length)}/${formatNumber(lane.nodes.length)}`;
  }

  function laneMilestoneCopy(lane) {
    const node = lane.featuredNode;
    const rewardName = node?.reward?.name;
    if (!node) return lane.completed.length ? 'You completed this path.' : 'You have no published goal here yet.';
    if (lane.id === 'rank') return `Reach ${rankState.next?.name || 'the top rank'}${rewardName ? ` to unlock ${rewardName}.` : '.'}`;
    if (lane.id === 'ritual') {
      const target = nodeTarget(node);
      return `Keep a ${target ? formatNumber(target) : 'steady'}-day streak${rewardName ? ` to unlock ${rewardName}.` : '.'}`;
    }
    return `Find ${node.name || 'a rare color'}${rewardName ? ` to unlock ${rewardName}.` : '.'}`;
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
  <section class:profile-progression-page-mode={pageMode} aria-labelledby="profile-progression-title">
    {#if !pageMode}
    <header class="profile-progression-heading">
      <div>
        <p class="profile-progression-label">Your profile / progression</p>
        <h2 id="profile-progression-title">Your profile story.</h2>
        <p>Every roll adds a color, a milestone, or an expression to the profile you are building.</p>
      </div>
      <div class="profile-progression-heading__summary" aria-label="Progression completion">
        <strong>{formatNumber(journeyGoalComplete)}</strong>
        <span>of {formatNumber(journeyGoalTotal)} goals complete</span>
      </div>
    </header>
    {/if}

    {#if !pageMode}
      <section class="profile-progression-direction" aria-labelledby="profile-progression-direction-title">
        <div class="profile-progression-direction__copy">
          <span class="profile-progression-label profile-progression-label--with-chip">
            Today's direction
            {#if hasTodayColor}<span class="profile-progression-color-chip" style={`--data-color:${todayColor}`} aria-label={`Today's rolled color ${todayColor}`}></span>{/if}
          </span>
          <h3 id="profile-progression-direction-title">{focusGoal?.name || 'Keep building your profile'}</h3>
          <p>{focusDescription(focusGoal)}</p>
          {#if focusGoal}<span class="profile-progression-direction__progress">{nodeProgressLabel(focusGoal)}</span>{/if}
        </div>
        <div class="profile-progression-direction__reward">
          <span>Next expression</span>
          <strong>{focusGoal?.reward?.name || 'Your next expression'}</strong>
          <small>{focusGoal?.reward ? 'Preview what you can earn.' : 'Keep rolling to reveal it.'}</small>
        </div>
        <a class="site-button" href="/roll">{focusActionLabel(focusGoal)}</a>
      </section>
    {/if}

    <section class:profile-progression-rank--page={pageMode} class="profile-progression-rank" aria-labelledby="profile-progression-rank-title">
      <div class="profile-progression-rank__identity">
        <div class="profile-progression-rank__badge" role="img" aria-label={`${rankState.current?.name || 'Unranked'} rank, ${progressPercent}% toward ${rankState.next?.name || 'the highest rank'}`}>
          <svg class="profile-progression-rank__ring" viewBox="0 0 76 76" aria-hidden="true">
            <circle class="profile-progression-rank__ring-track" cx="38" cy="38" r={rankRingRadius} />
            <circle class="profile-progression-rank__ring-value" cx="38" cy="38" r={rankRingRadius} stroke-dasharray={rankRingCircumference} stroke-dashoffset={rankRingDashOffset} />
          </svg>
          <span class="profile-progression-rank__mark" aria-hidden="true">{(rankState.current?.name || 'U').slice(0, 1)}</span>
        </div>
        <div>
          {#if pageMode}
            <span id="profile-progression-rank-title" class="profile-progression-rank__name">{rankState.current?.name || 'Unranked'} rank</span>
            <strong class="profile-progression-rank__ep" title={`${formatNumber(lifetimeEp)} experience points`}>{formatCompactNumber(lifetimeEp)} XP</strong>
            <small>{rankDistanceLabel()}</small>
          {:else}
            <span class="profile-progression-label">Rank · Build mastery</span>
            <h3 id="profile-progression-rank-title">{rankState.current?.name || 'Unranked'}</h3>
            <strong class="profile-progression-rank__ep">{formatNumber(lifetimeEp)}</strong>
            <small>experience points from rolls</small>
          {/if}
        </div>
      </div>
      {#if !pageMode}<div class="profile-progression-rank__next">
        {#if rankState.next}
          <div class="profile-progression-rank__next-copy">
            <span><strong>{progressPercent}%</strong> toward {rankState.next.name}</span>
            <span>{formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} points left</span>
          </div>
          <div class="profile-progression-bar" aria-label={`${progressPercent}% toward ${rankState.next.name}`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent}><span style={`width:${progressPercent}%`}></span></div>
        {:else}
          <div class="profile-progression-rank__next-copy"><span>Highest rank reached</span><span>Mastery is recorded in your profile.</span></div>
          <div class="profile-progression-bar profile-progression-bar--complete" aria-label="Highest rank reached" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div>
        {/if}
      </div>{/if}
    </section>

    <div class="profile-progression-stats" aria-label="Progression summary">
      {#if pageMode}
        <div><span>Rolls</span><strong title={`${formatNumber(totalRolls)} rolls`}>{formatCompactNumber(totalRolls)}</strong></div>
        <div><span>Longest streak</span><strong title={`${formatNumber(longestStreak)} days`}>{formatCompactNumber(longestStreak)}d</strong></div>
        <div><span>Goals</span><strong title={`${formatNumber(journeyGoalComplete)} of ${formatNumber(journeyGoalTotal)} goals complete`}>{journeyGoalTotal ? `${formatCompactNumber(journeyGoalComplete)}/${formatCompactNumber(journeyGoalTotal)}` : formatCompactNumber(journeyGoalComplete)}</strong></div>
        <div><span>Unlocks</span><strong title={`${formatNumber(earnedExpressionCount)} expressions earned`}>{formatCompactNumber(earnedExpressionCount)}</strong></div>
      {:else}
      <div><span>Rolls</span><strong>{formatNumber(totalRolls)}</strong><small>Colors added</small></div>
      <div><span>Longest streak</span><strong>{formatNumber(longestStreak)} days</strong><small>Current: {formatNumber(currentStreak)} days</small></div>
      <div><span>Goals complete</span><strong>{formatNumber(journeyGoalComplete)}</strong><small>Of {formatNumber(journeyGoalTotal)} journey goals</small></div>
      <div><span>Expressions earned</span><strong>{formatNumber(earnedExpressionCount)}</strong><small>Profile rewards</small></div>
      {#if !pageMode && achievementTotal}
        <div><span>Achievements</span><strong>{formatNumber(achievementCount)} / {formatNumber(achievementTotal)}</strong><small>Unlocked</small></div>
      {/if}
      {#if !pageMode && safeCollectionItems.length}
        <div><span>Collection</span><strong>{formatNumber(safeCollectionItems.length)}</strong><small>{storyUnlocks.collectionUnlocked ? 'Showcase unlocked' : 'Items collected'}</small></div>
      {/if}
      {/if}
    </div>

    {#if journeyEnabled}
      {#if weeklyFocus}
      <section class:profile-progression-weekly--page={pageMode} class="profile-progression-weekly" aria-labelledby="profile-progression-weekly-title">
        {#if pageMode}
        <div class="profile-progression-weekly__inline">
          <span class="profile-progression-weekly__swatch" style={`--weekly-color:${weeklyFocus.targetHex || '#ffffff'}`} aria-hidden="true"></span>
          <span class="profile-progression-weekly__copy" title={`Match ${weeklyFocus.targetHex || 'this color'} this week`}>Match <strong>{weeklyFocus.targetHex || 'this color'}</strong></span>
          <strong class="profile-progression-weekly__bonus">{weeklyFocus.completed ? 'Complete' : `+${formatCompactNumber(weeklyFocus.bonusEp)} pts`}</strong>
        </div>
        {:else}
        <div>
          <span class="profile-progression-label">Secondary challenge</span>
          <h3 id="profile-progression-weekly-title">Weekly color</h3>
          <p>{weeklyFocus.completed ? 'You matched this color this week.' : 'Match this color once to earn a bonus.'}</p>
        </div>
        <div class="profile-progression-weekly__target">
          <span class="profile-progression-weekly__swatch" style={`--weekly-color:${weeklyFocus.targetHex || '#ffffff'}`} aria-hidden="true"></span>
          <strong>{weeklyFocus.targetHex || 'Color pending'}</strong>
          <small>{weeklyFocus.completed ? 'Complete' : `+${formatNumber(weeklyFocus.bonusEp)} points`}</small>
        </div>
        {/if}
      </section>
      {/if}

      <section class="profile-progression-journey" aria-labelledby="profile-progression-journey-title">
      {#if pageMode}
      <div class="profile-progression-section-heading profile-progression-section-heading--page">
        <span class="profile-progression-label">Your paths</span>
      </div>
      {:else}<div class="profile-progression-section-heading">
        <div><span class="profile-progression-label">The journey</span><h3 id="profile-progression-journey-title">Three ways to build your story</h3><p class="profile-progression-section-heading__copy">Choose the goal that feels right today. The three paths grow independently.</p></div>
        {#if journeyGoalTotal}<span>{journeyGoalComplete} of {journeyGoalTotal} complete</span>{/if}
      </div>
      {/if}

      <div class="profile-progression-lanes">
        {#each laneModels as lane (lane.id)}
        <section class:profile-progression-lane--accordion={pageMode} class="profile-progression-lane" aria-labelledby={`profile-progression-lane-${lane.id}`}>
          {#if pageMode}
            <button
              type="button"
              class="profile-progression-lane__toggle"
              aria-expanded={expandedLane === lane.id}
              aria-controls={`profile-progression-lane-${lane.id}-details`}
              on:click={() => toggleLane(lane.id)}
            >
              <span class="profile-progression-lane__toggle-main">
                <ProgressionPathIcon track={lane.id} state={lane.featuredNode?.presentationState || (lane.completed.length ? 'complete' : 'future')} />
                <span id={`profile-progression-lane-${lane.id}`}><strong>{lane.label.replace(' / mastery', '')}</strong></span>
              </span>
              <span class="profile-progression-lane__toggle-progress">
                <span>{laneProgressLabel(lane)}</span>
                <span class="profile-progression-lane__toggle-bar profile-progression-bar" aria-hidden="true"><span style={`width:${laneProgressPercent(lane)}%`}></span></span>
              </span>
              <svg class:profile-progression-lane__chevron--open={expandedLane === lane.id} class="profile-progression-lane__chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m5 9 7 7 7-7" /></svg>
            </button>
            <div
              id={`profile-progression-lane-${lane.id}-details`}
              class:profile-progression-lane__details--expanded={expandedLane === lane.id}
              class="profile-progression-lane__details"
              aria-hidden={expandedLane !== lane.id}
              inert={expandedLane !== lane.id}
            >
              {#if lane.featuredNode}
                <article use:observeJourneyNode={lane.featuredNode} class="profile-progression-node profile-progression-node--active profile-progression-node--compact">
                  <p class="profile-progression-node__one-line">{laneMilestoneCopy(lane)}</p>
                  {#if lane.featuredNode.reward}<ProgressionRewardPreview reward={lane.featuredNode.reward} unlocked={isUnlocked(lane.featuredNode)} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={lane.featuredNode.id} track={lane.id} analyticsSurface={analyticsSurface} />{/if}
                </article>
              {:else}
                <p class="profile-progression-empty">{laneMilestoneCopy(lane)}</p>
              {/if}

              {#if lane.additionalActive.length}
                <div class="profile-progression-more">
                  <span>{lane.additionalActive.length} more {lane.id === 'discovery' ? 'discoveries' : 'active goals'}</span>
                  <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'active')} on:click={() => toggleSection(lane.id, 'active')}>{isSectionExpanded(expandedSections, lane.id, 'active') ? 'Hide more' : 'See more'}</button>
                </div>
                {#if isSectionExpanded(expandedSections, lane.id, 'active')}
                  <ol class="profile-progression-condensed-list profile-progression-condensed-list--active">
                    {#each lane.additionalActive as node (node.id)}
                      <li><ProgressionPathIcon track={lane.id} state="active" /><span><strong>{node.name || 'Active goal'}</strong><small>{node.description || 'Independent profile goal'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                    {/each}
                  </ol>
                {/if}
              {/if}

              {#if lane.completed.length}
                <div class="profile-progression-collapsed-row">
                  <span>{lane.completed.length} completed goal{lane.completed.length === 1 ? '' : 's'}</span>
                  <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'completed')} on:click={() => toggleSection(lane.id, 'completed')}>{isSectionExpanded(expandedSections, lane.id, 'completed') ? 'Hide completed' : 'View completed'}</button>
                </div>
                {#if isSectionExpanded(expandedSections, lane.id, 'completed')}
                  <ol class="profile-progression-condensed-list">
                    {#each lane.completed as node (node.id)}
                      <li><ProgressionPathIcon track={lane.id} state="complete" /><span><strong>{node.name || 'Completed goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>Complete</em></li>
                    {/each}
                  </ol>
                {/if}
              {/if}

              {#if lane.future.length}
                <div class="profile-progression-collapsed-row">
                  <span>{lane.future.length} coming later</span>
                  <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'future')} on:click={() => toggleSection(lane.id, 'future')}>{isSectionExpanded(expandedSections, lane.id, 'future') ? 'Hide later goals' : 'See later goals'}</button>
                </div>
                {#if isSectionExpanded(expandedSections, lane.id, 'future')}
                  <ol class="profile-progression-condensed-list">
                    {#each lane.future as node (node.id)}
                      <li><ProgressionPathIcon track={lane.id} state="future" /><span><strong>{node.name || 'Future goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                    {/each}
                  </ol>
                {/if}
              {/if}
            </div>
          {:else}
            <div class="profile-progression-lane__heading">
              <div class="profile-progression-lane__heading-copy">
                <div class="profile-progression-lane__title"><ProgressionPathIcon track={lane.id} state={lane.featuredNode?.presentationState || (lane.completed.length ? 'complete' : 'future')} /><span><span class="profile-progression-lane__kicker">{laneKicker(lane.id)}</span><h4 id={`profile-progression-lane-${lane.id}`}>{lane.label.replace(' / mastery', '')}</h4></span></div>
                <p>{lane.description}</p>
              </div>
              <span>{lane.completed.length} of {lane.nodes.length}</span>
            </div>

            {#if lane.featuredNode}
              <div class="profile-progression-active">
                <p class="profile-progression-subhead">{lane.id === 'discovery' ? 'Featured discovery' : 'Your next milestone'}</p>
                <article use:observeJourneyNode={lane.featuredNode} class="profile-progression-node profile-progression-node--active">
                    <div class="profile-progression-node__head">
                      <ProgressionPathIcon track={lane.id} state={lane.featuredNode.presentationState} />
                      <div><strong>{lane.featuredNode.name || 'Published goal'}</strong><small>{nodeStateLabel(lane.featuredNode)}</small></div>
                      <span class="profile-progression-node__progress">{lane.featuredNode.reward?.name || 'Expression reward'}</span>
                    </div>
                    <p>{lane.featuredNode.description || 'A server-published goal for your profile.'}{lane.id === 'discovery' ? ' You can find this in any order.' : ''}</p>
                    {#if nodeTarget(lane.featuredNode)}
                      <div class="profile-progression-node__bar" role="progressbar" aria-label={`${lane.featuredNode.name || 'Goal'} progression`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={nodePercent(lane.featuredNode)}><span style={`width:${nodePercent(lane.featuredNode)}%`}></span></div>
                    {/if}
                    <div class="profile-progression-node__meta">
                      <span>{nodeProgressLabel(lane.featuredNode)}</span>
                      {#if lane.featuredNode.reward}<ProgressionRewardPreview reward={lane.featuredNode.reward} unlocked={isUnlocked(lane.featuredNode)} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={lane.featuredNode.id} track={lane.id} analyticsSurface={analyticsSurface} />{/if}
                    </div>
                </article>
                {#if lane.additionalActive.length}
                  <div class="profile-progression-more">
                    <span>{lane.additionalActive.length} more {lane.id === 'discovery' ? 'discoveries' : 'active goals'}</span>
                    <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'active')} on:click={() => toggleSection(lane.id, 'active')}>{isSectionExpanded(expandedSections, lane.id, 'active') ? 'Hide more' : 'See more'}</button>
                  </div>
                  {#if isSectionExpanded(expandedSections, lane.id, 'active')}
                    <ol class="profile-progression-condensed-list profile-progression-condensed-list--active">
                      {#each lane.additionalActive as node (node.id)}
                        <li><ProgressionPathIcon track={lane.id} state="active" /><span><strong>{node.name || 'Active goal'}</strong><small>{node.description || 'Independent profile goal'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                      {/each}
                    </ol>
                  {/if}
                {/if}
              </div>
            {:else if lane.nodes.length}
              <p class="profile-progression-empty">All published goals in this lane are complete.</p>
            {:else if lane.id === 'rank'}
              <p class="profile-progression-empty">Rank is calculated from lifetime experience points and remains part of your profile record.</p>
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
                    <li><ProgressionPathIcon track={lane.id} state="complete" /><span><strong>{node.name || 'Completed goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>Complete</em></li>
                  {/each}
                </ol>
              {/if}
            {/if}

            {#if lane.future.length}
              <div class="profile-progression-collapsed-row">
                <span>{lane.future.length} coming later</span>
                <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'future')} on:click={() => toggleSection(lane.id, 'future')}>{isSectionExpanded(expandedSections, lane.id, 'future') ? 'Hide later goals' : 'See later goals'}</button>
              </div>
              {#if isSectionExpanded(expandedSections, lane.id, 'future')}
                <ol class="profile-progression-condensed-list">
                  {#each lane.future as node (node.id)}
                    <li><ProgressionPathIcon track={lane.id} state="future" /><span><strong>{node.name || 'Future goal'}</strong><small>{node.reward?.name || 'Expression reward'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                  {/each}
                </ol>
              {/if}
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
            <li><div><strong>{unlock.name || 'Milestone complete'}</strong><small>{unlock.reward?.name || 'Expression reward'}</small></div>{#if unlock.reward}<ProgressionRewardPreview reward={unlock.reward} unlocked={true} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={unlock.id} track={unlock.track} analyticsSurface={analyticsSurface} />{/if}</li>
          {/each}
        </ol>
        </section>
      {/if}
    {/if}

    {#if safeTimelineEvents.length || totalRolls === 0 || !pageMode}
      <div class="profile-progression-history">
        <div class="profile-progression-section-heading">
          <div><span class="profile-progression-label">History</span><h3>Recent rolls</h3></div>
          <span>{safeTimelineEvents.length ? `${safeTimelineEvents.length} recorded events` : 'No rolls yet'}</span>
        </div>
        {#if safeTimelineEvents.length}
          <ol>
            {#each timelineEvents.slice(0, 3) as event (event.id)}
              <li><span class="profile-progression-event-swatch" style={`--event-color:${event.payload?.hex || '#ffffff'}`} aria-hidden="true"></span><span><strong>{eventLabel(event)}</strong><small>{formatDate(event.occurredAt)}</small></span>{#if event.payload?.score}<em>{formatNumber(event.payload.score)} pts</em>{/if}</li>
            {/each}
          </ol>
        {:else}
          <p class="profile-progression-empty">Your first roll will start the record.</p>
        {/if}
      </div>
    {:else}
      <div class="profile-progression-history-note">
        <span class="profile-progression-label">History</span>
        <p>Your profile keeps the full roll history. Keep rolling to add to it.</p>
        {#if account.username}<a href={`/${account.username}`}>View your profile</a>{/if}
      </div>
    {/if}

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
  .profile-progression-rank__next-copy { display:flex; justify-content:space-between; flex-wrap:wrap; gap:.5rem 1rem; color:var(--color-ink-muted); font-size:var(--type-small); }
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

  .profile-progression-heading { align-items:flex-start; margin-bottom:1.35rem; }
  .profile-progression-heading h2 { max-width:34rem; }
  .profile-progression-heading__summary { align-self:flex-end; border-left-color:var(--color-line-strong); }
  .profile-progression-direction { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(10rem,.8fr) auto; align-items:center; gap:1rem; margin-bottom:1rem; padding:1rem 1.1rem; }
  .profile-progression-direction__copy, .profile-progression-direction__reward { display:grid; gap:.25rem; min-width:0; }
  .profile-progression-label--with-chip { display:inline-flex; align-items:center; gap:.45rem; }
  .profile-progression-color-chip { display:inline-block; flex:0 0 .72rem; width:.72rem; height:.72rem; border:1px solid rgba(241,243,237,.55); border-radius:50%; background:var(--data-color); box-shadow:0 0 0 .18rem rgba(255,255,255,.06); }
  .profile-progression-direction__copy h3 { margin:.25rem 0 0; color:var(--color-ink-strong); font:650 1.35rem/1.05 var(--font-display-stack); letter-spacing:-.025em; }
  .profile-progression-direction__copy p { max-width:34rem; margin:.25rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .profile-progression-direction__progress { color:var(--color-ink-strong); font:650 .7rem/1.2 var(--font-mono-stack); }
  .profile-progression-direction__reward { padding-left:1rem; border-left:1px solid var(--color-line-subtle); }
  .profile-progression-direction__reward span, .profile-progression-direction__reward small { color:var(--color-ink-muted); font-size:.68rem; }
  .profile-progression-direction__reward strong { overflow-wrap:anywhere; color:var(--color-ink-strong); font-size:var(--type-small); }
  .profile-progression-direction .site-button { justify-content:center; white-space:nowrap; }
  .profile-progression-rank { grid-template-columns:minmax(18rem,1.1fr) minmax(18rem,1fr); min-height:10rem; }
  .profile-progression-rank__identity { gap:1rem; }
  .profile-progression-rank__badge { position:relative; display:grid; place-items:center; flex:0 0 5.6rem; width:5.6rem; height:5.6rem; }
  .profile-progression-rank__ring { position:absolute; inset:0; width:100%; height:100%; overflow:visible; transform:rotate(-90deg); }
  .profile-progression-rank__ring circle { fill:none; stroke-width:2.5; }
  .profile-progression-rank__ring-track { stroke:var(--color-line-subtle); }
  .profile-progression-rank__ring-value { stroke:var(--progression-accent,var(--color-ink-strong)); stroke-linecap:round; transition:stroke-dashoffset .45s ease; }
  .profile-progression-rank__mark { position:relative; z-index:1; flex-basis:auto; width:3.35rem; height:3.35rem; border-color:var(--progression-accent,var(--color-state-active)); background:var(--surface-inset); font-size:1.5rem; }
  .profile-progression-rank__identity > div { gap:.15rem; }
  .profile-progression-rank__ep { color:var(--progression-accent,var(--color-ink-strong)); font:700 clamp(1.7rem,3vw,2.8rem)/.95 var(--font-mono-stack); font-variant-numeric:tabular-nums; letter-spacing:-.055em; }
  .profile-progression-rank__identity small { font-size:.72rem; }
  .profile-progression-rank__next { gap:.65rem; }
  .profile-progression-rank__next-copy strong { font-size:1rem; }
  .profile-progression-bar span, .profile-progression-node__bar span { background:var(--color-ink-strong); }
  .profile-progression-stats { margin-top:.8rem; }
  .profile-progression-stats > div { padding:.8rem .85rem; }
  .profile-progression-stats strong { font-size:1rem; }
  .profile-progression-weekly { margin-top:1rem; }
  .profile-progression-section-heading { align-items:flex-start; }
  .profile-progression-section-heading__copy { max-width:34rem; margin:.45rem 0 0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .profile-progression-lanes { gap:.8rem; }
  .profile-progression-lane { gap:.65rem; padding:.9rem; }
  .profile-progression-lane__heading-copy { min-width:0; }
  .profile-progression-lane__title { display:flex; align-items:center; gap:.55rem; }
  .profile-progression-lane__title h4 { margin:.2rem 0 0; font-size:1.3rem; }
  .profile-progression-lane__heading p { margin:.35rem 0 0; }
  .profile-progression-lane__kicker { color:var(--color-ink-muted); font:700 .62rem/1.1 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; }
  .profile-progression-lane__heading > span { padding-top:.2rem; }
  .profile-progression-subhead { color:var(--color-ink-muted)!important; }
  .profile-progression-node--active { border-color:var(--color-state-active); box-shadow:var(--shadow-state-card); }
  .profile-progression-node__head { grid-template-columns:auto minmax(0,1fr) minmax(5rem,.7fr); }
  .profile-progression-node__head > div { min-width:0; }
  .profile-progression-node__head strong { overflow-wrap:anywhere; white-space:normal; }
  .profile-progression-node__head small { overflow-wrap:anywhere; white-space:normal; }
  .profile-progression-node__progress { overflow-wrap:anywhere; color:var(--color-ink-strong); font-size:.68rem; line-height:1.25; white-space:normal; }
  .profile-progression-node__bar { background:var(--color-line-strong); }
  .profile-progression-node__meta { grid-template-columns:minmax(0,1fr); gap:.6rem; }
  .profile-progression-node__meta > span { padding-top:.2rem; color:var(--color-ink-strong); }
  .profile-progression-more { display:flex; align-items:center; justify-content:space-between; gap:.5rem; color:var(--color-ink-muted); font-size:.7rem; }
  .profile-progression-more button { min-height:2.5rem; padding:.35rem .5rem; border:0; background:transparent; color:var(--color-ink-strong); font:650 .7rem var(--font-body-stack); text-decoration:underline; text-underline-offset:.2em; cursor:pointer; }
  .profile-progression-more button:focus-visible { outline:2px solid var(--color-state-active); outline-offset:2px; }
  .profile-progression-condensed-list--active { border-top:1px solid var(--color-line-subtle); padding-top:.25rem; }
  .profile-progression-history-note { display:grid; gap:.3rem; margin-top:1rem; padding-top:1rem; border-top:1px solid var(--color-line-subtle); }
  .profile-progression-history-note p { margin:0; color:var(--color-ink-muted); font-size:var(--type-small); line-height:1.45; }
  .profile-progression-history-note a { color:var(--color-ink-strong); font-size:var(--type-small); font-weight:650; text-underline-offset:.2em; }
  .profile-progression-direction,
  .profile-progression-rank,
  .profile-progression-weekly,
  .profile-progression-lane,
  .profile-progression-node,
  .profile-progression-unlocks li,
  .profile-progression-history li {
    border-color:var(--color-state-active);
    border-radius:1.1rem;
    background:rgba(255,255,255,.035);
    box-shadow:var(--shadow-card-glass);
    backdrop-filter:blur(var(--blur-panel));
  }
  .profile-progression-rank { box-shadow:var(--shadow-state-card), var(--shadow-card-glass); }
  .profile-progression-lane,
  .profile-progression-unlocks li,
  .profile-progression-history li { border-color:var(--color-line-subtle); }
  .profile-progression-stats > div { border-color:var(--color-line-subtle); border-radius:var(--radius-md); background:rgba(255,255,255,.018); }
  .profile-progression-node { border-color:var(--color-line-subtle); border-radius:var(--radius-md); box-shadow:none; background:rgba(255,255,255,.025); }
  .profile-progression-node--active { border-color:var(--color-state-active); box-shadow:var(--shadow-state-card); }
  .profile-progression-direction .site-button {
    border:1px solid var(--color-state-active);
    background:linear-gradient(135deg,var(--color-ink-strong),#fff);
    color:var(--color-canvas-deep);
    box-shadow:0 0 0 .2rem var(--color-state-active-soft),0 .75rem 1.75rem rgba(0,0,0,.28);
    transition:box-shadow var(--motion-fast),opacity var(--motion-fast),background var(--motion-fast);
  }
  .profile-progression-direction .site-button:hover,
  .profile-progression-direction .site-button:focus-visible { background:linear-gradient(135deg,#fff,var(--color-ink-strong)); box-shadow:0 0 0 .3rem rgba(255,255,255,.1),0 .9rem 2rem rgba(0,0,0,.34); }
  @media (max-width:800px) {
    .profile-progression-rank { grid-template-columns:1fr; }
    .profile-progression-direction { grid-template-columns:1fr auto; }
    .profile-progression-direction__reward { grid-column:1 / -1; padding:0; border:0; border-top:1px solid var(--color-line-subtle); padding-top:.7rem; }
  }
  @media (max-width:520px) {
    .profile-progression-direction { grid-template-columns:1fr; gap:.8rem; }
    .profile-progression-direction .site-button { width:100%; }
    .profile-progression-direction__reward { grid-column:auto; }
    .profile-progression-node__head { grid-template-columns:auto minmax(0,1fr); }
    .profile-progression-node__progress { grid-column:2; }
  }
  @media (prefers-reduced-motion:reduce) {
    .profile-progression-rank__ring-value,
    .profile-progression-direction .site-button { transition:none; }
  }

  :global {
  .profile-progression-surface--page { padding:2rem!important; border-radius:24px; background:var(--surface,#161619); box-shadow:var(--shadow-card-glass); }
  .profile-progression-rank--page { grid-template-columns:1fr; }
  .profile-progression-rank--page .profile-progression-rank__ep { font:500 clamp(1.9rem,4vw,2.15rem)/1 var(--font-display-stack); font-variant-numeric:tabular-nums; }
  .profile-progression-page-mode .profile-progression-stats { grid-template-columns:repeat(auto-fit,minmax(7rem,1fr)); gap:1.2rem; }
  .profile-progression-page-mode .profile-progression-stats strong { font:500 1.5rem/1 var(--font-display-stack); }
  .profile-progression-page-mode .profile-progression-stats small { display:none; }
  .profile-progression-weekly__inline { display:flex; align-items:center; width:100%; gap:.45rem; white-space:nowrap; }
  .profile-progression-weekly__copy { min-width:0; overflow:hidden; text-overflow:ellipsis; }
  .profile-progression-weekly__bonus { margin-left:auto; }
  .profile-progression-weekly--page .profile-progression-weekly__swatch { width:1.2rem; height:1.2rem; }
  .profile-progression-page-mode .profile-progression-lanes { grid-template-columns:1fr; gap:.55rem; }
  .profile-progression-lane--accordion { gap:0; padding:.35rem .75rem; }
  .profile-progression-lane--accordion .profile-progression-lane__heading { display:none; }
  .profile-progression-lane__toggle { display:grid; grid-template-columns:auto minmax(7rem,1fr) auto; align-items:center; gap:.7rem; width:100%; min-height:3.5rem; padding:.45rem 0; border:0; background:transparent; color:var(--color-ink-strong); text-align:left; cursor:pointer; }
  .profile-progression-lane__toggle:focus-visible { outline:2px solid var(--color-state-active); }
  .profile-progression-lane__toggle-progress { display:grid; grid-template-columns:auto minmax(4rem,1fr); align-items:center; gap:.6rem; color:var(--color-ink-muted); font:600 .68rem var(--font-mono-stack); }
  .profile-progression-lane__toggle-bar { height:.2rem; }
  .profile-progression-lane__chevron { width:1rem; height:1rem; fill:none; stroke:var(--color-ink-muted); stroke-width:1.8; stroke-linecap:round; transition:transform var(--motion-fast) var(--motion-ease-standard); }
  .profile-progression-lane__chevron--open { transform:rotate(180deg); }
  .profile-progression-lane__details { display:grid; gap:.7rem; max-height:0; overflow:hidden; opacity:0; transition:max-height var(--motion-base) var(--motion-ease-standard),opacity var(--motion-fast) var(--motion-ease-standard); }
  .profile-progression-lane__details--expanded { max-height:48rem; margin-bottom:.65rem; opacity:1; }
  .profile-progression-node.profile-progression-node--compact>p { margin:0; color:var(--color-ink-strong); font-size:.78rem; line-height:1.35; }
  @media (max-width:520px) {
    .profile-progression-lane__toggle { grid-template-columns:auto minmax(0,1fr) auto; gap:.45rem; min-height:3.4rem; }
    .profile-progression-lane__toggle-progress { grid-column:2; }
    .profile-progression-lane__chevron { grid-column:3; grid-row:1; }
  }
  @media (prefers-reduced-motion:reduce) { .profile-progression-lane__details,.profile-progression-lane__chevron { transition:none; } }
  }
</style>
