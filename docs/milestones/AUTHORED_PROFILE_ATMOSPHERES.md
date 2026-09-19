# Authored profile atmospheres — 2026-09-19

Audit: twelve video plates share a renderer that replaces video nodes with posters
on visibility changes. Unexpected pause events have no recovery handler; queued
recovery animation frames survive teardown. Customize can therefore show a paused
video as animated. The existing Prism Dust canvas is retained.

Plan: replace four plates with deterministic, layered Canvas scenes: Loveglass
(dust-light), Sakura Afterglow (snowfall), Crimson Ink (ink-bloom), and Cyber Silk
(paper-shadow). Author distinct silhouettes, materials, depth and motion; keep the
identity region legible. Share rendering between public profiles and Customize.
Keep the remaining video nodes stable through ordinary pause/resume and bound all
recovery work. Validate actual frame progression, not just animated CSS classes.

Compatibility: stable item/renderer IDs, costs, rarity, entitlement and progression
references. A metadata-only reversible catalog migration renames the four items;
no profile, ownership, RLS, RPC or schema changes. Keep old media for rollback.
Homepage specimens using these IDs intentionally receive the refreshed effects.

Acceptance: four distinct authored scenes at desktop/mobile and compact sizes;
no video downloads for those scenes; static reduced-motion and explicit pause;
hidden/offscreen suspension, Customize-style hide/show and scene switching;
retained video unexpected-pause recovery; keyboard/click-through; bounded pixels
and 30fps motion; complete mandatory validation and updated decision/progress/log.

## Validation

The browser study exercises the production ProfileEnvironmentLayer in Studio and
public modes, verifies changing canvas pixels, compact stills, paused/reduced
motion, hidden documents, offscreen/hide-show recovery, scene switching, keyboard
links, no replacement video requests and unmount. Retained Rain Window and Silk
Folds recover injected pauses. Desktop and 390px screenshots were reviewed.
Evidence: `artifacts/profile-atmospheres/results.json` and adjacent screenshots.
This is shared-renderer coverage rather than an authenticated publish-flow audit.

631 unit tests and the full mandatory validation suite pass; local DB reset and
strict schema lint pass. Aggregate asset-catalog advisories remain non-blocking.
The migration has been applied only locally. No production deployment performed.
