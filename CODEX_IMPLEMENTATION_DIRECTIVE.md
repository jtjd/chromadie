# Codex Implementation Directive — chm.lol Homepage Candidate 5.11

## Source of truth

Use:

`REFERENCE/chm_candidate_5_11_centered_roll_effect.html`

as the exact visual and interaction source of truth.

This version supersedes Candidate 5.10 and every earlier homepage prototype.

The goal is to reproduce this page as closely as the existing application architecture reasonably permits. Do not treat it as loose inspiration.

---

## Critical implementation corrections

### 1. Seamless recent-roll ticker

The ticker must loop continuously with:

- no empty gap;
- no dead space;
- no visible reset;
- no pause between the final item and the repeated first item.

Implementation requirements:

1. Render one real ticker group from the existing live data source.
2. Render or clone a second identical group immediately after it.
3. Animate the track by exactly one group’s rendered width.
4. Do not depend on arbitrary `min-width: 200%`.
5. Do not use `translateX(-50%)` unless the two rendered groups are guaranteed to be identical in width.
6. Recalculate the movement distance when:
   - data changes;
   - fonts finish loading;
   - the viewport changes size;
   - responsive layout changes item widths.
7. Pause on pointer hover and keyboard focus.
8. Respect `prefers-reduced-motion`.

Test at least two full cycles at:

- 1920px;
- 1600px;
- 1440px;
- 1366px;
- 1024px;
- 430px;
- 390px.

There must never be a blank area between the last visible ticker item and the next repeated group.

Preserve the existing real ticker data, links, ordering rules, and refresh behavior.

---

### 2. Use the real production roll-effect component

The SVG in the standalone reference is only a clean visual placeholder.

Production must use the application’s real roll-effect, color-glyph, rarity-effect, or result-mark component.

Required priority:

1. Locate the actual effect component used by the live roll-result screen.
2. Reuse that component and its real effect logic.
3. Pass the same color, rarity, animation, and visual-effect data used by the result page.
4. Add a compact homepage presentation mode when necessary.
5. Only create a new shared wrapper if the current effect component cannot be reused directly.
6. Use the reference SVG only as a temporary fallback during development.

Do not:

- crop the effect from `daily-roll.png`;
- trace the screenshot;
- use a raster extraction;
- use the prior screenshot-cut symbol;
- substitute a generic colored circle;
- duplicate the roll-effect logic separately in the homepage.

The homepage hero and the real result page must share the same underlying roll-effect system.

The leaderboard should also use the same shared effect component in a compact or static mode when practical. A clean color swatch is preferable to a screenshot extraction when the full effect is too complex at that size.

---

### 3. Hero roll-effect centering

The custom roll effect in the attached **Today’s color** panel must be visually centered.

This is a non-negotiable layout requirement.

#### Required behavior

- Center the effect horizontally within its designated icon area.
- Do not leave it aligned to the left edge of the panel.
- Center the actual visible artwork, not only the React/Svelte/component wrapper.
- Remove negative margins, left translations, asymmetric padding, or inherited alignment rules.
- Use a dedicated wrapper with centered layout, such as:
  - `display: grid; place-items: center;`
  - or an equivalent flexbox solution.
- Keep the color name, hex, rarity, score, and rank text left-aligned unless the source-of-truth layout shows otherwise.
- The centered effect must remain stable while it animates.
- Animation transforms must not introduce horizontal drift.

#### Optical centering

Some effect components may have an SVG, canvas, or particle bounding box that is technically centered while the visible artwork still appears offset.

Inspect the actual rendered pixels.

When necessary:

- normalize the component viewport;
- correct internal SVG `viewBox` whitespace;
- center the canvas contents;
- wrap the effect in a fixed-size square;
- apply a small documented optical adjustment inside the effect wrapper.

Do not use an arbitrary negative left margin.

#### Responsive behavior

Verify centering at:

