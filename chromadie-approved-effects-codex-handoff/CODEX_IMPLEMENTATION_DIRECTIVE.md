# Goal: Implement the approved Chromadie cosmetics/effects

Work from the current project at HEAD. Implement the approved effects below into the existing production renderer/catalog architecture. This is an implementation pass, not another design exploration.

## Definition of done

The goal is complete only when every approved NEW effect below:

- exists as a real code-owned production cosmetic in the correct existing slot;
- visually matches its approved HTML reference closely enough that the reference and production renderer are clearly the same effect;
- works in Customize/effect previews, Profile Studio/live preview, and the public profile surface wherever that slot is rendered;
- can be selected/equipped through the existing catalog/inventory/equip contracts;
- survives refresh/publish with the equipped cosmetic still rendering correctly;
- has a deterministic static/reduced-motion presentation;
- does not introduce visual clipping, overflow, blank canvases, runtime errors, broken pointer behavior, or animation jank;
- is performance-safe on desktop and mobile; and
- is covered by targeted renderer/catalog/regression tests.

Do not mark this goal complete while an effect is merely registered but visibly broken, reduced to a generic approximation, missing from a production surface, or significantly lower quality than its reference.

---

## Existing approved effects: preserve, do not redesign

These are already considered good. They are regression baselines, not work items unless something in this implementation breaks them:

- 3D Parallax Tilt
- Liquid Blob
- 3D Tilt
- Scramble
- Type In

Do not replace, simplify, recolor, retire, or materially redesign these.

---

## Approved NEW effects to implement

### Name effects

1. **Kinetic Echo**
   - Slot: `name_motion`
   - Reference: `REFERENCE/01_locked_core_effects.html`
   - Match the controlled trailing copies around the real glyphs. It should feel intentional, not like generic text-shadow spam.

2. **Magnetic Type**
   - Slot: `name_motion`
   - Reference: `REFERENCE/01_locked_core_effects.html`
   - Pointer proximity should directly displace glyphs with smooth attraction/relaxation.
   - No snapping, unstable jitter, layout shift, or glyph overlap bugs.

3. **Neon Particle Name** (working name; preserve the reference behavior)
   - Slot: `name_motion` unless the current renderer architecture strongly justifies a code-owned material+motion split. Do not create a new slot.
   - Reference: `REFERENCE/03_neon_particle_name.html`
   - This is the accidental Digify-inspired prototype the user explicitly approved.
   - Preserve the masked internal energy, micro-particles, edge emission and bright glints. Do not collapse it into a plain glow.

4. **Raster Signal** (working name)
   - Slot: `name_motion`
   - Reference: `REFERENCE/04_raster_signal_name.html`
   - Preserve the monochrome raster/scanline construction, row displacement, signal jitter/duplication and sparse bright pixels.
   - It must remain legible at compact preview scale.

### Profile border

5. **Elastic Frame**
   - Slot: `profile_border`
   - Reference: `REFERENCE/01_locked_core_effects.html`
   - The perimeter should behave like tensioned material responding to pointer proximity.
   - Preserve the actual content boundary; never distort content dimensions or make the page jump.

### Profile motion / shell interaction

6. **Halo Offset**
   - Slot: `profile_motion`
   - Reference: `REFERENCE/01_locked_core_effects.html`
   - Detached shells should lag the profile motion with clear front-to-back hierarchy.
   - They are echoes of the profile shell, not generic glowing rectangles.

7. **Wavefront**
   - Slot: `profile_motion`
   - Reference: `REFERENCE/01_locked_core_effects.html`
   - A click/tap on the profile launches one physical-looking wave that briefly displaces nearby profile elements as it passes.
   - The profile must settle exactly back into place. No cumulative transforms/drift.
   - Keyboard/non-pointer users and reduced-motion users need a safe static/no-displacement state.

### Particle effects

8. **Prism Dust**
   - Slot: `profile_atmosphere`
   - Reference: `REFERENCE/02_particle_effects.html`
   - Preserve the varied shard sizes, refractive glints, clustered sparkle timing, and depth/density variation.
   - Do not substitute generic floating dots or a looping stock video unless it genuinely matches the approved reference better than a procedural renderer.

9. **Plasma Swarm**
   - Slot: `cursor_trail`
   - Reference: `REFERENCE/02_particle_effects.html`
   - This is the effect sometimes called “Plasma Storm” in discussion; canonical working name should be **Plasma Swarm**.
   - Preserve charged particle clusters, bright/hot nodes, soft ion cloud, and brief electrical links.
   - It must react smoothly to pointer motion and still produce a useful demo in preview mode.

