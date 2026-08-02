# Phase 12 Visual Comparison

All captures use Chromium at browser zoom 100%, CDP page scale 1, and
`deviceScaleFactor: 1`.

## First-visit guest Roll

| 1440×900 | 1280×720 | 390×844 |
| --- | --- | --- |
| ![Guest Roll 1440](site-root/1440x900.png) | ![Guest Roll 1280](site-root/1280x720.png) | ![Guest Roll mobile](site-root/390x844.png) |

## Discover

| 1440×900 | 1280×720 | 390×844 |
| --- | --- | --- |
| ![Discover 1440](discovery/1440x900.png) | ![Discover 1280](discovery/1280x720.png) | ![Discover mobile](discovery/390x844.png) |

## Signed-out Studio boundary

| 1440×900 | 1280×720 | 390×844 |
| --- | --- | --- |
| ![Studio 1440](studio/1440x900.png) | ![Studio 1280](studio/1280x720.png) | ![Studio mobile](studio/390x844.png) |

`metrics.json` in each surface directory records the viewport and document
scroll heights. Profile screenshots from the approved composition remain in
[`artifacts/phase-11-1/`](../phase-11-1/); they were not overwritten.