- 1920×1080;
- 1600×900;
- 1440×900;
- 1366×768;
- 1280×720;
- 1024×768;
- 768×1024;
- 430×932;
- 390×844;
- 360×800.

On desktop, the effect should be centered across the roll panel above the text.

On narrower layouts where the panel becomes horizontal, center it within its dedicated icon column.

#### Verification

Provide close-up screenshots of the Today’s color panel at:

- 1440×900;
- 1366×768;
- 390×844.

Confirm that:

- the visible effect is horizontally centered;
- the effect does not drift during animation;
- the icon does not touch the panel edge;
- the icon remains centered with Common, Rare, and any larger rarity treatments.

---

## Objective

Replace the current public homepage with a production implementation matching Candidate 5.11 while preserving the application’s real behavior.

Preserve and connect:

- authentication;
- signup;
- username claiming;
- public profile routes;
- live recent-roll ticker;
- leaderboard data;
- roll-result data;
- avatars;
- responsive application shell;
- existing privacy and legal behavior.

The standalone HTML contains illustrative data and demo form behavior. Do not ship those mocks as production behavior.

---

## Required workflow

Before editing:

1. Inspect the existing frontend framework and conventions.
2. Locate the public homepage route.
3. Locate the global header and footer.
4. Locate the real recent-roll ticker.
5. Locate the real username claim and availability flow.
6. Locate the public profile routes.
7. Locate the leaderboard query and row components.
8. Locate the production roll-effect component.
9. Run the existing build, lint, type checking, and tests.
10. State which files will change.
11. Implement without waiting for another approval unless a genuine architectural blocker exists.

Do not modify unrelated systems.

---

## Required page structure

Implement this exact section order:

1. Existing global header
2. Existing live recent-roll ticker
3. Full-viewport hero
4. “What the product actually looks like”
5. “How it works”
6. Three-row profile-focused leaderboard
7. Final username claim
8. Existing footer

Do not add:

- testimonials;
- pricing;
- FAQ;
- feature-card grids;
- fake statistics;
- fake user totals;
- additional profile galleries;
- marketplace promotion;
- redundant profile-opening links;
- repeated EP explanations.

---

## Visual requirements

Match Candidate 5.11 in:

- hierarchy;
- section order;
- desktop hero sizing;
- maximum content width;
- proportions;
- spacing;
- typography;
- line heights;
- letter spacing;
- dark surface hierarchy;
- muted text contrast;
- lavender headline accent;
- daily-color accent usage;
- image crops;
- leaderboard structure;
- hover behavior;
- entrance motion;
- scroll reveals;
- tab transitions;
- reduced-motion behavior.

Do not redesign or reinterpret it.

Avoid:

- glassmorphism;
- decorative blobs;
- bright global gradients;
- large colored background glows;
- generic feature cards;
- enterprise SaaS styling;
- excessive borders;
- excessive animation.

Color should primarily come from real profile content and daily roll results.

---

## Header and ticker

Use the existing application header and real routes.

Visible structure:

- `chm.lol` left;
- Explore and Leaderboard centered;
- Sign in and Sign up right.

Do not create a separate marketing-only header.

Preserve the real ticker component and data source. Apply the seamless-loop behavior described above.

---

## Hero

Keep this headline exactly:

> A public profile that changes every day.

Supporting copy:

> Customize your page with a background, avatar, music, links, and profile effects. Each daily color becomes part of your profile history, earns EP, and changes where your page appears on chm.lol.

Claim note:

> Free · One roll each day

Use the real daily-reset wording if the backend’s exact behavior differs.

### Full-screen desktop behavior

The hero must fill the available desktop viewport beneath the real header and ticker.

Derive the actual occupied height from the existing shell. Do not blindly hardcode the standalone prototype’s offset.

At these sizes, the first viewport must show all required hero content:

- 1920×1080;
- 1600×900;
- 1440×900;
- 1366×768;
- 1280×720.

Required visible content:

