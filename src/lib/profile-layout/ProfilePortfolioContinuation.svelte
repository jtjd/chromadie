<script>
  import FeaturedCollection from '../FeaturedCollection.svelte';
  import Module from '../foundation/Module.svelte';
  import ProfileCollection from '../ProfileCollection.svelte';
  import ProfileContent from '../ProfileContent.svelte';
  import ProfileMusic from '../ProfileMusic.svelte';
  import ProfileTimeline from '../ProfileTimeline.svelte';
  import ProfileWidgets from '../ProfileWidgets.svelte';
  import { normalizeHexColor } from '../utils.js';

  export let username = 'Player';
  export let profileContent = null;
  export let hasProfileContent = false;
  export let hasProfileMusic = false;
  export let profileWidgets = [];
  /** @type {Record<string, any> | null} */
  export let latestRoll = null;
  /** @type {Record<string, any> | null} */
  export let displayBestRoll = null;
  export let profileControlAccent = '#8B7CF6';
  export let colorEffectsEnabled = false;
  export let audioSrc = '';
  export let richAudioPlaylist = { tracks: [] };
  export let hasSpotifyWidget = false;
  export let spotifyType = '';
  export let spotifyId = '';
  export let visualFixture = '';
  export let previewMode = false;
  export let prefersReducedMotion = false;
  export let profileFeatureFlags = {};
  /** @type {Record<string, any> | null} */
  export let rank = null;
  /** @type {Record<string, any> | null} */
  export let rankState = null;
  export let progressionProofSnapshot = { completedCount: 0, recentUnlocks: [] };
  export let progressionProofCount = 0;
  export let progressionProofRolls = 0;
  export let isOwnProfile = false;
  export let storyModules = [];
  /** @type {Record<string, any> | null} */
  export let renderProfile = null;
  export let storyUnlocks = {};
  export let hasProfileStory = false;
  export let pinnedAchievements = [];
  export let collectionItems = [];
  export let recentScores = [];
  export let timelineEvents = [];
  export let totalPublicRolls = 0;
  /** @type {(entryKey: string) => void} */
  export let onEntryClick = () => {};

  $: visibleWidgets = Array.isArray(profileWidgets) ? profileWidgets : [];
  $: visibleAchievements = Array.isArray(pinnedAchievements) ? pinnedAchievements : [];
  $: safeAccent = normalizeHexColor(profileControlAccent, '#8B7CF6');
  $: storyProgress = progressionProofSnapshot || { completedCount: 0, recentUnlocks: [] };

  function colorFor(value, fallback = '#8B7CF6') {
    return normalizeHexColor(value, fallback);
  }

  function formatStat(value) {
    return (Number(value) || 0).toLocaleString();
  }
</script>

