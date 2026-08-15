# Design System

## Visual Goal

Chromadie should feel seamless, modern, immersive, and expensive without becoming visually noisy.

Reference qualities—not literal copies—from guns.lol and catchii:

- Strong identity hero.
- Full-page composition.
- Smooth transitions.
- Controlled depth and glass.
- Minimal visible application chrome.
- Media and links integrated into the composition.
- Clear focal points.

## Chromadie Difference

Color history and earned progression should generate the aesthetic.

A profile should not merely host game widgets. Its rolls, signature color, collections, and accomplishments should influence the visual environment.

## Default Experience

The default profile must already be shareable and attractive.

A new free user receives:

- A polished responsive layout.
- Signature color selection.
- Avatar, username, bio, and links.
- Integrated roll presentation.
- A small set of quality backgrounds and module variants.
- Enough control to produce a meaningfully distinct profile.

## Hierarchy

Recommended priority:

1. Identity and atmosphere.
2. Today's roll or latest result.
3. Links and creator content.
4. Signature accomplishments.
5. Collections and story.
6. Social activity.
7. Supporting statistics.

Not every profile must use the same order, but the editor must prevent incoherent layouts.

## Design Tokens

Create tokens for:

- Backgrounds and surfaces.
- Text hierarchy.
- Accent and signature color.
- Spacing.
- Radius.
- Blur.
- Elevation.
- Typography.
- Motion duration and easing.
- Content width.
- Module gaps.
- Responsive breakpoints.

Components must consume tokens rather than scattered literals.

### Current typography contract

The approved homepage and Profile Studio references use Clash Display for
display identity, major headings, the wordmark, and prominent short labels;
Inter is used for navigation, body copy, metadata, editor controls, and
supporting interface text. These two families are bundled and loaded with
swap-safe fallbacks. Existing game-specific surfaces may retain their own
bundled typography until a separate visual milestone moves them, but Satoshi,
Cabinet Grotesk, and Geist Mono are not the reference authority for the
homepage or Profile Studio.

The visual reference is typographic and atmospheric: near-black canvas, thin
rules, quiet capsule controls, restrained surfaces, subtle grain, and one
profile-derived accent. Chromadie retains its own daily color response and
earned progression so the reference informs the composition without turning
the product into a copy of a personal portfolio site.

## Customization Boundaries

Allow:

- Curated layout templates.
- Module ordering and supported sizing.
- Theme presets.
- Signature and accent colors.
- Approved font pairs.
- Backgrounds, ambient effects, borders, and transitions.
- Music and approved embeds where entitlement permits.
- Link arrangements.
- Visibility controls.

Do not allow:

- Raw HTML.
- Arbitrary JavaScript.
- Arbitrary CSS.
- Inaccessible color combinations in system-owned controls or defaults.
- Invisible controls.
- Layout positions that break mobile behavior.
- Autoplay audio without user interaction.
- Effects that obscure core actions.

## Motion

Motion should make the page feel alive and explain transitions.

Use:

- Ambient background movement.
- Subtle depth shifts.
- Roll-triggered environmental response.
- Smooth module expansion and reordering.
- Reward reveal sequences.

Avoid:

- Constant high-energy motion.
- Layout shift.
- Long unskippable sequences.
- Animation that harms readability.
- Multiple unrelated effects competing simultaneously.

Provide reduced-motion equivalents.

Profile owners may choose exact appearance colors, including combinations with
low contrast. The structured appearance editor does not rewrite, warn about,
or block those saved values. Defaults and dashboard controls remain designed
for accessibility; this exception applies only to owner-authored public
profile appearance values.

## Mobile

The mobile profile is not a compressed desktop dashboard.

Requirements:

- Identity remains visible.
- Roll remains obvious and reachable.
- Links remain easy to tap.
- Modules stack intentionally.
- Editor controls use dedicated mobile interactions.
- Background effects preserve battery and performance.
- Text and interactive targets meet accessibility standards.
