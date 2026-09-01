# ChromaDie Product-Event Contract

**Status:** Phase 9 continuation and progression journey slice, 2026-08-20
**Scope:** Optional in-app product-event measurement only. Cloudflare Web
Analytics remains a separate shell-level service described by the privacy
policy.

## Current boundary

Product events are opt-in. The preference is stored only as
`chromadie-product-analytics-consent` in the current browser's local storage.
An unknown or denied preference produces no product events.

The adapter still dispatches a redacted `chromadie:product-event`
`CustomEvent` in the page. A consented progression event is accepted for the
server aggregate only when `accountMode` is `authenticated`; it then makes a
best-effort RPC call that increments one bounded daily aggregate. Guest
progression attempts do not become progression aggregates. The RPC receives
only the allowlisted dimensions—no account id, username, milestone id, score,
HEX value, raw timestamp, local dedupe key, or event payload—and the database
stores no raw product-event rows. Legacy product events remain page-local. The
separate owner-opt-in profile-insights boundary below is not a replacement for
this adapter.

Progression aggregates live in the service-only
`progression_analytics_daily` table, are capped per bucket, and are removed
after 90 days by the scheduled cleanup boundary. The final progression RPC
only upserts the current UTC bucket; it must never perform table-wide cleanup
on the roll or profile hot path. A staff/service-only RPC can read those
dimensions for rollout measurement; browser roles cannot read the table or the
aggregate report.

The progression `surface` dimension is allow-listed at the database boundary;
the current owner destination uses `progression`, while the existing roll and
Studio surfaces retain their established values.

## Allowlisted events

| Event | Allowed properties | Meaning |
| --- | --- | --- |
| `route_view` | `route` | A client route became active |
| `public_profile_view` | `viewer` | A live profile projection loaded; value is `owner` or `visitor` |
| `roll_ready` | `surface`, `accountMode` | An existing roll surface became ready; values identify only the surface and guest/auth mode |
| `roll_completed` | `surface`, `accountMode`, `isReroll` | An existing server response passed canonical normalization |
| `profile_shared` | `surface`, `method` | A supported profile-share action completed |
| `cosmetic_preview` | `slot`, `context` | A structured profile expression entered the Customize preview |
| `cosmetic_equip` | `slot`, `context` | The existing equip RPC succeeded from Customize |
| `progression_viewed` | `surface`, `accountMode`, `rolloutStage` | The progression journey became visible |
| `progression_roll_completed` | `surface`, `accountMode`, `rolloutStage` | A server-confirmed roll completed on a journey surface |
| `progression_goal_viewed` | `surface`, `accountMode`, `rolloutStage`, `track` | A goal node became materially visible; the current client uses a 50% `IntersectionObserver`, not hover or focus |
| `progression_unlock_seen` | `surface`, `accountMode`, `rolloutStage`, `track` | Compatibility event for an explicit unlock visibility/inspection signal; never infer it from hover, focus, or a locked-node render |
| `progression_unlock_presented` | `surface`, `accountMode`, `rolloutStage`, `track` | `present_progression_unlocks` successfully recorded the live unlock's `presented_at` transition and the queue displayed it; locally deduped |
| `progression_reward_previewed` | `surface`, `accountMode`, `rolloutStage`, `track` | The canonical catalog/renderer preview loaded for an earned reward; not merely a hover or an attempted request |
| `progression_reward_equipped` | — | Final SQL RPC allowlist only; not currently accepted/emitted by `src/lib/productAnalytics.js`. The current successful Profile Studio equip remains `cosmetic_equip` |
| `progression_unlock_acknowledged` | `surface`, `accountMode`, `rolloutStage`, `track` | `acknowledge_progression_unlocks` successfully closed the live unlock; not a click proxy, locally deduped |
| `progression_milestone_completed` | — | Final SQL RPC allowlist only; not currently emitted by the browser. Completion remains authoritative in the progression ledger/grant path, never in analytics |
| `progression_cta_used` | `surface`, `accountMode`, `rolloutStage`, `track`, `action` | A supported progression CTA was activated, such as opening Profile Studio; not a view or hover |
| `progression_weekly_focus_viewed` | `surface`, `accountMode`, `rolloutStage` | The existing Color of the Week focus was shown |
| `progression_weekly_focus_completed` | `surface`, `accountMode`, `rolloutStage` | The existing Color of the Week reward was completed |
| `progression_share_started` | `surface`, `accountMode`, `rolloutStage`, `method` | A roll result share action began |
| `progression_claim_started` | `surface`, `accountMode`, `rolloutStage` | A claim flow was requested; guest calls are not accepted by the authenticated-only progression aggregate |

