# Product Direction Addendum — Profile First

Status: active product direction for Phase 10 and future milestones.

Chromadie is a social identity game whose profile evolves through daily color
rolls. The product north star remains:

> The profile is the game. The game is the profile.

The original Phase 0–9 infrastructure remains valuable and is preserved. The
live presentation, however, must stop behaving like a game dashboard. A
visitor should first think, “I wish my personal website looked like this,”
before needing to understand the game behind the identity.

## Default public composition

The default profile is a composed personal website, not an equal-weight grid
of widgets. Its primary visual hierarchy has no more than four regions:

1. identity;
2. today’s roll or latest result;
3. selected links or another expression surface;
4. one featured collection, accomplishment, or story surface.

Typography, whitespace, alignment, media, color, and atmosphere establish the
composition before borders and card containers. The identity and roll lead on
mobile. At 1440×900 the complete primary composition fits without vertical
scrolling; at 1280×720 identity, the roll, and supporting expression remain
visible.

The four-region rule is a ceiling on competing content, not a request to draw
four cards. The default page should feel like one continuous authored canvas.
If the page can be described as “a hero followed by cards,” it has not reached
the intended direction, even when the card count is small.

## Presentation boundaries

Editing, configuration, detailed statistics, moderation, account management,
entitlements, and large histories are detail or owner surfaces. Secondary
statistics, timelines, achievement grids, collection grids, and social modules
remain available but are collapsed or moved behind deliberate detail views.

The visible public-boundary/developer-explanation module, redundant edit/
explore/shop/share calls, and dashboard-like owner/visitor labels do not belong
in the default public hierarchy.

## Compatibility rule

Demoting a feature is not deleting its data or authority. Authentication, RLS,
secure roll RPCs, anti-reroll behavior, scoring, rewards, rarity, economy,
shop ownership, entitlements, history, cosmetics, public/private behavior,
direct-refresh routes, old share links, social data, moderation boundaries,
and deployment behavior remain stable. Existing structured configuration is
projected into the smaller composition; `legacy=1` remains the compatibility
escape hatch while detail surfaces evolve.

Phase 10 implements only this presentation reconciliation. Avatar uploads,
Cloudflare media, Spotify, new social features, notifications, messaging,
broader discovery, monetization, SvelteKit, unrestricted customization, and
unrelated cleanup remain outside the phase.

Related documents: [`docs/12_NEXT_PHASES_ROADMAP.md`](12_NEXT_PHASES_ROADMAP.md),
[`docs/milestones/PHASE_10_VISION_RECONCILIATION.md`](milestones/PHASE_10_VISION_RECONCILIATION.md),
[`docs/milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md`](milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md),
and [`checklists/PROFILE_FIRST_GATE.md`](../checklists/PROFILE_FIRST_GATE.md).
