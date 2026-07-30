# Phase 11 Visual Contract — Continuous Profile Composition

Status: implementation contract for the Phase 11 slice.

## Composition

The public profile is one authored canvas. It has a single opening composition
that combines identity and the daily/latest color, followed by a quiet
supporting line for links, signature expression, and one story trace. The
supporting line is continuation, not a row of equal cards.

The opening composition must use atmosphere, scale, color, alignment, and
whitespace as its primary structure. A border or filled surface may appear only
when it clarifies a meaningful interaction or a roll state. The default public
page must not expose visible labels such as “featured,” “long game,” “profile
connections,” or “public boundary.”

## Responsive contract

| Viewport | Required visible result |
| --- | --- |
| 1440×900 | The opening composition and supporting expression/story line are visible without vertical scrolling; the page reads as one canvas. |
| 1280×720 | Identity, the roll/latest color, and at least one supporting expression remain visible without scrolling. |
| 390×844 | Identity is first, the roll/latest color follows immediately, and supporting expression begins intentionally after it; no horizontal overflow. |

Desktop uses a calm two-part opening: identity carries the name and mood while
the roll carries the color moment and one clear owner action. Mobile stacks the
same relationship without compressing it into a dashboard grid.

## Interaction and compatibility

- The owner roll remains the existing server-authoritative `ProfileRoll` flow.
- Public visitors receive the existing latest-result projection only.
- Roll details, story history, social controls, owner editing, configuration,
  account management, entitlements, and legacy controls remain reachable below
  the opening composition.
- Keyboard focus, reduced motion, loading, error, empty, private, blocked, and
  unavailable states retain their existing behavior.
- No schema, route, authentication, RLS, scoring, reward, economy, entitlement,
  social, moderation, or deployment behavior changes.