- complete headline;
- supporting copy;
- claim form;
- recognizable profile;
- complete Today’s color panel.

Do not create internal hero scrolling.

For short desktop screens:

- reduce heading size;
- tighten vertical gaps;
- preserve all hero content;
- keep the profile recognizable.

Mobile must use natural document height rather than forced viewport height.

### Hero image

Use `REFERENCE/admin-profile.png`.

Create optimized desktop and mobile crops.

Production requirements:

- WebP or AVIF;
- `<picture>` or responsive `srcset`;
- explicit dimensions or aspect ratio;
- eager loading;
- `fetchpriority="high"`;
- no base64 assets.

---

## Today’s color panel

Display real data:

- daily effect;
- generated color name;
- hex;
- rarity;
- score;
- current daily position.

The real effect must follow the centering requirements above.

Use one useful downward action leading to the profile leaderboard.

Do not add a redundant “Open profile” link inside the hero.

---

## “What the product actually looks like”

Heading:

> The profile and the roll live together.

Supporting text:

> One side is the public page people visit. The other is the daily result that adds a color, score, conditions, and a new chapter to that profile’s history.

Use:

- `REFERENCE/bfr-profile.png`
- `REFERENCE/daily-roll.png`

Create optimized dedicated crops.

Do not reuse the hero profile image.

Keep the section restrained.

The small labels should identify:

- Public profile
- Daily result

and summarize:

- Identity · links · atmosphere
- Color · score · history

Do not add profile-opening links beneath the images.

---

## “How it works”

Section headline:

> Roll. Progress. Move into view.

Use three user-controlled tabs:

1. Roll
2. Progress
3. Visibility

Do not autoplay.

### Roll

Heading:

> Get one color and score each day.

Copy:

> Each result produces a generated color, rarity, score, and visible conditions. The color becomes a new chapter in the profile’s public history.

Use a dedicated crop showing:

- roll effect;
- hex;
- rarity;
- score;
- condition chips.

Do not zoom the crop inside its frame.

### Progress

Heading:

> See where the score came from.

Copy:

> Conditions and score contributors explain the result. EP then feeds profile progression and unlocks new ways to shape the same public page.

Use a separate crop showing:

- A New Chapter;
- countdown;
- conditions;
- score contributors;
- reward record.

Do not reuse or enlarge the Roll crop.

### Visibility

Heading:

> Higher placement makes the profile easier to find.

Copy:

> The leaderboard is a route into real profiles. Visitors can continue from a daily result into the person’s music, projects, links, and other public content.

Use real avatars and real result data.

---

## Leaderboard

Preserve Candidate 5.11’s visual structure.

Show exactly three homepage rows containing:

- rank;
- real avatar;
- username;
- short bio;
- daily effect or clean swatch;
- generated color name;
- rarity or hex;
- EP.

The full row should link to the real public profile.

Do not use the daily color as the avatar.

Do not repeat “Open profile” inside every row.

Use actual backend data.

Fallback data must be isolated in a clearly labeled typed fixture.

Do not manufacture users or social proof.

---

## Username claim flow

Connect both claim forms to the existing real username and signup flow.

Do not preserve the standalone prototype’s toast-only behavior.

Handle:

- invalid username;
- unavailable username;
- available username;
- authenticated user;
- unauthenticated user;
- duplicate claims;
- race conditions;
- keyboard submission;
- focus states;
- inline errors.

Preserve the typed username through authentication and signup.

Do not create a parallel claiming system.

---

## Motion

Reproduce only the restrained motion shown in Candidate 5.11:

- staggered hero entrance;
- subtle profile parallax;
- slow real roll-effect animation;
- restrained panel sheen;
- scroll-triggered reveals;
- smooth tab transitions;
- understated leaderboard hover accents;
- input focus feedback;
- subtle final-headline highlight.

The centered hero roll effect must not drift horizontally during motion.

Do not add:

