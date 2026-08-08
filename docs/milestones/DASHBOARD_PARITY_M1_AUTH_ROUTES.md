# Dashboard Parity Milestone 1B — Standalone Authentication Routes

Status: planned; do not start until Dashboard Parity Milestone 0 is closed or
its remaining performance gate is explicitly reclassified. Ship after
Milestone 1A so the new signup page supports one- and two-character usernames
at launch.

## Goal

Replace the homepage sign-in/sign-up overlay with calm, first-class account
pages that feel like part of Chromadie's public profile product. Preserve the
working Supabase authentication client, callback flow, password recovery,
session hydration, canonical profile routing, and account security.

This milestone requires no schema migration and does not change RLS, scoring,
roll eligibility, rewards, purchases, or profile publication.

## Route contract

- `/login` opens the sign-in page.
- `/signup` opens account creation and may receive a validated username draft
  from the homepage claim control.
- `/login?next=<safe-local-path>` and `/signup?next=<safe-local-path>` may
  return the user to an allowlisted same-origin destination after success.
- `/auth/callback` remains the email/provider confirmation boundary.
- `/reset-password` remains the password-update boundary.
- Forgot-password state belongs to the sign-in page and continues using the
  existing recovery request.
- Authenticated visitors who open `/login` or `/signup` are sent to the safe
  requested destination or their canonical profile.
- Invalid, external, encoded, or protocol-relative `next` values fall back to
  a safe application destination.

## Implementation slice

1. Add `login` and `signup` to the central route parser, route metadata, direct
   refresh behavior, and lazy route loader.
2. Reuse the existing `Auth.svelte` form logic inside a full-page auth shell;
   do not create a second authentication implementation.
3. Change desktop and mobile homepage header actions, founder messaging,
   guest/profile prompts, and username claims to navigate to the appropriate
   route instead of opening a dialog.
4. Preserve the claimed username as bounded plain text without placing email,
   passwords, tokens, or other private fields in URLs or analytics.
5. Remove modal focus trapping, body-scroll locking, and overlay CSS only after
   every caller has route parity and regression coverage.
6. Keep `/auth/callback` and `/reset-password` visually coherent with the new
   auth shell without changing token processing.

## Experience requirements

- Sign in and sign up have distinct URLs, headings, browser history, metadata,
  and direct-refresh behavior.
- The page explains the profile value proposition without turning auth into a
  marketing wall or delaying form access.
- Switching between sign in and sign up navigates between routes and preserves
  only safe, relevant state.
- Loading, validation, duplicate username, invalid credentials, unconfirmed
  email, recovery, network failure, and already-authenticated states are
  explicit.
- Keyboard focus starts at the page heading or first invalid field, errors are
  announced, password controls remain accessible, and mobile layouts do not
  overflow.
- Motion honors `prefers-reduced-motion`.

## Compatibility and security risks

- Do not replace or fork the working Supabase auth client as part of this
  presentation/routing milestone.
- Do not weaken username reservation, callback allowlists, session persistence,
  or safe-next validation.
- Do not log credentials, tokens, recovery fragments, or complete auth URLs.
- Preserve existing signup profile creation and authenticated store hydration.
- Keep callback and reset links compatible with already-sent emails.

## Acceptance criteria

- Homepage sign-in, sign-up, and username-claim actions never open an overlay.
- `/login`, `/signup`, `/auth/callback`, and `/reset-password` work by direct
  refresh on desktop and mobile.
- Signup, login, logout, recovery request, callback, and password reset retain
  their current success and failure behavior.
- Safe return navigation is covered against open redirects.
- Browser automation covers homepage-to-auth navigation, route switching,
  signup/login success, keyboard behavior, mobile containment, and an
  authenticated visit to an auth route.
- The complete `AGENTS.md` validation suite passes, including the active
  performance policy.
- Decisions, progress, and changelog documentation are updated before the
  milestone is marked complete.
