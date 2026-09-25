# Roll-first homepage and contextual discovery

## Objective

Keep the homepage focused on the playable daily Roll and the existing Today’s
Top Roller. The top roller is the real-profile preview and the visible path to
browse public profiles before a visitor rolls. Remove the additional marketing
sections from the homepage; surface profile, customization, and leaderboard
actions after the result.

This direction supersedes the lower-section composition in
[`HOMEPAGE_PRESENTATION.md`](HOMEPAGE_PRESENTATION.md).

## Plan

1. Preserve the Roll hero, current account behavior, shared header, and bounded
   public top-roll feed.
2. Remove unneeded profile-example, collection, community, pricing, FAQ, and
   signup sections from the homepage composition without deleting their
   standalone components or routes.
3. Keep the existing top roller visible before a roll, with its current public
   profile links and loading, error, empty, and retry states.
4. After a homepage roll, expose clear profile/customization/discovery actions
   for authenticated users and a Browse/Leaderboard path for guests.
5. Update homepage source/browser coverage and product decision/progress logs.

## Routing and risks

No schema, RPC, scoring, reward, auth, or profile-data changes are needed. The
homepage is now the only unchallenged daily-roll route; remove the
separate `/roll` route and `/?view=game` entry rather than preserving a
compatibility alias. Keep `/c/:id` challenge links distinct. Authenticated rolls
remain server-authoritative; guest result messaging and signup behavior remain
truthful. The top-roll preview continues to use only the existing bounded
public projection. Avoid a second data fetch for the same spotlight if the
existing feed can be kept independently of removed sections.

## Acceptance

- The homepage presents the Roll and existing Today’s Top Roller as its main
  content; the top roller links to real public profiles before the visitor
  rolls.
- No removed marketing sections are mounted or referenced by dead homepage
  anchor links.
- `/roll` is no longer an application route; Roll links and signup returns lead
  to `/`, and `/?view=game` resolves to the homepage.
- Homepage post-roll actions route to profile, Customize, or Leaderboard as
  appropriate; the shared challenge route remains available.
- Loading, error/retry, no-top-roll, guest, authenticated, keyboard, reduced
  motion, and mobile states remain usable.
- Relevant unit/browser checks and the mandatory validation suite pass.
- Update `DECISIONS.md`, `PROGRESS.md`, and `CHANGELOG_2_0.md` with final evidence.

## Implementation notes

Implemented and validated. The homepage is the sole daily-roll route; the old
`/roll` page function and `/?view=game` query entry were removed, and all
in-app Roll links and signup returns lead to `/`. The `/c/:id` challenge flow
continues to use the shared Game presentation. No migrations were needed. The
existing bounded spotlight feed remains the top roller source; its normalizer
and error states have direct tests.

Validation passed: production build, Svelte check (0 errors/warnings), ESLint,
all 836 unit tests, internal links, CSP, responsive CSS, enforced performance
budgets, username/balance/catalog drift, 5,000-sample scoring parity, database
security, schema lint, and local database reset. Homepage, account, roll
reliability, and progression browser smokes passed, including desktop/mobile
layouts, reduced motion, and authenticated first-roll rewards. Aggregate
JavaScript/CSS catalog targets remain advisory and exceed their targets;
enforced route budgets pass. The homepage route change itself required no
migration.
