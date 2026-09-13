# Name motion quality — 2026-09-12

## Plan and scope

1. Curate Studio to Raster Signal, Fuzzy, Kinetic Echo, Neon Particle and Scramble,
   plus five explicitly requested additions: Star Companions and Heart Pop (cute),
   Ion Sweep and Phase Fracture (cool), and Letterpress (neutral).
2. Rebuild the broken clipped-letter shuffle as a fixed-advance cipher resolve,
   with a long readable hold and grapheme-safe replacement characters.
3. Preserve Raster's selected material and plain name color; polish Neon's
   particle birth/death and glint envelopes, including font-cache invalidation.
4. Verify actual browser frames at desktop/mobile sizes, material changes,
   scrambling/rest states and reduced motion; run the mandatory suite.

## Compatibility

The shelf curation follows the cursor shelf precedent. The five new motions
use additive free catalog rows and a finite shop constraint extension in
`20260912120000_authored_name_motions.sql`; no ownership deletion, reward or
purchase-authority change. The migration was applied locally first, then to
linked production on 2026-09-13.
Old IDs remain valid and saved motions still render. An equipped older choice
stays available in the editor so owners can keep it or deliberately replace it.
Existing unrelated homepage work is outside this slice. Five new stable
renderer/item IDs are added; historical keys remain unchanged.

## Acceptance

Only the ten curated choices plus an existing selection appear in Studio.
All ten preserve the name material and render complete, static identities
under reduced motion. Scramble must actually change characters, preserve
layout and return to the exact full name. Particle emissions must fade to zero
at lifecycle boundaries. Fuzzy and Kinetic Echo retain their current gestures.


## Validation — completed locally

- `npm run build`, `npm run check`, `npx eslint src/`, and `npm test`: pass
  (619 tests; no Svelte errors or warnings).
- Required links, CSP, performance, username-policy drift, balance drift,
  catalog drift, scoring parity and database-security checks: pass locally.
- `npm run db:reset` and
  `supabase db lint --local --level warning --fail-on warning`: pass.
- Remote verification: `supabase migration list --linked` reports
  `20260912120000` applied; a read-only catalog query reports 20 active Name
  Motions, all five authored free rows, and `shop_version`
  `2026-09-12T12:00:00Z`.
- The database audit now checks 117 active rows, 20 historically supported
  Name Motions, and the five new free rows explicitly. Earlier audit failures
  were stale expected catalog counts; no security assertion was removed.
- Browser matrix: 13,608 font/material/motion frames, plus 812 focused frames
  covering active scrambling, all new motions, long/short names, edits and
  reduced motion. Five mounted mobile name components remain static with
  complete materials under reduced motion.
- Desktop, mobile and mounted reduced-motion screenshots reviewed in
  `/tmp/chromadie-name-motion-quality/`; full matrix evidence in
  `/tmp/chromadie-name-materials/`. Run
  `node scripts/browser/name-motion-quality-smoke.mjs` to regenerate.

No production catalog comparison was performed: the catalog checker ran its
local mode. The production database migration was applied after linked-history
verification; no separate application-hosting deployment or account-data
change was performed by this agent. Historical effects are hidden from the
Studio shelf except an existing selection; their server catalog rows remain
compatible.
