# Chromadie 2.0 Decisions

## 2026-08-09 — Let surface blur sample the actual page media

The uploaded background image is rendered as the page's own fixed background
layer rather than as a separate fixed sibling. The public profile card keeps
one transparent backdrop-filter layer at the surface boundary; intermediate
profile layout wrappers do not create an isolated stacking context, so the
filter samples the already-rendered page canvas, rich background video, and
authored atmosphere media behind the card. The same page-level media remains
sharp outside the card.

This keeps one source of truth for the uploaded image and avoids the
misleading failure mode where a browser reports a computed `backdrop-filter`
while fixed media siblings or nested stacking contexts prevent it from
sampling the page canvas. No media source, configuration schema, public URL,
or renderer authority boundary changes.

## 2026-08-09 — Let the Bio field own the compact identity column

The compact General Customization editor uses a four-column desktop grid. Bio
spans the two left columns and both right-side field rows, while Location /
Timezone and Description rhythm / Entry animation remain explicit two-column
groups. Visibility checkboxes sit below Bio rather than competing with the
second right-side row. At tablet and mobile widths the explicit placements are
cleared and the controls return to normal document flow.

This is a dashboard-only layout refinement. Identity validation, draft restore,
owner RPCs, presentation normalization, accessibility, and the full-size
Profile Settings editor remain unchanged.

## 2026-08-09 — Keep surface color and depth controls together

Profile Surface is now edited in the same Surface group as opacity and blur.
The editor presents six independent profile colors, then one card-depth group
containing the surface color and its two linked controls. This keeps the UI
aligned with the renderer, which uses the surface color as a translucent card
fill and the blur value to sample the main profile background behind that card.

The public renderer uses a dedicated, transparent card backdrop layer with
`backdrop-filter`; page background media and the daily roll remain outside that
layer. The existing validated appearance shape, V2 save/publish RPCs, legacy
appearance values, and reduced-motion boundaries are unchanged.

## 2026-08-09 — Consolidate Customize around quick profile edits

Customize now uses one continuous, screenshot-inspired workspace: a compact
asset uploader rail for the four highest-frequency media actions, a Plus
expression banner, and grouped General, Color, and Other customization
surfaces. The media cards are the upload controls themselves: clicking a card
opens the existing validated input and the card immediately reflects the
current preview. Full libraries, music settings, and rich-media configuration
stay behind one disclosure so the fast path does not create duplicate upload
implementations or separate save contracts. Customize deliberately omits its
page toolbar and quick-jump rail; Profile media is the first visible heading.

This is a presentation and information-architecture change. Existing lazy
editor loading, section-scoped dirty/publish events, entitlement gates, media
validation, RPC authority, RLS, public rendering, keyboard navigation,
mobile layout, and reduced-motion behavior remain unchanged.

## 2026-08-08 — Make public-site access reversible

The temporary Cloudflare Pages rehearsal gate now has an explicit
`PREVIEW_PROTECTION=off` bypass. This lets the owner lift the site-wide lock by
changing one deployment secret without deleting `functions/_middleware.js` or
removing the signed preview-session implementation. If the switch is absent,
the existing fail-closed `PREVIEW_PASSWORD` behavior remains active. This
concerns only browser traffic to Pages; Supabase authentication, RLS, and
account passwords remain unchanged.

## 2026-08-08 — Make the Profile Studio editor readable at a glance

The owner editor now gives the navigation and editing canvas most of the
viewport. The sidebar uses a wider, readable type scale; Customize controls
fill the available content column; and editor copy is reduced to direct labels
instead of explanatory marketing language. The live preview remains powered
by the same draft renderer, but is a compact identity-card check with daily
roll, story, and social regions hidden so it does not compete with controls.

This is presentation-only. Public profile composition, daily-roll authority,
draft/publish RPCs, media entitlement checks, and mobile/reduced-motion
behavior remain unchanged. The browser smoke contract now verifies that the
preview has no visible roll region while appearance changes remain unpublished
until the owner chooses Publish.

## 2026-08-08 — Make Profile Studio expression-first and destination-based

The owner dashboard now presents three primary destinations—Customize, Links,
and Premium—with account, analytics, social, progression, and settings grouped
under a separate Account section. Customize is an aggregate workspace that
loads identity, appearance, media, content, widgets, collection, and layout
controls together; Links owns public links, aliases, and sharing. Premium is a
read-only status/upsell surface that points to the existing pricing flow.

This is an information-architecture change only. Existing editor components,
section RPCs, draft/publish boundaries, live preview, and entitlement checks are
unchanged. Legacy `#profile-*` hashes remain readable and redirect to the
appropriate aggregate destination so saved dashboard links do not break.

## 2026-08-08 — Qualify the rich-media Storage metadata boundary

The staged `profile_media` Storage policies explicitly read
`storage.objects.metadata` when matching a staged asset's MIME type and map
the object name to the full `profile_media/<user>/<asset>` path exactly once.
The rich-media asset table also has a `metadata` column, and the old path
expression prefixed the user ID twice; either mismatch can reject a valid
upload. The correction is an additive policy replacement; entitlement, quota,
staged ownership, and server-side finalization remain unchanged.

## 2026-08-08 — Restore Atelier expression through the modern renderer contract

The original `name_prism_atelier` and `bg_prism_atmosphere` identities are
restored as active Chromadie Plus catalog rows, but they now select the finite
`name_motion` and `profile_atmosphere` renderers (`haunt-rainbow` and
`silk-folds`). The retired `name_effect`/`profile_bg` raw-CSS slots remain
removed, so historical keys cannot bypass the structured renderer boundary.
The canonical entitlement is `chromadie_plus`; `atelier_plus` remains a
compatibility entitlement through the existing helper. The Atelier template
continues to be a composition preset, while Customize now contains the three
expression controls and Collection explains how to find them.

## 2026-08-08 — Keep pricing inside the profile-first visual language

The `/pricing` surface uses the same authored canvas as the homepage rather
than switching to generic card-store chrome. The comparison is deliberately
quiet and editorial: the free profile is presented as complete, while
Chromadie Plus is framed as optional expression and capacity for the same
earned identity. Pricing belongs in the shared desktop/mobile site header and
prefetches like other primary destinations. Checkout, restore, and entitlement
authority remain unchanged and service-owned.

The lifetime Checkout session opts into Stripe Managed Payments because the
product is hosted personal-use SaaS. The server sends the eligible
`txcd_10103000` tax code and the supported `2025-03-31.basil` API version;
the browser still cannot create sessions or grant access. Managed Payments
must be enabled and its terms accepted in Stripe before this function is
deployed.

## 2026-08-08 — Roll out parity surfaces with reversible presentation flags

Milestone 13 uses build-time, audience-scoped flags for commerce, rich media,
V2 configuration, expanded insights, and social depth. Staff, an explicit
internal allowlist, a deterministic cohort, and all-users promotion are
separate release stages; each surface can be paused independently. The flags
never authorize an RPC, grant an entitlement, alter storage validation, or
move gameplay authority into the browser. When V2 or rich media is paused,
the existing V1/image profile remains the compatibility renderer.

Certification is expressed as three code-owned profiles—polished free,
premium media identity, and creator/provider identity—rather than a generic
link-page benchmark. Operations use service-owned aggregate panels for
fulfillment, uploads, providers, retention, and reports; no viewer identity,
raw media path, provider payload, or report identity enters that dashboard.

## 2026-08-08 — Keep detailed insights aggregate and social depth one-level

Milestone 12 extends the existing consent-based daily profile view counter
with bounded view/click dimensions rather than storing event rows. The edge
derives only device class, country code, and normalized referrer hostname;
owner reads receive 7/30/90-day summaries and CSV export through an
authenticated RPC. A separate owner preference controls whether an aggregate
view count is shown publicly. Analytics are never used for discovery, rank,
rewards, or badges.

Guestbook replies are intentionally one level, plain text, and rate-limited.
Likes, up to three owner pins, sorting, deletion, and reply-aware reporting
add expression and community context without opening private messaging.
Notifications are service-owned, owner-only, grouped within a bounded window,
and limited to social/reward signals. Browser roles cannot read or write the
new tables directly.

## 2026-08-08 — Make Stripe webhooks the sole commerce entitlement authority

Chromadie Plus is a fixed $7.99 USD lifetime profile-expression purchase. The
browser may create an authenticated Checkout session and restore its status,
but neither path can grant an entitlement. Only a signature-verified Stripe
event reaches the service-only, transactional database processor. Its event ID
primary key makes replays harmless; failed transactions leave no event row so
Stripe can retry safely.

`chromadie_plus` is canonical. `atelier_plus` remains as a compatibility key
and is backfilled in both directions needed by deployed configuration code.
Refunds and chargebacks revoke only Stripe-sourced presentation access and set
a 30-day media recovery deadline; they do not alter rolls, EP, inventory,
achievements, history, or profile content. Staff expression remains derived
from the authoritative `profiles.is_staff` flag.

## 2026-08-08 — Keep templates composition-only and premium expression entitlement-gated

Profile templates are finite, code-owned composition presets. They may set the
layout variant and validated module order, visibility, and sizing, but never
copy media, overwrite links/content/appearance/widgets, alter history, or
grant gameplay prestige. Manual composition edits are marked `custom` so the
profile remains an authored identity rather than silently losing its intent.

Atelier is an optional premium expression preset behind the existing
service-granted `atelier_plus` entitlement. The browser can read the owner’s
bounded entitlement projection, but the composition RPC is the final gate;
there is no client grant, payment mutation, rank purchase, or new entitlement
source in this milestone.

## 2026-08-08 — Keep profile insights aggregate, consented, and owner-private

Profile insights use two independent opt-ins: the visitor's existing product
event consent and the profile owner's insights preference. The server stores
only one bounded daily bucket per profile, with a 90-day retention boundary;
it does not retain viewer identity, IP address, exact visit time, user agent,
or raw event rows. Reads and settings writes are authenticated owner RPCs,
while the public recorder can write only the aggregate counter. This gives the
profile a personal discovery signal without creating a visitor database or
coupling analytics to gameplay, social state, or moderation.

## 2026-08-08 — Keep public social positive, bounded, and owner-controlled

The public profile now renders the existing Phase 7 favorite, reaction,
guestbook, block, and report surface through its canonical social projection.
Aggregate favorite/reaction counts are independently hideable with the
additive `social_summary_visible` setting; hiding counts does not disable
positive interactions or hide the current viewer's own saved/reaction state.
No social action changes gameplay, scoring, progression, or discovery rank.
The new five-argument settings RPC is an additive overload, while the legacy
four-argument RPC remains available for compatibility.

## 2026-08-08 — Keep provider expression structured and allowlisted

Provider widgets are stored as a small validated `{ provider, type, id,
visible, order }` projection rather than user-authored URLs or markup. The
first contract supports one Spotify item and one YouTube video, with a maximum
of two provider-unique widgets. The renderer derives fixed official embed
origins, lazy-loads public frames, and requires an explicit preview action.
Legacy Spotify fields remain readable during the additive migration. This
keeps profile expression personal and discoverable without weakening the
public-profile security, CSP, or performance boundary.

Use `08_DECISION_LOG_TEMPLATE.md` for new entries.

## 2026-08-08 — Keep aliases bounded and canonical

Profile aliases use an explicit `/a/` namespace and resolve only to the
existing canonical `/<username>` profile route. Owners can create at most
three lowercase ASCII aliases through authenticated RPCs; public resolution
returns only the alias and canonical username. The alias table is RLS-enabled
with no browser table grants, and profile deletion cascades aliases. This
improves shareability and profile memory without adding a second renderer,
metadata surface, custom-domain contract, or API access model.

## 2026-08-08 — Keep standalone additions inside the homepage visual contract

Standalone auth routes reuse `SiteModeHeader` and the homepage canvas tokens
instead of creating a second header, wordmark, or surface language. The auth
form remains the existing authentication implementation, but its route shell
uses the same `chm.lol` header, Instrument Sans/IBM Plex Mono pairing,
quiet-border stage, mobile containment, and reduced-motion behavior as the
homepage. Future standalone additions must first reuse this shared shell or
add an explicit design-system component before introducing route-local chrome.

## 2026-08-08 — Keep reusable media owner-scoped and selected by configuration

Avatar and background uploads now enter a private owner library as processed
WebP objects. Registration derives the owner-shaped path, verifies the Storage
object and MIME boundary, and writes the library row through a security-
definer RPC. The public profile still receives only the selected path through
the existing bounded expression projection; deleting an asset clears a
selected reference before removing the object. The daily roll, scoring, and
all gameplay authority remain unchanged.

## 2026-08-08 — Reserve newly valid short route names atomically

One- and two-character usernames use the existing ASCII, case-insensitive,
moderated, first-claim identity contract. Broadening the shape makes three
existing Pages paths username-shaped: `c`, `og`, and `u`. They are added as
hard database reservations in the same transaction that lowers the minimum,
so no deployment window can claim an application route as an identity.

The migration replaces every active embedded 3–20 check across profile and
challenge constraints, availability, direct-write enforcement, signup,
recovery, and public projection. The browser remains advisory; the database
trigger, reservation table, advisory signup lock, and case-insensitive unique
index remain authoritative. The linked migration was applied and verified
before the standalone signup route was released.

## 2026-08-08 — Make route payloads the blocking performance policy

Phase 0 replaces the legacy total-generated-JavaScript release blocker with a
manifest-backed policy that measures what users can load. Hard gates cover the
initial shell, largest lazy JavaScript and CSS assets, HTML, and the auth,
homepage, public-profile, and dashboard route dependency closures. The full
generated catalog remains visible as an advisory 800 kB JavaScript / 400 kB CSS
growth target.

Adding every mutually exclusive lazy route is useful for repository trend
tracking but does not represent a browser navigation. This decision supersedes
the open aggregate-cap condition recorded in the earlier Milestone 0 checkpoint
without weakening initial-load, route-load, or lazy-asset regression checks.

## 2026-08-08 — Treat short usernames as identity, not premium inventory

Chromadie will allow available one- and two-character usernames through a
forward-only broadening of the existing server-authoritative username policy.
Short names retain case-insensitive uniqueness, exact route reservations,
moderation, canonical root routing, and transactional signup enforcement. They
are first-claim identity choices and will not be sold, auctioned, or reserved
for Premium.

The policy migration ships before the standalone signup page so the new form
does not launch with a client/database length mismatch. Historical migrations
remain immutable; active constraints and functions are updated through a new
additive migration with schema, security, policy-drift, and browser coverage.

## 2026-08-08 — Replace homepage auth overlays with first-class routes

The dashboard-parity plan will replace the homepage authentication popup with
standalone `/login` and `/signup` pages. The new pages reuse the current auth
form and Supabase client rather than introducing a second authentication path.
Homepage header actions, guest prompts, and username claims navigate to these
routes; callback and reset-password links remain compatible.

The route contract permits only validated same-origin return destinations and
never places credentials, tokens, or private account data in URLs. Modal code
is removed only after desktop, mobile, keyboard, direct-refresh, signup, login,
recovery, callback, and authenticated-redirect parity is proven.

## 2026-08-08 — Keep authentication presentation route-owned

The standalone auth milestone implements the route decision with one shared
form component and a separate page shell. `/login` and `/signup` own browser
history, metadata, focus, mobile layout, safe-return state, and authenticated
redirects; `/auth/callback` and `/reset-password` remain dedicated boundary
routes. This keeps credentials and tokens out of URLs while removing modal
focus and body-scroll state from the global application shell.

## 2026-08-08 — Keep GoTrue initialization independent from API auth

The shared browser transport must not call `auth.getSession()` while sending a
GoTrue request. GoTrue uses the same fetcher during initialization and token
refresh, so that recursive lookup can leave an existing or expired session
waiting forever. Auth endpoints preserve GoTrue's own authorization headers;
the current session token is attached only to PostgREST, Storage, and Functions
requests.

## 2026-08-08 — Keep the dashboard baseline incremental while the aggregate JavaScript cap remains open

Milestone 0 narrows the browser transport to the Auth and PostgREST clients,
implements the two used Storage operations against the documented Storage API,
lazy-loads the homepage, and restructures emitted CSS without changing route or
auth behavior. It does not replace the working auth client or delete legacy
profile, roll, shop, leaderboard, legal, or prototype routes solely to satisfy
an aggregate bundle metric. The milestone remains active until the unchanged
total-JavaScript gate has a compatibility-safe resolution.

The executable browser gate may only target loopback Supabase and must cover
real rendered behavior; source-string assertions remain useful unit contracts
but are not browser evidence.

## 2026-08-08 — Give authored media a compositor-safe blur path

The identity surface retains translucent `backdrop-filter` behavior for normal
page content, while a card-local copy of uploaded backgrounds and authored
atmosphere plates consumes the validated surface-blur value directly. This
keeps the control reliable without blurring the page-wide canvas.

## 2026-08-08 — Keep effect layers transparent to surface backdrop sampling

Page-wide atmosphere layers and dashboard card-scoped atmosphere layers must
not create isolated backdrop roots. Their visible pixels remain behind the
identity surface, allowing the configured blur to sample and soften them in
both the live preview and the public profile.

## 2026-08-08 — Let the identity surface sample the page backdrop

The shared border wrapper remains clipped for cosmetic effects, but the public
identity boundary no longer creates an isolated backdrop root. This preserves
the border while allowing the card's configured backdrop blur to sample the
page-wide background, atmosphere, and cursor canvas beneath its translucent
surface.

## 2026-08-08 — Keep public effects page-wide and preview effects card-scoped

Uploaded backgrounds, atmosphere scenes, and cursor trails fill the public
profile canvas. The dashboard fitting-room preview keeps those layers inside
its card for a clean editing surface. The identity card remains the only
translucent surface, with validated RGBA opacity and backdrop blur revealing
the page canvas beneath it without recoloring the roll UI.

## 2026-08-08 — Keep public backgrounds full-page while scoping previews to the card

Uploaded profile backgrounds are a page-level visual on public profiles, so
they fill the profile viewport behind the identity and supporting content. The
dashboard fitting-room preview keeps the same media and effects inside its card
for a cleaner editing surface. All authored appearance variables still stop at
the intended public canvas/card boundaries.
Surface fill, blur, text, and highlight tokens are consumed by the shared card
and fitting-room renderers rather than being left as configuration-only values.

## 2026-08-08 — Make customization previews represent the card contract

The customization audit found that the Collection fitting room preferred the
published appearance over the current draft, and that profile media/effects
were mounted as page-level layers. The fitting room now uses the draft first
and shares the validated card-style projection with the public renderer.
Atmosphere plates and cursor trails fill the public profile while dashboard
previews keep them card-scoped. Uploaded backgrounds fill the profile page and
the daily roll remains on fixed system presentation tokens.
Layout exposes the existing module-size contract, while the daily roll
is fixed and cannot be resized or reordered. Empty links are rejected before a
save instead of being silently normalized away.

The audit also confirmed that guns.lol and Haunt offer a substantially broader
expression market—templates, widgets, uploaded fonts/cursors, crop controls,
text motion, and analytics. Those are not added as unrestricted HTML/CSS or a
second profile model here. A future expansion must use additive, validated
configuration and explicit storage/entitlement boundaries.

## 2026-08-08 — Keep profile appearance off the roll surface

Profile-authored appearance tokens now apply to the identity card surface only.
The shared profile shell keeps system presentation tokens for the daily roll so
theme colors, surface values, gradients, and text contrast cannot restyle the
roll UI while the card customization contract is still being refined.

## 2026-08-07 — Keep the Profile Studio preview persistent

The authenticated Profile Studio now mounts the existing preview-mode
`ProfileShell` in a named dashboard preview pane instead of opening it in a
temporary focus-trapped drawer. Wide layouts keep the editor and preview
visible together; narrower layouts stack the preview below the editor. The
preview still receives only normalized draft/profile data and never owns save,
publish, equip, roll, reward, or progression authority. The previous drawer
was removed so there is one consistent live-canvas relationship across
desktop and mobile.

## 2026-08-05 — Make Profile Studio a full-page dashboard and make progression tangible

The owner experience uses a full-page dashboard shell at `/profile/settings`.
The shell owns navigation, account actions, responsive behavior, and the
editor/preview workspace; the generic site header and footer are suppressed
only on this route. This keeps the profile editor coherent at desktop and
mobile sizes while preserving the public profile and direct route contracts.

The Shop stays secondary and direct `/shop` remains available. Progression is
the first reward surface: lifetime EP unlocks five authored, active catalog
effects at rank thresholds. Grants are additive, idempotent, and executed by
the server inside the existing roll transaction; the client only renders the
returned state. See `docs/milestones/PROFILE_DASHBOARD_AND_PROGRESSION_REWARDS.md`.

## 2026-08-05 — Evolve Profile Settings into Studio and hide Shop from the primary loop

The authenticated `/profile/settings` route now opens as a Profile Studio
dashboard with an Overview surface. Identity, Expression, Collection, Layout,
Privacy, and Progression remain deliberate sections behind that overview.
Studio is exposed in the primary authenticated navigation; Shop is hidden from
navigation and dashboard calls-to-action while `/shop` remains a compatibility
route.