The client contract allowlists event names and property keys, strips control
characters, bounds strings to 48 characters, and accepts booleans only where
the event contract uses them. Callers must never add usernames, email
addresses, profile or account ids, scores, hex colors, draft configuration,
inventory, entitlement keys, guestbook text, report details, block state, or
other moderation data.

Events are observational only. They do not gate routes, rolls, eligibility,
scoring, rewards, purchases, equips, profile publication, social actions, or
metadata.

The browser allowlist in `src/lib/productAnalytics.js` currently forwards the
progression lifecycle events above except the two SQL-only names
`progression_reward_equipped` and `progression_milestone_completed`. The final
`20260820000000_progression_core_system.sql` migration accepts those two names
at the database boundary for a future explicit server/client contract; their
presence in the SQL check must not be read as a current browser emission.

Presentation, preview, CTA, and acknowledgement events use local-only dedupe
keys. They are recorded only after the corresponding visible, successful, or
server-confirmed transition. There is no hover proxy: pointer movement, focus,
speculative render, or locked-goal inspection cannot create a progression
aggregate.

The final `record_progression_event` RPC accepts only the listed progression
event names and allowlisted dimensions (`surface`, `account_mode`, `rollout_stage`, and
`track`), normalizes and bounds them, requires an authenticated session for a
browser write, and upserts a capped daily bucket. It never receives raw
identifiers or event payloads. The scheduled cleanup boundary, not this RPC,
owns 90-day retention.

## Consent and deletion rules

- The privacy page is the current consent surface.
- Consent is separate from the existing Cloudflare Web Analytics script; the
  product-event adapter does not claim to control that service.
- Revoking consent prevents future events. Previously recorded progression
  buckets are intentionally anonymous aggregates and cannot be tied back to a
  visitor or account; they expire at the 90-day cleanup boundary.
- The progression recorder must remain aggregate-only. Adding raw events,
  identifiers, or account-linked retention requires a new privacy and
  operations decision before implementation.
- The adapter must not infer consent from authentication.
- The event contract must remain useful when consent is absent; product flows
  cannot depend on event delivery.

## Owner profile-insights boundary

The deployed `20260808170000_profile_insights` migration is a deliberately
separate aggregate recorder for the north-star profile surface. It is enabled
only when both conditions are true:

- the current visitor has explicitly granted product-event consent; and
- the profile owner has explicitly enabled aggregate public-view counts.

The browser keeps a bounded local profile/day recency key and calls only
`record_public_profile_view(p_username text)`. The database retains
`profile_id`, UTC `view_date`, and a capped `view_count`—never a viewer id,
username as an event property, IP address, user agent, exact visit time, or raw
event row. Profile deletion cascades the daily rows, and the scheduled cleanup
removes buckets older than 90 days.

Only the authenticated owner can call `get_my_profile_insights` or
`update_my_profile_insights_settings`. The public recorder cannot read the
aggregate and does not affect profile rendering, social actions, discovery,
roll eligibility, scoring, rewards, purchases, or moderation. Revoking visitor
consent prevents future recorder calls; aggregate rows cannot be tied back to
that visitor.

This is not an analytics export, moderation log, visitor directory, or raw
event sink. Any broader measurement provider still requires a separate
Product/Privacy/Operations review of fields, retention, deletion, access, and
incident ownership.

## Implementation ownership

- Contract and redaction: `src/lib/productAnalytics.js`
- Preference UI: `src/lib/AnalyticsPreferences.svelte`, mounted from the
  privacy policy
- Adapter setup: `src/main.js`; progression aggregate RPCs:
  `record_progression_event` and `get_progression_analytics`
- Event call sites: `App.svelte`, `ProfileShell.svelte`, `Game.svelte`,
  `Game.svelte`, and `ProfileCosmeticsEditor.svelte`
- Regression coverage: `test/phase-9-analytics.test.js`

Any future provider adapter must preserve the same event names and field
allow-list, be injected behind `setProductAnalyticsAdapter`, and add a privacy
and operations review plus tests for consent, redaction, retention, deletion,
failure handling, and no gameplay coupling.
