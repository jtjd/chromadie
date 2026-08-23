<script>
  import { SvelteSet } from 'svelte/reactivity';
  import ProgressionPathIcon from './ProgressionPathIcon.svelte';
  import ProgressionRankBadge from './ProgressionRankBadge.svelte';
  import ProgressionRewardPreview from './ProgressionRewardPreview.svelte';
  import { trackProductEvent } from './productAnalytics.js';

  export let journeyEnabled = true;
  /** @type {any} */
  export let weeklyFocus = null;
  export let laneModels = [];
  export let journeyGoalComplete = 0;
  export let journeyGoalTotal = 0;
  export let earnedCosmeticCount = 0;
  export let lifetimeEp = 0;
  export let rankState = { current: null, next: null, progress: 0 };
  export let progressPercent = 0;
  export let totalRolls = 0;
  export let longestStreak = 0;
  export let recentUnlocks = [];
  export let previewIdentity = 'You';
  export let previewColor = '#FFFFFF';
  export let previewAvatar = '';
  export let analyticsSurface = 'progression';
  export let dailyColor = '';
  /** @type {any} */
  export let dailyRollData = null;
  export let dailyRollHex = '';
  export let hasRolledToday = false;
  export let dailyRollError = '';
  export let dailyRollLoaded = false;
  export let rollSignals = [];
  /** @type {any} */
  export let focusGoal = null;

  let expandedSections = new SvelteSet();
  let expandedLane = '';
  const seenGoals = new SvelteSet();

  function formatNumber(value) {
    return Number(value || 0).toLocaleString();
  }

  function formatCompactNumber(value) {
    const numeric = Math.max(0, Number(value) || 0);
    if (numeric >= 1000000) return `${(Math.floor(numeric / 100000) / 10).toFixed(1).replace(/\.0$/, '')}M`;
    if (numeric >= 1000) return `${Math.floor(numeric / 1000)}K`;
    return Math.round(numeric).toLocaleString();
  }

  function focusProgressLabel(node) {
    if (!node) return 'Roll today';
    const current = Number(node?.progress?.current);
    const target = Number(node?.progress?.target ?? node?.progressTarget ?? node?.threshold);
    if (Number.isFinite(current) && Number.isFinite(target) && target > 0) {
      const rawUnit = node?.progress?.unit || (node?.track === 'rank' ? 'points' : 'rolls');
      const unit = String(rawUnit).toLowerCase() === 'ep' ? 'points' : rawUnit;
      return `${formatNumber(current)} / ${formatNumber(target)} ${unit}`;
    }
    if (node?.track === 'discovery') return 'Discover a rare color';
    return 'Keep rolling';
  }

  function isUnlocked(node) {
    return node?.unlocked === true || Boolean(node?.unlockedAt || node?.unlocked_at);
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

  function goalPaceLabel(node) {
    const expectedRolls = Number(node?.expectedRolls ?? node?.expected_rolls);
    if (Number.isFinite(expectedRolls) && expectedRolls > 0 && expectedRolls <= 90) return `Often within ${formatNumber(expectedRolls)} rolls`;
    const pace = String(node?.paceBand || node?.pace_band || '').toLowerCase();
    if (pace === 'days') return 'A few days of rolling';
    if (pace === 'weeks') return 'A few weeks of rolling';
    if (pace === 'months') return 'A longer-term goal';
    if (pace === 'years' || pace === 'lifetime') return 'A rare, long-term find';
    return node?.metric === 'achievement' ? 'Find it whenever it appears' : 'Coming later';
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

  function laneAccent(track) {
    if (track === 'rank') return '#FFD21C';
    if (track === 'ritual') return '#FF5C68';
    return '#22D7F3';
  }

  function laneFill(track) {
    if (track === 'rank') return 'linear-gradient(90deg,#D99F00 0%,#FFD21C 68%,#FFF09A 100%)';
    if (track === 'ritual') return 'linear-gradient(90deg,#EF3439 0%,#FF654D 56%,#FFAA56 100%)';
    return 'linear-gradient(90deg,#09B9D1 0%,#20D7E5 60%,#8AF4FF 100%)';
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

  function toggleSection(track, section) {
    const key = `${track}:${section}`;
    const next = new SvelteSet(expandedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    expandedSections = next;
  }

  function isSectionExpanded(sectionSet, track, section) {
    return sectionSet.has(`${track}:${section}`);
  }

  function toggleLane(track) {
    expandedLane = expandedLane === track ? '' : track;
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

<section class="profile-progression-page-mode profile-progression-page-layout" aria-labelledby="profile-progression-title">
  <div class="profile-progression-page-grid">
    <div class="profile-progression-page-main">
      <div class="progression-page__roll-column">
        <section class="progression-page__roll-card progression-page__rail-details progression-page__rail-detail" aria-labelledby="progression-today-roll-title">
          <div class="progression-page__roll-swatch" class:progression-page__roll-swatch--empty={!dailyColor} style={dailyColor ? `--data-color:${dailyColor}` : undefined} aria-label={dailyColor ? `Today's rolled color ${dailyColor}` : undefined}></div>
          <div class="progression-page__roll-copy">
            <span class="progression-page__detail-label">Today's roll</span>
            {#if hasRolledToday}
              <h2 id="progression-today-roll-title">{dailyRollData?.identity || 'Color recorded'}</h2>
              <div class="progression-page__roll-meta">
                <code>{dailyRollHex || dailyColor || 'Color recorded'}</code>
                {#if dailyRollData?.score !== undefined}<strong><svg class="progression-page__score-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.75 5.65 6.25.9-4.5 4.4 1.06 6.2L12 17.2l-5.56 2.95 1.06-6.2L3 9.55l6.25-.9L12 3Z" /></svg>{formatNumber(dailyRollData.score)} pts</strong>{/if}
              </div>
              <small>{dailyRollData?.rarity || 'Recorded roll'}</small>
              <a class="progression-page__detail-link" href="/roll">View full roll</a>
            {:else if dailyRollLoaded && dailyRollError}
              <h2 id="progression-today-roll-title">Roll status unavailable</h2>
              <small>Refresh before starting another roll.</small>
            {:else if dailyRollLoaded}
              <h2 id="progression-today-roll-title">Ready to roll</h2>
              <small>{focusGoal ? `${focusGoal.name} · ${focusProgressLabel(focusGoal)}` : 'No color recorded for today.'}</small>
              <a class="site-button" href="/roll">{focusGoal?.track === 'discovery' ? 'Roll and explore' : 'Roll today'}</a>
            {:else}
              <h2 id="progression-today-roll-title">Checking today</h2>
              <small>Reading your server record.</small>
            {/if}
          </div>
        </section>

        {#if hasRolledToday && rollSignals.length}
          <section class="progression-page__rail-detail progression-page__rail-detail--signals" aria-labelledby="progression-roll-signals-title">
            <span class="progression-page__detail-label">Scoring signals</span>
            <div id="progression-roll-signals-title" class="progression-page__signal-list" aria-label="Server-reported scoring signals">
              {#each rollSignals as signal (signal.id)}
                <span><span aria-hidden="true">{signal.symbol}</span> {signal.label}{#if signal.points} <small>+{formatNumber(signal.points)}</small>{/if}</span>
              {/each}
            </div>
          </section>
        {/if}
      </div>

      {#if journeyEnabled}
        {#if weeklyFocus}
          <section class="profile-progression-weekly profile-progression-weekly--page" aria-labelledby="profile-progression-weekly-title">
            <div class="profile-progression-weekly__page-copy">
              <span class="profile-progression-label">Weekly Goal</span>
              <h2 id="profile-progression-weekly-title">Match this week’s color</h2>
              <p>{weeklyFocus.completed ? 'Matched this week’s color.' : 'Match this week’s color once to earn the bonus.'}</p>
            </div>
            <div class="profile-progression-weekly__page-target">
              <span class="profile-progression-weekly__swatch" style={`--weekly-color:${weeklyFocus.targetHex || '#ffffff'}`} aria-label={`Weekly color ${weeklyFocus.targetHex || 'not available'}`}></span>
              <div class="profile-progression-weekly__page-target-copy">
                <strong>{weeklyFocus.targetHex || 'Color pending'}</strong>
                <span>{weeklyFocus.completed ? 'Matched · 1 / 1' : 'Not matched · 0 / 1'}</span>
              </div>
              <em>{weeklyFocus.completed ? 'Bonus earned' : `+${formatCompactNumber(weeklyFocus.bonusEp)} pts`}</em>
            </div>
          </section>
        {/if}

        <section class="profile-progression-journey profile-progression-journey--page" aria-labelledby="profile-progression-journey-title">
          <div class="profile-progression-section-heading profile-progression-section-heading--page">
            <span class="profile-progression-label">Your Paths</span>
            <span>{formatNumber(journeyGoalComplete)} of {formatNumber(journeyGoalTotal)} complete</span>
          </div>

          <div class="profile-progression-lanes profile-progression-lanes--page">
            {#each laneModels as lane (lane.id)}
              <section class="profile-progression-lane profile-progression-lane--accordion profile-progression-lane--page" style={`--progression-lane-accent:${laneAccent(lane.id)};--progression-lane-fill:${laneFill(lane.id)}`} aria-labelledby={`profile-progression-lane-${lane.id}`}>
                <button
                  type="button"
                  class="profile-progression-lane__toggle"
                  aria-expanded={expandedLane === lane.id}
                  aria-controls={`profile-progression-lane-${lane.id}-details`}
                  onclick={() => toggleLane(lane.id)}
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
                      {#if lane.featuredNode.reward}<ProgressionRewardPreview reward={lane.featuredNode.reward} unlocked={isUnlocked(lane.featuredNode)} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={lane.featuredNode.id} track={lane.id} analyticsSurface={analyticsSurface} presentation="wide" flat={true} />{/if}
                    </article>
                  {:else}
                    <p class="profile-progression-empty">{laneMilestoneCopy(lane)}</p>
                  {/if}

                  {#if lane.additionalActive.length}
                    <div class="profile-progression-more">
                      <span>{lane.additionalActive.length} more {lane.id === 'discovery' ? 'discoveries' : 'active goals'}</span>
                      <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'active')} onclick={() => toggleSection(lane.id, 'active')}>{isSectionExpanded(expandedSections, lane.id, 'active') ? 'Hide more' : 'See more'}</button>
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
                      <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'completed')} onclick={() => toggleSection(lane.id, 'completed')}>{isSectionExpanded(expandedSections, lane.id, 'completed') ? 'Hide completed' : 'View completed'}</button>
                    </div>
                    {#if isSectionExpanded(expandedSections, lane.id, 'completed')}
                      <ol class="profile-progression-condensed-list">
                        {#each lane.completed as node (node.id)}
                          <li><ProgressionPathIcon track={lane.id} state="complete" /><span><strong>{node.name || 'Completed goal'}</strong><small>{node.reward?.name || 'Cosmetic reward'}</small></span><em>Complete</em></li>
                        {/each}
                      </ol>
                    {/if}
                  {/if}

                  {#if lane.future.length}
                    <div class="profile-progression-collapsed-row">
                      <span>{lane.future.length} coming later</span>
                      <button type="button" aria-expanded={isSectionExpanded(expandedSections, lane.id, 'future')} onclick={() => toggleSection(lane.id, 'future')}>{isSectionExpanded(expandedSections, lane.id, 'future') ? 'Hide later goals' : 'See later goals'}</button>
                    </div>
                    {#if isSectionExpanded(expandedSections, lane.id, 'future')}
                      <ol class="profile-progression-condensed-list">
                        {#each lane.future as node (node.id)}
                          <li><ProgressionPathIcon track={lane.id} state="future" /><span><strong>{node.name || 'Future goal'}</strong><small>{node.reward?.name || 'Cosmetic reward'}</small></span><em>{nodeProgressLabel(node)}</em></li>
                        {/each}
                      </ol>
                    {/if}
                  {/if}
                </div>
              </section>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <aside class="profile-progression-page-side">
      <section class="profile-progression-rank profile-progression-rank--page" style={`--progression-rank-accent:${rankState.current?.color || '#FFD21C'}`} aria-labelledby="profile-progression-rank-title">
        <div class="profile-progression-rank__page-heading">
          <span id="profile-progression-rank-title" class="profile-progression-rank__badge-label">{rankState.current?.name || 'Unranked'} rank</span>
          <div class="profile-progression-rank__badge-mark"><ProgressionRankBadge rankName={rankState.current?.name || 'Unranked'} /></div>
        </div>
        <div class="profile-progression-rank__page-value"><strong>{formatCompactNumber(lifetimeEp)}</strong><span>XP</span></div>
        {#if rankState.next}
          <div class="profile-progression-rank__page-bar profile-progression-bar" role="progressbar" aria-label={`${progressPercent}% toward ${rankState.next.name}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={progressPercent}><span style={`width:${progressPercent}%`}></span></div>
          <div class="profile-progression-rank__page-next"><span>{formatNumber(Math.max(0, rankState.next.min - lifetimeEp))} XP to <strong style={`--progression-target-rank-color:${rankState.next.color || '#FFD21C'}`}>{rankState.next.name}</strong></span></div>
        {:else}
          <div class="profile-progression-rank__page-bar profile-progression-bar" role="progressbar" aria-label="Highest rank reached" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><span style="width:100%"></span></div>
          <div class="profile-progression-rank__page-next"><span>Highest rank reached</span></div>
        {/if}
      </section>

      <div class="profile-progression-stats profile-progression-stats--page" aria-label="Progression summary">
        <div class="profile-progression-stat profile-progression-stat--rolls">
          <svg class="profile-progression-stat__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="rotate(-18 8.2 8.2)"><rect x="3.25" y="3.25" width="9.8" height="9.8" rx="2.2" fill="currentColor" stroke="none" /><circle cx="6.15" cy="6.15" r=".95" fill="#111115" stroke="none" /><circle cx="10.15" cy="10.15" r=".95" fill="#111115" stroke="none" /></g><g transform="rotate(18 16.1 16.1)"><rect x="11.35" y="11.35" width="9.5" height="9.5" rx="2.15" fill="currentColor" stroke="none" /><circle cx="14.15" cy="14.15" r=".95" fill="#111115" stroke="none" /><circle cx="18.05" cy="14.15" r=".95" fill="#111115" stroke="none" /><circle cx="16.1" cy="16.1" r=".95" fill="#111115" stroke="none" /><circle cx="14.15" cy="18.05" r=".95" fill="#111115" stroke="none" /><circle cx="18.05" cy="18.05" r=".95" fill="#111115" stroke="none" /></g></svg>
          <strong title={`${formatNumber(totalRolls)} rolls`}>{formatCompactNumber(totalRolls)}</strong>
          <span>Rolls</span>
        </div>
        <div class="profile-progression-stat profile-progression-stat--streak">
          <svg class="profile-progression-stat__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5.5" width="16" height="14" rx="1.6" fill="currentColor" stroke="none" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h3M13 13h3M8 16.5h3" stroke="#111115" stroke-width="1.4" /></svg>
          <strong title={`${formatNumber(longestStreak)} days`}>{formatCompactNumber(longestStreak)}d</strong>
          <span>Longest streak</span>
        </div>
        <div class="profile-progression-stat profile-progression-stat--goals">
          <svg class="profile-progression-stat__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /></svg>
          <strong title={`${formatNumber(journeyGoalComplete)} of ${formatNumber(journeyGoalTotal)} goals complete`}>{journeyGoalTotal ? `${formatCompactNumber(journeyGoalComplete)}/${formatCompactNumber(journeyGoalTotal)}` : formatCompactNumber(journeyGoalComplete)}</strong>
          <span>Goals</span>
        </div>
        <div class="profile-progression-stat profile-progression-stat--unlocks">
          <svg class="profile-progression-stat__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 10V7.5a4 4 0 0 1 7.6-1.8" /><rect x="5" y="10" width="14" height="10" rx="1.5" fill="currentColor" stroke="none" /><path d="M12 14v2.5" stroke="#111115" stroke-width="1.8" /></svg>
          <strong title={`${formatNumber(earnedCosmeticCount)} cosmetics earned`}>{formatCompactNumber(earnedCosmeticCount)}</strong>
          <span>Unlocks</span>
        </div>
      </div>

      {#if recentUnlocks.length}
        <section class="profile-progression-unlocks profile-progression-unlocks--page" aria-labelledby="profile-progression-unlocks-title">
          <div class="profile-progression-section-heading">
            <div><span class="profile-progression-label">Recent unlocks</span><h2 id="profile-progression-unlocks-title">Cosmetics added to your record</h2></div>
          </div>
          <ol>
            {#each recentUnlocks.slice(0, 3) as unlock (unlock.id)}
              <li>
                {#if unlock.reward}
                  <ProgressionRewardPreview reward={unlock.reward} unlocked={true} username={previewIdentity} displayColor={previewColor} avatarSrc={previewAvatar} milestoneId={unlock.id} track={unlock.track} analyticsSurface={analyticsSurface} presentation="wide" flat={true} />
                {:else}
                  <div><strong>{unlock.name || 'Milestone complete'}</strong><small>Unlocked</small></div>
                {/if}
                <span class="profile-progression-unlock-check" aria-label="Unlocked"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9" /><path d="m8 12.2 2.6 2.6 5.4-5.5" /></svg></span>
              </li>
            {/each}
          </ol>
        </section>
      {/if}
    </aside>
  </div>

</section>

<style>
  :global {
    .progression-page__roll-column { display:grid; gap:1rem; min-width:0; }
    .progression-page__roll-card { display:grid; grid-template-columns:5.75rem minmax(0,1fr); align-items:center; gap:1.35rem; min-width:0; min-height:8.65rem; box-sizing:border-box; padding:1.35rem 1.45rem; border:1px solid var(--progression-line); border-radius:.95rem; background:rgba(255,255,255,.025); }
    .progression-page__roll-swatch { width:5.75rem; height:5.75rem; border:1px solid rgba(255,255,255,.62); border-radius:.7rem; background:var(--data-color); box-shadow:0 0 2rem color-mix(in srgb,var(--data-color) 26%,transparent); }
    .progression-page__roll-swatch--empty { border-color:var(--progression-line); background:var(--surface, #161619); box-shadow:none; }
    .progression-page__roll-copy { display:grid; align-content:center; justify-items:start; gap:.35rem; min-width:0; }
    .progression-page__detail-label { color:#AAB1FF; font:700 .72rem/1 var(--font-mono-stack); letter-spacing:.13em; text-transform:uppercase; }
    .progression-page__roll-copy h2 { max-width:100%; margin:0; color:var(--progression-page-strong,#F7F7FA); font:700 clamp(1.65rem,2.7vw,2rem)/1.02 var(--font-display-stack, sans-serif); letter-spacing:-.04em; overflow-wrap:anywhere; }
    .profile-progression-page-mode .progression-page__roll-copy > small,
    .profile-progression-page-mode .progression-page__detail-link,
    .profile-progression-page-mode .progression-page__rail-detail--signals { display:none; }
    .progression-page__roll-copy small { color:var(--progression-page-muted,#B3B4BF); font-size:.76rem; }
    .progression-page__roll-meta { display:flex; align-items:center; flex-wrap:wrap; gap:.55rem; }
    .progression-page__roll-meta code { padding:.27rem .5rem; border:1px solid var(--progression-page-line,#30313B); border-radius:.3rem; color:var(--progression-page-muted,#B3B4BF); font:600 .75rem var(--font-mono-stack); }
    .progression-page__roll-meta strong { display:inline-flex; align-items:center; gap:.28rem; color:#ffd21c; font:700 .84rem var(--font-mono-stack); text-transform:uppercase; }
    .progression-page__score-icon { width:1rem; height:1rem; fill:#ffd21c; stroke:#ffd21c; stroke-linejoin:round; stroke-width:.5; }
    .progression-page__roll-copy .site-button { margin-top:.35rem; }
    .progression-page__detail-link { color:var(--progression-text); font-size:.72rem; font-weight:650; text-underline-offset:.2em; }
    .progression-page__rail-detail--signals { display:grid; gap:.45rem; padding-top:.9rem; }
    .progression-page__signal-list { display:flex; flex-wrap:wrap; gap:.35rem .6rem; color:var(--progression-text); font-size:.7rem; line-height:1.35; }
    .progression-page__signal-list small { color:var(--progression-muted); font-size:.64rem; }

    .profile-progression-page-mode { --progression-page-line:#30313B; --progression-page-panel:#111115; --progression-page-strong:#F7F7FA; --progression-page-muted:#B3B4BF; --progression-page-faint:#8D8F9D; --progression-rank-accent:#FFD21C; --progression-ritual-accent:#FF5C68; --progression-discovery-accent:#22D7F3; --progression-page-success:#20DFA5; padding:0; background:transparent; }
    .profile-progression-page-grid { display:grid; grid-template-columns:minmax(0,2.05fr) minmax(18rem,1fr); gap:1.4rem; }
    .profile-progression-page-main, .profile-progression-page-side { min-width:0; }
    .profile-progression-page-side { padding-left:1.4rem; }
    .profile-progression-page-mode .profile-progression-rank--page { display:grid; grid-template-columns:1fr; gap:.7rem; min-height:0; margin:0; padding:1.35rem 1.25rem 1.25rem; border:1px solid var(--progression-page-line); border-radius:.9rem; background:var(--progression-page-panel); box-shadow:none; }
    .profile-progression-rank__page-heading { position:relative; display:grid; align-items:center; min-height:4.2rem; }
    .profile-progression-rank__badge-label { display:inline-flex; justify-self:center; width:max-content; max-width:100%; padding:.43rem .78rem; border:1px solid color-mix(in srgb,var(--progression-rank-accent) 78%,#fff); border-radius:.55rem; background:color-mix(in srgb,var(--progression-rank-accent) 14%,transparent); color:color-mix(in srgb,var(--progression-rank-accent) 64%,#fff); font:700 .72rem/1 var(--font-mono-stack); letter-spacing:.1em; text-transform:uppercase; text-shadow:0 0 .65rem color-mix(in srgb,var(--progression-rank-accent) 38%,transparent); }
    .profile-progression-rank__page-value { display:flex; align-items:baseline; justify-content:center; gap:.35rem; }
    .profile-progression-rank__page-value strong { color:var(--progression-page-strong); font:700 clamp(2.4rem,5vw,3.15rem)/.95 var(--font-display-stack); letter-spacing:-.06em; }
    .profile-progression-rank__page-value span { color:var(--progression-page-muted); font:600 1.05rem var(--font-mono-stack); }
    .profile-progression-page-mode .profile-progression-rank--page { position:relative; overflow:hidden; min-height:11.8rem; }
    .profile-progression-rank__badge-mark { position:absolute; top:50%; right:.05rem; display:grid; place-items:center; width:4.2rem; height:4.2rem; transform:translateY(-50%); z-index:2; }
    .profile-progression-page-mode .profile-progression-rank--page > * { position:relative; z-index:1; }
    .profile-progression-rank__page-bar { height:.35rem; overflow:hidden; border-radius:999px; background:#08080a; }
    .profile-progression-rank__page-bar span { display:block; height:100%; border-radius:inherit; background:linear-gradient(90deg,color-mix(in srgb,var(--progression-rank-accent) 65%,#000) 0%,var(--progression-rank-accent) 68%,color-mix(in srgb,var(--progression-rank-accent) 35%,#fff) 100%); box-shadow:0 0 .7rem color-mix(in srgb,var(--progression-rank-accent) 42%,transparent); }
    .profile-progression-rank__page-next { display:flex; justify-content:center; color:var(--progression-page-muted); font:600 .75rem var(--font-mono-stack); letter-spacing:.03em; }
    .profile-progression-rank__page-next strong { color:color-mix(in srgb,var(--progression-target-rank-color,var(--progression-rank-accent)) 68%,#fff); font-weight:800; }
    .profile-progression-page-mode .profile-progression-stats--page { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; margin:1.35rem 0 0; }
    .profile-progression-page-mode .profile-progression-stats--page > div { display:grid; grid-template-rows:auto auto auto; gap:.42rem; min-height:6.35rem; align-items:center; justify-items:center; padding:.9rem; border:1px solid var(--progression-page-line); border-radius:.8rem; background:var(--progression-page-panel); text-align:center; }
    .profile-progression-page-mode .profile-progression-stats--page strong { order:1; color:var(--progression-page-strong); font:700 1.7rem/1 var(--font-display-stack); font-variant-numeric:tabular-nums; }
    .profile-progression-page-mode .profile-progression-stats--page > div > span { order:2; color:var(--progression-page-muted); font:600 .72rem/1.1 var(--font-mono-stack); letter-spacing:.08em; text-transform:uppercase; }
    .profile-progression-stat__icon { order:0; width:1.8rem; height:1.8rem; fill:none; stroke:currentColor; stroke-linecap:round; stroke-linejoin:round; stroke-width:1.8; }
    .profile-progression-stat--rolls .profile-progression-stat__icon { color:#B774F5; }
    .profile-progression-stat--streak .profile-progression-stat__icon { color:#62A8FF; }
    .profile-progression-stat--goals .profile-progression-stat__icon { color:#20DFA5; }
    .profile-progression-stat--unlocks .profile-progression-stat__icon { color:#F16FB3; }
    .profile-progression-weekly--page { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:.85rem 1rem; min-height:9.05rem; box-sizing:border-box; margin-top:1.35rem; padding:1.2rem 1.4rem; border:1px solid var(--progression-page-line); border-radius:.9rem; background:var(--progression-page-panel); }
    .profile-progression-weekly__page-copy .profile-progression-label { color:var(--progression-page-strong); font:700 .95rem/1.1 var(--font-display-stack); letter-spacing:-.01em; text-transform:none; }
    .profile-progression-weekly__page-copy { min-width:0; }
    .profile-progression-weekly__page-copy h2 { margin:.38rem 0 0; color:var(--progression-page-strong); font:700 clamp(1.08rem,2vw,1.3rem)/1.08 var(--font-display-stack); letter-spacing:-.025em; }
    .profile-progression-weekly__page-copy p { display:block; margin:.42rem 0 0; color:var(--progression-page-muted); font:600 .78rem/1.35 var(--font-body-stack, sans-serif); }
    .profile-progression-weekly__page-target { display:grid; grid-template-columns:auto minmax(0,1fr); grid-template-rows:auto auto; align-items:center; gap:.22rem .7rem; min-width:11.5rem; }
    .profile-progression-weekly__page-target .profile-progression-weekly__swatch { display:block; grid-row:1 / -1; width:3.1rem; height:3.1rem; border:1px solid color-mix(in srgb,var(--weekly-color,#fff) 62%,#fff); border-radius:.65rem; background:var(--weekly-color,#fff); box-shadow:0 0 0 .14rem color-mix(in srgb,var(--weekly-color,#fff) 26%,transparent),0 0 1.1rem color-mix(in srgb,var(--weekly-color,#fff) 52%,transparent); }
    .profile-progression-weekly__page-target-copy { display:grid; min-width:0; gap:.2rem; }
    .profile-progression-weekly__page-target-copy strong { display:block; overflow:hidden; color:var(--progression-page-strong); font:700 .8rem/1.1 var(--font-mono-stack); letter-spacing:.04em; text-overflow:ellipsis; white-space:nowrap; }
    .profile-progression-weekly__page-target-copy span { color:var(--progression-page-muted); font:600 .72rem/1.15 var(--font-mono-stack); white-space:nowrap; }
    .profile-progression-weekly__page-target em { grid-column:2; color:var(--progression-page-success); font:700 .75rem/1.1 var(--font-mono-stack); font-style:normal; letter-spacing:.03em; text-transform:uppercase; }
    .profile-progression-journey--page { margin-top:1.35rem; padding:1.15rem 1.35rem 1.35rem; border:1px solid var(--progression-page-line); border-radius:.9rem; background:var(--progression-page-panel); }
    .profile-progression-journey--page .profile-progression-section-heading { align-items:center; }
    .profile-progression-section-heading--page .profile-progression-label { color:var(--progression-page-strong); font:700 1.3rem/1.1 var(--font-display-stack); letter-spacing:-.02em; text-transform:none; }
    .profile-progression-journey--page .profile-progression-section-heading > span:last-child { display:none; }
    .profile-progression-journey--page .profile-progression-lanes--page { display:grid; grid-template-columns:1fr; gap:.25rem; margin-top:.9rem; }
    .profile-progression-lane--page { gap:0; padding:.35rem 0; border:0; border-radius:0; background:transparent; box-shadow:none; }
    .profile-progression-lane--page .profile-progression-lane__heading { display:none; }
    .profile-progression-lane--page .profile-progression-lane__toggle { display:grid; grid-template-columns:minmax(0,1fr) auto; grid-template-rows:auto auto; align-items:center; gap:.38rem .7rem; width:100%; min-height:2.45rem; padding:.3rem 0; border:0; border-radius:.55rem; background:transparent; color:var(--progression-page-strong); text-align:left; cursor:pointer; }
    .profile-progression-lane--page .profile-progression-lane__toggle:focus-visible { outline:2px solid var(--progression-lane-accent,var(--color-ink-strong)); outline-offset:3px; }
    .profile-progression-lane--page .profile-progression-lane__toggle-main { display:flex; align-items:center; gap:.7rem; min-width:0; }
    .profile-progression-lane--page .profile-progression-lane__toggle-main > span:last-child { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .profile-progression-lane--page .profile-progression-lane__toggle-main :global(.progression-path-icon) { flex-basis:1.8rem; width:1.8rem; height:1.8rem; color:var(--progression-lane-accent,var(--color-ink-strong)); }
    .profile-progression-lane--page .profile-progression-lane__toggle-main > span:last-child { color:var(--progression-page-strong); font:700 .92rem/1.1 var(--font-display-stack); }
    .profile-progression-lane--page .profile-progression-lane__toggle-progress { display:contents; color:var(--progression-lane-accent,var(--progression-page-muted)); font:700 .74rem/1 var(--font-mono-stack); }
    .profile-progression-lane--page .profile-progression-lane__toggle-progress > span:first-child { grid-column:2; grid-row:1; justify-self:end; color:var(--progression-lane-accent,var(--progression-page-muted)); }
    .profile-progression-lane--page .profile-progression-lane__toggle-bar { grid-column:1 / -1; grid-row:2; width:100%; height:.34rem; overflow:hidden; border-radius:999px; background:rgba(255,255,255,.1); }
    .profile-progression-lane--page .profile-progression-lane__toggle-bar span { display:block; height:100%; border-radius:inherit; background:var(--progression-lane-fill,var(--progression-lane-accent,var(--color-ink-strong))); box-shadow:0 0 .65rem color-mix(in srgb,var(--progression-lane-accent) 34%,transparent); }
    .profile-progression-lane--page .profile-progression-lane__chevron { display:none; }
    .profile-progression-lane--page .profile-progression-lane__chevron--open { transform:rotate(180deg); }
    .profile-progression-lane--page .profile-progression-lane__details { display:grid; gap:.7rem; max-height:0; overflow:hidden; opacity:0; transition:max-height var(--motion-base) var(--motion-ease-standard),opacity var(--motion-fast) var(--motion-ease-standard); }
    .profile-progression-lane--page .profile-progression-lane__details--expanded { max-height:48rem; margin-bottom:.65rem; opacity:1; }
    .profile-progression-lane--page .profile-progression-node { border-radius:.75rem; background:rgba(255,255,255,.025); box-shadow:none; }
    .profile-progression-lane--page .profile-progression-node.profile-progression-node--compact>p { margin:0; color:var(--progression-page-strong); font-size:.84rem; font-weight:600; line-height:1.4; }
    .profile-progression-unlocks--page { margin-top:1.35rem; padding:1.25rem 1.3rem 1.3rem; border:1px solid var(--progression-page-line); border-radius:.9rem; background:var(--progression-page-panel); }
    .profile-progression-unlocks--page .profile-progression-section-heading h2 { display:none; }
    .profile-progression-unlocks--page .profile-progression-label { color:var(--progression-page-strong); font:700 1.1rem/1.1 var(--font-display-stack); letter-spacing:-.01em; text-transform:none; }
    .profile-progression-unlocks--page ol { grid-template-columns:1fr; gap:0; margin-top:.7rem; }
    .profile-progression-unlocks--page li { display:flex; align-items:center; gap:.55rem; padding:.35rem 0; border-top:1px solid var(--color-line-subtle); }
    .profile-progression-unlocks--page li:first-child { border-top:0; }
    .profile-progression-unlocks--page .progression-reward-preview { flex:1; min-width:0; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__trigger) { min-height:3.45rem!important; padding:.25rem 0!important; border:0; border-radius:.65rem; background:transparent; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__thumbnail) { flex-basis:2.8rem!important; width:2.8rem!important; height:2.8rem!important; border-radius:.55rem; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__thumbnail .shop-preview-area) { min-height:2.8rem!important; height:2.8rem!important; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__thumbnail .shop-preview-text),
    .profile-progression-unlocks--page :global(.progression-reward-preview__thumbnail .name-effect-canvas) { width:100%; max-width:100%; padding:0; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__thumbnail .name-effect-canvas__semantic) { display:block; width:100%; max-width:100%; overflow:hidden; font-size:.4rem!important; line-height:1; text-overflow:ellipsis; white-space:nowrap; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__trigger-copy strong) { color:var(--progression-page-strong); font-size:.82rem; font-weight:700; }
    .profile-progression-unlocks--page :global(.progression-reward-preview__trigger-copy small) { color:var(--progression-page-muted); font-size:.72rem; font-weight:600; }
    .profile-progression-unlock-check { display:inline-grid; flex:0 0 auto; place-items:center; width:1.3rem; height:1.3rem; color:var(--progression-page-success); }
    .profile-progression-unlock-check svg { width:100%; height:100%; fill:none; stroke:currentColor; stroke-linecap:round; stroke-linejoin:round; stroke-width:2.2; }
    @media (max-width:900px) {
      .profile-progression-page-grid { grid-template-columns:1fr; }
      .profile-progression-page-side { padding-left:0; padding-top:1.5rem; }
    }
    @media (max-width:620px) {
      .progression-page__roll-card { grid-template-columns:5.25rem minmax(0,1fr); gap:.9rem; }
      .progression-page__roll-swatch { width:5.25rem; height:5.25rem; }
    }
    @media (max-width:520px) {
      .profile-progression-page-mode { padding:0; }
      .profile-progression-weekly--page { grid-template-columns:1fr; }
      .profile-progression-weekly__page-target { justify-self:start; }
      .profile-progression-lane--page .profile-progression-lane__toggle { grid-template-columns:minmax(0,1fr) auto; gap:.3rem; min-height:2.45rem; }
      .profile-progression-page-mode .profile-progression-stats--page > div { min-height:5.8rem; padding:.75rem; }
    }
    @media (max-width:420px) {
      .progression-page__roll-card { grid-template-columns:1fr; }
      .progression-page__roll-swatch { width:5.75rem; height:5.75rem; }
    }
    @media (prefers-reduced-motion:reduce) {
      .profile-progression-lane--page .profile-progression-lane__details,
      .profile-progression-lane--page .profile-progression-lane__chevron,
      .progression-page__roll-swatch { transition:none; box-shadow:none; }
    }
  }
</style>
