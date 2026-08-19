# ChromaDie Product-Event Contract

**Status:** Phase 9 continuation and progression journey slice, 2026-08-19
**Scope:** Optional in-app product-event measurement only. Cloudflare Web
Analytics remains a separate shell-level service described by the privacy
policy.

## Current boundary

Product events are opt-in. The preference is stored only as
`chromadie-product-analytics-consent` in the current browser's local storage.
An unknown or denied preference produces no product events.

The adapter still dispatches a redacted `chromadie:product-event`
`CustomEvent` in the page. For the progression journey events listed below,
the same consented event also makes a best-effort RPC call that increments one
bounded daily aggregate. The RPC receives only the allowlisted dimensions—no
account id, username, score, HEX value, raw timestamp, or event payload—and
the database stores no raw product-event rows. Legacy product events remain
page-local. The separate owner-opt-in profile-insights boundary below is not a
replacement for this adapter.

Progression aggregates live in the service-only
`progression_analytics_daily` table, are capped per bucket, and are removed
after 90 days by the existing cleanup boundary. A staff/service-only RPC can
read those dimensions for rollout measurement; browser roles cannot read the
table or the aggregate report.

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
| `progression_unlock_seen` | `surface`, `accountMode`, `rolloutStage`, `track` | A published journey unlock was shown or inspected |
| `progression_weekly_focus_viewed` | `surface`, `accountMode`, `rolloutStage` | The existing Color of the Week focus was shown |
| `progression_weekly_focus_completed` | `surface`, `accountMode`, `rolloutStage` | The existing Color of the Week reward was completed |
| `progression_share_started` | `surface`, `accountMode`, `rolloutStage`, `method` | A roll result share action began |
| `progression_claim_started` | `surface`, `accountMode`, `rolloutStage` | A guest began the account-claim flow |

The client contract allowlists event names and property keys, strips control
characters, bounds strings to 48 characters, and accepts booleans only where
the event contract uses them. Callers must never add usernames, email
addresses, profile or account ids, scores, hex colors, draft configuration,
inventory, entitlement keys, guestbook text, report details, block state, or
other moderation data.

Events are observational only. They do not gate routes, rolls, eligibility,
scoring, rewards, purchases, equips, profile publication, social actions, or
metadata.

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
  `ProfileRoll.svelte`, and `ProfileCosmeticsEditor.svelte`
- Regression coverage: `test/phase-9-analytics.test.js`

Any future provider adapter must preserve the same event names and field
allow-list, be injected behind `setProductAnalyticsAdapter`, and add a privacy
and operations review plus tests for consent, redaction, retention, deletion,
failure handling, and no gameplay coupling.
