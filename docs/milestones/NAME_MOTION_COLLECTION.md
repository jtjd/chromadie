# Authored name motion collection — 2026-09-22

## User feedback revision — 2026-09-22

Browser review found the collection gestures too faint and the repeated letter
waving/jiggling unmotivated. Re-authored the twenty collection effects around a
steady name silhouette. Each now uses a larger, unmistakably animated motif
and a related light or color pass clipped into the existing material. There is
no per-glyph translation, rotation, or scaling in this collection.

Fuzzy, Raster Signal, Star Companions, Heart Pop, and Scramble keep their
existing renderers. The collection IDs, labels, durations, material catalog,
shared animation clock, static/reduced-motion compositor, and Hero Roll remain
unchanged. This follow-up changes no catalog rows, database state, ownership,
profile data, or account behavior.

The updated browser smoke checks that the motifs produce a visible pixel change
at desktop size, preserve name coverage at desktop and compact sizes, remain
deterministic, and resolve to the same material under reduced motion. Visual
captures are in `/tmp/chromadie-name-motion-final`. It passed 4,592 sampled
frames with no failures, a minimum 1,208 changed pixels, and zero name-coverage
loss. Build, Svelte check, ESLint, all 633 tests, links, CSP, performance,
username/balance/catalog drift, 5,000-sample scoring parity, and database
security checks passed. This follow-up changes no schema, so reset and schema
lint were not applicable.

The scope, acceptance, and release notes below document the original collection
launch; this feedback follow-up is renderer-only and makes no catalog or remote
database changes.

## Scope and plan

Preserve Fuzzy, Heart Pop, Raster Signal, Scramble and Star Companions. Replace
five weaker shelf gestures behind their existing owned IDs: Kinetic Echo →
Ribbon Waltz, Neon Particle → Firebrand, Ion Sweep → Sword Flourish,
Phase Fracture → Ink Impact, Letterpress → Wax Seal. Add fifteen original
motions with distinct silhouettes, timing and stories, spanning cute, bold and
neutral tastes. Keep the name readable and its selected material intact.

1. Audit shared Canvas rendering, shelf curation and finite database allowlists.
2. Implement bounded, deterministic gestures in a separate renderer module.
3. Extend canonical motion definitions, seed and additive catalog migration.
4. Review real desktop/mobile frames and reduced-motion output; run applicable
   required validation, updating tests only for changed behavior/contracts.
5. Record evidence and push the scoped commit to main and the linked database.

## Compatibility and risks

No account data, inventory, RLS, RPC, scoring or reward changes. Existing five
IDs gain the replacement artwork and names. Older hidden choices remain
renderable. New entries are free expression, consistent with the current shelf.
The shape constraint must preserve every existing slot's accepted vocabulary.
Canvas artwork must remain within the shared name viewport; short names and
mobile sizes need explicit review. Reduced motion uses the existing static
material fallback and all animation uses the existing shared clock.

Unrelated homepage edits and a pre-existing test-access migration are outside
this milestone and must not be included in its release.

## Acceptance and evidence

Implemented five preserved favorites, five replacements, and fifteen additions:
Cherry Blossom, Butterfly Kiss, Bubble Bath, Kitten Paws, Dandelion Wish, Rose
Romance, Raven Feather, Falling Ace, Crown Glint, Meteor Skip, Laurel Grow,
Paper Plane, Tide Pool, Firefly Dance and Confetti Parade.

The shared production renderer is used by Studio and public profiles; this
work does not introduce new account states or interactions. Decorative canvases
retain the existing semantic name, keyboard behavior, unavailable-renderer
fallback, offscreen suspension and visibility teardown. No media requests.

Local validation: build, Svelte check, ESLint, 633 tests, internal links, CSP,
performance, username/balance/catalog drift, 5,000-sample scoring parity,
database security, local reset and strict database lint pass. The security
audit explicitly checks all fifteen additions are free through the catalog
RPC. Existing aggregate asset-size advisories remain non-blocking; no budgets
were increased. Superseded Neon/echo/fracture/sweep drawing code was removed.

The browser study covers 3,512 frames, all materials at desktop/compact sizes,
one-character, grapheme and long identities, deterministic frames, material
preservation and 20 mounted reduced-motion names. Three-phase desktop/mobile
screenshots and actual mounted components are in
`/tmp/chromadie-name-motion-approved`; run
`node scripts/browser/name-motion-collection-smoke.mjs` to regenerate.
Visual review corrected a stretched fixture, faint ornament details and
correlated confetti trajectories. The browser fixture exercises the production
component; it is not an authenticated end-to-end publishing test.

An initial reset caught a seed trailing comma; catalog count/order assertions
were updated for the additions. An initial route overage was resolved by
removing superseded code and compacting canonical metadata. Final gates pass.

Release verified on 2026-09-22: implementation commit `34ebdf3` pushed to
`origin/main`; linked migration `20260922120000` applied and confirmed in remote
history. The public production catalog matches all 134 active seeded rows.
Only this migration was pushed from an isolated checkout; the unrelated local
Tjz test-access migration was excluded. A clean checkout also passes build,
route budgets, all 633 tests, links and catalog checks. GitHub CI for the
implementation commit passed.

The separate public-release preflight failed because the repository has no
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_PAGES_PROJECT` or `CLOUDFLARE_API_TOKEN`
secrets available to that workflow. No hosting configuration was changed and
frontend deployment is not claimed. This does not prevent the verified main
and database pushes requested for this milestone.
