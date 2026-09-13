<script>
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import ProfileReferenceCard from '../ProfileReferenceCard.svelte';
  import ProfileEnvironmentLayer from '../ProfileEnvironmentLayer.svelte';
  import snapshot from './tjzProfileSnapshot.json';

  export let reducedMotion = false;

  const demoProps = Object.freeze({
    ...snapshot.props,
    meta: String(snapshot.props.meta || '').replace(/\s*·\s*Joined\b.*$/i, '')
  });

  // The captured profile includes its custom cursor and cursor trail. The
  // Modern homepage specimen demonstrates the profile surface itself, so keep
  // those interaction cosmetics out of this isolated preview while leaving
  // the source snapshot untouched for provenance.
  const stripCursorStyle = value => String(value || '')
    .replace(/(?:^|;)\s*cursor\s*:[^;]*/gi, '')
    .replace(/;;+/g, ';')
    .replace(/^;|;$/g, '');
  const demoPageStyle = stripCursorStyle(snapshot.styles?.page);
  const demoSnapshot = Object.freeze({
    ...snapshot,
    environment: Object.freeze({
      ...snapshot.environment,
      cursorTrailKey: '',
      cursorUrl: '',
      pointerCursorUrl: '',
      pageStyle: demoPageStyle
    }),
    styles: Object.freeze({ ...snapshot.styles, page: demoPageStyle })
  });
</script>

<div class="tjz-profile" style={demoSnapshot.styles.page}>
  <ProfileEnvironmentLayer snapshot={demoSnapshot} mode="preview" {reducedMotion} />
  <div class="tjz-profile__card">
    <ProfileMotionEffect motionKey="profile_motion_perspective_tilt" inputSurface="container">
      <ProfileReferenceCard {...demoProps} linksInteractive={false} entryAnimation={reducedMotion ? 'none' : demoProps.entryAnimation} />
    </ProfileMotionEffect>
  </div>
</div>

<style>
  .tjz-profile { position: relative; display: grid; width: 100%; min-width: 0; min-height: 430px; place-items: center; padding: 36px 24px; border-radius: 12px; overflow: hidden; isolation: isolate; }
  .tjz-profile__card { position: relative; z-index: 1; width: 100%; min-width: 0; }
  @media (max-width: 600px) { .tjz-profile { min-height: 340px; padding: 28px 16px; } }
</style>
