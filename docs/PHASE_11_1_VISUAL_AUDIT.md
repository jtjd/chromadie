# Phase 11.1 — Visual Audit Before Correction

Date: 2026-07-26  
Scope: approved mockup fidelity correction only  
Production URL: `http://127.0.0.1:5181/u/Anzul`  
Reference URL: `http://127.0.0.1:5190`

## Capture contract

The measurements below were collected from fresh Chromium sessions with the
same 100% browser scale used for the screenshots:

- browser zoom: 100%;
- `deviceScaleFactor`: 1;
- CDP page scale factor: 1;
- `devicePixelRatio`: 1;
- `visualViewport.scale`: 1;
- document and body CSS zoom: `1`;
- viewport: 1920×1080 for the primary comparison;
- reduced motion: disabled for the baseline.

The audit script records these values in
[the baseline metrics](../artifacts/phase-11-1/baseline/metrics.json).
No browser zoom or device-scale discrepancy influenced the owner-supplied
production evidence. The latest real production screenshot is preserved as
[production at 1920×1080](../artifacts/phase-11-1/baseline/production-1920x1080.png),
with the prior Phase 10.2 evidence retained under
[the Phase 10.2 visitor captures](../artifacts/phase-10-2/visitor-final/).

## Side-by-side measurements at 1920×1080

All positions and dimensions are CSS pixels from `getBoundingClientRect()`;
text values are computed styles from `getComputedStyle()`.

| Property | Approved reference | Current production | Target |
|---|---:|---:|---:|
| Card width | 448px | 448px | 440–480px |
| Card top position | 252.38px | 117.33px | 220–285px |
| Card center position | x=960px | x=960px | x=952–968px |
| Music bar width | 672px | 672px | 640–704px |
| Music bar bottom offset | 24px | 284.81px | 20–40px |
| Primary name size | 30px / 36px line-height | 58.4px / 54.9px line-height | 30–42px; readable weight without oversized tracking |
| Body text size | 14px / 22.75px line-height | 13.92px / 21.58px line-height | ≥14px / comfortable line-height |
| Smallest essential text | 11px eyebrow; essential body remains 14px | 11.2px handle | ≥12px for essential metadata; 10–11px only for decorative eyebrows |
| Atmosphere visible bounds | x=0, y=0, 1920×1080 | x=0, y=71.97, 1920×1171.19; visible canvas begins below header | x=0, y=0, full viewport |
| Primary composition bottom | 1056px | 795.19px | 1032–1060px |

The reference card and production card have the same measured width and both
are horizontally centered. The failure is distribution, not width: production
starts 135.05px above the reference, leaves the expression bar 260.81px too
far from the viewport bottom, and renders its identity name almost twice the
reference size while its supporting metadata remains near micro-label scale.

## Secondary 1440×900 measurement

The same fresh sessions show the intended responsive relationship rather than
a fixed desktop offset:

| Property | Approved reference | Current production |
|---|---:|---:|
| Card bounds | x=496, y=162.38, 448×541.25px | x=496, y=109.77, 448×594.03px |
| Music bounds | x=384, y=806, 672×70px | x=384, y=726.30, 672×59.83px |
| Music bottom offset | 24px | 113.87px |
| Primary composition bottom | 876px | 786.13px |

## Current visual hierarchy

The current page has the correct broad ingredients but presents them as a
small, dark card cluster:

1. minimal header;
2. centered identity card with monogram fallback, oversized name, neutral bio,
   social links, latest color, and collection progress;
3. a narrow expression bar immediately beneath the card;
4. detail disclosures below the opening composition.

The result is structurally compliant but visually reads as a settings card in
an empty application canvas. The expression bar is a continuation of the card
rather than a separate lower anchor, and the atmosphere does not extend behind
the header or visibly shape enough of the viewport.

## Approved visual hierarchy

The reference uses:

1. full-viewport color atmosphere and restrained dark base;
2. quiet header at the edges;
3. a readable centered identity surface in the upper-middle;
4. the daily color as part of that surface;
5. a compact archive trace;
6. a separate expression/music anchor close to the viewport bottom.

The identity is not materially wider than production. Its impact comes from
vertical placement, readable body copy, balanced empty space, stronger color
spill, and a lower expression anchor.

## Correction plan derived from the measurements

- Make `ProfileAtmosphere` viewport-fixed/fill the visual canvas while keeping
  the profile page scroll-safe for detail disclosures.
- Move the opening composition into a height-aware flex layout with explicit
  upper-middle spacing and a bottom-anchored expression surface.
- Replace the production name/metadata imbalance with a restrained name scale,
  14px body copy, 12px comprehension metadata, and stronger but still quiet
  contrast.
- Increase the visual weight of the canonical color treatment without adding
  neon, particles, or dashboard chrome.
- Replace generic visible absence copy with a designed neutral expression
  trace; hide the music bar when there is no real music configuration except in
  an explicit visual fixture.
- Keep the collection as one archive trace using real samples and avoid making
  its progress count the headline.
- Preserve the secure roll path, canonical result settlement, existing
  profile data projection, and all detail/owner compatibility surfaces.

No production component or backend behavior has been changed at the time this
audit was created. The implementation begins only after this measurement
record.