### Avatar effects

10. **Butterfly Orbit**
    - Slot: `avatar_effect`
    - Reference: `REFERENCE/05_butterfly_avatar_orbit.html`
    - Preserve the approved white-glow butterfly look and even 3D orbit distribution.
    - Butterflies must actually move around the avatar in projected 3D: depth-based scale/orientation, wing flapping, front/back occlusion.
    - Use the real user avatar from the existing slot. The reference avatar/background is only a demo aid and must NOT ship.

11. **Bat Orbit**
    - Slot: `avatar_effect`
    - Reference: `REFERENCE/06_bat_avatar_orbit.html`
    - Use the approved black-bat version with the smoother motion and inward-curved top wing.
    - Preserve real 3D front/back occlusion around the actual user avatar.
    - The bat bodies should not dominate the silhouette; wings are the primary read.
    - The reference avatar/background must NOT ship.

---

## Current architecture: extend it, do not bypass it

The current project already has finite code-owned renderer systems. Use them.

Relevant areas include:

- `src/lib/name/NameEffectCanvas.svelte`
- `src/lib/name/nameMotions.js`
- `src/lib/name/render/composableMotions.js`
- `src/lib/name/nameAnimationClock.js`
- `src/lib/profile-border/ProfileBorderEffect.svelte`
- `src/lib/profile-border/profileBorders.js`
- `src/lib/profile-motion/ProfileMotionEffect.svelte`
- `src/lib/profile-motion/profileMotionController.js`
- `src/lib/profile-motion/profileMotions.js`
- `src/lib/avatar-effect/AvatarEffect.svelte`
- `src/lib/avatar-effect/avatarEffects.js`
- `src/lib/cursor-trail/`
- `src/lib/profile-atmosphere/`
- `src/lib/ShopItemPreview.svelte`
- `src/lib/ProfileCosmeticsEditor.svelte`
- profile render-model/config/loadout code
- current Supabase catalog seed/migrations and drift tooling

Keep the established security rule: catalog rows select finite, code-owned renderer keys. Never store or execute arbitrary CSS, JS, canvas commands, SVG markup, shaders, or URLs from catalog data.

The old Shop route is intentionally retired in this codebase. **Do not resurrect it.** These cosmetics should appear through the current Customize/Profile Studio catalog experience.

---

## Rendering requirements

### Shared lifecycle

Do not create one uncontrolled `requestAnimationFrame` loop per particle, glyph, or cosmetic instance.

Use the existing shared timing/lifecycle patterns where possible. Any new canvas renderer must:

- cap DPR reasonably (2 is enough);
- resize correctly with `ResizeObserver` or the existing renderer lifecycle;
- clean up observers/listeners/animation handles on destroy;
- pause or substantially reduce work when offscreen/hidden;
- respect `prefers-reduced-motion`;
- avoid per-frame DOM node creation;
- avoid unbounded particle arrays;
- use deterministic seeded variation where appropriate so previews do not visibly reshuffle on every render;
- remain stable in compact/effect-card previews; and
- never allow a canvas/runtime error to blank the whole preview or profile.

### Avatar orbit architecture

For Butterfly Orbit and Bat Orbit, a good production structure is:

- one back-decoration canvas/layer;
- the real avatar slot in the middle;
- one front-decoration canvas/layer;
- both decoration passes driven from the same projected orbit state.

This gives real occlusion without copying or re-rendering the avatar image into the effect renderer.

Do not embed the fakecrime/reference avatar or any reference-page image into production.

### Pointer interactions

Magnetic Type, Elastic Frame, Halo Offset, Wavefront, and pointer-reactive avatar behavior must use local coordinates from the actual rendered host. Do not attach unnecessary global pointer listeners.

Touch/tap behavior must be sensible. Hover-only behavior cannot be the only way to see an owned cosmetic on mobile.

### Quality bar

“Premium” here means **high-quality execution**, not muted colors or adherence to a palette.

Do not wash out colors to make an effect look sophisticated. Do not force cosmetics to follow a site palette. The approved reference is the visual target.

Avoid:

