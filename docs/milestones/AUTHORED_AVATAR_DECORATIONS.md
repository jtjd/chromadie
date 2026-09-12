# Authored avatar decorations

Scope: Moonlit Clouds, Enchanted Garden, Prismatic Fracture. Original painted
assets are the visual foundation; localized deformation and timed lighting
provide distinct choreography. Discord is a quality benchmark, not a supplied
asset or exact animation reference.

Plan: generate and inspect transparent artwork; integrate a small lazy renderer
with static fallback; add three free catalog rows and extend the finite SQL
allowlist; verify production previews, mobile, reduced motion, failure/cleanup,
loop continuity, and all required checks.

Compatibility: existing AvatarEffect slot and authoritative equip/catalog RPCs.
Client must deploy before the additive catalog migration. Rollback retires the
three rows without removing loadouts. No privacy, scoring, or RLS changes.

Acceptance: recognizable and detailed still artwork at 86–180px; an unobstructed
portrait center; localized organic motion rather than rotating whole frames;
seamless ambient loops; static reduced-motion fallback; no interaction capture,
overflow, broken-image UI, or animation work while offscreen.

## Implementation and validation — 2026-09-12

The three 768px WebP plates preserve genuine alpha and total 490,518 bytes.
Built-in imagegen prompts and final filenames are recorded in
`public/avatar-decorations/ARTWORK.md`. The renderer uses an anchored 32×32
mesh, a 30fps cap, periodic local deformation and texture lighting. It starts
within its existing loop rather than introducing a formation or reveal reset.
Reduced motion and disabled previews show the original still; failed image
loading leaves the underlying avatar intact; unavailable/lost WebGL shows the
still. Context recovery, listener cleanup, and offscreen pauses are covered.

Validation passed:
- Build, Svelte check (zero diagnostics), ESLint on src, and 613 unit tests.
- Links, CSP, enforced performance budgets, username/balance/catalog drift,
  scoring parity, database security.
- Local database reset applied migration `20260912030000`; database lint
  completed with no warnings/errors. Security expectations now include 9
  active avatar effects, 99 active renderer rows, and 101 total active rows.
- Production-component Chromium checks at 86/108/180px, dark/light avatars,
  390px/DPR2 mobile, reduced motion, animation disable, context loss/restore,
  offscreen pauses, and unmount. The actual shaders at 0 and 16 seconds have
  matching pixels, while intermediate frames differ. Reviewed desktop and
  mobile stills plus successive motion samples.

Evidence: `artifacts/authored-decorations/desktop.png`, `mobile.png`,
`mobile-bottom.png`, `reduced-motion.png`, `motion-0.png` through `motion-3.png`,
and `results.json`. Regenerate with
`node scripts/browser/authored-decorations-smoke.mjs`.

Early browser runs caught mismatched shader precision and reduced-motion
event handling; both were corrected. Fixture startup now uses an isolated
HTML document to avoid the application's Vite import reload race. Existing
aggregate JS/CSS advisory targets remain exceeded; enforced budgets pass.

Delivery status: implemented and validated locally. The three new catalog
rows have not been applied to the hosted database, and this slice has not
been pushed or deployed. Publish the client before applying the migration.
Discord was the quality benchmark; no specific Discord animation was supplied
for frame-by-frame equivalence testing.