- particles;
- cursor trails;
- bouncing;
- large rotations;
- autoplaying carousels;
- aggressive glow;
- continuous large movement.

Respect `prefers-reduced-motion`.

With reduced motion enabled:

- all content must remain visible;
- parallax must be disabled;
- entrance motion must be skipped;
- the roll effect must use a static centered state;
- tab changes must remain usable.

---

## Responsive requirements

Test at minimum:

- 1920×1080
- 1600×900
- 1440×900
- 1366×768
- 1280×720
- 1024×768
- 768×1024
- 430×932
- 390×844
- 360×800

Desktop:

- hero fits the available viewport;
- no clipped form;
- no clipped panel;
- effect remains centered;
- no internal hero scrolling.

Mobile:

- natural page height;
- dedicated mobile hero crop;
- daily panel stacks cleanly;
- effect remains centered in its icon region;
- no horizontal overflow;
- readable leaderboard;
- accessible tab targets.

---

## Accessibility

Implement:

- semantic landmarks;
- real buttons for tabs;
- correct tab roles and selected state;
- keyboard tab switching;
- visible focus;
- descriptive alt text;
- decorative effect layers hidden from assistive technology;
- sufficient metadata contrast;
- accessible modal behavior if the roll preview remains expandable;
- Escape and backdrop close;
- focus trapping;
- body scroll locking.

Do not rely on hover alone.

---

## Performance

Do not ship base64 images.

Use:

- WebP or AVIF;
- responsive image variants;
- explicit dimensions;
- eager hero loading;
- lazy below-fold images;
- delayed loading of full-resolution preview media;
- CSS and IntersectionObserver instead of a heavy animation library where practical.

Reuse the existing roll-effect implementation. Do not duplicate large shaders, canvases, or animation assets solely for the homepage.

---

## Preserve existing systems

Do not change:

- database schema;
- roll rules;
- scoring logic;
- EP economy;
- authentication architecture;
- profile editor;
- cosmetics;
- leaderboard calculations;
- public profile routes;
- privacy pages;
- legal pages;
- ticker data source.

Only change a system when direct integration requires it, and document the reason.

---

## Implementation quality

Follow the existing project framework and conventions.

Do not embed the full homepage in one giant component.

Use sensible components following the project’s naming conventions, potentially including:

- `HomeHero`
- `DailyResultPanel`
- `ProductPreview`
- `HowItWorks`
- `HomeLeaderboard`
- `UsernameClaim`

Reuse real existing components for:

- avatars;
- roll effects;
- leaderboard rows;
- auth;
- username validation;
- profile routing.

Do not duplicate business logic.

---

## Verification

Before completion:

1. Run formatting.
2. Run linting.
3. Run type checking.
4. Run tests.
5. Run the production build.
6. Test every required viewport.
7. Watch the ticker for multiple complete cycles.
8. Verify the real production roll effect is used.
9. Verify the effect is optically centered.
10. Verify it does not drift during animation.
11. Verify the desktop hero fits.
12. Verify reduced-motion mode.
13. Verify keyboard navigation.
14. Verify the real claim flow.
15. Verify ticker data remains live.
16. Verify leaderboard rows open real profiles.
17. Verify no horizontal overflow.

Provide:

- a concise file-change summary;
- build, lint, type-check, and test results;
- screenshots at 1440×900, 1366×768, and 390×844;
- close-up screenshots of the centered effect;
- any remaining visual differences and the reason for each.

---

## Definition of done

The work is complete only when:

- the page visibly matches Candidate 5.11;
- the live ticker loops with no dead space;
- the hero uses the actual production roll-effect component;
- that effect is visually centered;
- the effect remains centered while animated;
- the desktop hero fits the available viewport;
- real routes and data are connected;
- username claiming is real;
- the leaderboard uses real profiles and avatars;
- responsive layouts are polished;
- reduced-motion behavior works;
- build, lint, type checking, and tests pass;
- no unrelated product systems were redesigned.
