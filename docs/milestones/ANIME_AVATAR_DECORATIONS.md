# Anime avatar decorations — 2026-09-12

Scope: Sakura Neko, Cloud Bunny, Crimson Ronin, Midnight Oni, Koi Current,
and the requested standalone animated Sakura Petals effect.

Plan: create simple transparent anime artwork, inspect at actual avatar sizes,
add distinct localized choreography, integrate catalog rows through existing
server-authoritative interfaces, and verify browser behavior and required checks.

Compatibility: additive catalog migration `20260912040000` follows the prior
three-decoration migration. Deploy the client before publishing the catalog.
All six are free expression options. Existing purchases, loadouts, RLS and
scoring are unchanged; retiring rows remains the rollback path.

The five illustrated plates use the shared lazy WebGL renderer: cat ear flicks
and ribbons, bunny ear/cloud movement, scarf ripples, blue flame movement, and
koi tails/water. Sakura Petals uses nine independently phased sprite particles
with varied falling lanes, timing and tumbling. Negative delays disperse the
first frame. Foreground compositing keeps petals visible over the portrait.
Reduced motion pauses petals and uses still artwork for illustrated effects.
Offscreen, hidden-tab and disabled states pause animation. Static fallback,
context recovery, failed image loading and cleanup preserve the avatar.

Final assets and exact generation prompts are in
`public/avatar-decorations/ANIME_ARTWORK.md`. The initial application loads only
the small finite registry and shared lazy entry point; artwork and animation
components load when selected.

Acceptance evidence: `artifacts/anime-decorations/desktop.png`, mobile previews,
reduced-motion and successive motion screenshots, and `results.json`.
The browser study covers 86/108/180px avatars, dark and light backgrounds,
390px mobile, dispersed petal startup, movement, reduced motion, offscreen
pausing, context loss/recovery, loop continuity and unmount cleanup.

Delivery is local: neither these six nor the preceding three decorations have
been pushed or applied to the hosted database in this implementation session.

## Final validation

Passed production build, Svelte check (zero errors/warnings), ESLint, all 613
unit tests, links, CSP, username policy drift, balance drift, catalog drift,
5,000-sample scoring parity, and database security. Local database reset applied
both decoration migrations and the seed; local lint found no schema errors.
Enforced performance budgets pass, including dashboard JavaScript at
539.91/540 kB. Existing aggregate catalog advisory targets remain exceeded.

Both authored-decoration browser studies and the existing avatar-creature
regression passed. Reviewed the six-effect desktop study and mobile evidence.
Initial checks caught a small initial-download overage and a registry type
inference error; shared lazy loading, compact registry normalization and numeric
shader typing resolved them. A regression fixture import race was fixed by
loading the isolated study HTML instead of the full application bootstrap.
