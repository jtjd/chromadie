<script>
export let accent = '#8B7CF6';
export let secondaryAccent = '#71D6FF';
export let rollState = 'idle';
export let rollColor = '';

$: safeRollState = ['rolling', 'settled'].includes(rollState) ? rollState : 'idle';
$: safeRollColor = rollColor || accent;
</script>

<div
  class={'profile-atmosphere profile-atmosphere--' + safeRollState}
  style={'--atmosphere-accent: ' + accent + '; --atmosphere-secondary: ' + secondaryAccent + '; --atmosphere-roll-color: ' + safeRollColor + ';'}
  aria-hidden="true"
>
  <span class="profile-atmosphere__core"></span>
  <span class="profile-atmosphere__corner profile-atmosphere__corner--top"></span>
  <span class="profile-atmosphere__corner profile-atmosphere__corner--bottom"></span>
  <span class="profile-atmosphere__roll-flare"></span>
  <span class="profile-atmosphere__roll-ring"></span>
  <span class="profile-atmosphere__vignette"></span>
  <span class="profile-atmosphere__grain"></span>
</div>

<style>
  .profile-atmosphere {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
    background: #07080b;
    isolation: isolate;
  }

  .profile-atmosphere__core,
  .profile-atmosphere__corner,
  .profile-atmosphere__roll-flare,
  .profile-atmosphere__roll-ring,
  .profile-atmosphere__vignette,
  .profile-atmosphere__grain {
    position: absolute;
    inset: 0;
  }

  .profile-atmosphere__core {
    background:
      radial-gradient(ellipse 66% 54% at 50% 42%, color-mix(in srgb, var(--atmosphere-accent) 17%, transparent), transparent 72%),
      radial-gradient(ellipse 48% 38% at 50% 86%, color-mix(in srgb, var(--atmosphere-secondary) 7%, transparent), transparent 74%);
    opacity: 0.9;
    animation: profile-atmosphere-breathe 24s ease-in-out infinite;
  }

  .profile-atmosphere__corner--top {
    inset: -16rem -14rem auto auto;
    width: 34rem;
    height: 34rem;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--atmosphere-accent) 30%, transparent), transparent 70%);
    filter: blur(72px);
    opacity: 0.42;
  }

  .profile-atmosphere__corner--bottom {
    inset: auto auto -19rem -14rem;
    width: 36rem;
    height: 36rem;
    border-radius: 50%;
    background: radial-gradient(circle, color-mix(in srgb, var(--atmosphere-secondary) 20%, transparent), transparent 68%);
    filter: blur(88px);
    opacity: 0.28;
  }

  .profile-atmosphere__roll-flare {
    background: radial-gradient(circle at 50% 46%, color-mix(in srgb, var(--atmosphere-roll-color) 42%, transparent), transparent 42%);
    mix-blend-mode: screen;
    opacity: 0;
  }

  .profile-atmosphere__roll-ring {
    inset: 28% 28% 30%;
    border: 1px solid color-mix(in srgb, var(--atmosphere-roll-color) 58%, transparent);
    border-radius: 50%;
    box-shadow: 0 0 3rem color-mix(in srgb, var(--atmosphere-roll-color) 24%, transparent);
    opacity: 0;
  }

  .profile-atmosphere__vignette {
    background: radial-gradient(ellipse 82% 76% at 50% 44%, transparent 30%, rgba(0, 0, 0, 0.6) 100%);
    z-index: 1;
  }

  .profile-atmosphere__grain {
    z-index: 2;
    opacity: 0.022;
    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.18) 0 0.45px, transparent 0.65px);
    background-size: 17px 17px;
    mix-blend-mode: screen;
  }

  @keyframes profile-atmosphere-breathe {
    0%, 100% { transform: scale(1); opacity: 0.78; }
    50% { transform: scale(1.025); opacity: 0.96; }
  }

  .profile-atmosphere--rolling .profile-atmosphere__core {
    animation: profile-atmosphere-roll-core 1.55s ease-in-out infinite;
  }

  .profile-atmosphere--rolling .profile-atmosphere__roll-flare {
    animation: profile-atmosphere-roll-flare 1.55s ease-out infinite;
  }

  .profile-atmosphere--rolling .profile-atmosphere__roll-ring {
    animation: profile-atmosphere-roll-ring 1.55s ease-out infinite;
  }

  .profile-atmosphere--settled .profile-atmosphere__roll-flare {
    animation: profile-atmosphere-roll-flare 1.15s ease-out;
  }

  .profile-atmosphere--settled .profile-atmosphere__roll-ring {
    animation: profile-atmosphere-roll-ring 1.15s ease-out;
  }

  @keyframes profile-atmosphere-roll-core {
    0%, 100% { transform: scale(1); opacity: 0.9; }
    50% { transform: scale(1.09); opacity: 1; }
  }

  @keyframes profile-atmosphere-roll-flare {
    0% { opacity: 0; transform: scale(0.72); }
    28% { opacity: 0.72; }
    100% { opacity: 0; transform: scale(1.3); }
  }

  @keyframes profile-atmosphere-roll-ring {
    0% { opacity: 0; transform: scale(0.58); }
    18% { opacity: 0.68; }
    100% { opacity: 0; transform: scale(1.36); }
  }

  @media (prefers-reduced-motion: reduce) {
    .profile-atmosphere__core,
    .profile-atmosphere--rolling .profile-atmosphere__core,
    .profile-atmosphere--rolling .profile-atmosphere__roll-flare,
    .profile-atmosphere--rolling .profile-atmosphere__roll-ring,
    .profile-atmosphere--settled .profile-atmosphere__roll-flare,
    .profile-atmosphere--settled .profile-atmosphere__roll-ring {
      animation: none;
    }

    .profile-atmosphere--rolling .profile-atmosphere__roll-flare,
    .profile-atmosphere--settled .profile-atmosphere__roll-flare {
      opacity: 0.2;
    }

    .profile-atmosphere--rolling .profile-atmosphere__roll-ring,
    .profile-atmosphere--settled .profile-atmosphere__roll-ring {
      opacity: 0.16;
    }
  }
</style>
