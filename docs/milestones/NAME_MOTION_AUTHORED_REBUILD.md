# Authored motion quality rebuild

## Scope and plan

Rebuild the twenty collection name motions after feedback identified repetitive
pinwheel shapes and mechanical cycles. Review current rendered frames, then
replace the scene drawings with distinct motion narratives, dimensional shapes,
thematic color, asymmetric staging, and controlled arrival/hold/departure timing.
Review the complete collection at normal and compact sizes, including loop
boundaries and material combinations, before running the required checks.

## Boundaries

Renderer-only changes. Keep saved IDs, catalog ownership, durations, shared
clock, selected name material, and the existing static/reduced-motion behavior.
The earlier five retained favorites remain separate. No migration is needed.

## Acceptance

- Cherry Blossom reads as tumbling individual petals, not spinning flowers.
- All twenty scenes have distinct silhouettes and motivated motion.
- Scenes enter and leave cleanly, without visible reset teleports.
- The name stays readable and its selected material remains visible.
- No clipping at desktop, mobile, short, long, and accented names.
- Shared lifecycle/offscreen behavior, reduced motion, and finite work remain.
- Real browser frames and motion strips are reviewed; required checks pass.

## Implemented scenes

| Motion | Artwork and choreography |
| --- | --- |
| Ribbon Waltz | Shaded silk band unspools, folds, and settles below the name. |
| Firebrand | Traveling ignition, separate flame tongues, ember arcs, cooling trail. |
| Sword Flourish | Faceted steel and brass sword, quick curved sweep, impact, recovery. |
| Ink Impact | Pressure-varying scarlet brush stroke, pigment ridges, late droplets. |
| Wax Seal | Irregular wax rim, compression, inset gold device and reflected light. |
| Cherry Blossom | Compact branch, stationary blossom, individual cupped drifting petals. |
| Butterfly Kiss | Veined wing pairs with perspective flap, approach, perch, departure. |
| Bubble Bath | Unequal iridescent bubbles, curved ascent, wobble and separate pop phase. |
| Kitten Paws | Alternating offset stamps with local arrival opacity and lingering trail. |
| Dandelion Wish | Recognizable seed head, detailed pappus, staggered seed release. |
| Rose Romance | Growing stem, leaves and sepals, overlapping curled bloom petals. |
| Raven Feather | Asymmetric iridescent vane and barbs with a restrained drifting bank. |
| Falling Ace | Front/back card faces, perspective flip, diagonal fall and final flick. |
| Crown Glint | Metal facets, jewel details, seating motion and surface glints. |
| Meteor Skip | Three continuous diminishing arcs with contact rings and dissipating tails. |
| Laurel Grow | Two growing leafy branches frame the name and turn gold. |
| Paper Plane | Folded wings and shaded underside, tangent-facing bank and departure. |
| Tide Pool | Curved basin, irregular traveling crest, refraction and settling ripples. |
| Firefly Dance | Tiny winged bodies, staggered warm pulses and short fading wakes. |
| Confetti Parade | Varied paper silhouettes launch, tumble, fall and fade in one burst. |

## Review and validation

Reviewed desktop/mobile galleries and twelve-phase sequences for all twenty
motions. Iterative review corrected hidden subjects, flattened butterfly wings,
rectangular water edges, excess path traces, slow sword timing, meteor pauses,
and confetti that stayed behind the lettering. The canvas frame export preserves
actual production renderer pixels without depending on page screenshot tiling.
Evidence: `/tmp/chromadie-motion-authored-verified/`.

The browser matrix passes 5,492 frames: all selected materials, normal/compact
sizes, repeated-frame determinism, stable name alpha coverage, reduced-motion
material equality, twenty mounted components, loop boundaries, and edge checks
for single-character, long, accented, and emoji names. New unit checks cover
opacity inheritance, bounded deterministic variation and the loop envelope.

All required checks pass: build, Svelte check (zero errors/warnings), ESLint,
842 tests, internal links, CSP, performance, username-policy drift, balance drift,
catalog drift, scoring parity (5,000 RGB samples), and database security.
Catalog validation uses the local seed; remote catalog credentials are absent.
Enforced performance budgets pass; aggregate JS/CSS catalog sizes remain advisory
overages. No schema change or migration is needed.
