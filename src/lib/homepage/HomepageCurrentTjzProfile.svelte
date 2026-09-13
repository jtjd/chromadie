<script>
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import ProfileFullBleedLayout from '../profile-layout/ProfileFullBleedLayout.svelte';
  import ProfileEnvironmentLayer from '../ProfileEnvironmentLayer.svelte';
  import snapshot from './tjzLiveProfileSnapshot.json';

  export let reducedMotion = false;

  // Keep the live Tjz loadout, layout, and visual environment intact. Only
  // the identity copy is authored for this separate homepage demonstration.
  const demoProps = Object.freeze({
    ...snapshot.props,
    // The Sleek specimen is the handwritten member of the showcase. Resolve
    // this through the same finite name-font registry used by real profiles.
    nameLoadout: { ...snapshot.props.nameLoadout, fontKey: 'name_font_marker_tag' },
    displayName: 'Aster',
    bio: 'making room for brighter days.',
    location: 'Lisbon, PT',
    timezone: '',
    joinedLabel: '',
    showJoinDate: false,
    linksInteractive: false,
    headingTag: 'h2',
    layoutVariant: snapshot.props.layoutVariant
  });
</script>

<div class="current-tjz-profile" style={snapshot.styles.page} aria-label="Aster profile preview">
  <ProfileEnvironmentLayer {snapshot} mode="preview" {reducedMotion} />
  <div class="current-tjz-profile__card">
    <ProfileMotionEffect motionKey={snapshot.props.profileMotionKey} inputSurface="container">
      <ProfileFullBleedLayout
        {...demoProps}
        surfaceStyle={snapshot.styles.surface}
        entryAnimation={reducedMotion ? 'none' : demoProps.entryAnimation}
        onEntryClick={() => {}}
      />
    </ProfileMotionEffect>
  </div>
</div>

<style>
  .current-tjz-profile {
    position: relative;
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 430px;
    place-items: center;
    padding: 36px 24px;
    overflow: hidden;
    border-radius: 12px;
    isolation: isolate;
  }

  .current-tjz-profile__card {
    position: relative;
    z-index: 1;
    width: min(100%, 40.25rem);
    min-width: 0;
  }

  @media (max-width: 600px) {
    .current-tjz-profile {
      min-height: 340px;
      padding: 28px 16px;
    }
  }
</style>
