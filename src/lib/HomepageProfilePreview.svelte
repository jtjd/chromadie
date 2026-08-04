<script>
  import CompactRollPreview from './CompactRollPreview.svelte';
  import IdentityCard from './IdentityCard.svelte';
  import ProfileBorderEffect from './profile-border/ProfileBorderEffect.svelte';
  import ProfileMusic from './ProfileMusic.svelte';
  import { getBadgeMeta } from './badgeData.js';
  import { getProfileMediaUrl } from './profileMedia.js';
  import { getVisibleProfileLinks, normalizeProfileConfig } from './profileConfig.js';
  import { getCanonicalProfilePath } from './routeContract.js';
  import { getLatestHomepageRoll } from './homepageDirectory.js';
  import { normalizeHexColor } from './utils.js';
  import { getNameRendererLoadout } from './name/nameLoadout.js';
  import AtmosphereLayer from './profile-atmosphere/AtmosphereLayer.svelte';

  /** @type {Record<string, any> | null} */
  export let model = null;
  export let variant = 'directory';
  export let mediaCacheKey = '';
  export let emptyMessage = 'No public profiles available yet.';
  export let emptyDetail = 'Profiles will appear here after players publish and roll.';

  $: context = model && model.context ? model.context : null;
  $: profile = context?.targetProfile || null;
  $: config = normalizeProfileConfig(context?.profileConfig?.published, profile?.mood_color || '#8B7CF6');
  $: username = profile?.username || '';
  $: displayName = profile?.display_name || username;
  $: profilePath = getCanonicalProfilePath(username) || '#';
  $: cosmetics = profile?.equipped_cosmetics || {};
  $: nameRendererLoadout = getNameRendererLoadout(cosmetics);
  $: accentColor = normalizeHexColor(
    getLatestHomepageRoll(context)?.hex_code || profile?.mood_color || config.signatureColor,
    config.signatureColor
  );
  $: nameRendererRecentColors = (Array.isArray(context?.targetScores) ? context.targetScores : [])
    .slice(0, 8)
    .map(score => score?.hex_code)
    .filter(Boolean);
  $: avatarSrc = getProfileMediaUrl(config.avatar_path, mediaCacheKey);
  $: backgroundSrc = getProfileMediaUrl(config.background_path, mediaCacheKey);
  $: audioSrc = getProfileMediaUrl(config.audio_path, mediaCacheKey);
  $: hasSpotify = Boolean(config.spotify_type && config.spotify_id);
  $: hasAudio = Boolean(audioSrc);
  $: latestRoll = getLatestHomepageRoll(context);
  $: latestRollIsToday = latestRoll?.roll_date === new Date().toISOString().slice(0, 10);
  $: visibleLinks = getVisibleProfileLinks(config);
  $: badges = (Array.isArray(profile?.equipped_badges) ? profile.equipped_badges : []).map(id => {
    const meta = context?.allAchievements?.find(achievement => achievement.id === id);
    const fallback = getBadgeMeta(id);
    return { id, name: meta?.name || fallback.name || id, icon: meta?.icon || fallback.symbol || '✦' };
  });
  $: accessibleName = displayName ? `${displayName}'s public profile` : 'Public profile preview';

</script>

<article
  class={'homepage-preview homepage-preview--' + variant}
  class:homepage-preview--empty={!profile}
  aria-label={profile ? accessibleName : 'No public profile available'}
