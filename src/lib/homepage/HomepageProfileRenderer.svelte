<script>
  import ProfileShell from '../ProfileShell.svelte';

  /** @type {any} */
  export let fixture = null;
  export let previewDevice = 'desktop';
  export let className = '';

  $: profile = fixture?.profile || null;
  $: label = profile ? `${profile.display_name || profile.username}'s profile preview` : 'Profile preview';
  $: rendererClass = ['homepage-profile-renderer', className].filter(Boolean).join(' ');
</script>

<div class={rendererClass} aria-label={label} data-homepage-fixture={fixture?.id || undefined}>
  {#if fixture}
    <ProfileShell
      previewMode={true}
      previewProfile={fixture.profile}
      previewProfileConfig={fixture.profileConfig}
      previewScores={fixture.scores}
      previewTimelineEvents={fixture.timelineEvents}
      previewCollectionItems={fixture.collectionItems}
      previewAllAchievements={fixture.allAchievements}
      visualFixture=""
      renderContext="homepage"
      {previewDevice}
    />
  {/if}
</div>

<style>
  .homepage-profile-renderer {
    position: relative;
    width: 100%;
    height: 100%;
    min-width: 0;
    min-height: 0;
    overflow: hidden;
    isolation: isolate;
  }

  .homepage-profile-renderer :global(.profile-shell-page) {
    width: 100%;
    height: 100%;
    min-height: 100%;
  }

  .homepage-profile-renderer :global(.profile-shell__media-image),
  .homepage-profile-renderer :global(.profile-shell__media-video) {
    object-position: center;
  }

  .homepage-profile-renderer :global(.profile-shell__page-cursor-layer) { pointer-events: none; }

  @media (prefers-reduced-motion: reduce) {
    .homepage-profile-renderer :global(*) { animation: none !important; transition-duration: 0.001ms !important; }
  }
</style>