Shop catalog loading is lazy at the product boundary: account bootstrap no
longer waits on catalog availability, while Collection and direct Shop entry
still load the same catalog and preserve the existing purchase/equip/RLS
contracts. The next progression reward slice must extend the existing
server-authoritative `roll_die_impl(boolean)` transaction and existing
achievement/inventory model rather than introduce a client-side or parallel
currency system. See `docs/milestones/PROFILE_STUDIO_DASHBOARD.md`.

## 2026-08-05 — Make Studio primary, keep Shop secondary, and give Progression its own surface

The product will use a hybrid owner model. Studio answers how a player shapes
their profile, Collection answers what they own and equip, Progression answers
what their daily play has earned, and Shop answers what expression can be
acquired next. The Shop remains available for compatibility and future premium
expression, but it is no longer the primary mental model for identity.

The first implementation slice is projection-only: it uses the existing
profile configuration, story, achievement, EP, rank, inventory, entitlement,
and equip contracts. No client-authoritative reward or purchase behavior is
introduced, and no historical catalog or inventory data is deleted. See
`docs/milestones/PROFILE_STUDIO_COLLECTION_PROGRESSION.md`.

## 2026-08-05 — Curate Name Motion into ten authored gestures

The active Name Motion catalog is now intentionally small: Ghost Frequency,
Scramble, Color Wake, Dustfall, Type In, Filament Trace, Prism Fracture,
Molten Rise, Voltage Arc, and Archive Bloom. Each is a complete Canvas 2D
gesture with authored color, timing, and geometry; players do not shop through
generic motion fragments or combine a large matrix of weak options.

The renderer remains composable internally so materials and fonts keep their
stable boundaries, but the player-facing motion catalog is curated. Removed
motion rows are marked legacy by an additive migration, and historical keys
resolve to the closest retained gesture through a finite compatibility alias
map. This preserves equipped profiles and inventory references while keeping
deprecated products out of new purchases. All motion paths use the shared
clock, remain Canvas-owned, and keep reduced-motion/static fallbacks intact.

The same curation applies to Name Materials: Raised Glass, Carbon Vein,
Afterglow, Soft Black, Quarry Mark, Cathode Bloom, and Draftline remain active;
the other material rows become legacy-only with finite material aliases.

## 2026-08-05 — Replace weak atmosphere plates without changing stable keys

Night Pollen and Paper Shadow keep their existing renderer and ownership keys so
equipped profiles and inventory records remain valid, but their authored media
is replaced with stronger plates. The visible catalog names are now Starlight
Tunnel and Chromatic Tangle to match the new particle-tunnel and colored
light-trail treatments. Both use cache-busted v2 WebM/MP4 loops and poster
fallbacks; the existing screen blend, reduced-motion behavior, and black-backed
media contract remain unchanged.

## 2026-08-05 — Treat the Shop as a fitting room

The Shop is organized as one fitting-room frame: a compact category rail owns
taxonomy, a three-column gallery owns discovery, and a right inspector owns the
live profile plus the selected cosmetic’s context and purchase action. Repeated
cards expose Preview/Owned state; the inspector is the single purchase surface.

Product cards use compact visual-first tiles with neutral near-black stages and
the same card hierarchy: specimen, slot eyebrow, cosmetic name, then quiet
rarity/collection metadata and a Preview action. The default Catalog entry is a
curated Featured set, while category and color-coded rarity filters expose the
full catalog without making the first view feel like an inventory dump.
Preview-specific gradients, loud color blocks, highlight overlays, and nested
profile panels were removed because they made different renderers feel like
unrelated UI components and weakened the actual effect.

The fitting-room chrome stays subordinate to the profile: rail descriptions,
playback controls, and the redundant layout-status badge are omitted. The live
identity surface is transparent in the inspector so atmosphere media remains
visible behind it; the title carries the primary lavender-to-blue contrast cue.

The balance display remains a quiet label/value pair rather than a competing
wallet panel. Catalog avatar previews use the authenticated profile’s safe
media URL and fall back to the user’s initial when no avatar is configured;
the former demo dog is not part of the product. Atmosphere thumbnails suppress
the shared video drop-shadow that produced colored edge bars, while cursor
thumbnails identify the product directly with a pointer, click ring, and
layered trail. Border previews keep only the visual border treatment, and
atmosphere thumbnails explicitly size their media to the card bounds so a
black-backed plate cannot leave an artificial side strip.

Borders show the effect around a simple name specimen; Atmospheres show the
media plate directly. The real profile fitting-room preview remains the place
for full composition context. Selection, purchase, ownership, accessibility,
and reduced-motion behavior stay unchanged.

## 2026-08-05 — Use black shop card shells and border-only specimens

Catalog cards now use a near-black shell and black preview stage so the effect
is the highest-contrast element in the gallery. Profile Border thumbnails no
longer repeat a profile name; they show the border treatment on an empty field,
while the selected inspector and real profile retain the identity name.

## 2026-08-04 — Replace retired atmosphere presets with sourced video plates

The seven retired procedural presets are replaced by seven new Pexels-sourced
plates: Silk Folds, Glass Caustics, Cinder Drift, Night Pollen, Paper Shadow,
Smoke Spiral, and Lumen Flare. The new product keys are additive and do not
reuse the retired identities or restore historical inventory references.

Each source is treated as a black-backed grayscale 16:9 plate, delivered at
960×540 in WebM and MP4, with a forward/reverse native loop and a representative
poster. Black backing is intentional: the renderer's `screen` blend ignores the
black field while the CSS opacity controls intensity, preserving the profile's
uploaded background across browsers. This keeps the media portable without
depending on alpha-video support. Source pages and processing notes live beside
each asset.

## 2026-08-04 — Expand atmospheres with authored, crossfaded video plates

The next atmosphere pass adds three distinct sourced treatments: Dustlight,
Ink Bloom, and Snowfall. Each source is processed into a bounded 16:9 plate,
encoded as WebM and MP4, and joined with a tail-to-head crossfade before the
native video loop. This makes looping an asset property rather than relying on
an abrupt browser restart. Screen blending keeps the user's background intact;
posters provide the reduced-motion and compact fallback.

