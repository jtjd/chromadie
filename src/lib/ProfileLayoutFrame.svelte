<div class="profile-layout-frame">
  <slot></slot>
</div>

<style>
  /* Geometry only: the profile border owns the perceived surface and the
     shell supplies the layout/device context through its page classes. */
  .profile-layout-frame {
    display: grid;
    width: min(100%, var(--profile-layout-width, 300px));
    min-width: 0;
    margin-inline: auto;
  }

  :global(.profile-shell-page--compact) .profile-layout-frame { --profile-layout-width: 300px; }
  :global(.profile-shell-page--sleek) .profile-layout-frame { --profile-layout-width: 335px; }
  :global(.profile-shell-page--minimal) .profile-layout-frame { --profile-layout-width: 280px; }
  :global(.profile-shell-page--modern) .profile-layout-frame { --profile-layout-width: 310px; }
  :global(.profile-shell-page--portfolio) .profile-layout-frame { --profile-layout-width: 320px; }
  :global(.profile-shell-page--preview-mobile.profile-shell-page--minimal) .profile-layout-frame { margin-inline: auto; }

  .profile-layout-frame > :global(*) { min-width: 0; }
  :global(.profile-shell-page--sleek) .profile-layout-frame { row-gap: .55rem; }
  :global(.profile-shell-page--modern) .profile-layout-frame { row-gap: .35rem; }

  @media (prefers-reduced-motion: reduce) {
    .profile-layout-frame { scroll-behavior: auto; }
  }
</style>
