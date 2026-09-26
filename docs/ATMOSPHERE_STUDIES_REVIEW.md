# Ten atmosphere studies

Ten additional free effects explore different tastes without replacing any of
the existing fourteen atmospheres. Choose them in Customize → Appearance →
Profile atmosphere, then **Update equipped effects**.

| Effect | Direction | Distinctive motion and composition |
| --- | --- | --- |
| Aurora Veil | Atmospheric / northern lights | Emerald and violet curtains, stars, a low light ribbon |
| Abyssal Bloom | Dreamy / deep sea | Breathing translucent jellyfish with trailing filaments |
| Astral Orbit | Cosmic / science fiction | Shaded ringed planet, orbital paths, moving satellite |
| Lantern Festival | Warm / celebratory | Glowing paper lanterns rising at different depths |
| Firefly Grove | Botanical / cottagecore | Veined fern fronds and wandering firefly light |
| Opal Tide | Iridescent / abstract | Flowing chromatic contour surfaces framing the identity |
| Retro Horizon | Synthwave / retro | Striped sunset, mountains, moving perspective grid |
| Lunar Moths | Gothic / celestial | Moon phases, engraved borders, fluttering luna moths |
| Koi Reverie | Calm / aquatic | Circling patterned koi, lily pads, expanding water rings |
| Kinetic Studio | Graphic / playful | Suspended geometric mobiles in cobalt, orange, and citron |

## Compare

With `npm run dev`, open
`/scripts/browser/atmosphere-studies-gallery.html`. Each gallery card opens a
full-size comparison scene with the existing atmosphere picker, pause control,
and compact preview. Resize the browser to compare the responsive compositions.
The gallery is a development study, not a new production route.

The generated overview is `artifacts/atmosphere-studies/collection.png`.
Desktop, mobile, reduced-motion and compact screenshots sit beside
`artifacts/atmosphere-studies/results.json`. The account smoke writes actual
Customize/public-profile screenshots and its results under the `account/`
subdirectory when it passes.

## Implementation decision

These are original transparent Canvas 2D compositions. Each has its own
geometry, materials and motion; they are not recolors of a particle preset.
This approach provides portrait composition, deterministic stills, and no
additional video/poster downloads. It also avoids increasing the existing
atmosphere media catalog, which is already about 84 MiB. Video remains available
for existing scenes and may still suit future photographic concepts.

Rendering shares the existing visibility/pause/teardown lifecycle, a 30 fps cap,
and a 1.8-million-pixel allocation ceiling. The final 1440×900 Chromium drawing
sample measured median costs of 1.4–20.8 ms and a maximum p95 of 22.9 ms, including
a readback to flush drawing. These are local runner measurements, not a claim
about every phone. Reduced-motion and compact views use composed stills.

Only the finite renderer keys are needed by eager catalog/profile validation.
Descriptions and painting code remain with the lazy decorative renderer, keeping
all enforced route budgets intact. Existing paid/earned items and historical
renderer aliases retain their behavior.

## Data and release

The additive `20260925230000_atmosphere_studies_collection.sql` migration extends
both existing renderer constraints and adds ten free, zero-cost catalog rows.
Seed data and drift/security assertions match. Unknown renderer values still
fail the database constraint. Equip remains server-authoritative.

The migration was validated with a local reset and strict schema lint. The
pre-reset local account data and its auth sequence were restored from a private
temporary backup. No production deployment or remote migration was performed.
To roll back availability, retire only the ten new catalog items; retain their
renderer keys so already-equipped profiles continue to work.
