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
`CustomEvent` in the page. It does not call a network endpoint, write to
Supabase, create cookies, or persist event records. There is no server-side
event sink, retention job, export path, or visitor-analytics database in this
slice.

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
