# Luminous name materials — design review

## Direction

The September 23 drafts were rejected. The primary agent replaced all eighteen
renderers; no Luna artwork remains in the material rendering path. Soft Halo and
Cathode Bloom retain their original code. The collection contains twenty effects
plus Plain.

The corrected direction is bright, readable, restrained, and expressive. There
are no stone/foil faces, mirror bands, scanner lines, or busy geometric overlays.
The eighteen finishes use different combinations of edge construction, surface
texture, light placement, and timing. Glitter and glints are deliberately quieter
at compact sizes, where letter recognition takes priority.

## Research

- [Discord Display Name Styles](https://support.discord.com/hc/en-us/articles/33833879643927-Discord-Display-Name-Styles-FAQ): real profile treatments include neon, gummy, prism, gradients, theme previews, and accessibility controls. This establishes relevance to profile identity, not a sales ranking.
- [GraphicRiver glitter font add-ons](https://graphicriver.net/graphics-with-glitter%2Bfont-in-add-ons): paid glitter/sparkle products with recorded sales support demand for this visual family. These are design-tool products, so their sales are not evidence of demand for any individual Chromadie design.
- [LUMINA by Roman Motsak](https://www.behance.net/gallery/239099941/LUMINA-Holographic-3D-Mesh-Typeface): researched chromatic highlight control. Its mirror-like metal treatment was excluded after the user clarified the direction.

No reference artwork or purchased assets are embedded in the renderer.

## Eighteen replacements

| Finish | Surface and animation |
| --- | --- |
| Dewdrop | Rounded aqua edge, wet highlights, small round glints |
| Violet Glow | Soft lavender face with a broad, unfocused violet bloom |
| Neon Rose | Fine white-pink contour and gently breathing neon light |
| Rose Dust | Dense fine rose glitter with independently twinkling points |
| Sunlit | Warm lemon/apricot light and a few white star glints |
| Blue Bloom | Cool light cascades through individual letters within a blue aura |
| Silver Sparkle | Pale silver face with crisp four-point twinkles |
| Pixie Dust | Fresh green glitter with rounded luminous motes |
| Opaline | A pearly rim around drifting pink and mint light |
| Colorflow | A soft full spectrum shifts across the face without a dividing band |
| Aurora | Several soft emerald/lavender light pools flow under a broad bloom |
| Peach Fizz | Small translucent bubble rings within peach and blush lettering |
| Lagoon | Rounded, moving pools of light within turquoise lettering |
| Frosted | Fine icy grain, a cool rim, and restrained crystal glints |
| Sugarcoat | A rounded raised edge and a soft glossy blush highlight |
| Stardust | Violet/blue light clouds with sparse star twinkles |
| Moonstone | Smooth lilac pearl, a narrow edge, and broad quiet sheen |
| Daydream | A clean white face framed by pink and blue light sources |

## Engineering

The eighteen effects have an independent 12-second material cycle, quantized to
30 repaint opportunities per second. Still stops glyph motion while allowing the
material to animate. Static and reduced-motion modes use a fixed designed frame.
The existing shared clock and one reusable painted surface per destination remain
in use. Texture seeds depend on the name/font/material, not the selected motion.

The additive catalog migration adds twelve free items and updates the six rebuilt
items' presentation. Existing keys, ownership, prices, and access tiers are
preserved. Only local database reset/validation was performed; no remote migration
or deployment was performed.

## Evidence

Validation results and final artifact paths are recorded in the milestone file.
Pixel and unit tests establish rendering behavior; visual quality and distinctness
were reviewed separately in profile and compact contact sheets, including all six
sampled animation phases and light/dark surfaces.
