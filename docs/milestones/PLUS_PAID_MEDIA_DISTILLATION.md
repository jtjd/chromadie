# Chromadie Plus Paid-Media Distillation

## Goal

Make Chromadie Plus a simple $7.99 lifetime purchase for hosted profile media,
while keeping profile structure, layouts, and the active cosmetics catalog out
of the paid entitlement.

## Delivered vertical slice

- Plus benefits are background video hosting, animated avatar hosting, custom
  cursors, profile audio hosting/playlists, and a custom OG/share preview.
- Plus and staff accounts receive 1 GiB of bounded media storage with a
  200-asset operational ceiling. Existing per-file safety limits remain.
- Animated avatars accept animated GIF and animated WebP up to 5 MB. Uploads
  generate and select a static WebP fallback for reduced motion and failures.
- Share images accept JPEG, PNG, or WebP input up to 10 MB and are center-cropped
  in the browser to a crawler-compatible 1200×630 JPEG no larger than 1 MB.
- The upload control plane hashes and validates actual R2 bytes before an asset
  becomes selectable. A new entitlement-checked V2 selection RPC atomically
  selects an animated avatar with its fallback.
- Public metadata uses the paid share image first, then a historical banner,
  then the generated profile image, then the site default. It publishes OG
  image type, dimensions, and alt text.
- Free accounts now receive the current structural maxima: six links, ten
  projects, and four widgets. Current layouts remain free.
- The two historical Atelier Plus cosmetics are retired from the active catalog
  while their renderer mappings and historical ownership remain intact.
- Checkout is paused unless both the client R2 rollout flag and the server
  `PROFILE_MEDIA_R2_READY=true` deployment gate are enabled.

## Compatibility and security

- Existing `chromadie_plus` and legacy-compatible `atelier_plus` entitlements
  continue to authorize Plus.
- The legacy media selection RPC and legacy banner columns remain available to
  older clients. New banner uploads and banner UI are removed.
- RLS, private staging, server-side hashing/signature checks, immutable public
  delivery, cleanup jobs, and Stripe fulfillment authority are unchanged.
- Refunds remove the public paid-media projection without deleting gameplay or
  profile history.

## Acceptance

- Customer-facing Plus copy lists only the approved hosted-media benefits,
  $7.99 lifetime pricing, and the 1 GB quota.
- Animated media respects `prefers-reduced-motion` and falls back to the static
  avatar poster on load failure.
- Schema changes are additive and old clients remain compatible.
