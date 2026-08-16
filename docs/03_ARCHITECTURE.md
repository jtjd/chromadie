# Target Architecture

## Principle

The application is profile-centric and module-driven.

Pages remain only where they serve a distinct public or legal purpose. Game systems should be composed into the profile shell.

## Proposed Source Structure

```text
src/
  app/
    AppShell.svelte
    routes.js
    session/
  profile/
    ProfileShell.svelte
    ProfileHero.svelte
    ProfileRenderer.svelte
    ProfileOwnerControls.svelte
    profileContext.js
    moduleRegistry.js
    modules/
      roll/
      links/
      achievements/
      collections/
      timeline/
      activity/
      social/
      stats/
  editor/
    ProfileSettings.svelte
    ProfileStudioWorkspace.svelte
    ProfileCustomizePage.svelte
    ProfileLinksEditor.svelte
    ProfileReferenceLayoutEditor.svelte
  discovery/
    Leaderboard.svelte
    LeaderboardEntry.svelte
  commerce/
    catalog/
  domain/
    rolls/
    profiles/
    cosmetics/
    collections/
    social/
    progression/
  services/
    supabase/
    analytics/
    media/
  styles/
    tokens.css
    foundations.css
    motion.css
    utilities.css
```

Adapt this structure to the existing repository rather than moving everything at once.

## Profile Configuration Model

A profile is rendered from validated structured data.

Conceptual shape:

```js
{
  version: 1,
  theme: {
    signatureColor: "#7C5CFF",
    surfaceStyle: "glass-soft",
    backgroundId: "deep-space",
    fontPairId: "default-modern",
    motionLevel: "ambient"
  },
  layout: {
    layoutVariant: "full-bleed",
    modules: [
      { id: "roll", variant: "hero-integrated", order: 0, size: "wide" },
      { id: "links", variant: "icons", order: 1, size: "compact" },
      { id: "achievements", variant: "showcase", order: 2, size: "wide" }
    ]
  }
}
```

Never store raw executable markup.

## Module Contract

Every profile module should define:

- Stable module type.
- Versioned configuration schema.
- Visibility rules.
- Owner and visitor render behavior.
- Minimum and maximum size.
- Empty state.
- Loading and error state.
- Mobile behavior.
- Entitlement or unlock requirements.
- Analytics events where applicable.

## State Boundaries

Separate:

- Auth/session state.
- Canonical server profile data.
- Editable draft profile configuration.
- Local UI state.
- Roll transaction state.
- Catalog and entitlement state.

Do not allow profile editing state to mutate canonical data until an explicit save succeeds.

## Roll Integration

Keep roll execution server-authoritative.

The profile module controls presentation only:

1. Request eligibility/status.
2. Begin visual sequence.
3. Execute existing secure roll RPC.
4. Receive canonical result.
5. Update local stores from canonical response.
6. Animate profile consequences.
7. Revalidate affected profile data.

Never determine a winning result, score, reward, rarity, or eligibility in animation code.

## Compatibility

Maintain current public routes during migration.

Possible route map:

- `/` → public landing/onboarding; signed-in visitors receive an owner-profile
  CTA without changing the root route.
- `/?view=game` → compatibility Roll route for guest play and old links.
- `/u/:username` → public profile.
- `/leaderboard` → public roll leaderboard with Today and This month views.
- `/shop` → decoration studio or preserved redirect.
- `/profile` → redirect to own profile.
- Legal/auth/challenge routes remain explicit.

## Performance

- Lazy-load noncritical modules.
- Avoid mounting editor code for public visitors.
- Defer media, particles, and embeds.
- Establish a motion and media budget.
- Render useful HTML before heavy effects.
- Optimize profile OG metadata independently of the interactive client.
