# Competitor Profile Parity Milestone 9 — Lifetime Premium Fulfillment

## Goal

Offer one clear **$7.99 USD lifetime** Chromadie Plus purchase that expands
profile expression without selling rank, rolls, rewards, achievements, or
prestige.

## Vertical slice

- `chromadie_plus` is the canonical expression entitlement.
- Existing `atelier_plus` owners are backfilled and both keys remain readable
  during migration.
- `/pricing` compares the complete free profile with Plus; authenticated buyers
  enter a server-created Stripe Checkout session.
- Checkout restore verifies an owner/session pair but cannot grant access.
- A raw-body, signature-verified Stripe webhook is the only commerce path that
  grants or revokes Plus.
- Billing customer, checkout, event, and access rows are service-owned and
  hidden from browser roles.
- Refund and chargeback events remove Stripe-sourced presentation access while
  retaining a 30-day media recovery marker. Gameplay and profile content are
  untouched.
- The authoritative staff flag independently supplies the same expression
  entitlement.

## Compatibility and rollout risks

- Keep `atelier_plus` until all deployed configuration/equip code reads
  `chromadie_plus`; no destructive key migration occurs here.
- Deploy the additive migration before the three Edge Functions and `/pricing`.
- Configure `SITE_URL`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET` only as
  Supabase secrets. Stripe must send the four accepted event types to
  `stripe-premium-webhook`.
- A rollback removes the client route and disables the functions. Existing
  billing/event rows and entitlements remain available for reconciliation.
- Rich-media deletion is outside this milestone. The recovery deadline is the
  contract consumed by Milestone 10 cleanup.

## Acceptance

- Contract tests cover the fixed product, legacy compatibility, missing
  sessions, authentication boundaries, and forged/stale signatures.
- Database security tests cover failed-event retry, successful completion,
  duplicate delivery, refund revocation, browser grants, and the 30-day
  recovery window.
- Required repository validation and local schema lint/reset must pass before
  release. A live Stripe test-mode purchase/refund remains an operator release
  check because it requires project secrets and a configured webhook endpoint.
