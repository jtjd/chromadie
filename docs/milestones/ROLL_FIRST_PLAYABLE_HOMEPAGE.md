# Roll-First Playable Homepage

## Objective

Make the homepage demonstrate Chromadie through the real daily roll. The first
viewport should explain and play the product before introducing profiles as the
lasting result of play.

## Scope

- Mount the existing authoritative Roll experience at `/`.
- Use one primary pre-roll action and state-aware post-roll actions.
- Keep pre-roll guest signup quiet and post-roll signup prominent and truthful.
- Remove scenic/profile-demo marketing and competing homepage controls.
- Explain the Roll, Decode, Compare loop and probability-weighted scoring below
  the first viewport.
- Show only authentic public rolls and profile links in the homepage board.
- Preserve `/roll`, authentication, RLS, score authority, replay behavior, and
  historical records.

## Acceptance

- Desktop and mobile render without horizontal overflow or left-column layout
  shift during condition reveal.
- Result contributors reveal common-first and rarest-last through deliberate
  color, channel, condition, and score beats; reduced motion resolves
  immediately.
- The homepage makes at most one guest discovery request and performs no public
  profile hydration or storage fetch.
- `/roll` is noindex and canonicalizes to `/`.
- Source, browser, build, security, drift, parity, and performance checks pass or
  any pre-existing failure is reported explicitly.
