# Phase 10.2 visual comparison

The screenshots below are the review set for the approved mockup translation.
The production visitor and owner captures use the mapped public `/u/Anzul`
profile data. The owner and pre-roll captures use the local-only visual fixture
query documented in `docs/PHASE_10_2_REPORT.md`; no roll action was invoked.

## Before / reference / translated visitor

| State | 1440×900 | 1280×720 | 390×844 |
| --- | --- | --- | --- |
| Current production before Phase 10.2 | [before](before/1440x900.png) | [before](before/1280x720.png) | [before](before/390x844.png) |
| Approved mockup reference | [reference](reference/1440x900.png) | [reference](reference/1280x720.png) | [reference](reference/390x844.png) |
| Translated visitor | [visitor](visitor-final/1440x900.png) | [visitor](visitor-final/1280x720.png) | [visitor](visitor-final/390x844.png) |

## Owner and state captures

| State | Artifact |
| --- | --- |
| Translated owner at 1920×1080 | [owner](owner-verified/1920x1080.png) |
| Translated owner at 1440×900 | [owner](owner-verified/1440x900.png) |
| Translated owner at 1280×720 | [owner](owner-verified/1280x720.png) |
| Pre-roll | [pre-roll](pre-roll-final/1440x900.png) |
| Completed canonical roll | [completed roll](completed-roll/1920x1080.png) |
| Reduced motion | [reduced motion](reduced-motion-final/1440x900-reduced-motion.png) |
| Missing-avatar fallback | [missing avatar](missing-avatar/1440x900.png) |
| Missing-music fallback | [missing music](missing-music/1440x900.png) |

## Measurements

- Visitor metrics: [visitor-final/metrics.json](visitor-final/metrics.json)
- Owner metrics: [owner-verified/metrics.json](owner-verified/metrics.json)
- Pre-roll metrics: [pre-roll-final/metrics.json](pre-roll-final/metrics.json)
- Reduced-motion metrics: [reduced-motion-final/metrics-reduced-motion.json](reduced-motion-final/metrics-reduced-motion.json)

The primary composition has no horizontal overflow. The visitor primary
regions end at y=795 at 1920×1080, y=786 at 1440×900, y=669 at 1280×720,
and y=645 at 390×844. The owner completed state ends at y=878, y=869, and
y=713 at those desktop viewports respectively; the mobile owner capture is
allowed to scroll.
