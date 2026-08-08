# ChromaDie Product-Event Contract

**Status:** Phase 9 continuation slice, 2026-07-25  
**Scope:** Optional in-app product-event measurement only. Cloudflare Web
Analytics remains a separate shell-level service described by the privacy
policy.

## Current boundary

Product events are opt-in. The preference is stored only as
`chromadie-product-analytics-consent` in the current browser's local storage.
An unknown or denied preference produces no product events.

The current adapter dispatches a redacted `chromadie:product-event`
`CustomEvent` in the page. It does not call a network endpoint, write raw
product events to Supabase, create cookies, or persist event records. The
separate owner-opt-in profile-insights boundary below is not a replacement for
this adapter and does not create a raw product-event sink.

The operational owner for a future production sink is **not assigned**. A
sink cannot be added until Product, Privacy, and Operations approve the event
fields, retention period, deletion process, access controls, and incident
owner.

## Allowlisted events

| Event | Allowed properties | Meaning |
| --- | --- | --- |
| `route_view` | `route` | A client route became active |
| `public_profile_view` | `viewer` | A live profile projection loaded; value is `owner` or `visitor` |
| `roll_ready` | `surface`, `accountMode` | An existing roll surface became ready; values identify only the surface and guest/auth mode |
| `roll_completed` | `surface`, `accountMode`, `isReroll` | An existing server response passed canonical normalization |
| `profile_shared` | `surface`, `method` | A supported profile-share action completed |
| `shop_try_on` | `slot`, `accessTier`, `context` | A structured cosmetic entered the fitting-room preview |
| `shop_equip` | `slot`, `accessTier` | The existing equip RPC succeeded |

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
- Revoking consent prevents future events. The current adapter has no stored
  event records, so there is nothing to delete from a server or database.
- A future adapter must define retention and account/browser deletion behavior
  before it is enabled. It must not infer consent from authentication.
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
- Adapter setup: `src/main.js`
- Event call sites: `App.svelte`, `ProfileShell.svelte`, `Game.svelte`,
  `ProfileRoll.svelte`, `DiscoveryCard.svelte`, and `Shop.svelte`
- Regression coverage: `test/phase-9-analytics.test.js`

Any future provider adapter must preserve the same event names and field
allow-list, be injected behind `setProductAnalyticsAdapter`, and add a privacy
and operations review plus tests for consent, redaction, retention, deletion,
failure handling, and no gameplay coupling.
