# Dedicated Progression Destination

Status: implemented — 2026-08-19

## Objective

Make progression a first-class identity destination instead of an account
subsection inside Profile Studio. The destination should feel like the rest of
Chromadie, work across viewport sizes, and give players a durable place to
understand what their rolls have become.

## Implementation

- Added the lazy `/progression` route and reserved the segment from username
  parsing.
- Added `ProgressionPage.svelte`, a normal-shell full-page composition with
  rank/EP context, Roll and Customize actions, and loading, signed-out,
  unavailable, fetch-error, and reduced-motion states.
- Reused `loadProfileContext()` and the existing `get_my_progression` RPC via
  `ProfileProgression.svelte`; no client scoring, reward, inventory, or
  prestige authority was introduced.
- Removed the visible progression section from Profile Studio. Studio remains
  the structured profile expression and publishing surface.
- Added destination links to authenticated header/footer navigation, Studio's
  More menu, the Studio overview, roll context, and the owner profile proof.
- Redirected legacy `#progression` settings bookmarks to `/progression`.
- Added the `progression` aggregate analytics surface through an additive SQL
  migration. Consent, service-only storage, 90-day retention, and aggregate
  dimensions remain unchanged.

## Compatibility and risk

The route is owner-only and `noindex,follow`. Signed-out visitors are not
shown fabricated account progress; they receive bounded login and guest-roll
paths. Existing Studio hashes remain normalized, with `progression` handled as
a one-way route redirect. The only schema change expands an allow-listed
analytics surface and redefines the same bounded recorder function; gameplay,
RLS, scoring, rewards, inventory, profile publication, and historical data are
unchanged.

## Acceptance criteria

- `/progression` is a real lazy-loaded route with a full responsive page.
- Authenticated navigation and relevant product surfaces link to it.
- Profile Studio no longer presents progression as an editor destination.
- Old progression hash links land on the dedicated page.
- Loading, guest, unavailable, error, keyboard, and reduced-motion behavior is
  covered without weakening server authority.
- Route, component, build, test, database, security, and documentation checks
  pass before release.
