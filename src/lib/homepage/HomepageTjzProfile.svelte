<script>
  import ProfileMotionEffect from '../profile-motion/ProfileMotionEffect.svelte';
  import ProfileReferenceCard from '../ProfileReferenceCard.svelte';
  import ProfileEnvironmentLayer from '../ProfileEnvironmentLayer.svelte';
  import snapshot from './tjzProfileSnapshot.json';

  export let reducedMotion = false;
</script>

<div class="tjz-profile" style={snapshot.styles.page}>
  <ProfileEnvironmentLayer {snapshot} mode="preview" {reducedMotion} />
  <div class="tjz-profile__card">
    <ProfileMotionEffect motionKey="profile_motion_perspective_tilt" inputSurface="container">
      <ProfileReferenceCard {...snapshot.props} entryAnimation={reducedMotion ? 'none' : snapshot.props.entryAnimation} />
    </ProfileMotionEffect>
  </div>
</div>

<style>
  .tjz-profile { position: relative; display: grid; min-height: 430px; place-items: center; padding: 36px 24px; border-radius: 0 0 16px 16px; overflow: hidden; isolation: isolate; }
  .tjz-profile__card { position: relative; z-index: 1; width: 100%; min-width: 0; }
  @media (max-width: 600px) { .tjz-profile { min-height: 340px; padding: 28px 16px; } }
</style>
