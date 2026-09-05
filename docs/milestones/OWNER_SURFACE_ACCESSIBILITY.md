# Milestone — Owner Surface Accessibility

Status: complete on 2026-09-04.

## Goal

Make implemented, durable player systems visible and actionable without
creating duplicate records or moving authority into the client. This milestone
covers progression records, profile content configuration, and rivals.

## Delivered Vertical Slices

### Progression record

- `/progression` supports Journey, Achievements, Collection, and History tabs.
- Tabs are canonical, direct-linkable, mobile-safe, and lazy-loaded.
- Achievements expose unlocked/locked state, derivable progress, filters, and
  existing badge pinning.
- Collection exposes current condition names and hints for both found and
  locked entries, with archived discoveries retained visibly.
- History uses compact event rows and a 40-record keyset page.
- Pending unlocks are acknowledged through an owner queue without changing the
  source event records.

### Profile Studio content

- The existing heading, Markdown, project, and approved provider-widget
  editors are available under Studio's Content tab.
- Changes share Studio's draft, preview, validation, dirty-state, reset, and
  publish flow.
- Existing structured configuration limits and safe renderer contracts remain
  authoritative.

### Rivals

- Signed-in players can open a Rivals tab from Leaderboard.
- The view shows every existing rival up to the established capacity of five,
  with today's score only where activity privacy permits.
- Inaccessible rivals are represented by sparse removable placeholders so a
  block cannot trap an owner at the follow cap.
- New follows continue to enforce profile, interaction, block, rate-limit, and
  capacity policy.

## Data and Compatibility

- `get_my_profile_history` reads existing profile events through an owner-only
  keyset interface.
- `get_my_condition_collection` derives discoveries from existing events and
  returns a bounded aggregate.
- `get_my_rivals` reads existing follows while redacting identity and activity
  according to block and privacy state.
- `toggle_follow` changes only the removal order for an existing relationship;
  all checks still apply before creating a relationship.
- Migrations are additive except for the compatible RPC replacement. No tables,
  historical rows, routes, share URLs, or public profile contracts are removed.

## Acceptance and Validation

- Focused route, data-contract, component, and database-policy tests cover all
  three slices.
- The full application build, Svelte checks, repository ESLint, 524-test suite,
  clean database reset, schema lint, and owner-surface SQL behavior suite pass.
- Repository-wide drift, generated scoring-spec, security, performance, CSP,
  link, and authenticated Chromium checks pass. Browser coverage includes
  desktop, mobile, reduced motion, Progression records, Studio Content, and
  Rivals.
- The local public-release configuration passes when
  `PREVIEW_PROTECTION=off`. Live Cloudflare verification still requires the
  deployment account ID, Pages project, and API token in the release
  environment; no production secret is stored in the repository.