- generic glow-only substitutions;
- simple shapes layered together as a stand-in for the actual effect;
- uniform particles with identical speed/size/lifetime;
- obvious loops/jumps;
- unstable noise/jitter;
- clipping at the avatar/card/name bounds;
- excessive blur hiding weak geometry; and
- effects that only look acceptable in the catalog preview but fail on the live profile.

---

## Catalog / persistence integration

Add these as normal active cosmetics through the existing catalog model.

- Use the existing slots listed above.
- Keep item keys stable and explicit.
- Choose costs/rarities/collections using the existing catalog ladder and nearest comparable cosmetics; do **not** rebalance unrelated items in this pass.
- Do not delete or retire the other weak cosmetics yet. This pass is additive implementation of the approved set.
- Preserve inventory, entitlement, equip/unequip, RPC, RLS, cache-version, and loadout contracts.
- Add a new additive migration if catalog rows need to change. Do not rewrite historical migrations already applied.
- Update seed/drift tooling consistently.

Suggested stable keys unless they conflict with an established convention:

- `name_motion_kinetic_echo` -> `kinetic-echo`
- `name_motion_magnetic_type` -> `magnetic-type`
- `name_motion_neon_particle` -> `neon-particle`
- `name_motion_raster_signal` -> `raster-signal`
- `border_elastic` -> `elastic`
- `profile_motion_halo_offset` -> `halo-offset`
- `profile_motion_wavefront` -> `wavefront`
- `profile_atmosphere_prism_dust` -> `prism-dust`
- `cursor_trail_plasma_swarm` -> `plasma-swarm`
- `avatar_effect_butterfly_orbit` -> `butterfly-orbit`
- `avatar_effect_bat_orbit` -> `bat-orbit`

If the current project has a stronger canonical naming convention, follow it consistently, but do not silently map these new items onto unrelated legacy renderer keys.

---

## Production-surface parity

For every effect, verify all relevant surfaces use the same canonical renderer rather than separate approximations:

1. Customize cosmetic preview/control
2. Profile Studio live preview
3. Public profile
4. Any compact/profile card surface that intentionally renders that slot

The preview must demonstrate the real effect, not a screenshot, placeholder, or simplified fake.

Be especially careful with refresh/re-entry behavior because this project has previously had preview state issues. Changing avatar/background, publishing, refreshing, switching tabs, or reopening Customize must not strand an effect in a blank/static/broken state.

---

## Testing

Add focused tests for at least:

- registry resolution for every new key;
- catalog item -> slot -> css_value/renderer resolution;
- name renderer coverage for all four new name effects;
- avatar effect registration and front/back-layer structure;
- profile-border registration for Elastic Frame;
- profile-motion registration for Halo Offset and Wavefront;
- atmosphere registration for Prism Dust;
- cursor registration for Plasma Swarm;
- reduced-motion/static behavior;
- cleanup/lifecycle behavior where practical;
- public profile + Studio/Customize parity contracts;
- no invalid equipped slot/item regression;
- no catalog drift caused by incomplete seed/migration updates.

Then run the relevant targeted tests plus the existing full suite/build/lint/check commands used by the project. Fix regressions caused by this work. If an unrelated pre-existing failure remains, identify it clearly rather than hiding it.

---

## Do not do in this goal

- Do not redesign the site or Customize UI.
- Do not resurrect the retired Shop route.
- Do not implement rejected prototype effects.
- Do not remove/retire the remaining weak cosmetics yet.
- Do not rebalance the entire economy.
- Do not replace existing approved 3D Parallax Tilt, Liquid Blob, 3D Tilt, Scramble, or Type In.
- Do not ship reference screenshots, reconstructed avatars, fakecrime assets, or guns.lol assets.
- Do not create arbitrary catalog-executable effect code.
- Do not downgrade an effect to a generic CSS approximation merely to finish faster.

---

## Workflow

1. Read this directive and every file in `REFERENCE/`.
2. Inspect the current renderer/catalog architecture before editing.
3. Make a concise implementation plan mapping each approved effect to existing files/components and any new code-owned renderer modules needed.
4. Implement the effects in logical batches, preserving the established contracts.
5. Test each renderer on its real production surfaces as it is added.
6. Run targeted and full validation.
7. Report:
   - exact effects implemented;
   - final item/renderer keys;
   - files/migrations changed;
   - tests run/results;
   - any deliberate deviations from the references and why;
   - any remaining blocker that prevents an effect from meeting the approved reference quality.

Proceed with implementation unless there is a genuine architectural blocker. Do not stop merely to ask aesthetic questions already answered by the reference files.