>
  {#if profile}
    <header class="homepage-preview__header">
      <a href={profilePath} on:click|stopPropagation>{profilePath.replace(/^\//, 'chm.lol/')}</a>
    </header>

    <div class="homepage-preview__scene">
      {#if backgroundSrc}
        <div class="homepage-preview__media-background" style={`background-image: url("${backgroundSrc}");`} aria-hidden="true"></div>
      {/if}
      {#if cosmetics?.profile_atmosphere}
        <AtmosphereLayer atmosphereKey={cosmetics.profile_atmosphere} todayColor={accentColor} recentColors={nameRendererRecentColors} mode="card" active={false} animated={false} className="homepage-preview__atmosphere" />
      {/if}

      <ProfileBorderEffect borderKey={cosmetics?.profile_border} compact={true} className="homepage-preview__identity-boundary">
        <IdentityCard
          titleId={'homepage-preview-title-' + username}
          headingTag="h2"
          username={username}
          displayName={displayName}
          profilePath={profilePath}
          bio={typeof profile.bio === 'string' ? profile.bio.trim().slice(0, 160) : ''}
          bioFallback="No bio added yet."
          links={visibleLinks}
          badges={badges}
          staff={profile.is_staff === true}
          founder={Array.isArray(profile.equipped_badges) && profile.equipped_badges.includes('launch_edition')}
          accentColor={accentColor}
          nameRendererLoadout={nameRendererLoadout}
          nameRendererContext="card"
          nameRendererMode="static-signature"
          nameRendererRecentColors={nameRendererRecentColors}
          avatarEffectKey={cosmetics?.avatar_effect}
          avatarEffectMode="compact"
          avatarEffectAnimated={false}
          avatarSrc={avatarSrc}
          avatarLoading={variant === 'directory' ? 'lazy' : 'eager'}
          showToday={false}
        />
      </ProfileBorderEffect>

      {#if hasAudio || hasSpotify}
        <div class="homepage-preview__music">
          <ProfileMusic
            bestRoll={latestRoll}
            accentColor={accentColor}
            audioSrc={audioSrc}
            spotifyType={config.spotify_type}
            spotifyId={config.spotify_id}
            deferMedia={true}
          />
        </div>
      {/if}
    </div>

    <footer class="homepage-preview__footer">
      <div class="homepage-preview__roll" aria-label={latestRoll ? `${latestRollIsToday ? 'Today' : 'Latest'} public roll` : 'No public roll yet'}>
        {#if latestRoll}
          <CompactRollPreview
            displayColor={latestRoll.hex_code || accentColor}
            rarity={latestRoll.rarity || 'Common'}
            size={variant === 'primary' ? '3rem' : '2.4rem'}
            scale={variant === 'primary' ? 0.3 : 0.24}
          />
          <div class="homepage-preview__roll-copy">
            <span>{latestRollIsToday ? 'Today’s color' : 'Latest public roll'}</span>
            <strong>{latestRoll.identity || latestRoll.hex_code}</strong>
            <code>{latestRoll.hex_code}</code>
          </div>
          <div class="homepage-preview__roll-meta">
            <span>{latestRoll.rarity || 'Common'}</span>
            {#if Number(latestRoll.score)}<strong>{Number(latestRoll.score).toLocaleString()} EP</strong>{/if}
          </div>
        {:else}
          <div class="homepage-preview__roll-empty">
            <span>Public roll</span>
            <strong>No public roll yet.</strong>
          </div>
        {/if}
      </div>

      {#if model?.discoveryItem?.rank}
        <div class="homepage-preview__rank">
          <span>{model.discoveryItem.sourceSurface === 'today' ? 'Today’s rank' : 'Rank'}</span>
          <strong>#{model.discoveryItem.rank}</strong>
        </div>
      {/if}
    </footer>
  {:else}
    <div class="homepage-preview__empty-copy">
      <span>Public directory</span>
      <strong>{emptyMessage}</strong>
      <p>{emptyDetail}</p>
    </div>
  {/if}
</article>

<style>
  .homepage-preview {
    --preview-accent: #8ddcff;
    position: relative;
    min-width: 0;
    overflow: hidden;
    border: 1px solid rgba(241, 243, 237, 0.16);
    border-radius: 0.3rem;
    background: #080a0b;
    color: rgba(241, 243, 237, 0.92);
    cursor: default;
    isolation: isolate;
  }

  .homepage-preview:hover { border-color: color-mix(in srgb, var(--preview-accent) 72%, white 10%); }
  .homepage-preview:focus-visible { outline: 2px solid var(--preview-accent); outline-offset: 4px; }
  .homepage-preview__header { position: relative; z-index: 3; display: flex; align-items: center; justify-content: flex-start; gap: 1rem; min-height: 2.25rem; padding: 0.65rem 0.85rem; border-bottom: 1px solid rgba(241, 243, 237, 0.12); background: rgba(7, 9, 9, 0.72); }
  .homepage-preview__header a { min-width: 0; overflow: hidden; color: rgba(241, 243, 237, 0.78); font: 600 0.62rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); text-overflow: ellipsis; text-decoration: none; white-space: nowrap; }
  .homepage-preview__header a:hover { color: var(--preview-accent); }
  .homepage-preview__header span { color: rgba(241, 243, 237, 0.42); font: 600 0.57rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.11em; text-transform: uppercase; white-space: nowrap; }
  .homepage-preview__scene { position: relative; min-height: 12.5rem; padding: clamp(1rem, 3vw, 2rem); overflow: hidden; background: #080a0c; }
  .homepage-preview__media-background { position:absolute; inset:0; z-index:0; background-position:center; background-size:cover; pointer-events:none; }
  :global(.homepage-preview__atmosphere) { z-index: 0; opacity: .72; }
  :global(.homepage-preview__identity-boundary) { position: relative; z-index: 2; width: 100%; overflow: hidden; border-radius: 0.45rem; isolation: isolate; }
  :global(.homepage-preview__identity-boundary) :global(.identity-card) { position: relative; z-index: 1; }
  .homepage-preview__music { position: relative; z-index: 4; margin-top: 0.8rem; }
  .homepage-preview__music :global(.profile-music--audio) { position: static; left: auto; bottom: auto; min-height: 0; padding: 0; }
  .homepage-preview__music :global(.profile-music--audio > audio) { position: absolute; }
  .homepage-preview__music :global(.profile-music) { width: max-content; max-width: 100%; border-radius: 999px; }
  .homepage-preview__music :global(.profile-music--spotify-deferred) { min-height: 3rem; padding: 0.45rem 0.65rem; }
  .homepage-preview__music :global(.profile-music__copy strong) { font-size: 0.75rem; }
  .homepage-preview__footer { position: relative; z-index: 3; display: flex; align-items: center; justify-content: space-between; gap: 1rem; min-height: 4.35rem; padding: 0.75rem 0.9rem; border-top: 1px solid rgba(241, 243, 237, 0.12); background: rgba(7, 9, 9, 0.78); }
  .homepage-preview__roll { display: flex; align-items: center; min-width: 0; gap: 0.65rem; }
  .homepage-preview__roll-copy { display: grid; min-width: 0; gap: 0.18rem; }
  .homepage-preview__roll-copy span, .homepage-preview__roll-empty span, .homepage-preview__rank span { color: rgba(241, 243, 237, 0.42); font: 600 0.54rem / 1.1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.1em; text-transform: uppercase; }
  .homepage-preview__roll-copy strong { overflow: hidden; color: rgba(241, 243, 237, 0.9); font: 600 0.75rem / 1.1 var(--home-font, 'Instrument Sans', sans-serif); text-overflow: ellipsis; white-space: nowrap; }
  .homepage-preview__roll-copy code { color: var(--preview-accent); font: 600 0.58rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); }
  .homepage-preview__roll-meta { display: grid; justify-items: end; gap: 0.18rem; margin-left: 0.35rem; color: rgba(241, 243, 237, 0.45); font: 600 0.57rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); text-transform: uppercase; white-space: nowrap; }
  .homepage-preview__roll-meta strong { color: rgba(241, 243, 237, 0.78); font-size: 0.59rem; }
  .homepage-preview__roll-empty { display: grid; gap: 0.25rem; }
  .homepage-preview__roll-empty strong { color: rgba(241, 243, 237, 0.75); font: 600 0.74rem / 1.1 var(--home-font, 'Instrument Sans', sans-serif); }
  .homepage-preview__rank { display: grid; justify-items: end; gap: 0.25rem; padding-left: 0.8rem; border-left: 1px solid rgba(241, 243, 237, 0.12); }
  .homepage-preview__rank strong { color: var(--preview-accent); font: 600 0.95rem / 1 var(--home-mono, 'IBM Plex Mono', monospace); }
  .homepage-preview--primary { --preview-accent: #8ddcff; }
  .homepage-preview--primary .homepage-preview__scene { min-height: 18rem; padding: clamp(1.25rem, 4vw, 2.5rem); }
  .homepage-preview--primary .homepage-preview__footer { min-height: 4.8rem; }
  .homepage-preview--side .homepage-preview__scene { min-height: 11.5rem; padding: 0.85rem; }
  .homepage-preview--side :global(.identity-card) { padding: 1rem; }
  .homepage-preview--side :global(.identity-card__person) { gap: 0.7rem; }
  .homepage-preview--side :global(.identity-card__avatar) { flex-basis: 3.6rem; width: 3.6rem; }
  .homepage-preview--side :global(.identity-card__name) { font-size: 1.35rem; }
  .homepage-preview--side :global(.identity-card__bio) { margin-top: 0.45rem; font-size: 0.69rem; line-height: 1.35; }
  .homepage-preview--side :global(.identity-card__links) { gap: 0.35rem 0.7rem; margin-top: 0.55rem; }
  .homepage-preview--side :global(.identity-card__links a) { min-height: 1.5rem; font-size: 0.63rem; }
  .homepage-preview--side .homepage-preview__footer { min-height: 3.55rem; padding: 0.5rem 0.65rem; }
  .homepage-preview--side .homepage-preview__roll-meta { display: none; }
  .homepage-preview--lower .homepage-preview__scene { min-height: 10rem; padding: 0.75rem; }
  .homepage-preview--lower :global(.identity-card) { padding: 0.9rem; }
  .homepage-preview--lower :global(.identity-card__avatar) { flex-basis: 3.5rem; width: 3.5rem; }
  .homepage-preview--lower :global(.identity-card__name) { font-size: 1.3rem; }
  .homepage-preview--directory .homepage-preview__scene { min-height: 11rem; padding: 0.85rem; }
  .homepage-preview--directory :global(.identity-card) { padding: 1rem; }
  .homepage-preview--directory :global(.identity-card__avatar) { flex-basis: 3.8rem; width: 3.8rem; }
  .homepage-preview--directory :global(.identity-card__name) { font-size: 1.45rem; }
  .homepage-preview--directory .homepage-preview__footer { min-height: 3.8rem; }
  .homepage-preview--empty { display: grid; place-items: center; min-height: 16rem; cursor: default; }
  .homepage-preview__empty-copy { display: grid; gap: 0.55rem; max-width: 16rem; padding: 2rem; text-align: center; }
  .homepage-preview__empty-copy span { color: rgba(241, 243, 237, 0.42); font: 600 0.58rem / 1.1 var(--home-mono, 'IBM Plex Mono', monospace); letter-spacing: 0.12em; text-transform: uppercase; }
  .homepage-preview__empty-copy strong { color: rgba(241, 243, 237, 0.8); font: 600 1.05rem / 1.05 var(--home-font, 'Instrument Sans', sans-serif); }
  .homepage-preview__empty-copy p { margin: 0; color: rgba(241, 243, 237, 0.5); font-size: 0.75rem; line-height: 1.45; }

  @media (max-width: 42rem) {
    .homepage-preview--primary .homepage-preview__scene { min-height: 17rem; }
    .homepage-preview--primary :global(.identity-card) { padding: 1.2rem; }
  }

  @media (prefers-reduced-motion: reduce) {
    .homepage-preview :global(*) { animation: none !important; transition-duration: 0.001ms !important; }
  }
</style>