Sources are documented beside the assets and come from [Dust Particles in Light
Beam](https://www.pexels.com/video/close-up-abstract-dust-particles-in-light-beam-36637658/),
[Ink in Water](https://www.pexels.com/video/ink-in-water-18333374/), and
[Snowfall in Black Background](https://www.pexels.com/video/snowfall-in-black-background-5485148/),
all accessed 2026-08-04.

## 2026-08-04 — Use a sourced droplet loop for Droplets on Glass

Droplets on Glass now uses a full-frame Pexels window clip rather than a
static plate. The source is reduced to a black-backed droplet highlight layer,
then encoded as a 24-second loop with a short tail-to-head crossfade. This
keeps the real droplet contours visible without bringing a dark pane or frame
edge into the profile, and gives reduced-motion surfaces a clean poster frame.

## 2026-08-04 — Separate motion rain from anchored droplets

Rain Window is now a rain-only seamless motion plate. The fixed windshield
texture was removed from it because the still droplet field read as a frozen
layer behind the moving rain. Droplets on Glass is a separate Rare atmosphere
using that authored, static pane texture; its droplets stay anchored instead
of pretending to loop.

## 2026-08-04 — Use a loop-native Rain Window plate

The first Rain Window pass tried to force arbitrary windshield footage into a
loop with a tail-to-head crossfade. Because the droplet field is random, the
crossfade still exposed a reset. The atmosphere now uses a Pexels clip marked
as a seamless loop for motion, paired with a separate low-opacity still made
from real windshield droplets. The static glass layer preserves the tactile
window identity while the loop-native plate repeats without asking unrelated
droplet states to match. Cards and reduced-motion surfaces remain static.

## 2026-08-04 — Give avatar anchors authored layers, not generic CSS presets

The first avatar quality pass keeps the existing 18 stable renderer keys and
catalog metadata, but upgrades three anchor effects with authored raster
plates: Prism Orbit, Ember Crown, and Ghost Double. One shared, bounded Canvas
compositor adds a small number of authored texture fragments; Ghost uses the
real avatar as a restrained image-aware offset.
The layers are decorative, pointer-inert, and remain inside the shared avatar
wrapper, so the same treatment works in profile, Shop, and compact surfaces.

Compact cards render a static signature and never start a per-card animation
clock. Full-profile particles pause when hidden or offscreen, cap device-pixel
ratio, clean up observers/frames, and respect reduced motion. The remaining
keys share the same authored texture vocabulary while their individual plates
remain queued for manual creative review; no new catalog product was
introduced.

## 2026-08-04 — Add three launch cosmetic slots without widening the renderer boundary

The launch catalog now adds exactly `cursor_trail`, `avatar_effect`, and
`profile_layout`. Their 39 products are finite database rows whose renderer
values resolve through code-owned registries; no catalog CSS, Canvas commands,
HTML, or URLs are accepted. Cursor trails use one profile-scoped canvas layer,
avatar effects stay inside a shared avatar wrapper, and paid layouts compose
the existing profile modules without duplicating profile data.

The three existing free layouts remain the fallback stored in
`profile_config.layoutVariant`. An owned paid layout is an equipped override;
clearing it reveals the saved free layout. Free layout selection continues to
use the existing Profile Settings save action and clears a paid override only
after that save succeeds. Shop try-on remains temporary and purchase/equip
authority stays in the existing RPCs.

The benchmark review (accessed 2026-08-04) used [guns.lol cursor/profile
effects](https://help.guns.lol/premium-guides/cursor-profile-effects), [guns.lol
layout settings](https://help.guns.lol/premium-guides/layout-settings), [guns.lol
customization](https://help.guns.lol/getting-started/customization), and the
[guns.lol changelog](https://help.guns.lol/changelog), plus [haunt.gg
Premium](https://help.haunt.gg/guides/premium), the [haunt.gg
changelog](https://help.haunt.gg/overview/changelog), and the [haunt.gg
overview](https://help.haunt.gg/). Strong reference points were direct pointer
trails, bounded profile-entry motion, avatar-local decoration, structurally
different layouts, and live previews. Chromadie adapts those interaction
patterns around daily/recent roll colors, keeps trails off touch devices, and
uses reduced-motion/static compact signatures.

| Area | Competitor baseline | Current Chromadie | Chromadie target |
| --- | --- | --- | --- |
| Cursor | Direct trails, selectable effects, and profile-scoped animation | No launch cursor slot | One bounded pointer layer with 16 distinct, roll-aware trails |
| Avatar | Local decoration, crop/radius controls, and reveal polish | Avatar and border only | Shared avatar wrapper with animated full-profile and quiet compact signatures |
| Layout | Multiple structural compositions and section modes | Three free profile variants | Eight compositions with five paid overrides and one clear free fallback |
| Preview/mobile | Live editing previews with responsive/reveal behavior | Shop preview covers retained Name/Border layers | Persistent contextual preview, meaningful mobile stacking, and reduced-motion parity |

## 2026-08-03 — Keep the homepage header consistent across supporting routes

All non-profile routes now opt into the homepage header presentation through
the shared `SiteModeHeader`. The primary navigation is intentionally limited
to Leaderboard and Shop; the account identity remains available as an account
control, while the redundant Profile navigation item is removed. Profile mode
keeps its separate account-only treatment so the public composition is not
changed. No route, auth, or data contracts changed.

## 2026-08-03 — Match the shop preview to Profile Settings

The shop fitting room now uses the Profile Settings preview language: a
Live profile / Draft preview topline, the production identity card with
avatar and visible social links, and one quiet status line. The editable page
section composition stays exclusive to Profile Settings; it does not belong
in a purchase preview. EP balance lives inside this sticky panel so account
context remains attached to the profile while the catalog scrolls. Existing
temporary try-on and renderer boundaries remain unchanged.

## 2026-08-03 — Make the shop an expression workspace

The shop now borrows the Profile Settings editor's three-part composition:
one compact rail for Catalog/Owned and layer navigation, one focused results
column, and one persistent live profile preview. This gives navigation a
single home, removes competing horizontal menus, and makes the preview part
of the selection workflow rather than a separate detail surface. The change
reuses existing catalog filtering, temporary fitting-room state, purchase
RPCs, and profile renderer boundaries; it is presentation-only and requires
no schema or endpoint changes.

Unaffordable purchase actions use a single “Need … more EP” message instead
of repeating the shortfall and full price in the same button. This keeps the
card metadata row readable at the three-column desktop density while leaving
the authoritative purchase guard unchanged.

## 2026-08-03 — Scale the shop around the profile preview

The shop desktop surface now uses a wider bounded canvas, larger supporting
type, and a wider fitting-room rail so the catalog does not read as a small
dashboard inside a large viewport. Name-layer filtering is reduced to a compact
layer selector with count badges; the descriptions remain available through
accessible labels and tooltips. Product cards omit the repeated Name slot
label, and the shared preview uses a shorter stage with a larger identity
surface. These are presentation-only changes; catalog, purchase, and profile
boundaries remain unchanged.

## 2026-08-03 — Keep catalog context in the shop header

The Catalog/Owned switch and Today’s color are account-level context, not a
second catalog introduction. They now sit with the EP balance and profile
settings actions in the shop header, so Browse can begin directly with its
category rail and product tools. The fitting-room stage is also slightly
shorter to keep the profile preview present without pushing the results below
the fold. No catalog, purchase, or endpoint behavior changes.

## 2026-08-03 — Keep the shop header compact and make fitting-room state deterministic

The Names view does not need a second headline because the category rail and
Name layers menu already establish the task. Its context row now keeps only
the live Today’s color signal. EP balance is the primary account affordance,
so it receives the strongest header scale and accent treatment; the secondary
surface is labeled Owned to describe its purpose directly.

The fitting-room renderer is keyed by the selected item and resolved loadout,
not only by the Replay control. A selection therefore remounts the shared
production renderer whenever a font, material, motion, or border changes,
while purchase and equip authority remain in their existing RPC/settings
boundaries.

## 2026-08-03 — Make catalog density and name layers immediately scannable

The shop catalog uses three effect cards per row on desktop so the browse
surface feels like a real collection rather than a sparse two-column form.
The Names category now exposes a dedicated Name layers menu with explicit
Font, Material, and Motion choices, short explanations, and counts. The menu
keeps the existing slot filtering and fitting-room selection behavior; it is a
presentation-only navigation improvement and requires no catalog or schema
change.

## 2026-08-03 — Make the shop one profile studio instead of four competing surfaces

The shop now opens on one Catalog surface with a persistent, readable profile
fitting room and keeps Collection as the only secondary surface. The former
Home and temporary Studio views remain compatible through view-state
normalization but are no longer presented as parallel destinations. The shop
launch announcement is suppressed because it belongs to the gameplay surface,
not the expression task.

Catalog cards use one selectable product surface, a neutral effect stage, and
one purchase/ownership state. The daily color appears as compact profile
context and in the real fitting-room renderer; it does not recolor the catalog.
The initial catalog render is bounded with an explicit Load more action so
Name canvases do not all mount in the first frame. Existing purchase RPCs,
wallet/inventory/entitlement refresh, temporary try-on, RLS, and profile
settings boundaries are unchanged. No schema or catalog data migration is
required.

## 2026-08-03 — Keep rendered names as legible as their semantic fallback

The shared Canvas name renderer now mirrors the IdentityCard heading contract
on its semantic node. IdentityCard owns that heading style in its component
scope, but the Canvas semantic text is rendered by a child component; without
an explicit bridge, the canvas measured a browser-default-sized node and made
equipped fonts look deceptively small. The bridge is presentation-only,
preserves the accessible text layer, and leaves renderer keys, loadouts, and
profile data unchanged.

Catalog cards also use one compact metadata/action row: Buy with its EP cost,
or a disabled Owned/Equipped state when the item is already in the account.
The preview stage is shorter and no longer reserves a separate footer row.

## 2026-08-03 — Make the fitting room read like the finished profile

The Browse fitting room now uses the same identity hierarchy as a finished
profile: the rendered name is large enough to anchor the card, the profile
surface is centered inside its stage, and social links use a bounded two-column
grid with truncation instead of colliding in a narrow flex row. Catalog name
swatches use the profile renderer context at a larger readable scale. Purchase
cards show an EP price once, inside the Buy action, while collection names use
stronger contrast and a quiet divider so they remain scannable beside rarity.
These are presentation-only changes; catalog keys, pricing, purchase RPCs,
inventory, temporary try-on, profile settings, and public profile rendering are
unchanged.

## 2026-08-03 — Keep catalog presentation independent from the daily roll

The daily color belongs to the player’s identity and Today’s Edit context;
it should not recolor every catalog tile or shop control. ShopItemPreview
therefore uses a stable neutral stage and a fixed renderer input for isolated
product previews, while the On your profile fitting-room view continues to
use the real profile color. Browse uses compact category pills, a
three-column desktop gallery, and a narrower preview rail so the product
effect—not empty panel area or repeated copy—carries the scan. Existing
catalog filtering, temporary try-on, purchase RPC, inventory, entitlement,
profile settings, responsive behavior, and reduced-motion handling remain
unchanged.

## 2026-08-03 — Resolve homepage identity from live state before showing a result

The homepage no longer paints the localhost roll fixture before the public
`today` discovery endpoint responds. A fixture may still appear locally when
that endpoint succeeds with no public rows, while production remains
live-data-only. During resolution, the homepage uses a neutral accent rather
than implying a real color. Authentication state is passed into the existing
homepage instance and the route outlet updates its props without remounting,
so a signed-in visitor does not briefly see signed-out claim controls or lose
the current endpoint result. Discovery, auth, scoring, and profile boundaries
remain unchanged.

## 2026-08-03 — Make the shop product-first and remove interface noise

The shop now treats the effect itself as the primary browse target. Browse
headings are concise, the search control has one visible label, cards use a
shorter effect stage, and product titles open the existing detail sheet without
separate Details/Manage links. Home keeps one compact today edit and a smaller
curated row; the existing Profile settings link remains the single path for
equipping owned cosmetics. The contextual fitting-room rail is shorter and its
duplicate footer copy is gone. Unknown badge IDs are omitted from previews
instead of rendering placeholder question marks. Catalog, purchase, fitting
room, profile settings, and backend boundaries are unchanged.

## 2026-08-03 — Publish the daily roll before rich homepage hydration finishes

The homepage now promotes the already-authoritative `today` discovery result
as soon as that surface returns, before waiting for avatar, link, badge, and
profile-history hydration. This keeps the first viewport truthful and useful
without inventing a client-side roll. Existing rows remain visible during
refreshes, and the lower leaderboard uses a quiet loading state instead of
placeholder bars. No RPC, scoring, or discovery data contract changed.

## 2026-08-03 — Make the shop easier to scan without changing its game boundary

The first shop improvement slice keeps the existing Home, Browse, Collection,
Studio, Product Detail, purchase, and temporary try-on architecture. Home now
leads with one daily-color edit, a compact current-profile identity strip, and
one clear detail action rather than a second full profile preview. Browse keeps
its category, subtype, search, sort, filter, and quick-buy behavior, but uses
larger effect-first cards in a two-column desktop grid and removes technical
renderer/count copy. Product Detail mounts one preview at a time through an
Item / On your profile toggle, preserving focus trapping, Escape, purchase,
try-on, and related-item behavior. No schema, RPC, catalog, price, or RLS
changes were required.

## 2026-08-03 — Keep the winner link quiet and add a useful personal signal

The highest-roll identity block is already a link, so the avatar and username
do not need an extra “View profile” instruction. The duplicate “Rarity earned”
utility row was replaced with the winner’s current streak, while the rarity
badge remains beside the hex color. The local fixture shows an em dash when
streak data is unavailable; live discovery data supplies the value.

## 2026-08-03 — Make today’s highest roll a person-led entry point

The homepage “Today’s color” panel represents the highest public roll of the
day, so the live result now says “Highest roll today” instead of leaving the
relationship between the color and the leaderboard implicit. The winning
profile is presented with its avatar, name, handle, and a direct public-profile
link. The lower action says “See today’s top rolls” and continues to scroll to
the existing leaderboard. No ranking, roll, or discovery data contract changed.

## 2026-08-03 — Carry the active daily color into the homepage wordmark

The homepage now shares one validated active-color value between the daily
color panel, the “changes every day” hero phrase, and the `.lol` portion of the
`chm.lol` wordmark. The live discovery result or localhost fixture supplies
the value through the existing homepage directory; no client gameplay state or
new data contract is introduced. The header color is mixed with light ink for
contrast and its transition is disabled under reduced motion.

## 2026-08-03 — Center the daily-color readout around the color

The homepage rail is titled “Today’s color,” which describes the visitor-facing
subject rather than the underlying roll mechanic. It centers the label, glyph,
color, and rarity as one visual unit. Score and earned rarity remain in the
lower utility rows so the result does not read like a left-aligned table beside
a centered visual. The owner line appears only for a live featured roll; the
local fixture has no extra explanatory sentence.

## 2026-08-03 — Treat the homepage daily color as a roll, not a mock result

The homepage daily-color module now uses the same language for live data and
the localhost fixture. It presents a daily roll as a color, earned rarity, and
score, without calling the fixture an “example” or exposing a made-up identity
phrase. When live discovery data is available, the module identifies the
featured profile roll; the local fixture stays owner-neutral. Its discovery
action says “See today’s public rolls” so the destination matches the content.
The result is intentionally not described as a universal color-of-the-day:
rarity belongs to each player’s roll, not to the calendar day.

## 2026-08-03 — Explain the homepage daily-color preview plainly

The homepage preview no longer presents a generated identity phrase, ambiguous
leaderboard position, or unexplained rarity value. It leads with the hex color,
labels the result as an example or latest daily color, names the score as a
roll score, and presents rarity as a property of that particular roll. The
preview uses a Rare example so a local visitor does not infer that every daily
color is Mythic. Its lower action says “Explore public profiles” and remains an
in-page path to the discovery section.

## 2026-08-03 — Give the homepage lower sections one visual rhythm

**Status:** implemented for visual review

The lower homepage remains a single authored continuation of the hero. The
product screenshots keep their real public-profile/daily-result distinction,
the explanation surface uses a horizontal three-step rail rather than a
side-navigation dashboard, and the leaderboard uses quiet line-based rows
with an explicit empty state and existing discovery route.

This is a presentation-only pass. The existing lightbox, discovery RPC,
profile links, leaderboard rows, claim flow, route behavior, and server-owned
gameplay remain intact. No new data or migration is required.

## 2026-08-03 — Refine the homepage one viewport at a time

**Status:** first iteration implemented for visual review

Homepage refinement remains incremental rather than replacing the approved
Candidate 5.11 structure. The first iteration changes only the home header,
live ticker, hero, and unavailable daily-result presentation. Empty ticker
data now takes no space, the hero uses the original-resolution profile
capture, and missing live roll data gives the profile the full stage instead
of rendering a large empty result column. Local development renders
the existing guest fixture by default; `?home_preview=empty` keeps the honest
empty state available for local testing. The fixture is presentation-only and
production never falls back to it.

The profile capture now sits inside a restrained browser frame with a small
high-contrast address bar. The browser shell shares the hero stage’s single
outer boundary rather than adding another inset card, giving visitors page
context without stacking redundant frames. A complete Safari-style toolbar
uses visual-only traffic lights, navigation, privacy, URL, reload, share,
new-tab, and tab controls; it does not pretend to be an interactive browser.
The daily result remains a separate product surface.

The existing discovery RPC, profile hydration, username claim flow, routes,
authentication, typography, lower homepage sections, and server-authoritative
roll boundary are unchanged. A full-height preview capture now keeps those
sections visible together for review; their content remains a separate,
incremental iteration surface.

## 2026-08-02 — Align the shop presentation with the approved boutique reference

**Status:** implemented in the existing shop architecture

The shop keeps its current route/view state, live catalog, purchase RPC,
wallet/inventory/entitlement refresh, temporary fitting room, and shared
Name/Profile Border renderers. The presentation now uses a narrower near-black
storefront canvas, compact balance/owned metadata, real catalog counts in the
category navigation, an editorial Today’s Edit, a four-item real curated row,
and a focused Name lab with Fonts, Materials, and Motion navigation.

The live profile preview remains account-backed. It derives the authenticated
handle and display name independently, so a display name cannot replace the
real username in the semantic profile card. No mock Admin profile, catalog
rows, schema, prices, or backend behavior were introduced.

The follow-up Name catalog pass adopts the catalog reference’s compact card
hierarchy: product name and price lead, the shared renderer occupies a bounded
preview band, and rarity, collection, description, and state form the decision
stack. Purchasable cards now expose a visible Buy action (or the existing
confirmation state) that delegates to the existing `purchase_item` boundary;
no client-side price or purchase path was added. The contextual preview adds
isolated/combined, replay, pause, and reset controls while continuing to use
the live account and shared renderer.

## 2026-08-02 — Lean alpha cosmetic reset

**Status:** accepted and implemented locally; remote deployment pending backup and approval

The alpha catalog now supports only `name_font`, `name_material`,
`name_motion`, and `profile_border` as cosmetic slots. The 64 modern Name
rows remain active, and the nine retained Profile Border keys use one finite,
code-owned `ProfileBorderEffect.svelte` component with bounded animation,
reduced-motion states, and offscreen cleanup.

The forward-only `20260802110000_lean_cosmetic_catalog_reset.sql` migration
clears obsolete equipped JSON keys, removes obsolete inventory and catalog
rows, normalizes the nine Border rows, tightens slot/renderer checks, replaces
the equip boundaries, and bumps `shop_version`. It does not refund EP or
touch wallets, rolls, scores, achievements, profile media, titles,
consumables, links, rivals, or leaderboard data. The existing inventory
foreign key is the only purchase-history dependency, so inventory is cleaned
before catalog deletion; no financial ledger is introduced.

Production order is: create a verified backup, deploy a reduced-slot client,
apply the migration, invalidate caches, verify counts and RLS/RPC behavior,
then smoke-test one Name purchase/equip, one Border purchase/equip, and safe
fallback for an obsolete-equipped profile. Recovery is a backup restore
through the database owner process; no destructive down migration or
automatic replacement grant exists.

The reset reduced the measured D2 build from 806.28 kB JavaScript and 431.81
kB CSS to 767.87 kB JavaScript and 388.92 kB CSS. Initial and largest-lazy
budgets remain passing: 431.36/450 kB and 69.24/100 kB JavaScript, plus
133.80/200 kB and 47.69/75 kB CSS. The transitional total caps still fail
honestly at 767.87/700 kB JavaScript and 388.92/380 kB CSS; no budget was
raised.

## 2026-08-02 — Historical: Activate composable Name layers behind the existing cosmetic boundary

**Status:** historical Phase D2 record; superseded by the lean alpha reset

The three Name layers use the existing `profiles.equipped_cosmetics` JSONB
object rather than introducing a parallel profile-customization model. The
additive `name_font`, `name_material`, and `name_motion` slots coexist with
the legacy `name_effect` slot. The server-authoritative `equip_item` RPC locks
the profile row, preserves the other modern layers when one layer changes,
and clears the mutually exclusive legacy/modern side atomically. Unequipping
one layer removes only that layer.

The catalog adds `catalog_status` with `active`, `legacy`, and `retired`
states. The 29 existing Name keys are explicitly `legacy`, remain in the
catalog and inventory, and remain equippable by owners; they cannot be newly
purchased. The 64 new renderer rows use stable keys of the form
`name_<slot>_<normalized_id>` and hyphenated code-owned registry keys in
`css_value`. Plain and Still remain UI defaults, not purchase rows. Renderer
rows are checked against finite Font, Material, and Motion registries and can
never contain catalog-provided CSS, HTML, JavaScript, URLs, shaders, or
Canvas commands.

The current client reads `get_shop_catalog()` so Browse/Home receive active
rows and Collection can retain owned legacy rows. A compatibility RLS policy
keeps the direct table read available to older clients while hiding the three
new slots until the D2 client is deployed. Deployment order is: apply and
verify the migration/RPCs, deploy the matching client, then verify counts,
purchase, inventory refresh, and equip conflict behavior. Recovery hides the
64 active rows by changing their status to `retired` (or another reviewed
non-purchasable state) without deleting rows, inventory, or equipped JSON;
legacy ownership is never exchanged or granted automatically.

The reference prices total 20,480,000 EP: Fonts 4,150,000, Materials
7,340,000, and Motions 8,990,000. Using the documented 54,182 average EP
per roll/day, this is approximately 6 days for an average item, 15 days for
the 760,000 EP high-rarity item, 77/136/166 days for complete Font/Material/
Motion subtypes, and 378 days for the full set before achievement rewards.
The reference supplied complete merchandising copy for Motions; the Font and
Material rows receive one concise sentence each, derived from their documented
visual identity, because those reference entries did not include descriptions.
Phase E remains responsible for proving legacy CSS is unused and removing it;
this milestone deliberately keeps the legacy renderer and CSS available.

## 2026-08-01 — Give profile backgrounds a larger quality budget

**Status:** accepted and implemented

Backgrounds are the broadest visual surface on a profile, so a 1 MB output
ceiling and 2400 px cap caused visible detail loss in textured or geometric
images. Background uploads now use a 4 MB Storage limit, a 3200 px maximum
dimension, and an initial WebP quality of 0.9. Avatar limits stay compact and
unchanged because avatars render at a much smaller scale.

## 2026-08-01 — Make ambient profile color effects opt-in

**Status:** accepted and implemented

The profile’s rolled and signature colors should communicate identity without
silently taking over the entire presentation. The structured profile config
therefore stores `colorEffectsEnabled`, defaulting to `false`. Disabled
profiles show the selected background without the atmosphere veil or ambient
color layers; play/volume controls and profile navigation cues use neutral
surface tokens. Signature color remains available for links and other card
data, and the avatar fallback stays neutral.

Users can explicitly enable ambient tinting from profile settings when they
want the signature and roll colors to shape the broader profile presentation.

## 2026-08-01 — Keep profile color identity local to card data

**Status:** accepted and implemented

Daily rolls should remain visually meaningful without recoloring the entire
public profile. The latest roll is therefore contained in the roll/result
module and its color data surfaces. The full-page atmosphere, opening canvas,
and fallback avatar use fixed neutral surface accents, and user-selected
background/atmosphere cosmetics remain independent of the roll.

The configured signature color remains available for links, badges, labels,
and other data treatments inside the identity card and supporting profile
surfaces. This keeps personal expression visible while preventing either a
daily result or signature color from taking over the profile background or
avatar.

## 2026-08-01 — Isolate homepage screenshot showcases behind a replacement manifest

**Status:** accepted and implemented

The homepage collage and below-fold showcase now render static WebP capture
slots from one small manifest containing only username, screenshot path, public
profile URL, alt text, and collage position. The central capture is eager and
the below-fold showcase is lazy; no live profile component tree, media embed,
or profile content is mounted for the screenshot surface. Four approved
public-profile captures are checked in and link to their corresponding public
routes. The ticker component, data source, polling, links, and motion behavior
remain unchanged.

## 2026-08-01 — Keep homepage profile previews limited to the live surface

**Status:** accepted and implemented

The featured homepage specimen shows the live identity card and floating audio
controls only. The horizontal “recent colors” strip was removed because it
does not exist in that form on the public profile. Color history remains in
the live profile’s secondary continuation, where the actual archive and story
components render.

## 2026-08-01 — Separate interface accent from daily-roll color

**Status:** accepted and implemented

The shared interface now uses a cool near-white accent with cyan interaction
cues. Signal lime remains available as a distinct roll and reward color, so
the game loop keeps its own visual signal without tinting every route, button,
and navigation element lime.

## 2026-08-01 — Show the profile in the first desktop viewport

**Status:** accepted and implemented

The desktop homepage keeps the product explanation, username claim, and
featured profile in one first-screen composition at 1920×1080. The hero uses
slightly tighter type scale, line height, spacing, and top padding on desktop;
mobile keeps its separate stacked reading order and type treatment. The
featured profile remains the primary visual proof rather than being pushed
below the fold.

## 2026-08-01 — Keep homepage profile previews faithful to live profiles

**Status:** accepted and implemented

Homepage profile specimens use the same floating play and volume control
pattern as live profiles. The controls are anchored to the preview canvas,
outside the identity card, and the card contains only identity, content, and
links. Daily color and rank remain in the separate roll explanation rather
than being presented as invented card fields.

The featured example now uses existing cool-toned Aurora, Celestial, Holo,
Prism, Hexagon, and Nebula cosmetics. The homepage/demo treatment no longer
uses amber as a brand accent. User-owned warm cosmetics remain available as
individual expression choices.

## 2026-08-01 — Show profiles before leaderboard data on the homepage

**Status:** accepted and implemented

The homepage now leads with a direct description of the customizable public
profile, keeps the username claim beside that explanation, and uses the large
Mara specimen to demonstrate identity, content, music, and restrained
cosmetics. The lower homepage discovery rail is replaced by
three centralized Minimal, Atmospheric, and Expressive profile specimens. Each
opens an in-page full example view, so fictional examples do not reserve real
usernames or alter public profile routing. Competitive details remain on the
leaderboard.

The example audio controls are presentation-only and do not load Spotify or
full media on the homepage. Existing username validation, auth handoff,
analytics consent, discovery navigation, scoring, and public profile data
boundaries remain unchanged.

## 2026-07-31 — Make the public profile the homepage conversion promise

**Status:** accepted and implemented

The homepage explains the profile-first loop directly and uses a curated,
structured demo-profile projection rather than a score dashboard. The existing
auth, username policy, route, and roll boundaries remain the authority. The
homepage conversion events are added to the existing consent-gated analytics
allowlist with no identity payloads.

## 2026-07-30 — Keep secondary profile data on an intentional second page

**Status:** accepted and implemented

The opening profile remains a focused identity card. When a profile has
secondary content enabled, an Explore profile cue leads to a centered,
full-height continuation containing the roll, archive, expression, and deeper
profile data. Profiles without secondary content do not show the cue.

## 2026-07-30 — Keep hosted profile audio staff-only during alpha

**Status:** accepted and implemented

Profile audio uses the existing Supabase Storage stack with one MP3 per staff
profile and a 5 MiB file limit. The player
attempts autoplay and loops by default, while native controls and browser
autoplay fallback preserve visitor control. Public profile composition gains
no new primary region. Future paid access must introduce an entitlement-aware
boundary rather than weakening the staff check.

## 2026-07-30 — Remove the profile hydration waterfall

**Status:** accepted and implemented

Independent profile projections now start together instead of waiting for
social data, scores, story, configuration, and achievements one at a time.
The static achievement catalog is cached for the lifetime of the browser
session, while owner-only data remains owner-scoped and server-authoritative.

## 2026-07-30 — Let owners hide the daily roll from visitors

**Status:** accepted and implemented

The daily roll remains available to the owner for gameplay, while profile
settings can hide the visitor-facing daily-color surface. The existing module
visibility contract is extended additively and remains server-normalized.

## 2026-07-30 — Use username as the public display name

**Status:** accepted and implemented

The account username is now the sole public display name. Profile settings
continues to support an optional bio, but no longer offers a display-name
editor. Existing display-name values are normalized to the username by an
additive migration, and the identity RPC preserves that invariant.

## 2026-07-25 — Preserve live boundaries during Phase 0

**Status:** accepted

**Context**

Phase 0 needed regression protection around the existing SPA route, profile, and roll contracts before any profile-first redesign work. The current implementation has intentional security and authority boundaries: authenticated profile hydration, public profile projections, server-authoritative roll RPCs, bounded leaderboard views, and structured cosmetic data.

**Decision**

Keep the current Svelte/Vite SPA, route URLs, Supabase RPC surface, RLS/projection boundaries, scoring/economy semantics, and deployment flow stable. Extract only pure contract helpers for route parsing, profile field/ownership mapping, and roll readiness/canonical presentation, and wire them behind the existing components. Use focused native Node tests to lock the current behavior.

**Alternatives considered**

- Rewriting the application or introducing SvelteKit during the audit: rejected because it would expand scope and create route/auth/metadata migration risk.
- Moving profile or roll decisions into client state: rejected because ownership, eligibility, scoring, rewards, purchases, and prestige must remain server-authoritative.
- Broadening public selects or weakening RLS to simplify profile rendering: rejected because public profile links are an acquisition surface and private account data must remain protected.
- Waiting to add tests until the redesign: rejected because the existing behavior is the compatibility contract the redesign must preserve.

**Consequences**

Phase 0 produces a system map and regression seam without changing product behavior or requiring a schema migration. The large feature components and duplicated server/client metadata paths remain known hazards. The local Supabase parity/security checks were initially blocked by a stopped container, then passed after the project database container was restarted without a reset.

**Related files**

`docs/CURRENT_SYSTEM_MAP.md`, `docs/PHASE_0_REPORT.md`, `src/lib/routes.js`, `src/lib/profileContract.js`, `src/lib/rollState.js`, `test/phase-0-contracts.test.js`, `src/App.svelte`, `src/lib/Profile.svelte`, `src/lib/Game.svelte`.

## 2026-07-25 — Isolate Phase 1 foundations from the live profile

**Status:** accepted

**Context**

The current profile component combines data loading, ownership rules, cosmetics, achievements, and rendering. Phase 1 needs a coherent visual system and a responsive profile composition without creating a second source of truth or risking live profile behavior.

**Decision**

Add token CSS, explicit motion primitives, and small reusable `Surface`, `Button`, `Media`, and `Module` components. Build the first profile composition with immutable fixture data at `/prototype/profile`, served with `noindex,nofollow` metadata. Keep the prototype disconnected from stores, Supabase, auth, scoring, rewards, and live profile rendering.

**Alternatives considered**

- Replacing `Profile.svelte` immediately: rejected because live owner/visitor behavior needs a separate Phase 2 migration and parity plan.
- Adding profile configuration tables: rejected because Phase 1 has no backend deliverable.
- Styling only the existing global classes: rejected because it would deepen coupling and make the new system difficult to migrate incrementally.

**Consequences**

The prototype gives desktop/mobile composition and foundation primitives a concrete review surface while preserving rollback to the live app. It adds one explicitly non-indexable route and a Pages Function metadata path. Future live integration must adapt canonical profile data into the module contract rather than importing the fixture.

**Related files**

`src/styles/tokens.css`, `src/styles/foundations.css`, `src/styles/motion.css`, `src/lib/foundation/`, `src/lib/profileFixture.js`, `src/lib/ProfileCanvasPrototype.svelte`, `functions/prototype/profile.js`, `test/phase-1-foundations.test.js`.

## 2026-07-25 — Migrate the profile route through a shared live shell seam

**Status:** accepted

**Context**

Phase 2 needs the Phase 1 profile composition to render real current account and public profile data without duplicating the owner/visitor security branch or removing working owner controls. The current schema has no public bio or avatar field, and the existing `Profile.svelte` still owns mood editing, badge pinning, rivals, and deletion.

**Decision**

Extract the existing profile hydration into `src/lib/profileData.js`, preserving the explicit `get_my_profile` owner branch, allow-listed visitor profile select, bounded public score RPC, public achievement definitions, and owner-only achievement progress. Integrate a new `ProfileShell.svelte` at the existing profile routes. Keep the current renderer behind `legacy=1`, with canonical public URLs and `noindex,follow` fallback metadata during migration. Use a safe username monogram plus the existing brand mark where the current schema has no avatar field.

**Alternatives considered**

- Duplicate the data loader in the shell and legacy component: rejected because ownership/privacy drift would become likely during the migration.
- Replace the large legacy profile in place: rejected because it would remove a safe rollback path for mood, pinned badges, rivals, and account deletion.
- Add bio/avatar/profile-configuration columns now: rejected because that belongs to Phase 4 and would require a separate schema, privacy, validation, and migration review.
- Integrate today's roll into the new shell: rejected because roll presentation and no-navigation updates are Phase 3 deliverables.

**Consequences**

Current `/u/<username>`, `/profile`, and profile-id routes use the live shell while preserving the existing URL and Supabase boundaries. The shell renders public profile identity, rank, stats, best roll, recent colors, pinned badges, and sanitized cosmetics; owner controls remain reachable through an explicit temporary fallback. Phase 2 adds no schema migration and does not change scoring, economy, rewards, RLS, or production data semantics.

**Related files**

`src/lib/profileData.js`, `src/lib/ProfileShell.svelte`, `src/lib/Profile.svelte`, `src/lib/routes.js`, `src/App.svelte`, `functions/u/[[username]].js`, `test/phase-2-profile-shell.test.js`, `docs/PHASE_2_REPORT.md`.

## 2026-07-25 — Integrate the authenticated roll into the profile shell

**Status:** accepted

**Context**

Phase 3 needs today’s roll to feel like an event in the owner’s profile while preserving the existing guest flow, server-authoritative transaction, and public profile boundary. The existing `Game.svelte` contains useful roll behavior but also owns guest persistence and share presentation, so replacing it or duplicating its RPC/lock logic would create compatibility risk.

**Decision**

Add an owner-only `ProfileRoll.svelte` inside `ProfileShell.svelte`. Route both the existing game and the new profile module through `rollService.js`, `rollState.js`, and the shared percentile presentation helper. Reuse `get_my_daily_roll`, `get_score_percentile`, and `roll_die`; animate and display only bounded server-returned fields; refresh the existing profile, inventory, and wallet stores after success; and reload the shell projection without navigation. Keep guest/local persistence, challenge/share actions, and the legacy renderer on their existing paths.

**Alternatives considered**

- Move all roll UI into the profile shell and remove the root game path: rejected because guest/local behavior and existing share/challenge flows need to remain stable.
- Compute score, rarity, eligibility, or rewards in the new component: rejected because the SQL RPC and its RLS/security boundary remain authoritative.
- Add a new roll table or alter the scores schema: rejected because the existing canonical roll RPC and stored presentation already supply the Phase 3 data.
- Reuse `Game.svelte` directly inside the profile shell: rejected because its guest persistence, share modal, and large component ownership would make profile integration harder to guard and test.

**Consequences**

Authenticated owners get a no-navigation roll experience in the live profile. Public visitors do not receive owner controls, guests retain the root local-only flow, and both client surfaces share the same request/canonical/lock seams. The new module adds no schema, RLS, scoring, economy, reward, route, metadata, or production-data changes. Phase 4 remains responsible for structured profile configuration, links/discovery, and any separately reviewed migrations.

**Related files**

`src/lib/ProfileRoll.svelte`, `src/lib/ProfileShell.svelte`, `src/lib/rollService.js`, `src/lib/rollPresentation.js`, `src/lib/Game.svelte`, `test/phase-3-profile-roll.test.js`, `docs/PHASE_3_REPORT.md`.

## 2026-07-25 — Add a versioned profile configuration boundary

**Status:** accepted

**Context**

Phase 4 needs to make the live profile more personal without turning profile
customization into unrestricted user-authored markup or exposing private draft
state. The existing `profiles` table is a protected account projection, and
the roll module remains the primary owner transaction surface established in
Phase 3.

**Decision**

Add one additive `profile_configurations` row per profile with version-1
`draft_config` and `published_config` JSONB projections. The server normalizes
signature color, layout variant, module ids/order/visibility/size, and up to
six typed HTTPS links. Browser roles have no table grants; owner reads/writes
and public published reads use narrowly granted security-definer RPCs. Saving
never changes public rendering; an explicit publish promotes the validated
draft. The roll module is always visible. The client mirrors the contract only
to render safely and provides an owner-local preview; it does not decide
ownership, validation, publication, scoring, rewards, or economy state.

**Alternatives considered**

- Adding many nullable customization columns to `profiles`: rejected because
  it would widen a security-sensitive account projection and make future
  module evolution harder.
- Storing HTML/CSS or arbitrary URLs: rejected because profile links are a
  public acquisition surface and customization must remain structured,
  validated, and safe.
- Applying drafts immediately on save: rejected because owners need a private
  composition space and visitors need a clear published boundary.
- Allowing the owner to hide the roll module: rejected for this phase because
  the Phase 3 profile roll is the primary authenticated daily transaction and
  must remain discoverable.
- Adding configuration to Pages Function metadata/JSON-LD now: rejected
  because metadata remains username/profile based and should not depend on an
  interactive configuration RPC.

**Consequences**

Owners can configure signature color, layout, module order/visibility, and
safe links with a local preview and explicit publication. Visitors receive
only the published projection. The migration adds one protected table and four
RPC boundaries, preserves account deletion via cascade, and leaves existing
auth, routes, profile field allow-lists, roll authority, scoring, economy,
rewards, and metadata semantics intact. Future configuration versions must
update the SQL normalizer, client normalizer, editor, public projection, and
security tests together.

**Related files**

`supabase/migrations/20260725100000_profile_configuration.sql`,
`supabase/SECURITY.md`, `src/lib/profileConfig.js`,
`src/lib/profileData.js`, `src/lib/ProfileEditor.svelte`,
`src/lib/ProfileShell.svelte`, `test/phase-4-profile-config.test.js`,
`docs/PHASE_4_REPORT.md`.

## 2026-07-25 — Add durable public story projections without changing the config contract

**Status:** accepted

**Context**

Phase 5 needs profiles to accumulate visible history and collection meaning.
Canonical scores already contain safe public color/condition/presentation data,
but the live shell only reads a bounded recent-score window. `user_achievements`
is intentionally owner-private, and Phase 4 configuration rows use an exact
version-1 module shape that should not be invalidated by speculative module
versioning.

**Decision**

Add an additive `profile_events` projection with idempotent database triggers
for profile creation and canonical score insert/update, plus an idempotent
historical backfill. Expose it and a lifetime condition summary through one
bounded `get_public_profile_story(uuid)` RPC. Compose the timeline and
collection showcase inside the existing configurable `recent` and
`achievements` modules instead of changing the Phase 4 configuration schema.
Use server-owned `total_rolls` only to reveal more story depth and unlock the
collection showcase; it is presentation gating, not an entitlement or reward
authority.

**Alternatives considered**

- Deriving the entire timeline directly from `scores` on every read: rejected
  because durable event identity and future event types need a stable history
  projection.
- Mirroring every `user_achievements` row into public events: rejected because
  achievement unlock progress remains owner-private; pinned badges and
  canonical roll conditions are the public accomplishment surfaces.
- Extending the version-1 configuration module set immediately: rejected
  because existing saved eight-module layouts could be invalidated without a
  concrete version migration. Story sections can use the existing recent and
  achievement modules for this vertical slice.
- Adding event writes to scoring/roll calculation code: rejected because the
  triggers observe committed canonical rows and keep authority boundaries
  separate.

**Consequences**

Old and new profiles receive a durable origin/roll story, lifetime condition
collection, and progressive story depth without route or metadata changes.
Public responses are bounded, safe-normalized, and available to anon and
authenticated visitors through one RPC; browser roles cannot read the event
table. The migration adds trigger work to score/profile writes and a bounded
aggregation query, so future event types must include privacy, payload,
indexing, and deletion reviews. Scoring, eligibility, rewards, economy,
private achievements, auth, and existing configuration semantics remain
unchanged.

## 2026-08-01 — Extend the homepage contract across supporting pages

The full leaderboard route now presents its existing discovery results as one
quiet, homepage-style board: profile identity, current roll, score, and the
existing metadata/actions remain available without the previous feature-card
visual hierarchy. Privacy and Terms now share the same document shell, type
scale, muted copy role, and rule-separated sections. This is presentation-only;
RPC data, filters, follow/share behavior, auth, public profile routes, and
profile-specific rendering remain unchanged.

## 2026-08-01 — Keep profile entry transparent and account-only

Profile mode uses the homepage header typography over the profile atmosphere,
without a header surface, application navigation, edit control, or mobile menu.
The only visible controls are the `chm.lol` wordmark and the current account
identity/sign-out or sign-in action. The homepage daily-result column uses a
centered middle row so its color presentation is not top-heavy.

## 2026-08-01 — Keep signed-out navigation out of guest profile onboarding

Signed-out supporting routes now keep the public Explore/Leaderboard header
navigation instead of exposing the legacy `?view=profile` guest onboarding
surface. Authenticated profile navigation is unchanged.

**Related files**

`supabase/migrations/20260725110000_profile_story.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/profileStory.js`, `src/lib/ProfileTimeline.svelte`,
`src/lib/ProfileCollection.svelte`, `src/lib/profileData.js`,
`src/lib/ProfileShell.svelte`, `test/phase-5-profile-story.test.js`,
`docs/PHASE_5_REPORT.md`.

## 2026-07-25 — Turn the leaderboard into a bounded public discovery hub

**Status:** accepted

**Context**

Phase 6 needs ranking and browsing to lead people into public profiles. The
existing leaderboard reads safe projection views, but its rows are weak
profile entry points and it has no public pagination or discovery surfaces.
The profile route, metadata path, and authenticated rivals behavior are
already compatibility contracts.

**Decision**

Add one additive `get_public_discovery(text,text,text,integer,integer)`
SECURITY DEFINER read projection with explicit surfaces for today, weekly,
monthly, all-time, recent exceptional, rising, new, and deterministic daily
random discovery. Validate the surface, rarity, username prefix, page, and
limit in the function; cap pages at 20 and returned rows at 12. Return only
public card fields and the validated username, never an internal `user_id`.
Add the supporting date/best-roll/recent-player indexes.

Replace the leaderboard presentation through small
`DiscoveryHub.svelte` and `DiscoveryCard.svelte` components while retaining
`Leaderboard.svelte` as the route entry point. Keep the existing rivals RPC
and follow control as a compatibility path because that mutation currently
requires its target id. New public cards navigate and share through the
existing `/u/<username>` route.

**Alternatives considered**

- Keep extending the existing large `Leaderboard.svelte`: rejected because
  filters, pagination, profile cards, and several ranking meanings would
  deepen a coupled component rather than establish a migration seam.
- Query `scores` or `profiles` directly from the browser: rejected because
  authoritative score tables and broad profile fields must remain behind
  explicit public projections.
- Return profile ids from every discovery surface: rejected because the
  public profile URL already has a validated username contract and discovery
  does not need internal identifiers.
- Use client-side randomization or ranking: rejected because ordering and
  boundedness belong to the server projection; random discovery uses a stable
  daily server hash.
- Add follow/reaction/guestbook writes: rejected because those are Phase 7
  social-layer deliverables; only the existing rivals compatibility behavior
  remains.

**Consequences**

The canonical `/leaderboard` URL now opens a public discovery hub with strong
profile cards, exceptional/rising/new/random surfaces, username/rarity
filters, bounded load-more pagination, and Web Share/clipboard profile links.
Today/weekly/monthly/all-time rankings and rivals remain available. The new
RPC and indexes are additive; scoring, eligibility, rewards, economy, RLS
policy semantics, roll transactions, historical data, and profile metadata
URLs remain unchanged. The random surface is exploratory rather than a
competitive ranking, and its daily hash ordering is intentionally separate
from indexed score ordering.

**Related files**

`supabase/migrations/20260725120000_public_discovery.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/discoveryData.js`, `src/lib/DiscoveryHub.svelte`,
`src/lib/DiscoveryCard.svelte`, `src/lib/Leaderboard.svelte`,
`src/lib/routes.js`, `functions/leaderboard.js`,
`test/phase-6-discovery.test.js`, `docs/PHASE_6_REPORT.md`.

## 2026-07-25 — Put the first social layer behind protected profile RPCs

**Status:** accepted

**Context**

Phase 7 needs profiles to create safe reasons to revisit one another without
introducing private messaging, notification spam, or browser-authoritative
moderation state. The existing social surface is the authenticated five-rival
`user_follows` graph and its `toggle_follow` RPC. The public profile shell and
discovery RPC already provide the stable read and URL seams for a social slice.

**Decision**

Add an additive social schema in
`supabase/migrations/20260725130000_social_layer.sql` with protected tables for
profile social settings, favorites, positive reactions, guestbook entries,
blocks, reports, and per-account rate-limit windows. Keep all new tables RLS
enabled with no browser table privileges. Expose only fixed-search-path
SECURITY DEFINER RPCs for public social reads, authenticated writes, owner
privacy settings, block/report actions, and guestbook deletion. Extend the
existing follow toggle with the same block and interaction checks while
preserving its five-rival cap and return contract.

Use three non-competitive reaction types (`spark`, `glow`, and `cheer`), a
bounded plain-text guestbook with no URLs, and owner controls for interactions,
guestbook availability, recent activity, and discovery inclusion. Enforce
blocks and settings inside each mutation, rate-limit each action server-side,
retain moderation details outside public projections, and cascade social rows
with account deletion. Integrate one `ProfileSocial.svelte` module through
the existing `ProfileShell`/`profileData.js` seam; successful writes reload the
bounded projection rather than inventing optimistic authority.

**Alternatives considered**

- Add direct browser policies to each social table: rejected because a single
  projection/RPC boundary makes privacy, blocks, validation, and rate limits
  auditable and avoids exposing internal account relationships.
- Start with guestbook before blocks/reports: rejected because guestbook and
  reaction writes require abuse controls before public release.
- Add notifications or private messages: rejected because notification spam
  and message moderation are separate systems and are explicitly deferred.
- Reuse `user_follows` as favorites: rejected because rivals are a capped
  competitive compatibility feature; save/favorite is a separate expressive
  signal and must not change the existing rivals semantics.
- Store profile privacy in client configuration JSON: rejected because
  activity/discovery visibility must be enforced by the public score/story/
  discovery projections, not by a render hint.

**Consequences**

Visitors can read bounded positive social signals and guestbook notes; only
authenticated users can mutate them. Owners control interaction, guestbook,
activity, and discovery visibility. Blocks remove reciprocal follows,
favorites, and reactions and suppress the social projection. Guestbook text is
escaped by normal Svelte interpolation and validated again in SQL. Social
signals do not affect scores, rarity, ranks, EP, rewards, achievements, shop
state, or notifications. The public `/u/<username>` URL, Pages metadata,
discovery URL, legacy profile fallback, and no-private-message boundary remain
unchanged.

The current block action leaves guestbook rows protected for moderation and
hides them from the blocked projection; changing that retention behavior is a
future moderation decision. Notifications, visitor counts, comparisons, and
broader profile visibility remain outside this milestone.

**Related files**

`supabase/migrations/20260725130000_social_layer.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/profileSocial.js`, `src/lib/ProfileSocial.svelte`,
`src/lib/profileData.js`, `src/lib/ProfileShell.svelte`,
`test/phase-7-social.test.js`, `docs/PHASE_7_REPORT.md`.

## 2026-07-25 — Keep decoration expression additive and entitlement-gated

**Status:** accepted

**Context**

Phase 8 needs the shop to feel like a profile decoration studio while
preserving the existing live catalog, EP economy, inventory ownership, and
server-authoritative equip boundary. The current shop fitting room used a
compact mock profile preview and had no explicit distinction between earned
items and future premium expression.

**Decision**

Keep `/shop` and `Shop.svelte` as the compatibility entry point, add a small
`DecorationStudio.svelte` wrapper, and render the fitting-room profile hero
through the existing `ProfileShell.svelte` in a network-free isolated preview
mode. Show explicit free-baseline, earned, and premium-expression labels. The
free baseline remains complete for every profile; existing earned items keep
their current EP/inventory behavior.

Add an additive `profile_entitlements` table with RLS enabled, no browser
table grants, a fixed-search-path owner projection RPC, and a service-role-only
idempotent grant RPC. Add `access_tier` and `entitlement_key` metadata to
`shop_items`, with two premium expression examples. Premium catalog rows are
not purchasable with EP; `equip_item` checks the matching entitlement inside
the server transaction. Account deletion removes entitlement rows.

**Alternatives considered**

- Treat premium rows as zero-cost shop items: rejected because cost `0` would
  make browser-visible catalog state look like an earned purchase and would
  bypass an explicit monetization boundary.
- Grant or equip premium items from the client: rejected because entitlement,
  purchase, and expression ownership are server-authoritative account state.
- Add a payment provider/webhook in this milestone: rejected because it would
  introduce external credentials, billing semantics, and operational failure
  modes before the entitlement boundary is audited.
- Create a second profile renderer for the studio: rejected because it would
  duplicate cosmetics safety, profile mapping, and future profile layout
  behavior. The existing shell now has a deliberately isolated preview mode.
- Make free profiles sparse to increase premium conversion: rejected because
  the product north star requires a beautiful, personal identity at the free
  baseline; premium is expression, not social access or gameplay power.

**Consequences**

The shop now communicates the access model and previews the actual profile
hero. Entitled premium keys can appear in the owner fitting room and be
equipped only after the RPC rechecks the entitlement; unentitled premium rows
remain preview-only. No score, rarity, rank, EP, reward, achievement, roll,
RLS, public URL, metadata, or historical data semantics changed. The local
reset caught and corrected closed catalog CASE coverage in the snapshot and
reprice migrations, and the security audit covers grants, fixed search paths,
premium gates, and account deletion.

Payment/webhook issuance, entitlement administration, receipts, refunds,
subscription lifecycle, notifications, and Phase 9 product work remain
deferred.

**Related files**

`supabase/migrations/20260725140000_decoration_entitlements.sql`,
`supabase/tests/launch_security.sql`, `supabase/SECURITY.md`,
`src/lib/DecorationStudio.svelte`, `src/lib/Shop.svelte`,
`src/lib/ShopStudioPreview.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/shopCatalog.js`, `src/lib/stores.js`,
`test/phase-8-decoration.test.js`, `docs/PHASE_8_REPORT.md`.

## 2026-07-25 — Harden launch surfaces behind bounded runtime contracts

**Status:** accepted

**Context**

Phase 9 begins with launch polish, but the current application has several
distinct production-readiness gaps: the Vite bundle remains a single chunk
above the default warning threshold, programmatic navigation has no shared
content focus target, structured media has no load-error fallback, and public
HTML responses do not distinguish cacheable published profiles from private or
legacy responses. Product analytics and legacy-renderer retirement also need
privacy and compatibility decisions before implementation.

**Decision**

Add a narrow launch-hardening slice without changing canonical account or
gameplay state:

- define a `check:performance` asset budget of 650 KiB JavaScript, 300 KiB CSS,
  and 12 KiB HTML;
- add a keyboard-visible skip link and focus the `#main-content` region after
  programmatic and browser-history navigation while preserving dialog/mobile
  focus restoration;
- normalize media sources to same-origin paths or HTTPS, reserve the existing
  aspect-ratio box, and render an accessible fallback after invalid or failed
  loads;
- apply short public cache windows to published public HTML and immutable
  caching to hashed assets, while keeping missing, owner/private, and
  `legacy=1` profile responses no-cache;
- lock the behavior with focused native tests and retain the existing full
  validation suite.

Do not add an analytics sink, payment/webhook flow, arbitrary media/embeds,
SvelteKit, or legacy-route removal in this slice. Cloudflare Web Analytics
remains shell-level measurement only until consent, event redaction, retention,
and operational ownership are defined.

**Alternatives considered**

- Hide or raise the existing Vite chunk warning without a budget: rejected
  because a launch gate should expose regression pressure rather than conceal
  it. Code-splitting requires a measured follow-up.
- Cache every profile response: rejected because owner/private and legacy
  responses can carry migration/control state and must remain non-cacheable.
- Allow arbitrary HTTPS/HTTP/data media: rejected because future media must
  remain safe, CSP-compatible, and predictable on mobile; only local and HTTPS
  sources are currently needed.
- Add browser analytics directly to Supabase: rejected because this would
  create a new behavioral-data and retention surface without a consent or
  moderation/operations decision.
- Remove `legacy=1` now: rejected because mood, pinned badges, rivals, and
  deletion still depend on that compatibility renderer.

**Consequences**

The application has explicit launch regression guards and a safer public
acquisition surface. These changes are presentation/HTTP behavior only; they
do not alter auth, RLS, scoring, roll eligibility, rewards, economy,
entitlements, social records, public profile fields, or historical data. The
current bundle warning remains visible and is recorded as a separate
optimization boundary. Analytics instrumentation, browser/device audit,
moderation operations documentation, deeper code-splitting, and legacy cleanup
remain the next Phase 9 slices.

**Related files**

`scripts/check-performance-budget.mjs`, `package.json`,
`src/lib/mediaSafety.js`, `src/lib/foundation/Media.svelte`, `src/App.svelte`,
`functions/_publicPage.js`, `functions/u/[[username]].js`,
`functions/index.js`, `functions/leaderboard.js`, `functions/how-to-play.js`,
`functions/privacy.js`, `public/_headers`,
`test/phase-9-launch-polish.test.js`, `docs/PHASE_9_REPORT.md`.

## 2026-07-25 — Keep product events opt-in, redacted, and provider-neutral

**Status:** accepted for the Phase 9 continuation slice

**Context**

The application already has Cloudflare Web Analytics at the shell level, but
it had no product-event contract. Adding a provider or database sink directly
would create a new behavioral-data surface without an agreed consent model,
retention period, deletion path, redaction policy, or operational owner.

**Decision**

Add a small client-side event seam in `src/lib/productAnalytics.js` with:

- explicit `granted`/`denied` consent from the privacy page, stored only in
  browser local storage;
- a fixed list of coarse route/profile/roll/share/shop event names and
  property keys;
- control-character stripping and bounded strings, with no usernames, emails,
  ids, scores, colors, draft configuration, entitlements, guestbook content,
  reports, or moderation state;
- a page-local `CustomEvent` adapter and memory adapter for tests, with no
  network or Supabase write;
- call sites attached only to existing route/readiness/success transitions,
  never to gameplay or account authority.

Document the current social moderation boundary separately. Protected report
and guestbook tables, RLS, RPC validation, blocks, rate limits, and deletion
cascades are the current safety controls; a dashboard, notification queue,
appeal workflow, moderator identity audit, and global freeze remain future
operational work.

**Alternatives considered**

- Insert events directly into Supabase: rejected because it would establish
  durable behavioral-data retention and access semantics prematurely.
- Send events to Cloudflare or a third-party provider immediately: rejected
  because shell analytics and product analytics have different consent,
  redaction, and ownership requirements.
- Emit usernames, profile ids, roll values, or moderation fields: rejected
  because the current funnel does not need identity or private-content data.
- Add a moderation UI in this slice: rejected because it would require a
  privileged operator identity, audit trail, queue semantics, and deployment
  surface beyond the current protected RPC boundary.

**Consequences**

Product flows can be measured in a future-approved way without coupling
delivery to gameplay, profile publication, shop authority, or social writes.
With the current adapter, events disappear with the page and revoking consent
stops future delivery. A future sink must preserve this contract and obtain an
assigned owner, retention/deletion process, access controls, and incident
response approval before activation.

**Related files**

`src/lib/productAnalytics.js`, `src/lib/AnalyticsPreferences.svelte`,
`src/main.js`, `src/App.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/Game.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/DiscoveryCard.svelte`, `src/lib/Shop.svelte`,
`test/phase-9-analytics.test.js`, `docs/ANALYTICS_CONTRACT.md`,
`docs/MODERATION_OPERATIONS.md`.

## 2026-07-25 — Treat linked schema/catalog drift as a launch blocker

**Status:** accepted for the Phase 9 browser-audit boundary

**Context**

The Chromium audit passed the local critical flows, but the configured linked
Supabase project is behind the branch. `supabase migration list --linked`
shows the remote ending at `20260712200000_launch_audit_remediation`, while
the local Phase 4–8 migrations remain pending. Read-only RPC probes return
`PGRST202`/HTTP 404 for discovery, profile configuration/story/social, and
owner entitlement/settings surfaces. The remote catalog comparison also lacks
two local shop keys.

**Decision**

Treat the drift as a deployment/launch blocker. Do not add a client fallback to
older profile/discovery queries, do not make a browser-only catalog exception,
and do not push migrations implicitly. Require an authorized release/DB owner
to confirm the target project, backup or point-in-time recovery ownership,
ordered migration review, post-push RPC/catalog checks, and rollback plan
before deployment.

Record the browser evidence and recovery boundary in
`docs/PHASE_9_BROWSER_AUDIT_REPORT.md` and
`docs/ROLLBACK_AND_RECOVERY.md`. Keep scoring, roll eligibility, rewards,
economy, entitlements, RLS, public privacy, and historical data semantics
unchanged while the drift is resolved.

**Consequences**

The local frontend can be reviewed independently, but Phase 9 launch
certification cannot be declared until remote schema/catalog parity is
verified. A matching frontend deployment must follow, not precede, the
server-side RPC boundary. The first remediation action is operational and
requires explicit authorization; it is not a UI redesign or compatibility
refactor.

**Related files**

`docs/PHASE_9_BROWSER_AUDIT_REPORT.md`, `docs/ROLLBACK_AND_RECOVERY.md`,
`supabase/MIGRATIONS.md`, `supabase/migrations/20260725100000_profile_configuration.sql`,
`supabase/migrations/20260725140000_decoration_entitlements.sql`,
`test/phase-9-browser-audit.test.js`.

## 2026-07-25 — Reconcile the live profile around identity first

**Status:** accepted for Phase 10

**Context**

The Phase 0–9 infrastructure was complete and protected, but the live
`ProfileShell` still presented identity, roll, stats, history, achievements,
social, owner controls, and boundary explanations as an equal-weight game
dashboard. The product direction now requires the public profile to feel like
a composed personal website before the visitor understands the game.

**Decision**

Keep the existing live data/authority seams and project their stored v1
configuration into at most four primary regions: identity, roll/latest result,
expression, and one featured story/accomplishment. Make the authenticated bare
root resolve to the owner profile while keeping explicit `/?view=game` as the
direct roll route. Collapse secondary history, stats, social, configuration,
and owner compatibility surfaces behind native detail/owner sections. Remove
the visible public-boundary explanation and redundant primary calls to action.

Use `src/lib/profileComposition.js` as a presentation projection only. Keep
`ProfileEditor`, `ProfileSocial`, the secure `ProfileRoll`, the legacy
`legacy=1` renderer, the profile configuration normalizer, all RPCs, and all
stored data intact. Use real mapped profile data in production and a stable
public account only for screenshot inspection.

**Alternatives considered**

- Rewrite the profile and remove legacy/configuration paths: rejected because
  it would discard working controls, stored configurations, and rollback
  safety.
- Add a new profile schema or bio/avatar/media system: rejected because Phase
  10 is a visual reconciliation, not a data-model or media milestone.
- Hide secondary data entirely: rejected because the profile’s history,
  achievements, social, and account features remain important attachment and
  compatibility surfaces.
- Leave the root as Roll and add a separate profile home: rejected because it
  preserves the dashboard-first product impression and makes the profile
  secondary to the game.

**Consequences**

The public profile reads as identity and expression first, with the latest
color visible before the detail history. The primary composition fits the
desktop gates and leads with identity/roll on mobile. Secondary content adds
intentional disclosure instead of competing for initial attention. The global
footer remains normal site navigation, while legacy/configuration/RPC data
remain available for compatibility.

The linked Supabase project still has the Phase 9 documented migration/catalog
drift. Phase 10 does not push migrations, add client fallbacks, or claim launch
certification; remote reconciliation remains an authorized release action.

**Related files**

`src/lib/profileComposition.js`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileExpression.svelte`, `src/lib/ProfileFeatured.svelte`,
`src/lib/ProfileRoll.svelte`, `src/App.svelte`, `src/lib/routes.js`,
`src/lib/foundation/Surface.svelte`, `test/phase-10-profile-first.test.js`,
`docs/11_PRODUCT_DIRECTION_ADDENDUM.md`,
`docs/milestones/PHASE_10_VISION_RECONCILIATION.md`,
`docs/PHASE_10_REPORT.md`.

## 2026-07-26 — Treat minimalism as a composition constraint, not a card count

**Status:** accepted as the Phase 11 workflow boundary

**Context**

The Phase 10 profile reduced the number of visible regions, but the result
still retained the visual grammar of an AI-designed dashboard: a large hero
followed by separate cards and repeated module chrome. The intended reference
is a simple personal page whose identity, mood, links, and daily color ritual
feel authored as one surface.

**Decision**

The next workflow will evaluate and implement a continuous profile composition,
not another pass that merely removes or collapses cards. Identity and roll are
one central moment. Links and story are quiet continuation. Cards, borders,
eyebrows, repeated labels, and subsystem language are exceptional treatments,
not defaults. The screenshot review is a hard design gate: if the page reads as
a set of modules or needs explanation as a dashboard, the work fails review.

Keep the existing profile data, configuration, RPC, auth, RLS, roll, scoring,
rewards, economy, entitlements, history, cosmetics, social, moderation,
routes, and legacy compatibility boundaries unchanged.

**Consequences**

Phase 11 will begin with a visual contract and before/after screenshots before
component changes. The profile may become visually simpler even though the
underlying feature set remains intact. Detail surfaces can still expose the
full system, but the public first impression must communicate a person and a
mood before mechanics and statistics.

**Related files**

`docs/12_NEXT_PHASES_ROADMAP.md`,
`docs/milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md`,
`docs/PHASE_10_REPORT.md`.

## 2026-07-26 — Make identity and roll one authored opening composition

**Status:** accepted and implemented for Phase 11

**Context**

The Phase 10 four-region projection met the content ceiling but still looked
like a hero followed by three equal cards. The intended reaction is personal
website envy before game comprehension; card count alone could not create that
reaction.

**Decision**

Keep the four-region data contract as a ceiling, but render identity and the
latest/next color inside one continuous atmospheric opening canvas. Render
links, signature expression, and one story/accomplishment trace as quiet
typographic continuation. Reserve visible card treatment and repeated module
chrome for deliberate detail or owner surfaces. The owner roll gets an
integrated presentation mode that changes copy and framing only; its secure
request, canonical response, reroll guard, reward handling, and refresh seam
remain the same.

**Consequences**

The default public profile is materially simpler without deleting data or
feature access. The first viewport communicates a person, mood, and color
before stats, mechanics, or social subsystems. The supporting detail disclosures
remain available for users who want the full game/profile history. Screenshot
review is required evidence for this visual boundary.

The linked Supabase migration/catalog drift and Firefox/device certification
gap remain release blockers. This decision does not authorize remote writes,
schema changes, media integration, or later product expansion.

**Related files**

`src/lib/ProfileShell.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileExpression.svelte`, `src/lib/ProfileFeatured.svelte`,
`test/phase-11-continuous-profile.test.js`,
`docs/PHASE_11_VISUAL_CONTRACT.md`, `docs/PHASE_11_REPORT.md`.

## 2026-07-26 — Use the approved mockup as a composition contract

**Status:** accepted and implemented for Phase 10.2

The approved `design/reference/v0-profile-mockup/` is translated into Svelte
as a centered personal identity surface: a minimal profile header, canonical
daily color, one quiet collection trace, and one expression/music boundary.
The reference remains frontend-only inspection material. Its React/Next.js
architecture, literals, local roll simulation, placeholder socials, and fake
music behavior are rejected from production.

The live renderer uses the existing mapped profile/configuration/story/social
projections and the secure owner roll flow. Missing avatar, bio, and music
contracts use safe, quiet fallbacks rather than fabricated user content. A
local-only screenshot fixture can expose the same mapped public profile in
owner/pre-roll states for visual evidence; it is disabled in production
builds and cannot change roll authority.

**Consequences**

The first impression is a personal page rather than a game dashboard while
history, configuration, social, moderation, entitlements, account controls,
and `legacy=1` remain reachable through deliberate detail surfaces. Music
integration, richer identity fields, and media contracts remain Phase 11
boundaries. No schema, auth, RLS, route, scoring, reward, economy, or
deployment behavior changed.

**Related files**

`docs/APPROVED_MOCKUP_TRANSLATION.md`,
`checklists/APPROVED_MOCKUP_PARITY_GATE.md`,
`src/lib/ProfileAtmosphere.svelte`, `src/lib/ProfileModeHeader.svelte`,
`src/lib/IdentityCard.svelte`, `src/lib/TodayColor.svelte`,
`src/lib/FeaturedCollection.svelte`, `src/lib/ProfileMusic.svelte`,
`docs/PHASE_10_2_REPORT.md`.

## 2026-07-26 — Correct visual fidelity without expanding the data contract

**Status:** accepted and implemented for Phase 11.1

The approved mockup comparison showed that the live profile still read as a
small card on an empty canvas even after the Phase 11 composition work.
Correct the presentation at the CSS/component boundary only: use a
viewport-fixed atmosphere, readable essential type, upper-middle placement,
and an independently bottom-anchored optional expression surface. When no
production music/expression data exists, omit that surface and rebalance the
profile. Use a mapped color-history sentence or a designed first-chapter state
instead of generic placeholder bio copy.

Do not add public bio/avatar/music fields, media storage, playback, schema
changes, new routes, or gameplay behavior. The visual fixture remains local
and cannot settle a roll or introduce mock production content.

**Consequences**

The profile’s visual impact is now judged with repeatable 100%/dSF1 browser
captures and computed-style measurements, not source assertions alone. Missing
optional content remains honest without leaving a broken-looking control.
The owner/visitor distinction, secure roll authority, all compatibility
surfaces, and the Phase 12 boundary remain unchanged.

**Related files**

`src/lib/ProfileShell.svelte`, `src/lib/ProfileAtmosphere.svelte`,
`src/lib/IdentityCard.svelte`, `src/lib/ProfileMusic.svelte`,
`src/lib/ProfileRoll.svelte`, `scripts/audit-phase-11-1.mjs`,
`docs/PHASE_11_1_VISUAL_AUDIT.md`, `docs/PHASE_11_1_REPORT.md`.

## 2026-07-26 — Hold real identity work until linked schema reconciliation

**Status:** blocked at the Phase 13 database baseline gate

Phase 13 requires a new server-authoritative identity contract and a
canonical-domain transition, but the linked Supabase project is not at the
branch's Phase 4–8 schema boundary. `supabase migration list --linked` shows
the remote ending at `20260712200000_launch_audit_remediation`; the five local
profile configuration/story, discovery, social, and entitlement migrations
remain pending. The linked catalog also lacks `bg_prism_atmosphere` and
`name_prism_atelier`, while the local snapshot/seed pair contains 82 matching
items.

Do not create or apply the Phase 13 identity migration, restore the removed
legacy bio implementation, or change public-domain runtime behavior while the
production projection/RLS boundary is unverified. First obtain backup/PITR
confirmation, apply the five pending migrations in order through the reviewed
workflow, verify all RPCs/RLS/grants/catalog rows, and record the rollback
point. Then resume the additive identity/domain slice.

**Related files**

`docs/PHASE_13_PLAN.md`, `docs/PHASE_13_DATABASE_BASELINE.md`,
`docs/CHM_LOL_DOMAIN_CUTOVER.md`, `docs/PHASE_13_REPORT.md`.

## 2026-07-26 — Extend the approved profile language to supporting surfaces

**Status:** accepted and implemented for Phase 12

The approved profile composition is now the visual language for the rest of
the site. Non-profile routes use a shared atmospheric canvas and restrained
`SiteModeHeader`, while public and authenticated profile routes retain the
existing `ProfileModeHeader` and centered `ProfileShell` composition.

The default-entry semantics remain explicit rather than being inferred from
presentation: signed-out `/` opens the guest daily-roll surface;
authenticated `/` resolves to the owner live profile after session hydration;
and `/?view=game` remains the direct roll route. Explicit profile, discovery,
shop, help, privacy, challenge, and legacy routes retain their existing
meaning.

**Consequences**

Roll authority, authentication, RLS, scoring, rewards, economy, entitlements,
history, cosmetics, social/moderation boundaries, direct refresh, and old
profile URLs are unchanged. The sitewide extension changes the visual shell
and navigation affordances only. It does not fabricate an unauthenticated
profile, add identity fields, or turn supporting pages into dashboard cards.

The captured evidence is under `artifacts/phase-12/` and the exact boundary
and validation results are in `docs/PHASE_12_REPORT.md`. The linked Supabase
schema/catalog drift remains a pre-existing release blocker and was not
modified.

**Related files**

`src/lib/SiteModeHeader.svelte`, `src/lib/ProfileAtmosphere.svelte`,
`src/App.svelte`, `src/styles/layout.css`,
`test/phase-12-sitewide-profile-entry.test.js`,
`docs/milestones/PHASE_12_SITEWIDE_PROFILE_ENTRY.md`,
`docs/PHASE_12_REPORT.md`.

## 2026-07-27 — Use one profile language across supporting surfaces

**Status:** accepted and implemented as a visual refinement

**Context**

The Phase 12 shell extended the profile atmosphere to the rest of the site,
but the supporting routes still exposed parts of the older dashboard skin:
the application header had a different chrome treatment, Roll controls used a
legacy spectrum button, and Discover/Studio/help surfaces carried competing
surface, radius, and accent rules.

**Decision**

Keep `ProfileShell` and its composition as the visual source of truth. Align
`SiteModeHeader` and `ProfileModeHeader` around the same transparent brand,
mark, typography, spacing, and slash-separated navigation language. Add one
sitewide stylesheet that projects the profile surface, border, radius, text,
control, responsive, and reduced-motion tokens onto non-profile routes while
leaving each route's information architecture and domain components intact.

Do not rewrite Roll, Discover, Studio, help, privacy, or guest-lock content
into profile modules. The shared layer changes presentation only; existing
authentication, route handling, server-authoritative gameplay, catalog,
privacy, social, and legacy boundaries remain the authority.

**Consequences**

Supporting routes now read as rooms around the profile: the same atmospheric
canvas, quiet translucent surfaces, mono labels, accent-led focus states, and
profile-like primary actions appear across the site. Discovery's grid and the
Studio catalog remain intentionally domain-specific, but no longer introduce a
separate black/purple skin. The refinement adds no schema migration, backend
write, route change, or production data dependency.

**Related files**

`src/styles/site.css`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileModeHeader.svelte`, `src/main.js`,
`test/sitewide-profile-cohesion.test.js`.

## 2026-07-28 — Let the canonical roll animate the profile composition

**Status:** accepted and implemented as a presentation refinement

**Context**

The owner roll already lived inside the profile identity surface and reused
the secure roll path, but the rest of the profile only noticed the result
after the color value changed. The ritual still read like a control embedded
in a static page instead of an event that changed the identity.

**Decision**

Keep `ProfileRoll.svelte` responsible for the existing server-authoritative
transaction and emit only bounded lifecycle signals (`rollstart`,
`rollcancel`, and the existing canonical `colorchange`/`rollcomplete`
events). Let `ProfileShell` own transient presentation state. While the
canonical result is resolving, the identity recedes and the roll stays focal;
when the server result arrives, the canonical color drives a short atmosphere,
identity, and collection response. CSS owns the effect and includes a reduced-
motion equivalent.

No result, score, rarity, reward, eligibility, inventory, or profile data is
computed by the effect layer, and no durable roll-effect state is stored.

**Consequences**

Rolling now changes the profile in place: the atmosphere intensifies, the
identity quiets during resolution, and the new color settles through the
profile surface before the page returns to rest. Visitors remain read-only;
the owner-only roll and all existing RPC, RLS, scoring, reward, route, and
historical-data boundaries are unchanged.

**Related files**

`src/lib/ProfileRoll.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/IdentityCard.svelte`, `test/profile-roll-presentation.test.js`.

## 2026-07-29 — Make the roll a profile ritual and reduce identity-surface noise

**Status:** accepted and implemented as a separately scoped visual refinement

**Context**

The profile response effect made a completed roll influence the surrounding
composition, but the owner action still read as a small utility control and
the identity card combined person, game result, story copy, and collection
metadata in one dense surface. The current public schema still has no
authoritative personal bio/avatar contract, so the refinement must improve
hierarchy without inventing identity content or adding a migration.

**Decision**

Keep one centered identity surface with only the person, handle, optional
validated links, and the integrated roll. Move the color archive to a quiet
featured trace outside the card. Present the owner roll as a short ritual:
open the color field, read and lock the server-returned signal, count up the
canonical score, reveal returned conditions, and let the player skip the
presentation after initiation. Use reduced-motion equivalents and preserve
the existing visitor result path.

The animation layer may stage and count canonical values for presentation,
but it may not determine eligibility, score, rarity, rewards, purchases, or
prestige. The existing `roll_die` RPC and client request/lock seam remain the
only gameplay authority exposed to the UI.

**Alternatives considered**

- Add more profile widgets or persistent statistics to make the page feel
  richer: rejected because the problem is competing hierarchy, not missing
  information.
- Recreate a literal slot-machine or lever interaction: rejected because the
  daily roll should feel like a color ritual attached to identity, not a
  casino mechanic or a second game implementation.
- Add personal bio/avatar fields during this pass: rejected because Phase 13's
  linked database baseline is blocked and identity data needs its own additive
  privacy/validation milestone.

**Consequences**

The initial viewport has fewer competing facts and a clearer primary action;
the profile remains recognizable as a personal page before its game details
are opened. The archive and detailed roll conditions remain reachable, while
owner, visitor, guest, private, and historical data boundaries continue to be
handled by the existing adapters and disclosure surfaces. No schema or
backend deployment work is required.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileShell.svelte`, `test/profile-ritual-refinement.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Surface scoring conditions without restoring the dashboard

**Status:** accepted and implemented as a visual follow-up

The compact owner result hid the most meaningful proof of a roll—its scoring
conditions—inside a collapsed details panel. At the same time, the centered
profile composition underused desktop width compared with the spacious,
identity-first layouts reviewed across current guns.lol profiles.

Keep the condition data server-reported and display only a bounded rail of
active contributors, score awards, and an overflow count in the primary result.
Leave the complete traits, contributor, badge, reward, and reroll record in the
existing expandable details surface. Widen the approved profile canvas to a
single two-column identity/roll surface above the archive, with a CSS breakpoint
that returns to the existing stacked mobile composition.

Do not add a profile schema, duplicate scoring logic, infer conditions in the
browser, or turn the profile back into an equal-weight results dashboard.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileRoll.svelte`, `test/profile-ritual-refinement.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Separate identity from the game on the same profile page

**Status:** accepted and implemented as the simpler profile boundary

The two-column identity/roll surface still made the profile card feel like a
game dashboard. A profile should first communicate one person, while the
daily game can remain close by without competing with that identity.

Render the identity card with only avatar, name, handle, optional validated
links, and the small earned badge. Move the daily roll into a quiet sibling
layer below the card on the same page. In that profile mode, show only the
daily color/result summary and a details disclosure; keep the full scoring
conditions, rewards, countdown, and reroll controls available inside the
disclosure and on the direct game route. Keep the archive outside the card as
a low-contrast progression trace.

This is a presentation boundary only. The same `ProfileRoll` request, secure
RPC, canonical server result, eligibility guard, refresh behavior, and
visitor-read-only path remain in force. Mobile uses the same stacked flow.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileRoll.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/TodayColor.svelte`,
`test/profile-ritual-refinement.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Use one typography contract for the shared header

**Status:** accepted and implemented as a cohesion correction

The shared header used separate typographic treatments for primary navigation,
profile actions, account controls, and the mobile menu. Although the component
was shared across routes, inherited fonts and mismatched sizes made each state
look like different navigation chrome.

Use the body typeface for every interactive header control at one 0.78 rem,
600-weight scale with restrained letter spacing and title case. Apply the same
contract to desktop navigation, Share/Edit, account actions, the mobile Menu
trigger, and every mobile-menu action. Keep the compact brand wordmark as the
only intentional typographic exception.

**Related files**

`src/lib/SiteModeHeader.svelte`, `test/sitewide-profile-cohesion.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Give the bare root a minimal public homepage

**Status:** accepted and implemented as an acquisition and orientation surface

The bare root previously changed meaning by session: guest Roll when signed
out and owner profile after authentication. That left no stable place to
explain ChromaDie, offer account creation, or return when the logo was
activated.

Make `/` a session-independent landing page with one concise explanation of
the daily color identity loop, one signup CTA for visitors, an owner-profile
CTA for signed-in players, a quiet abstract color composition, and the shared
legal/support footer. Keep the homepage header minimal with brand and account
actions only. The header logo always navigates to `home`.

Preserve gameplay and share compatibility: `/?view=game` remains the direct
Roll route, `/c/<id>` remains the challenge route, `/u/<username>` remains the
public profile route, and clean Discover/Studio/legal routes retain their
meaning. The direct game route is non-indexed so `/` is the canonical
acquisition surface. No auth, roll, scoring, reward, RLS, or schema behavior
changes.

**Related files**

`src/lib/HomePage.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/routes.js`, `src/App.svelte`, `test/home-page.test.js`,
`test/phase-10-profile-first.test.js`,
`test/phase-12-sitewide-profile-entry.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Keep primary destination navigation off profile pages

**Status:** accepted and implemented as a profile-simplicity refinement

The profile is the product’s identity surface and already contains its owner
gameplay. Repeating Profile, Discover, and Studio in the middle of the profile
header adds application chrome to an intentionally sparse public page.

In profile mode, retain the ChromaDie brand, Share, owner Edit, and account
controls, but omit the primary destination navigation on desktop and from the
mobile menu. Keep Profile, Discover, and Studio available through the same
shared header on non-profile routes. Preserve the header grid with a
non-interactive spacer so contextual actions remain aligned consistently, and
label the profile mobile menu as profile actions.

**Related files**

`src/lib/SiteModeHeader.svelte`, `test/sitewide-profile-cohesion.test.js`,
`docs/PROGRESS.md`, `docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Use one navigation shell across profile and application routes

**Status:** accepted and implemented as a sitewide cohesion refinement

The profile route had a minimal profile-only header while Roll, Discover, and
Studio used a separate application header. That made the site feel like
several products and left the profile without an obvious way to reach core
surfaces.

Render one `SiteModeHeader` on every application and public-profile route. The
header owns the shared Profile / Discover / Studio navigation, active
states, account controls, and responsive mobile menu. Profile Share and owner
Edit remain available as contextual actions in the same header rather than a
second navigation system.

This is a presentation and navigation-boundary change only. Existing route
parsing, public profile URLs, auth/session behavior, share analytics, owner
editing, and secure gameplay services remain unchanged. The former
`ProfileModeHeader` remains available as an unused compatibility component;
the application no longer renders it.

**Related files**

`src/App.svelte`, `src/lib/SiteModeHeader.svelte`,
`test/phase-10-2-approved-mockup.test.js`,
`test/phase-12-sitewide-profile-entry.test.js`,
`test/sitewide-profile-cohesion.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Absorb Roll navigation into the profile and suppress fast-load interstitials

**Status:** accepted and implemented as a profile-first navigation refinement

The owner roll already lives inside the profile, so a primary Roll tab
duplicated the same product action and weakened the principle that the profile
is the game. Profile requests also replaced the page immediately with a
text-heavy loading panel, producing a distracting flash during ordinary fast
loads.

Remove Roll from desktop and mobile primary navigation. Keep the existing game
route as a compatibility boundary for signed-out guest play, shared challenges,
and old direct links; do not alter roll authority or route parsing. Profile and
account hydration remain non-visual: keep the atmospheric canvas stable, expose
loading state through `aria-busy`, and render content when it is ready. Do not
show account banners, header labels, profile cards, or silhouettes for routine
loading. Error and unavailable-profile states remain explicit because they
require user action.

**Related files**

`src/App.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/Profile.svelte`,
`test/phase-12-sitewide-profile-entry.test.js`,
`test/profile-ritual-refinement.test.js`, `docs/PROGRESS.md`,
`docs/CHANGELOG_2_0.md`.

## 2026-07-29 — Preserve transient view state without publishing drafts

**Status:** accepted and implemented

Navigation should not discard work a player has started, but transient UI state
must not become a second source of truth for published profile data or gameplay.

Store bounded, allowlisted drafts and view preferences in a small session-scoped
client layer. Scope profile drafts by profile id and Shop state by account id;
keep Discovery state global to the current tab. Restore on remount, clear a
profile draft after an authoritative save/publish, and clear all transient view
state when local account cache is cleared. Use memory as a fallback when browser
storage is unavailable.

This preserves in-progress editing across navigation and same-tab reloads while
leaving server-authoritative save/publish, authentication, RLS, roll, scoring,
reward, inventory, and published-profile boundaries unchanged.

**Related files**

`src/lib/viewState.js`, `src/lib/ProfileEditor.svelte`,
`src/lib/ProfileShell.svelte`, `src/lib/DiscoveryHub.svelte`,
`src/lib/Shop.svelte`, `src/lib/stores.js`, `test/view-state.test.js`.

## 2026-07-29 — Keep the default identity card horizontal and identity-first

**Status:** accepted and implemented

The default profile should read like a compact identity card rather than a
stacked dashboard. Keep the avatar as the visual anchor, place the name and a
small bounded set of earned badges beside it, and place public links beneath
the identity copy. Preserve the existing roll and archive as separate regions
below the card.

Use the existing public `equipped_badges` projection, show no more than three
secondary badges in the opening card, and keep badge labels available through
accessible names and titles. Continue rendering links as validated structured
values; do not add custom markup or a new profile data contract.

**Related files**

`src/lib/IdentityCard.svelte`, `src/lib/ProfileShell.svelte`,
`test/profile-ritual-refinement.test.js`.

## 2026-07-29 — Use a typographic personal-site language across the app

**Status:** accepted and implemented as a visual-system refinement

The previous Google-font and saturated-glass combination made Chromadie read
like a generic generated dashboard. Adopt the reference qualities observed on
catchii.de without copying its content or replacing Chromadie’s identity:
Satoshi body copy, Cabinet Grotesk display type, Geist Mono labels, near-black
canvas, thin rules, quiet capsule controls, restrained surfaces, and subtle
grain/radial light.

Keep the profile’s signature color as the game-specific differentiator. The
visual pass changes typography, surfaces, navigation treatments, homepage
composition, and atmosphere intensity only. It does not add a profile region,
alter profile data, move roll authority, change authentication, or change
database/RLS behavior. Font loading uses swap-safe fallbacks and explicitly
allowlisted font origins in the deployed CSP.

**Related files**

`src/styles/fonts.css`, `src/styles/tokens.css`, `src/styles/site.css`,
`src/lib/HomePage.svelte`, `src/lib/SiteModeHeader.svelte`,
`src/lib/ProfileAtmosphere.svelte`, `src/lib/IdentityCard.svelte`,
`test/reference-visual-language.test.js`.

## 2026-07-29 — Move profile disclosures into a dedicated settings surface

**Status:** accepted and implemented

The public profile should remain a small identity, roll, and archive surface.
Owner editing, social/privacy controls, account compatibility controls, and
the optional color story now live at `/profile/settings`. The public story is
off by default and is rendered only after the owner explicitly enables it.
Visitor social controls remain available as a non-collapsible continuation so
moving owner settings does not remove public interaction behavior.

The linked production database is still marked drifted/NO-GO in the Phase 13
baseline, so this change does not add a migration. The existing configuration
slot that is excluded from the approved composition stores the story opt-in as
a compatibility bit; a future approved additive migration can promote that to
an explicit `storyVisible` field without changing the UI contract.

**Related files**

`src/lib/ProfileSettings.svelte`, `src/lib/ProfileShell.svelte`,
`src/lib/ProfileEditor.svelte`, `src/lib/profileConfig.js`, `src/lib/routes.js`,
`test/phase-10-profile-first.test.js`.

## 2026-07-29 — Reconcile the production Phase 4–8 baseline before Phase 13

**Status:** approved by owner, execution blocked by release gates

The linked Supabase project is behind and drifted relative to the local chain.
The safe reconciliation is the exact five-migration timestamp order documented
in `docs/PHASE_13A_RELEASE_PLAN.md`. Do not stack identity work on the unknown
production state, edit applied migrations, use migration repair, execute a
generated destructive diff, or reset the linked database.

Owner approval authorizes the reviewed release only after read-only preflight,
backup/PITR confirmation, named rollback ownership, and lock/row-count review.
Because the database password, backup/PITR point, rollback owner, and complete
remote counts were unavailable on 2026-07-29, no production write was made.

**Related files**

`docs/PHASE_13A_RELEASE_PLAN.md`,
`docs/PHASE_13A_RECONCILIATION_REPORT.md`,
`docs/ROLLBACK_AND_RECOVERY.md`.

## 2026-07-29 — Credentialed Phase 13A preflight passed, release still held

The owner-side CLI can now connect to the linked database. The migration list
and dry run confirm exactly the five reviewed migrations are pending. The
linked schema diff is informational only: its broad reverse operations reflect
the known remote/local drift and must not be executed. Read-only table stats
confirm 10 profiles, 71 scores, 80 shop items, and 5 meta rows; no application
blocking query was observed.

Do not push until exact counts, backup/PITR restore point, named rollback owner,
and the low-traffic window are recorded.

## 2026-07-29 — Use a temporary Pages secret gate for live rehearsal

Cloudflare Zero Trust Access was not selected because its onboarding requires
billing setup for this account. The temporary Pages middleware is the
no-cost, repository-native alternative: it protects the existing production
domain with an encrypted `PREVIEW_PASSWORD` secret and a signed short-lived
cookie, without placing credentials in source control. It must be deployed
only for the approved rehearsal and removed afterward.

## 2026-07-29 — Complete Phase 13A reconciliation after explicit risk acceptance

The owner accepted that the Supabase Free plan provides no managed backup/PITR
and authorized the live reconciliation behind the temporary Pages gate. The
first push stopped on the remote UUID extension schema mismatch. The failed
unapplied migrations were corrected to call
`extensions.uuid_generate_v4()` explicitly, locally rehearsed, and retried
once. All five migrations are now recorded remotely.

This decision does not authorize identity, avatar, music, or root-routing work
by itself. Phase 13 may resume only after the owner completes the gated browser
smoke checks and the release report is retained with the exact remote results.

## 2026-07-29 — Add the bounded Phase 13 identity contract after reconciliation

**Status:** accepted and implemented; external domain cutover remains pending

After Phase 13A aligned the linked production migration baseline, add the
smallest additive identity contract: nullable display name and bio fields,
Unicode-aware normalization, a server-authoritative `auth.uid()` update RPC,
and explicit bounded public projections. Existing profile rows remain intact
and identity values are not backfilled. Owner editing belongs in the existing
settings surface, while visitor rendering remains visually equivalent to the
owner's published identity.

Canonical profile URLs are root `/<username>` paths. `/u/<username>` remains a
temporary compatibility route, reserved application paths share one definition
across client/server/tests, and legacy origins are normalized through the
shared origin helper. Cloudflare host attachment, redirect rules, Supabase
dashboard settings, and email-template installation are separate operator
steps and are not implied by the repository implementation.

Related files: `supabase/migrations/20260725150000_profile_identity.sql`,
`src/lib/profileIdentity.js`, `src/lib/IdentityEditor.svelte`,
`src/lib/routeContract.js`, `src/lib/siteOrigin.js`,
`docs/CHM_LOL_DOMAIN_CUTOVER.md`.

## 2026-07-30 — Make username reservation exact, authoritative, and grandfather-safe

**Status:** accepted and implemented locally; production release pending

Username routing and username protection are separate contracts. Route
segments protect application endpoints, while a focused reservation table
protects exact normalized usernames by category and release policy. The
database is authoritative through the availability RPC and a profile-write
trigger; browser checks remain convenience feedback and cannot bypass the
policy. Reserved words are never rejected by substring match, so ordinary
creative identities remain available.

The existing confirmed staff account `Admin` is an approved grandfathered
exception. The migration records its profile identity on the `admin` row,
preserving the historical profile and URL while preventing every other
profile from claiming that normalized key. No automatic rename or historical
data deletion is permitted.

The reservation migration is additive and currently local-only. The linked
production project must not receive it until the collision, backup/recovery,
low-traffic, and verification gates are reviewed again. The temporary Pages
gate remains active during certification.

## 2026-07-30 — Keep Phase 14 expression bounded and settings-only

**Status:** accepted and implemented; expression and storage-size migrations
applied to linked project; public gate remains active

Phase 14 uses the existing Supabase stack for the smallest optional expression
surface: two owner-scoped WebP Storage buckets and four nullable profile
configuration columns. Browser image files are resized/cropped and converted
before upload. Stored output is capped at 256 KiB for avatars and 1 MiB for
backgrounds in both the browser processor and Storage buckets. Spotify URLs
are validated by both the client convenience layer and the authenticated
server RPC, which stores only a supported entity type and bounded identifier.

Avatar and background references are exact owner-shaped paths, Storage writes
are restricted to the matching authenticated user path, and profile deletion
removes the owned objects inside the existing deletion boundary. Public
rendering uses the existing identity card and atmosphere, with initials and the
generated daily-color background as fallbacks. Music is a lazy official embed
with no autoplay and no custom player.

All management controls remain in `/profile/settings`; the visitor/owner
profile composition is unchanged. The migration is local-only until a separate
release review authorizes a linked push. No Cloudflare media service, arbitrary
HTML/CSS, OAuth, hosted audio, or additional profile widgets were introduced.

## 2026-07-30 — Separate cosmetic shopping from profile appearance management

**Status:** accepted and implemented

The shop is the catalog and purchase surface. Profile settings is the single
owner surface for previewing and equipping owned cosmetics. The appearance
editor groups cosmetics by the surface they affect—profile, roll, or
leaderboard—and renders the existing profile canvas beside the controls.

This adopts the useful information architecture of mature profile-customization
sites without copying their visual design or introducing unrestricted CSS.
Equip and unequip operations continue through the existing authenticated RPCs;
the public profile composition and visitor rendering are unchanged.

## 2026-07-30 — Make the daily reveal a chromatic lock-in

**Status:** accepted and implemented

The profile roll uses a deterministic presentation sequence after the
server-authoritative result returns: spectrum charge, chroma scan, decelerating
lock, final-color impact, and score settlement. Candidate colors are visual
only and may tint the profile atmosphere; they never affect scoring, rewards,
eligibility, or the canonical result.

The completed result keeps the orb, hex, rarity, and EP in one aligned group.
The strongest scoring conditions remain visible in the collapsed state, while
the complete server-reported record stays behind a quiet score-breakdown
disclosure. Motion intensity scales with rarity and collapses to a static,
immediate result under reduced-motion preferences. The compact disclosure owns
its open state so the live countdown cannot override the reader's choice.

Staff owners may replay that stored presentation from the score breakdown.
Replay is deliberately client-only: it reuses the canonical result already
returned for the account and never calls a roll, reward, history, inventory, or
profile-refresh boundary.

## 2026-07-30 — Give earned result values a restrained warm counterpoint

**Status:** accepted and implemented

Completed daily-color results keep the rolled color as the identity accent for
the label and rarity. Earned EP and per-condition point values use a shared
soft-gold `--color-earned` token so reward text is visually distinct from both
the roll color and neutral descriptive text. The counterpoint is limited to
earned typography; it does not recolor the atmosphere, roll object, surfaces,
or canonical color identity.

## 2026-07-30 — Make score conditions part of the reveal

**Status:** accepted and implemented

The completed score breakdown opens by default so the result explains itself
without an extra interaction. During the final lock phase, the already
server-reported condition list enters progressively before the result settles;
this is presentation-only and does not calculate, reorder, or award any
condition client-side. The native disclosure remains available so players can
collapse the detail after reading it. Reduced-motion users receive the same
conditions immediately with no staged animation.

## 2026-07-30 — Put sharing at the roll result

**Status:** accepted and implemented

Profile sharing belongs beside the canonical result it describes, not in the
global header. The header now stays focused on navigation, account, and owner
editing controls. Completed owners’ rolls expose a styled `Share roll` action
that uses native share when available and copies a bounded text-and-URL
fallback otherwise. The share text is derived from the server-reported result
and leading conditions; it does not create a roll or mutate gameplay state.

## 2026-07-30 — Keep roll sharing in the primary result hierarchy

**Status:** accepted and implemented

The `Share roll` action sits immediately after the visible result conditions
and before the expandable breakdown. This keeps the action attached to the
daily color moment instead of burying it among secondary reward controls.

## 2026-07-30 — Set the chm.lol wordmark in the header type language

**Status:** accepted and implemented

The header wordmark uses Geist Mono, lowercase treatment, and the same compact
letter spacing family as its navigation controls. The logo mark remains the
brand anchor, while `chm.lol` now reads as a quiet navigation label rather than
a separate display-style lockup.

## 2026-07-30 — Keep reveal conditions visible through the scan phase

**Status:** accepted and implemented

Canonical condition metadata is primed as soon as the secure roll response is
received, before the presentation-only spectrum loop completes. This lets the
condition rail animate during the visible scan and lock stages rather than
waiting for the result state. The canonical score, rewards, and final color
still settle only through the existing server-authoritative presentation path.

## 2026-07-30 — Let the shared header span the viewport

**Status:** accepted and implemented

The sitewide application header is a viewport-level shell, not a content
column. Its outer width is now 100% across routes, while the existing
responsive horizontal padding keeps controls readable and touchable. Profile,
roll, discovery, studio, and settings content retain their own intentional
max-widths beneath the header.

## 2026-07-30 — Keep profile atmosphere effects curated

**Status:** accepted and implemented

Profile effects are catalog-backed but rendered from a small code-owned
allowlist (`rain`, `snow`, `fireflies`, and `scanlines`). This preserves safe
structured customization and lets effects live across the full profile canvas
without accepting arbitrary CSS or executable content. Every effect has a
reduced-motion fallback.

## 2026-07-31 — Simplify the sitewide header mark

**Status:** accepted and implemented

The sitewide header now uses only the compact `chm.lol` wordmark instead of a
graphic mark. The die remains available in game, homepage, auth, and favicon
contexts where its literal game signal is useful; the profile-facing header
stays quiet and typographic.

## 2026-07-31 — Make profile claiming the homepage CTA

**Status:** accepted and implemented

Signed-out visitors can enter a bounded username directly in a `chm.lol/`
claim field. Submission opens the existing account flow with that username
pre-filled; availability, moderation, and account creation remain enforced by
the existing authentication and server RPCs.

## 2026-07-31 — Show the product loop on the homepage

**Status:** accepted and implemented

The landing page now demonstrates a fictional Mythic roll using the existing
roll renderer, scoring conditions, and a lightweight discovery/profile cue.
This is presentation-only fixture content: it never calls the roll RPC,
changes eligibility, or implies a visitor has earned the displayed result.

## 2026-07-31 — Use lavender for the `.lol` suffix and name the destination

**Status:** accepted and implemented

The homepage and shared header use a restrained lavender `.lol` suffix instead
of gray, which reads as disabled. The primary nav calls the leaderboard
`Leaderboard` rather than `Discover`; the route and discovery implementation
remain unchanged.

## 2026-07-31 — Make the homepage explain the game before the brand

**Status:** accepted and implemented

The landing hero now names Chromadie as a daily color game and states the
actual loop—one roll, condition-based EP, profile effects, and leaderboard
progression—before the fictional Mythic showcase demonstrates it.

## 2026-07-31 — Anchor the homepage hero independently from the claim form

**Status:** accepted and implemented

The homepage hero is independently top-anchored with a deliberate lower
desktop offset rather than bottom-aligned. This prevents the username claim
helper text from shifting the giant wordmark upward while preserving its
original lower composition. The dot in `.lol` is also dimmed slightly to make
the transition into the lavender suffix easier to read.

## 2026-07-31 — Replace signed-out profile lock with guest onboarding

**Status:** accepted and implemented

The signed-out `/profile` destination now opens the existing local guest roll
inside an onboarding profile surface. The legacy “Profile Locked” card is
removed from this path; the roll’s existing signup prompt explains that an
account is required to save progress, earn account EP, unlock cosmetics, and
enter leaderboard competition.

The guest roll is presented with a profile-mode surface and copy, while the
existing Game component remains the authority for local roll persistence and
guest scoring.

## 2026-07-31 — Guide signed-out visitors through the profile before the roll

**Status:** accepted and implemented

The signed-out profile route now opens a three-step profile-first onboarding:
the visitor sees a representative identity card, learns that rolls unlock
profile expression, and then advances into the existing guest roll. The roll
remains local and server-compatible through `Game`; the onboarding only owns
presentation and progression, and the existing post-roll account CTA remains
the save/compete boundary.

The homepage, `TodayColor`, and integrated `ProfileRoll` now share the same
result hierarchy: hex and rarity identify the color, score and EP are one
lockup, and conditions occupy a distinct rail beneath them.

The onboarding roll uses `ProfileRoll` in a bounded guest fixture mode rather
than mounting the legacy `Game` screen. This preserves the active-profile
presentation while keeping the fictional result local and presentation-only.

The onboarding also forwards `ProfileRoll` lifecycle events into
`ProfileAtmosphere`, so guest previews receive the same rolling flare, ring,
color wash, and settled impact as an active profile.

## 2026-07-31 — Make the homepage preview a composed profile surface

**Status:** accepted and implemented

The fictional homepage example now follows the profile-first product model:
an identity card with handle, bio, links, and rank leads into the daily roll.
The roll is explicitly presented as living inside that profile, followed by
equipped effects and a leaderboard/discovery cue. This makes the product loop
legible without presenting the roll as a disconnected color widget.
## 2026-07-31 — Keep atmosphere selection visible but entitlement-safe

Profile settings now shows the curated animated atmosphere catalog directly,
including locked entries, so owners can discover the rain, snow, fireflies, and
scanline effects without weakening the existing server-authoritative equip
boundary. The preview and controls use a two-column layout on wide screens and
stack on small screens.

## 2026-08-01 — Rebuild profile settings as a focused studio workspace

**Status:** accepted and implemented

The owner-only `/profile/settings` surface now presents one active editor at a
time inside a three-zone workspace: a section rail, the selected editor, and a
sticky live profile preview. Identity, expression, appearance, layout/links,
privacy/social, and account controls remain available through the rail and
mobile horizontal navigation. This reduces repeated module chrome and long
scrolling while keeping each existing editor responsible for its own validation,
draft restoration, save/publish behavior, and server-authoritative RPCs.

The redesign is presentation-only. It does not change profile configuration,
media, social, cosmetics, authentication, RLS, routes, or public-profile
rendering. Section state is hash-addressable for refreshable navigation, and
the reduced-motion contract covers the new navigation and preview transitions.

## 2026-08-01 — Use direct instructional copy in owner settings

Profile settings uses concise, task-oriented labels and descriptions. Copy
should tell the owner what a control changes, avoid aspirational or poetic
language, and preserve vertical space for the configuration itself. Redundant
profile links stay out of the editor body when the shared header already
provides the primary profile action.

The editor also gives primary fields the available width and uses themed media
controls for owner previews. Native browser audio chrome is not part of the
settings visual language when a bounded custom control can provide the same
playback and seeking behavior accessibly.

The settings rail is the sole section context. Do not repeat the selected
section number, title, description, or local utility header above the editor.

## 2026-08-01 — Make layout edits visible in the real draft preview

**Status:** accepted and implemented

The layout and links editor now sends its normalized draft configuration to the
shared right-hand profile preview on every edit. The preview renders the
identity card, signature color, links, style, and a compact ordered section map
from that draft, so visibility and reorder controls have immediate, legible
feedback.

The old abstract module-chip diagram and its separate preview toggle were
removed because they described the configuration without showing the profile it
actually changes. Draft preview state is local to the settings surface; save
and publish still use the existing server RPCs and visitors only receive the
published configuration.

## 2026-08-01 — Keep the daily roll inside the profile language

**Status:** accepted and implemented

The owner preroll is a profile module, not a promotional hero. Its ready state
uses direct copy, a restrained square signal mark, and the existing daily reset
timer. The countdown creates a light reason to act while remaining secondary to
the profile and disappearing as a marketing device once the daily roll is
complete.

The server-authoritative roll flow, reveal animation, result details, and UTC
reset calculation remain unchanged. The visual update removes the decorative
orb, orbit, and oversized glow that made the action feel disconnected from the
rest of the profile surface.

## 2026-08-01 — Separate full-page atmosphere overlays from card backgrounds

Weather effects such as rain, snow, fireflies, and scanlines now use their own
`profile_atmosphere` cosmetic slot. They render through the existing fixed,
viewport-sized `ProfileAtmosphere` layer, so the effect covers the public page
and can coexist with a separate card background.

The migration keeps existing item keys, ownership, and entitlements, backfills
legacy equipped weather effects, and retains a client compatibility fallback.
Only curated effect keys map to code-owned CSS layers; profile data cannot
provide arbitrary HTML, JavaScript, or CSS.

## 2026-08-01 — Use procedural canvas layers for atmosphere effects

The tiled CSS patterns made rain, snow, fireflies, and scanlines visibly
repetitive. Atmosphere effects now use a seeded 2D canvas renderer with shared
resize, density, depth, color, and reduced-motion behavior. The renderer is
also used by owner previews and shop cards, so future effects can be added as
curated drawing recipes without accepting user HTML, JavaScript, or CSS.

## 2026-08-01 — Make the cosmetics shop a visual atelier

The shop and profile editor remain separate surfaces with separate jobs. The
shop is now a discovery and acquisition surface: it presents a large live
profile canvas, a compact featured collection, direct catalog filters, and a
selected-item panel. The profile editor remains the permanent equip surface.

Selecting a cosmetic creates a temporary try-on loadout and never writes
equipped state. Purchasing calls the existing `purchase_item` RPC only; the
shop does not auto-equip the item. Owned cosmetics link back to profile
settings, where the existing `equip_item` and `unequip_item` authority stays
unchanged. The redesign is presentation-only and requires no schema or
entitlement migration.

## 2026-08-01 — Keep app navigation inside the authenticated shell

Same-origin links for app and legal routes are intercepted by the existing SPA
router and resolved with `history.pushState`. This keeps the current Supabase
session and shared shell mounted while the destination view changes, avoiding
the false signed-out state that appeared during a full document reload.

Protected routes render the guest lock only after the account state is known to
be signed out. Profile settings also seeds its editor from the already-loaded
account profile while deeper configuration and social data refresh, so normal
shop/editor navigation does not show an auth lock or a loading interstitial.
Direct refreshes and real profile/account errors retain their existing auth and
retry boundaries.

## 2026-08-01 — Compose additive catalog migrations in drift checks

The catalog drift checker now treats the versioned live snapshot as the base
catalog and composes explicitly listed additive catalog migrations on top of
it. It also parses every `shop_items` insert block in `seed.sql`, so newly
added catalog rows are compared without editing an already-applied snapshot
migration. The atmosphere catalog migration remains the source for the four
weather effect rows that are present in the live catalog.

## 2026-08-01 — Prototype a restrained game-native homepage

The homepage is the isolated proving ground for a less generic visual
language. Keep the approved shared header unchanged, but remove the route-wide
purple/cyan atmosphere from `/` and give the page a flat warm-black canvas.
Use homepage-scoped Spline Sans and IBM Plex Mono so the prototype can test a
geometric game identity without changing profile or application typography.

The opening composition combines a direct product statement, the existing
claim/profile actions, and one static profile-and-roll specimen. The specimen
reuses the production `IdentityCard` so it stays faithful to the public profile
instead of inventing a parallel marketing mockup. A dedicated daily-roll
section sits below it and explains the connection between score, leaderboard
position, and profile visibility. It remains presentation-only: no sample
roll, score, reward, or countdown becomes client authority.

The specimen now carries a distinct example identity, a short recent-color
trail, and two separate color roles: the profile accent and the current daily
roll. This adds warmth and a sense of history through the product model itself,
without inventing a second profile composition. Cosmetic motion remains
catalog-owned and follows the shared reduced-motion behavior.

The fixture also uses a curated real cosmetic loadout (`bg_deep_space`,
`bg_rain`, `border_chroma`, `frame_holo`, and `name_chroma`) through the same
catalog and rendering components as public profiles. Its generated dog avatar
is a local static asset; it is presentation-only and does not affect account
media, entitlements, or profile state.

## 2026-08-01 — Make the homepage a usable product entry point

The homepage now lets visitors open the daily-roll result card into a local
sample roll. It reuses the existing `ProfileRoll` presentation and shared guest
fixture, but never calls the roll RPC, writes account state, or affects scoring.
The explicit fixture path is allowed to run before auth hydration; real rolls
remain gated by the existing authenticated/server-authoritative path.

The homepage also includes a compact “Today on Chromadie” discovery rail backed
by the bounded `get_public_discovery` projection. It requests three public
entries, normalizes them through `discoveryData.js`, keeps profile navigation in
the SPA shell, and handles loading, retry, and no-public-profiles states. No
schema, RLS, ranking, or private-data behavior changed.

## 2026-08-01 — Extend the homepage visual language across supporting routes

The homepage’s warm-black canvas, signal-lime accent, Spline Sans interface
type, and IBM Plex Mono metadata type are now the shared visual contract for
Roll, discovery, leaderboard, studio, profile settings, auth, guest, help,
legal, error, banner, and footer surfaces.

Supporting routes no longer mount the default full-page profile atmosphere.
Atmosphere effects remain available to public profiles, profile previews, and
cosmetic previews where they represent profile expression. Route behavior,
profile rendering, authentication, RPC authority, catalog ownership, and
server-side gameplay boundaries remain unchanged.

The migration is intentionally additive and token-led: existing components
retain their markup and domain logic while shared surfaces move away from the
legacy purple/cyan glass skin. The repository’s performance budget remains
over threshold at the current monolithic bundle size; JavaScript is at the
existing baseline overage and this migration adds a larger shared CSS layer.
The failure is reported rather than hidden.

## 2026-08-01 — Keep the legacy application header treatment

The sitewide visual migration does not replace the application header. Keep
its transparent shell, blurred pill navigation and account controls, and use
Satoshi consistently for the header controls and `chm.lol` wordmark. The
`.lol` suffix may use the site’s signal-lime accent; the rest of the header
keeps its quiet neutral treatment. Route prefetch behavior remains attached to
the existing navigation controls.

## 2026-08-01 — Keep the application shell mounted during route loading

The SPA now uses explicit route loaders and one persistent `RouteOutlet` for
non-home route components. The outlet snapshots the visible component and its
props, keeps that snapshot mounted while a destination chunk is loading, and
swaps only after the destination resolves. Direct refreshes receive a compact
inline loading state; client navigation does not flash a full-screen loader.

Route chunks are prefetched after a short idle period and on primary-nav
hover/focus. Loader promises are cached for the session and rejected promises
are evicted so a failed chunk can be retried. Existing route parsing, auth
boundaries, profile compatibility, public URLs, event handlers, and server
authority remain unchanged.

The performance check now measures initial JavaScript/CSS, the largest lazy
JavaScript/CSS asset, total asset ceilings, and the HTML shell separately.
Initial and per-route budgets describe user-facing loading cost; total caps
remain as transitional regression limits so route splitting does not conceal
asset growth.

## 2026-08-01 — Make leaderboard entries profile-forward

The leaderboard is a discovery surface, so each result needs to identify a
person before presenting the score. The existing bounded ranking function is
kept as a renamed base projection and wrapped with a small public preview:
display name, bio, profile accent, and an exact owner-shaped public avatar path.
The wrapper does not expose profile ids, account data, draft configuration,
wallet values, or any new ranking authority.

Discovery cards now use a real avatar when one is available, fall back to an
accent initial when it is not, and show the handle, short bio, latest color,
score, streak, and profile entry point in one composed surface. Roll color and
profile accent remain separate visual roles so the result still reads as a
player's profile with a current roll, rather than a decorated score row.

## 2026-08-01 — Use one compact roll language across discovery surfaces

Compact profile contexts now render their color result through
`CompactRollPreview`, a small layout adapter around the existing canonical
`RollPreview`. The homepage sample, discovery cards, and shop leaderboard
preview therefore share the same orb geometry, rarity glow, equipped orb
shape, roll effect, and reduced-motion behavior. The adapter owns sizing only;
roll scoring, rarity, cosmetic resolution, and live profile rendering remain
unchanged.

The shop leaderboard preview also uses the configured preview avatar. Public
discovery avatars continue to come only from the bounded profile projection and
the additive `profile_configurations` migration; no private account data is
added to the client contract.

## 2026-08-01 — Make discovery cards read as profiles, not widgets

The homepage discovery rail and leaderboard share one profile-tile treatment:
the avatar, display name, handle, and score establish the person first; the
current color is a compact secondary signal; streak and roll count stay in a
quiet footer. Decorative gradients, nested panel treatment, and generic
surface labels are reduced so these cards belong to the flat game-native shell.
Unknown badge ids are omitted instead of rendering question-mark placeholders.

## 2026-08-01 — Make the homepage profile example a real cosmetic build

The homepage specimen now uses a complete `Signal Garden` collection rather
than a mix of unrelated background, rain, chroma, and holographic items. The
collection covers the profile background, border, frame, display name, roll
orb, and roll effect; the existing Fireflies full-page atmosphere supplies the
ambient layer. All pieces are normal catalog rows with code-owned CSS classes,
so the shop and public renderers use the same validated interfaces. The
homepage keeps a small local class fallback so the specimen remains coherent
while a fresh catalog is loading; that fallback does not alter account state,
shop ownership, profile loadouts, or server-authoritative behavior.

## 2026-08-01 — Make the homepage a live profile directory

The public homepage now follows the approved live-directory composition: the
existing header stays intact, a bounded recent-roll ticker sits beneath it, and
the first viewport pairs direct product copy and the username claim with an
uneven profile collage. Profile previews are hydrated through the existing
public discovery, profile identity, configuration, score, and story RPCs.

The homepage does not contain fictional profile data or homepage-only cosmetics.
It prefers public staff profiles, falls back to the known `Admin` account only
when the public contract resolves it, and otherwise renders an honest empty
state. Identity, backgrounds, avatars, links, badges, cosmetics, roll names,
rarity, EP, rank, and public roll timestamps remain authoritative.

The homepage uses Instrument Sans locally while the existing Satoshi header,
sitewide tokens, auth, routes, and normal public profile renderer remain
unchanged. Audio uses the live profile controls with deferred playback and
Spotify uses an explicit load action to avoid autoplay and duplicate embeds.

## 2026-08-01 — Keep homepage activity compact and authoritative

The homepage directory now uses a full-bleed, slow roll ticker with only the
public username, real hex value, and a color dot in the visual treatment. The
full roll metadata remains available in the link label for assistive technology.
The hero uses the same UTC reset boundary as daily rolls, and the daily public
roll count is exposed as an aggregate on the existing public discovery RPC;
no profile rows or private fields are added to the contract.

## 2026-08-01 — Reconcile the homepage with Candidate 5.11 production boundaries

The homepage now follows the Candidate 5.11 section order and visual contract:
the existing global header, measured live ticker, full hero, product view, tabbed
How it works section, three-row leaderboard, final claim, and existing footer.
The ticker, leaderboard, and Today panel consume the existing bounded public
discovery/profile contracts; no schema, mock account, or client-authoritative
roll data was added.

The Today panel reuses the canonical `RollPreview` path through
`CompactRollPreview`, while the reference product imagery is represented only by
optimized derivatives of the supplied assets. Both claim forms dispatch into
the existing auth modal and username validation flow, preserving availability,
duplicate, and account-boundary handling.

## 2026-08-01 — Finish homepage reference interaction pass

The homepage now keeps the Candidate 5.11 spacing and centered shell while
adding an accessible image preview for the profile/roll and How it works
reference images. Enlarged previews reuse the same optimized assets, close from
Escape or the backdrop, and return focus to the trigger. The hero's Today panel
link scrolls to the live leaderboard section with reduced-motion handling, and
the home header's `.lol` accent uses the same lavender-blue as the hero copy.
No profile data, roll authority, or image source was changed.

The hero profile image uses a modest 4% base crop within the existing frame so
the reference composition reads as a closer profile specimen without changing
the source asset or the hero's measured layout.

The How it works heading and explanatory copy now use the reference scale and
muted text role. Its daily-roll preview explicitly contains the full source
image so the interaction enlarges the complete result rather than a cropped
center slice.

The desktop hero now serves the supplied 2553×1379 PNG source instead of a
1600px lossy derivative. This preserves detail while the CSS crop provides the
tighter framing requested for the hero.

The Product section reference images use a 235px desktop presentation height.
The profile remains centered on its identity card and the daily result remains
top-aligned so the important result metadata survives the shorter crop.

The shortened profile frame uses a focused CSS crop around the identity card,
while the daily result keeps its top metadata crop. Shared homepage kicker
styles are global so the child sections retain the reference mono label role;
the leaderboard heading and explanatory copy now use the Candidate 5.11 scale
and muted color values.

The Product showcase is rendered statically instead of participating in the
scroll reveal observer. This prevents its profile/roll pair from becoming
temporarily transparent when a fast scroll interrupts the reveal transition.

Homepage default roll previews now use a small code-owned SVG facet glyph based
on the reference implementation: four geometric planes, color-derived light
and shadow facets, a contained SVG glow filter, and the reference float motion.
The existing orb-shape class names now resolve to this shared clean glyph in
the roll renderer, preserving the catalog and equipped-cosmetic contracts
without retaining the older CSS orb treatments.

## 2026-08-01 — Use the homepage baseline for supporting routes

The clean reference facet glyph no longer inherits the equipped roll-effect
wrapper in compact reference previews, so the Today panel and other reference
presentations remain centered and free of the older orb treatment. Non-profile
application routes now inherit the homepage's warm-black canvas, Instrument
Sans/IBM Plex Mono typography, lavender-blue accent, restrained borders, and
off-white controls through the shared site boundary. Public profile rendering,
profile-specific headers, auth/data contracts, and route behavior remain
unchanged.

## 2026-08-02 — Recompose the shop around live profile expression

The `/shop` route now projects the existing server-owned catalog, wallet,
inventory, entitlement, equipped, profile, and daily-roll data into separate
Home, Browse, Collection, Studio, and product-detail surfaces. Home is curated;
Browse is the full public catalog with filters; Collection is account-backed;
Studio is try-on only. `purchase_item` and the profile-settings equip flow
remain unchanged. No migrations, seed changes, new effects, or client
authority were added.

## 2026-08-02 — Tune shop composition to the approved reference

The live-data shop keeps the reference’s visual grammar: a two-column Today’s
Edit stage, six-way category strip, denser Browse filter rail, tabbed
Collection, three-column Studio workspace, taller product visuals, boxed inline
EP pricing, and a drawer-like product detail view. These are presentation
changes only; catalog, account, preview, purchase, and equip boundaries remain
unchanged.

## 2026-08-02 — Establish the Phase A Name renderer compatibility boundary

The Name migration starts with a shared, canvas-backed renderer and explicit
code-owned legacy presets for all 29 existing `name_effect` keys. The renderer
uses the existing local font packages and system fallbacks, one shared
requestAnimationFrame clock, visibility/reduced-motion lifecycle controls,
deterministic seeded noise, and a semantic text layer outside the canvas.

Only the contained Profile Settings live preview uses the new path in Phase A.
All other production Name surfaces continue to use their existing CSS bridge
until legacy parity is validated. Catalog rows, prices, purchase RPCs,
inventory, entitlements, equipped profiles, RLS, and permanent equip behavior
are unchanged. `name_prism_atelier` remains an owned legacy key with its
premium entitlement identity; no replacement grants or new catalog slots were
introduced.

## 2026-08-02 — Migrate every Name surface through the shared Phase A renderer

Phase B moves all equipped and preview Name rendering through the single
`NameEffectCanvas` wrapper and the existing code-owned renderer foundation.
Public profile shells and large settings/Studio previews use full animated
rendering with reduced-motion and offscreen pause behavior. Shop item previews
use compact bounded animation. Discovery, leaderboard, rivals, and homepage
directory/example rows use deterministic static-signature mode. Unstyled names
remain plain semantic text without mounting a canvas.

The semantic username remains the real heading, link, button content, or text
node. Canvas is only an `aria-hidden` visual layer. The wrapper allowlists its
semantic tags/classes and renderer modes; catalog values cannot provide CSS,
HTML, URLs, or executable renderer code. Profile contexts pass the real latest
roll color where available, with existing signature/profile color fallbacks;
recent public colors are passed where the context already has them.

An internal, un-routed parity harness places each of the 29 legacy CSS
representations beside its shared animated/static and reduced-motion canvas
render. Legacy Name CSS remains in the repository for comparison and rollback,
but no production component applies the legacy Name classes or the old
`getNameEffect` class/style bridge. The parity review records strong parity,
acceptable reinterpretation, or needs refinement per key; it does not claim
pixel-perfect equivalence for the old pseudo-element/filter-heavy effects.

No catalog rows, prices, item keys, schema slots, purchase RPCs, inventory,
entitlements, RLS, profile saves, permanent equip behavior, or replacement
grants changed in this phase.

## 2026-08-02 — Refine the shop without changing its authority boundaries

Phase C keeps the existing `/shop` view-state architecture and account-backed
catalog contracts while simplifying the presentation. Shop Home now has a
compact category navigation, one real Today’s Edit product, the live equipped
profile/current-roll context, one curated row, and text-level Browse and
Collection paths. Redundant profile/roll continuation cards are removed.

Browse keeps the full catalog and all existing filters/sorts, but moves the
secondary filters into an accessible contained panel and adds one sticky
contextual fitting-room preview. Product cards expose semantic product names,
prices, rarity/collection metadata, ownership state, preview, and detail; the
purchase decision remains in Product Detail.

Product Detail remains the existing `<dialog>` contract and is presented as a
right-side drawer on desktop and a bottom sheet on mobile. Escape, focus trap,
focus restoration, try-on, confirmation, purchase RPC, inventory/wallet/
entitlement refresh, and Profile Settings equip boundaries remain unchanged.
Collection and Studio use the same card/preview language without changing
inventory, entitlement, or permanent equip behavior. No schema, catalog, seed,
price, item-key, Name renderer, or legacy CSS changes were introduced.

## 2026-08-02 — Establish the Phase D1 composable Name renderer catalog

Phase D1 extends the existing shared Name renderer with a code-owned,
composable loadout contract. `getComposableNameDefinition({ fontKey,
materialKey, motionKey })` and `resolveNameLoadout(loadout)` independently
validate each layer against finite registries. Invalid Font, Material, and
Motion values fall back to `soft-grotesk`, `plain`, and `none` respectively;
legacy `rendererKey` values remain on the legacy preset path unless an explicit
composable key is supplied. The contract accepts future `name_font`,
`name_material`, and `name_motion` field names without reading a store or
database.

The code-owned catalog now contains exactly 18 Fonts, 23 Materials including
Plain, and 25 Motions including Still. The 64 paid definitions are the 18
Fonts, 22 paid Materials, and 24 paid Motions. No definition is exposed as a
live product, no database slot or catalog row was added, and existing legacy
keys remain unchanged.

No new font dependency was added. The existing locally bundled Instrument Sans
Variable, Spline Sans Variable, and IBM Plex Mono packages remain the only
production font assets. Soft Grotesk and Mono Compact use the bundled families.
The other requested faces use deterministic system or bundled substitutions:
Cormorant Garamond/DM Serif/Roboto Slab/Abril Fatface/Pirata One use a Georgia
serif fallback; Syne, Black Ops One, Michroma, Fredoka, and Archivo Black use
Spline Sans; Archivo Narrow and Libre Franklin use a system/Instrument sans;
Sono, Pixelify Sans, and VT323 use IBM Plex Mono; Permanent Marker uses the
system cursive fallback. The renderer redraws after a best-effort local font
load event and never loads Google Fonts or catalog-provided font declarations.

Reusable Canvas 2D primitives cover bounded fills and gradients, outline and
emboss passes, masks, specular bands, seeded texture, scanlines, particles,
pixel fragments, horizontal slices, character layers, echoes, radial color,
daily-color palettes, and recent-color history. All paid Motion branches use
the shared clock's normalized progress; none starts its own animation loop.
Explicit composable previews load these branches once through
`nameComposableRenderer.js`, then redraw through the same `NameEffectCanvas`
path. The internal `NameComposableCatalogHarness.svelte` shows every layer and
combined loadout but is unrouted and not imported by production navigation.

Measured D1 build output is JavaScript 794.07 kB and CSS 430.09 kB versus the
Phase C baselines of 765.16 kB and 430.09 kB. Initial JavaScript is 440.13 kB
and largest lazy JavaScript is 73.13 kB; initial/largest-lazy CSS is 165.34/
48.94 kB. The existing transitional total caps still report JavaScript
794.07/700 kB and CSS 430.09/380 kB. The font asset payload remains 220.49 kB
(215.32 KiB in the performance script's binary units) with zero new font
assets. D2 must resolve the total-cap debt without raising
the limits or removing legacy CSS merely to hide the warning.

The three Phase B legacy parity concerns remain honest and unchanged:
`name_prism_atelier`, `name_sunset_blur`, and `name_void` still need visual
refinement. The new fallback typefaces and subtle texture/material treatments
also need manual visual signoff before paid products are activated. Phase D2
is responsible for additive database slots, catalog activation, product rows,
profile controls, and equip conflict semantics; none of that work belongs in
D1.

## 2026-08-03 — Keep the homepage profile-first and make discovery fallbacks truthful

The existing homepage hero, username claim, and browser presentation remain
the acquisition foundation. The profile capture stays on its original
high-resolution PNG and is reframed with CSS so identity is readable without
introducing another image pipeline or compressed derivative.

The live or localhost-preview roll now supplies a validated homepage color.
That raw color is used for atmosphere, while text-level accents mix toward the
fixed light ink so dark daily colors cannot erase labels or links.

The lower page tells one cumulative identity story: every roll persists,
the complete Roll/Evolve/Explore loop is visible without tabs, and discovery
leads into people. If today has no public rolls, the homepage may show only
profiles already hydrated through the bounded public profile contract. These
profiles are labeled as profiles rather than ranked or represented as having
rolled today. Loading, public-data failure, and a legitimate empty directory
remain distinct states. Demo fixtures remain localhost-only and never backfill
production discovery.

No schema, RPC, RLS, scoring, authentication, route, catalog, entitlement, or
profile-rendering authority changed.

## 2026-08-03 — Keep reference font identities and differentiate the actual faces

The reference’s Font products are now customer-facing by their real family
names: Cormorant Garamond, Archivo Narrow, Syne, IBM Plex Mono, Sono, and the
other approved families. The earlier invented Font labels were removed. Each
family is bundled locally and lazy-loaded by its stable renderer key, so Canvas
cards and profiles no longer collapse to a shared Georgia or system-sans
fallback. Materials and Motions retain their distinct product vocabulary.

The technical contract remains unchanged: item keys, renderer keys, prices,
rarities, collections, descriptions, inventory, equipped loadouts, purchase
RPCs, and RLS boundaries are preserved. The canonical seed, code-owned
registries, and additive production migrations are synchronized, with tests
asserting real family labels and one local asset loader for every Font key.

## 2026-08-03 — Reconcile the live catalog without changing consumable behavior

The linked catalog was missing the two additive Name-label migrations and still
had the pre-reset copy for the nine retained profile borders. Those migrations
were applied in order, followed by an idempotent border-description correction;
item keys, prices, rarities, ownership, and equipped loadouts were not touched.

`streak_freeze` remains stackable. The earlier inventory migration deliberately
introduced quantity-based consumption and enables repeated freeze purchases, so
the canonical seed now declares that behavior explicitly instead of treating
the live value as drift and regressing the economy.

The label correction also bumps `meta.shop_version`. Shop metadata is the
existing cache-invalidation boundary, so old `shop_cache:v3` entries are
refetched without changing the cache shape or forcing a client-side purge.

## 2026-08-03 — Keep Canvas names aligned with their accessible text

`NameEffectCanvas` retains a semantic text node for accessibility and fallback
rendering, while the visual treatment is drawn to Canvas. The renderer now
reads that node's computed font size and distinguishes intrinsic inline names
from full-width product swatches. This keeps short profile names at the same
scale as their selectable text instead of shrinking them to fit a fixed
padding heuristic. Canvas measurement still applies the available-width
scale, and the semantic node receives the same finite family, style, and weight
as the active renderer. This keeps browser selection consistent without
removing the accessible fallback source.

## 2026-08-03 — Keep shop selection inside the fitting-room preview

Selecting a shop item no longer opens the large Product Detail drawer. The
Browse surface owns the selected item and projects its validated loadout onto
the persistent Studio profile preview, so the profile remains visible while a
player compares pieces. Clear restores the equipped loadout; purchase buttons
still use the existing confirmation and server-authoritative RPC path.

The fitting-room preview intentionally omits public social links. The shop is
evaluating visual identity, not reproducing a complete public profile, and
removing the links keeps the avatar, name treatment, bio, and border legible in
the bounded preview stage. No catalog, inventory, entitlement, equip, profile,
or data authority changed; the legacy detail path was not mounted by the live
shop route and is now removed after the production-import audit.

## 2026-08-03 — Project catalog renderer values into shop try-on

The persistent Browse preview now resolves a selected Name item through its
catalog `css_value` before handing the temporary loadout to the shared Name
renderer. Stable equipped JSON and item keys remain unchanged; this projection
only makes the selected Font, Material, or Motion visible immediately in the
fitting room. The preview header identifies the player’s profile and keeps only
the playback/clear controls, avoiding a second selected-item detail card above
the profile itself.

## 2026-08-04 — Keep the catalog quality pass narrowly renderer-focused

The catalog audit found no Font mapping failures and no justified pricing,
rarity, collection, description, or stable-key changes. Four dark Name
Materials received small palette/rim adjustments so their existing treatments
remain readable on dark profile surfaces. Typefall now mixes very dark daily
colors toward the existing light ink instead of drawing an invisible frame.
Oil Slick also received a brighter code-owned palette and a restrained amber
rim after the fully loaded renderer check showed its static frame could vanish.

The shared Profile Border component keeps all nine registry keys and metadata,
but its Chroma, Prism, Crystal, Glitch, and Neon animations now animate only
border color/shadow. Wrapper hue filters, opacity fades, and translation were
removed so profile content stays stable and Mythic treatments read as distinct.

The six retired Shop source components had no production or required-test
imports and were deleted. Purchase, inventory, equip, profile rendering, and
database slot contracts remain unchanged.

## 2026-08-04 — Atmospheres are authored scene plates, not background presets

Competitor review found that haunt.gg treats profile effects as a composed
background manager with live preview, reveal/parallax, and restrained animated
layers; guns.lol similarly combines authored background effects with profile
animation; fakecrime.bio makes uploaded media and cursor presentation part of
the page identity. Chromadie keeps uploaded backgrounds as their own surface
and adds a finite `profile_atmosphere` slot for authored SVG scene plates. The
plates use roll and recent-roll colors as palette input, but their geometry and
material language remain code-owned so they do not collapse into generic
gradients or user CSS. Public references: haunt.gg changelog
(https://help.haunt.gg/overview/changelog), haunt.gg profile assets
(https://help.haunt.gg/customization/assets), guns.lol customization
(https://help.guns.lol/getting-started/customization), and fakecrime.bio
(https://fakecrime.bio/).

The first catalog slice contains eight scenes across Signal, Prism, Nocturne,
Ember, and Archive. One shared `AtmosphereLayer` owns the SVG plate, visibility
pause, reduced-motion frame, compact card treatment, and pointer-safe stacking.
Shop cards render static miniatures; only public profiles and fitting-room
previews animate. The additive migration updates the existing slot allowlists,
RPCs, seed, cache version, and catalog drift checks without reviving the old
weather-class rows.

The atmosphere layer is explicitly additive: it has no opaque base, blend-mode
texture, or color wash, and uploaded profile backgrounds render at full fidelity.
Scene plates use layered authored linework, particles, refractive edges, and
material details rather than a single gradient or glow preset.

## 2026-08-04 — Rain Window uses a transformed stock plate for the pilot

The Rain Window pilot uses a short, locally served plate derived from Pexels
video 34479250 (Jonathan David,
https://www.pexels.com/video/rain-droplets-on-windshield-close-up-34479250/).
The source is cropped to a profile-safe 16:9 composition, converted to a
high-contrast droplet highlight plate, trimmed to a 14-second loop with a
one-second tail-to-head crossfade, and served as WebM with an MP4 fallback and
poster frame. The source is not redistributed unchanged. The video is isolated
to the Rain Window atmosphere, uses screen
blending so black contributes no tint or dimming, and falls back to the poster
for cards, reduced motion, hidden documents, and unsupported video formats.

## 2026-08-05 — Use Haunt’s public effect vocabulary as a reference set

The first authored Name Motion pass was too bespoke and did not meet the
quality bar in live preview. The next pass uses the public Haunt vocabulary as
the reference language: glow, typewriter, particles, rainbow, gradient, fuzzy,
and closely related reveal/entry behaviors. Chromadie implements the gestures
with its own bounded Canvas renderer, shared animation clock, and daily-color
inputs; competitor code, assets, and markup are not copied. Type In and
Scramble remain because they were the only two gestures that already passed
the product review. The active shop now exposes exactly ten motions and marks
the prior eight active rows legacy while resolving historical equipped values
through finite aliases.

## 2026-08-05 — Give the Name Motion shelf distinct authored gestures

The follow-up quality audit found that the first Haunt-reference renderers
overused one diagonal light sweep: Glow, Rainbow, Gradient, Reveal, Split
Reveal, and Flash read as palette or timing variants at compact card scale.
The renderer now gives each active key a separate visual grammar while keeping
the ten catalog keys stable. Glow is a breathing masked aura, Rainbow is a
moving set of saturated prism slices, Gradient is a slower fluid fill with a
soft liquid highlight, and Flash is a short chromatic exposure. Particles now
emit deterministic colored trails from the text baseline; Reveal and Split
Reveal use masked entry edges and a chromatic center seam; Fuzzy keeps its
signal line inside the text mask.

Type In now left-anchors partial text and places its cursor after the visible
characters, including during deletion. No catalog, inventory, entitlement,
profile, or database authority changed, and all legacy motion aliases remain
stable. Renderer recording tests cover these gesture boundaries in addition to
the existing deterministic and bounded-Canvas checks.

## 2026-08-05 — Keep profile theme colors independent from daily colors

The dashboard owns a bounded `appearance` object for profile-wide colors,
surfaces, gradients, and base borders. Daily roll colors remain inputs to roll
history and authored effects; they no longer tint the complete public profile.
The selected username color is the renderer base color, while authored
materials and motions retain their finite code-owned palettes. Appearance is
saved and published through owner-only section RPCs so an unpublished layout or
composition draft cannot be promoted accidentally.

Owner-selected appearance colors are rendered exactly. The former design rule
against inaccessible user-selected combinations is superseded for this
structured profile-appearance surface; defaults, system controls, focus states,
and dashboard interaction colors remain accessible.

## 2026-08-05 — Make dashboard pages and publishing section-scoped

The profile dashboard uses a canonical hash IA with a collapsible Profile group.
Navigation pushes history, restores direct/popstate locations, and guards dirty
Customize/Layout drafts. Appearance and composition publish through separate
owner RPCs with optimistic timestamps; composition accepts only layoutVariant,
modules, and links. New appearance defaults use fixed accent `#CDD2FF`, while
legacy whole-config saves retain structured appearance values for compatibility.
The live preview reuses owner-loaded profile data, bounds uploaded media, and
does not expose social, follow, roll, analytics, or autoplay mutations.

## 2026-08-08 — Keep profile content structured and deliberately small

The first post-media dashboard content slice is a single plain-text About
region plus at most four HTTPS Projects. Content is stored under the existing
version-one profile configuration and uses its owner-private draft/publicized
projection rather than a new public table. Drafts can retain incomplete project
rows while editing, but the normalized public projection drops incomplete or
unsafe links. Rendering uses Svelte text interpolation and ordinary safe
anchors; Chromadie does not accept profile-authored HTML, JavaScript, CSS, or
arbitrary embeds. This gives profiles more story and exploration value while
keeping the public acquisition surface fast and safe.

## 2026-08-08 — Rich media is staged, bounded, and entitlement-gated

Profile parity needs practical video, audio, banner, and cursor expression, but
the public profile cannot become an upload sandbox. Rich assets therefore use a
separate `profile_media` bucket and an owner-private `profile_media_assets`
library. A browser first creates a staged row through an authenticated RPC;
Storage policies require that row, and a verification RPC checks the recorded
MIME/size before the asset becomes active. Quotas are three 25 MB videos, five
10 MB MP3 tracks, one WebP banner, two 128×128/128 KB cursor assets, and 150 MB
total per profile.

Selection writes validated paths and a small audio playlist into additive
profile-configuration columns. Public projection is conditional on the
authoritative staff flag or active billing access, so refund/chargeback
presentation revocation never deletes rolls, history, or private recovery media.
Free profiles keep the existing image/atmosphere/Spotify expression. Muted
background video is allowed to autoplay; audio intent is represented by a
finite Enter profile action and never by a page-wide pointer/keyboard listener.
Native media remains behind safe structured controls, with poster/reduced-motion
fallbacks and media-key support.

## 2026-08-08 — Make profile parity additive, structured, and shareable

Milestone 11 introduces a versioned `ProfileConfigurationV2` envelope while
keeping V1 profile rows and rendering readable throughout rollout. Links gain
stable opaque keys and a 25-entry cap, but only the first six enter the opening
identity card; the existing secondary links region is the continuation. Free
profiles remain capped at four projects and two provider widgets, while
Chromadie Plus and authoritative staff accounts receive ten projects and four
widgets. Premium changes expression capacity, never rolls, rewards, history,
or prestige.

About text is a deliberately small Markdown subset parsed into a sanitized AST;
raw HTML, scripts, CSS, arbitrary embeds, and non-HTTPS targets are discarded.
GitHub, Twitch, Last.fm, and Discord are fixed provider cards, while Spotify
and YouTube keep their allowlisted lazy embed path. Identity presentation,
metadata, and link styling are normalized by owner-only security-definer RPCs.

Sharing uses canonical URLs first, with existing aliases as an optional path,
code-owned QR generation, and server-rendered title, description, theme color,
banner, and favicon metadata selected only from validated profile media. V2
columns and RPCs are additive and can be left dormant to roll back the client
surface without deleting authored profile data.

## 2026-08-08 — Make Profile Studio task-oriented and keep publishing section-scoped

Customize presents existing profile capabilities through a compact asset row
and seven keyboard-accessible categories rather than one uninterrupted editor
stack. Inactive editors stay mounted so category changes do not discard local
draft state, but only the active editor and its existing section-owned action
bar are visible. This preserves the current appearance, content, widget, and
composition RPC boundaries instead of implying an atomic cross-section save.

The live profile preview remains the real bounded preview renderer, but it is
now an explicit inspector rather than a permanent dashboard column. It is
collapsed by default, docks only where sufficient width exists, overlays at
ordinary desktop widths, and becomes a bottom sheet on mobile. Quick asset
tiles are summaries and entry points into the existing media managers; they do
not create a second upload, entitlement, validation, or RLS path.

## 2026-08-08 — Keep Customize as one continuous, direct-manipulation workspace

The category switcher and quick-entry tiles were too close to a collection of
small destinations: important controls were still hidden behind another click,
and the current asset was separated from the action that changed it. Customize
now uses one continuous page with page-owned section headings. Avatar and
background controls remain directly visible, and rich-media controls expose the
active video, banner, cursor, pointer cursor, and audio previews beside their
upload/replace actions. Saved libraries remain below those controls for reuse.

Child module chrome is intentionally flattened inside this workspace so a user
does not have to parse nested titles and marketing descriptions. Section action
bars stay scoped to their existing RPC contracts, but render in place rather
than competing as floating dashboard elements. The redesign changes only the
presentation layer; upload validation, entitlement checks, RLS, draft/publish
boundaries, and profile rendering remain unchanged.

## 2026-08-09 — Publish the assembled profile from one dashboard action bar

Color Customization now exposes only the seven profile palette colors and the
surface depth controls. Highlight, border, border-color, and background-gradient
settings are intentionally absent from the editor, while their legacy stored
values remain readable through the normalizer for historical profiles and safe
rollback compatibility.

Appearance, content, widgets, and composition editors now stage validated local
drafts and emit preview/dirty state to Profile Studio. Customize and Links share
one Reset / Publish profile action bar. Reset stages the published V2
configuration back into the draft; Publish submits the assembled configuration
through the existing owner-authorized `save_profile_configuration_v2` and
`publish_profile_configuration_v2` RPCs. Media selection, identity bio saves,
collection ownership, and privacy/social writes remain on their existing
scoped boundaries.

## 2026-08-09 — Scope Catppuccin Mocha to Profile Studio

Profile Studio now uses the Catppuccin Mocha reference palette for its
background layers, surfaces, text hierarchy, borders, mauve/lavender accents,
and semantic status colors. The palette is scoped to the dashboard host so the
public profile canvas and other site routes keep their existing visual
contracts. This is a color-only refinement: layout, spacing, navigation,
component structure, responsive behavior, and accessibility interactions are
unchanged.

## 2026-08-09 — Use semantic accent contrast without changing dashboard structure

The Mocha palette is now used as a restrained role system inside Profile
Studio: Customize uses Mauve, Links Sapphire, Premium Pink, account sections
use distinct status-friendly accents, and the existing Customize surfaces use
Sapphire, Teal, Mauve, and Peach tinting. These are color and token changes
only; the shell geometry, navigation order, spacing, interactions, responsive
behavior, and reduced-motion behavior remain unchanged.

## 2026-08-09 — Use Mocha surface levels to separate large editor panels

The large Profile Studio surfaces now alternate between Catppuccin Surface0
and Surface1 according to their existing editor roles, while the action bar
uses Surface1 as a higher-emphasis status surface. Accent tinting remains
restrained and semantic. This improves panel hierarchy through color only;
layout, spacing, component structure, and interactions remain unchanged.

## 2026-08-09 — Keep large dashboard surfaces dark and controls legible

Large Profile Studio sections use the darkest three Mocha neutrals—Crust,
Mantle, and Base—in an alternating sequence. Lighter Surface0/Surface2 tones
are reserved for input fills, control borders, and button surfaces, while
semantic colors remain on headings and status accents. This reduces visual
busyness without changing the dashboard structure or interaction contract.

## 2026-08-09 — Use one Manrope UI family in Profile Studio

Profile Studio uses the locally bundled Manrope variable family for its
functional interface typography, including the dashboard header, navigation,
section headings, labels, inputs, and buttons. IBM Plex Mono remains the
technical companion for hex values, counters, and status metadata. The font
override is scoped to Profile Studio so public profile and homepage visual
contracts remain unchanged.

## 2026-08-09 — Use depth before brightness for Profile Studio hierarchy

The Profile Studio canvas now uses Crust as the page gutter, with Base and
Mantle as the alternating large-section surfaces. Input fills are a restrained
mix of Surface0 and their parent section, and accent borders are less intense.
This keeps the Mocha contrast legible without letting borders or controls
become the dominant visual layer.

## 2026-08-04 — Keep only authored atmosphere plates in the launch shop

Atmospheres are a high-salience profile surface, so thin procedural SVG lines,
rings, and gradients do not meet the same quality bar as the authored weather,
glass, light, ink, and snow plates. We removed the seven procedural presets and
their catalog/inventory/equipped records instead of presenting them as legacy
choices. The slot now contains five finite video-backed renderers; new scenes
must meet that authored-media bar before being added.