<div class="profile-portfolio-continuation" style={`--profile-portfolio-continuation-accent:${safeAccent};`} data-profile-portfolio-continuation data-profile-username={username}>
  {#if hasProfileContent}
    <section class="profile-portfolio-page profile-portfolio-page--content" data-profile-portfolio-page="content" aria-labelledby="profile-portfolio-content-title">
      <div class="profile-portfolio-page__inner">
        <p class="profile-portfolio-page__eyebrow">About</p>
        <h2 id="profile-portfolio-content-title" class="profile-portfolio-page__title">A little more context</h2>
        <ProfileContent content={profileContent} onEntryClick={onEntryClick} />
      </div>
    </section>
  {/if}

  {#if hasProfileMusic || visibleWidgets.length}
    <section class="profile-portfolio-page profile-portfolio-page--media" data-profile-portfolio-page="media" aria-labelledby="profile-portfolio-media-title">
      <div class="profile-portfolio-page__inner profile-portfolio-page__inner--media">
        <p class="profile-portfolio-page__eyebrow">Media</p>
        <h2 id="profile-portfolio-media-title" class="profile-portfolio-page__title">Sound and integrations</h2>
        <div class="profile-portfolio-page__media-stack">
          {#if hasProfileMusic}
            <ProfileMusic
              placement="inline"
              bestRoll={latestRoll || displayBestRoll}
              accentColor={profileControlAccent}
              colorEffectsEnabled={colorEffectsEnabled}
              audioSrc={audioSrc}
              audioPlaylist={richAudioPlaylist}
              spotifyType={hasSpotifyWidget ? '' : spotifyType}
              spotifyId={hasSpotifyWidget ? '' : spotifyId}
              visualFixture={visualFixture}
              deferMedia={previewMode}
              reducedMotion={prefersReducedMotion}
            />
          {/if}
          {#if visibleWidgets.length}
            <ProfileWidgets widgets={visibleWidgets} deferMedia={previewMode} onEntryClick={onEntryClick} />
          {/if}
        </div>
      </div>
    </section>
  {/if}

  {#if hasProfileStory}
    <section class="profile-portfolio-page profile-portfolio-page--story" data-profile-portfolio-page="story" aria-labelledby="profile-portfolio-story-title">
      <div class="profile-portfolio-page__inner profile-portfolio-page__inner--story">
        <div class="profile-portfolio-page__archive">
          <FeaturedCollection
            items={collectionItems}
            samples={recentScores}
            accentColor={profileControlAccent}
            unlocked={storyUnlocks.collectionUnlocked}
            rollsRequired={storyUnlocks.collectionRollsRequired}
            totalRolls={storyUnlocks.totalRolls}
          />
        </div>

        <section class="profile-portfolio-story" aria-labelledby="profile-portfolio-story-title">
          <div class="profile-portfolio-story__heading">
            <div>
              <p class="profile-portfolio-page__eyebrow">Color story</p>
              <h2 id="profile-portfolio-story-title">History, milestones, and collected conditions</h2>
            </div>
          </div>

          <div class="profile-portfolio-story__details">
            {#if rank && rankState}
              <Module size="wide" tone="quiet" eyebrow="Progress" title={rank.name + ' rank'} description="A quiet record of the progress behind this identity.">
                <div class="profile-portfolio-story__rank-row">
                  <div>
                    <span class="profile-portfolio-story__rank-label">{rank.name} rank</span>
                    <span class="profile-portfolio-story__rank-value">{formatStat(rankState.lifetimeEp)} EP</span>
                  </div>
                  <div class="profile-portfolio-story__rank-track" aria-label={Math.round(rankState.progress * 100) + ' percent toward the next rank'}>
                    <span style={`width:${Math.round(rankState.progress * 100)}%;background:${rank.color};`}></span>
                  </div>
                  <span class="profile-portfolio-story__rank-next">{rankState.next ? rankState.next.name + ' at ' + formatStat(rankState.next.min) + ' EP' : 'Highest rank reached'}</span>
                </div>
                {#if profileFeatureFlags.progressionJourney && (storyProgress.recentUnlocks.length || progressionProofCount)}
                  <div class="profile-portfolio-story__proof" aria-label="Progression history">
                    {#if storyProgress.recentUnlocks.length}<span class="profile-portfolio-story__proof-label">Recent unlocks</span>{:else}<span class="profile-portfolio-story__proof-label">Profile history</span>{/if}
                    {#if storyProgress.recentUnlocks.length}
                      <div class="profile-portfolio-story__proof-items">
                        {#each storyProgress.recentUnlocks.slice(0, 2) as unlock (unlock.id)}
                          <span><strong>{unlock.reward?.name || unlock.name}</strong><small>{unlock.track === 'discovery' ? 'Discovery' : unlock.track === 'ritual' ? 'Ritual' : 'Rank'}</small></span>
                        {/each}
                      </div>
                    {/if}
                    <div class="profile-portfolio-story__proof-stats">
                      {#if progressionProofCount}<span>{formatStat(progressionProofCount)} milestones</span>{/if}
                      {#if progressionProofRolls}<span>{formatStat(progressionProofRolls)} rolls</span>{/if}
                    </div>
                    {#if isOwnProfile}<a href="/progression">View full progression</a>{/if}
                  </div>
                {/if}
              </Module>
            {/if}

            {#each storyModules as module (module.id)}
              {#if module.id === 'stats'}
                <Module size={module.size} tone="quiet" eyebrow="Progress" title="A record of color" description="The milestones behind this identity.">
                  <div class="profile-portfolio-story__stats" aria-label="Profile statistics">
                    <div><strong>{formatStat(renderProfile?.current_streak)}</strong><span>Current streak</span></div>
                    <div><strong>{formatStat(renderProfile?.longest_streak)}</strong><span>Longest streak</span></div>
                    <div><strong>{formatStat(renderProfile?.total_rolls)}</strong><span>Total rolls</span></div>
                  </div>
                </Module>
              {:else if module.id === 'signature'}
                <Module size={module.size} eyebrow="Signature roll" title="The color worth remembering" description={displayBestRoll ? (displayBestRoll.rarity || 'Unranked') + ' from the public record.' : 'This profile is waiting for its first roll.'}>
                  {#if displayBestRoll}
                    <div class="profile-portfolio-story__best-roll">
                      <div class="profile-portfolio-story__best-color" style={`background:${colorFor(displayBestRoll.hex_code)};`}></div>
                      <div>
                        <p>{colorFor(displayBestRoll.hex_code, '#000000')}</p>
                        <strong>{formatStat(displayBestRoll.score)} EP</strong>
                        <small>{displayBestRoll.rarity || 'Unranked'}</small>
                      </div>
                    </div>
                  {:else}
                    <div class="profile-portfolio-story__empty">No rolls yet. The first color will give this profile its opening note.</div>
                  {/if}
                </Module>
              {:else if module.id === 'recent'}
                <Module size={module.size} eyebrow="Recent color story" title="The last 30 days" description={totalPublicRolls + ' public roll' + (totalPublicRolls === 1 ? '' : 's') + ' in the available recent history.'}>
                  {#if recentScores.length}
                    <div class="profile-portfolio-story__color-list" aria-label="Recent public colors">
                      {#each recentScores as score (score.roll_date)}
                        <div><span class="profile-portfolio-story__color-dot" style={`background:${colorFor(score.hex_code)};`}></span><span>{score.roll_date}</span><strong>{colorFor(score.hex_code, '#000000')}</strong></div>
                      {/each}
                    </div>
                  {:else}
                    <div class="profile-portfolio-story__empty">No recent colors are available yet.</div>
                  {/if}
                  <div class="profile-portfolio-story__divider" aria-hidden="true"></div>
                  <div class="profile-portfolio-story__subheading"><div><p class="profile-portfolio-page__eyebrow">Durable story</p><h3>Color timeline</h3></div><span>{storyUnlocks.timelineLimit} visible chapter{storyUnlocks.timelineLimit === 1 ? '' : 's'}</span></div>
                  <ProfileTimeline events={timelineEvents} maxItems={storyUnlocks.timelineLimit} />
                </Module>
              {:else if module.id === 'achievements'}
                <Module size={module.size} eyebrow="Pinned identity" title="Achievements on display" description={storyUnlocks.collectionUnlocked ? 'A small public selection from this player’s earned history.' : 'No achievements are pinned to the public profile yet.'}>
                  {#if visibleAchievements.length}
                    <div class="profile-portfolio-story__achievement-list">
                      {#each visibleAchievements as badge (badge.id || badge.name || badge)}
                        <article><span aria-hidden="true">✦</span><div><strong>{badge.name || badge}</strong><p>{badge.description || 'A pinned color achievement.'}</p></div></article>
                      {/each}
                    </div>
                  {:else}
                    <div class="profile-portfolio-story__empty">Pinned badges will appear here when this player chooses them.</div>
                  {/if}
                  {#if isOwnProfile}<a class="profile-portfolio-story__record-link" href="/progression?tab=achievements">View all achievements</a>{/if}
                  <div class="profile-portfolio-story__divider" aria-hidden="true"></div>
                  <div class="profile-portfolio-story__subheading"><div><p class="profile-portfolio-page__eyebrow">Lifetime discoveries</p><h3>Condition collection</h3></div><span>{storyUnlocks.collectionUnlocked ? collectionItems.length + ' discovered' : storyUnlocks.totalRolls + '/' + storyUnlocks.collectionRollsRequired + ' rolls'}</span></div>
                  {#if storyUnlocks.collectionUnlocked}<ProfileCollection items={collectionItems} />{:else}<div class="profile-portfolio-story__locked"><strong>Keep rolling to open the collection showcase.</strong><p>Your first {storyUnlocks.collectionRollsRequired} daily rolls reveal the conditions that define this color identity.</p><div class="profile-portfolio-story__progress"><span style={`width:${Math.min(100, Math.round((storyUnlocks.totalRolls / storyUnlocks.collectionRollsRequired) * 100))}%;`}></span></div></div>{/if}
                  {#if isOwnProfile}<a class="profile-portfolio-story__record-link" href="/progression?tab=collection">Open full collection</a>{/if}
                </Module>
              {/if}
            {/each}
          </div>
        </section>
      </div>
    </section>
  {/if}
</div>

<style>
  .profile-portfolio-continuation { display: contents; }
  .profile-portfolio-page { display: flex; box-sizing: border-box; width: 100%; min-height: 100dvh; align-items: center; justify-content: center; padding: clamp(2.5rem, 9vh, 6rem) 0; scroll-snap-align: start; scroll-snap-stop: always; }
  .profile-portfolio-page__inner { display: grid; gap: 1rem; width: min(100%, 72rem); min-width: 0; }
  .profile-portfolio-page__inner--media { width: min(100%, 64rem); }
  .profile-portfolio-page__inner--story { gap: clamp(1.25rem, 3vw, 2.5rem); width: min(100%, 72rem); }
  .profile-portfolio-page__eyebrow { margin: 0; color: color-mix(in srgb, var(--profile-portfolio-continuation-accent) 70%, white); font: 700 .68rem/1.2 var(--font-mono-stack, monospace); letter-spacing: .14em; text-transform: uppercase; }
  .profile-portfolio-page__title { margin: 0; color: var(--color-ink-strong, #f1f6ff); font: 650 clamp(1.65rem, 4vw, 2.4rem)/1.05 var(--font-display-stack, sans-serif); letter-spacing: -.045em; }
  .profile-portfolio-page__inner > :global(.profile-content) { width: 100%; }
  .profile-portfolio-page__inner--media { justify-items: center; }
  .profile-portfolio-page__inner--media > * { width: 100%; }
  .profile-portfolio-page__media-stack { display: grid; gap: 1rem; width: min(100%, 64rem); }
  .profile-portfolio-page__archive { width: min(100%, 52rem); margin-inline: auto; padding: 1.15rem 1.3rem; border: 1px solid color-mix(in srgb, var(--profile-portfolio-continuation-accent) 20%, transparent); border-radius: 1rem; background: color-mix(in srgb, var(--profile-surface, #11141b) 72%, transparent); box-shadow: 0 1.5rem 4rem rgba(0,0,0,.16); }
  .profile-portfolio-story { display: grid; gap: 1rem; }
  .profile-portfolio-story__heading { display: flex; justify-content: space-between; gap: 1rem; }
  .profile-portfolio-story__heading h2 { margin: .35rem 0 0; color: var(--color-ink-strong, #f1f6ff); font: 650 clamp(1.55rem, 3.6vw, 2.25rem)/1.05 var(--font-display-stack, sans-serif); letter-spacing: -.04em; }
  .profile-portfolio-story__details { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 1rem; }
  .profile-portfolio-story__details :global(.foundation-module) { grid-column: span 6; }
  .profile-portfolio-story__details :global(.foundation-module--wide) { grid-column: span 12; }
  .profile-portfolio-story__rank-row { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem 1rem; padding-top: .9rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-portfolio-story__rank-row > div:first-child { display: flex; align-items: baseline; gap: .65rem; }
  .profile-portfolio-story__rank-label { color: var(--profile-portfolio-continuation-accent); }
  .profile-portfolio-story__rank-value { color: var(--color-ink-strong); font: 600 .78rem/1 var(--font-mono-stack); }
  .profile-portfolio-story__rank-track { flex: 1 1 12rem; min-width: 8rem; height: .4rem; overflow: hidden; border-radius: 999px; background: var(--surface-inset); }
  .profile-portfolio-story__rank-track span { display: block; height: 100%; border-radius: inherit; }
  .profile-portfolio-story__rank-next { color: var(--color-ink-muted); font-size: .72rem; }
  .profile-portfolio-story__proof { display: grid; gap: .55rem; margin-top: .9rem; padding-top: .8rem; border-top: 1px solid var(--color-line-subtle); }
  .profile-portfolio-story__proof-label { color: var(--profile-portfolio-continuation-accent); font: 700 .66rem/1.2 var(--font-mono-stack); letter-spacing: .1em; text-transform: uppercase; }
  .profile-portfolio-story__proof-items, .profile-portfolio-story__proof-stats { display: flex; flex-wrap: wrap; gap: .45rem; }
  .profile-portfolio-story__proof-items span { display: grid; gap: .15rem; min-width: 8rem; padding: .5rem .65rem; border: 1px solid var(--color-line-subtle); border-radius: .55rem; background: var(--surface-inset); }
  .profile-portfolio-story__proof-items strong { color: var(--color-ink-strong); font-size: .74rem; }
  .profile-portfolio-story__proof-items small, .profile-portfolio-story__proof-stats, .profile-portfolio-story__proof a { color: var(--color-ink-muted); font-size: .68rem; }
  .profile-portfolio-story__proof a, .profile-portfolio-story__record-link { color: var(--color-ink-strong); font-size: .72rem; font-weight: 650; text-decoration: none; }
  .profile-portfolio-story__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
  .profile-portfolio-story__stats > div { padding: .8rem; border-radius: .65rem; background: var(--surface-inset); }
  .profile-portfolio-story__stats strong { display: block; color: var(--color-ink-strong); font: 650 1.5rem/1 var(--font-display-stack); }
  .profile-portfolio-story__stats span { display: block; margin-top: .35rem; color: var(--color-ink-muted); font-size: .68rem; }
  .profile-portfolio-story__best-roll { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: .9rem; align-items: center; }
  .profile-portfolio-story__best-color { min-height: 6rem; border-radius: .65rem; box-shadow: inset 0 0 0 1px rgba(255,255,255,.18); }
  .profile-portfolio-story__best-roll p, .profile-portfolio-story__best-roll strong, .profile-portfolio-story__best-roll small { display: block; margin: 0; }
  .profile-portfolio-story__best-roll p { color: var(--color-ink-strong); font: 600 .78rem/1 var(--font-mono-stack); }
  .profile-portfolio-story__best-roll strong { margin-top: .4rem; color: var(--profile-portfolio-continuation-accent); font: 650 1.15rem/1 var(--font-display-stack); }
  .profile-portfolio-story__best-roll small { margin-top: .35rem; color: var(--color-ink-muted); font-size: .7rem; }
  .profile-portfolio-story__color-list { display: grid; gap: .4rem; }
  .profile-portfolio-story__color-list > div { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: .65rem; padding: .55rem .65rem; border-radius: .45rem; background: var(--surface-inset); color: var(--color-ink-muted); font: 600 .68rem/1.2 var(--font-mono-stack); }
  .profile-portfolio-story__color-list strong { color: var(--color-ink-strong); font-weight: 600; }
  .profile-portfolio-story__color-dot { width: 1.1rem; height: 1.1rem; border: 1px solid rgba(255,255,255,.24); border-radius: 50%; }
  .profile-portfolio-story__divider { height: 1px; margin: 1rem 0; background: var(--color-line-subtle); }
  .profile-portfolio-story__subheading { display: flex; align-items: baseline; justify-content: space-between; gap: .75rem; margin-bottom: .8rem; }
  .profile-portfolio-story__subheading h3 { margin: .25rem 0 0; color: var(--color-ink-strong); font: 650 1.05rem/1.1 var(--font-display-stack); }
  .profile-portfolio-story__subheading > span { color: var(--color-ink-muted); font: 600 .66rem/1.2 var(--font-mono-stack); text-align: right; }
  .profile-portfolio-story__achievement-list { display: grid; gap: .5rem; }
  .profile-portfolio-story__achievement-list article { display: grid; grid-template-columns: auto 1fr; gap: .65rem; align-items: start; padding: .65rem; border-radius: .5rem; background: var(--surface-inset); }
  .profile-portfolio-story__achievement-list article > span { color: var(--profile-portfolio-continuation-accent); }
  .profile-portfolio-story__achievement-list strong { color: var(--color-ink-strong); font-size: .74rem; }
  .profile-portfolio-story__achievement-list p { margin: .2rem 0 0; color: var(--color-ink-muted); font-size: .68rem; }
  .profile-portfolio-story__empty { padding: .8rem; border: 1px dashed var(--color-line-subtle); border-radius: .5rem; color: var(--color-ink-muted); font-size: .75rem; line-height: 1.45; }
  .profile-portfolio-story__locked { display: grid; gap: .4rem; padding: .8rem; border: 1px dashed color-mix(in srgb, var(--profile-portfolio-continuation-accent) 42%, var(--color-line-subtle)); border-radius: .6rem; }
  .profile-portfolio-story__locked strong { color: var(--color-ink-strong); font-size: .74rem; }
  .profile-portfolio-story__locked p { margin: 0; color: var(--color-ink-muted); font-size: .72rem; line-height: 1.45; }
  .profile-portfolio-story__progress { height: .35rem; overflow: hidden; border-radius: 999px; background: var(--surface-inset); }
  .profile-portfolio-story__progress span { display: block; height: 100%; border-radius: inherit; background: var(--profile-portfolio-continuation-accent); }
  .profile-portfolio-story__record-link { display: inline-flex; margin-top: .8rem; }

  @media (max-width: 48rem) {
    .profile-portfolio-page { align-items: flex-start; padding-block: 5rem; }
    .profile-portfolio-page__inner, .profile-portfolio-page__inner--media, .profile-portfolio-page__inner--story { width: 100%; }
    .profile-portfolio-story__details :global(.foundation-module), .profile-portfolio-story__details :global(.foundation-module--wide) { grid-column: 1 / -1; }
  }

  @media (max-width: 36rem) {
    .profile-portfolio-page { padding: 4.5rem .75rem; }
    .profile-portfolio-page__title { font-size: 1.65rem; }
    .profile-portfolio-story__stats { grid-template-columns: 1fr; }
    .profile-portfolio-story__subheading { align-items: flex-start; flex-direction: column; }
    .profile-portfolio-story__subheading > span { text-align: left; }
  }
</style>
