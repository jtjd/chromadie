# Approved Mockup Translation Map

Phase: 10.2 — Approved Mockup Visual Convergence  
Reference: `design/reference/v0-profile-mockup/`  
Status: translation contract before production implementation

The reference is a visual contract for composition, atmosphere, spacing, and
interaction tone. It is not a production data or authority contract. The
production translation keeps the Svelte renderer, Supabase projections, RLS,
and server-authoritative roll flow.

| Mockup element | Mockup source | Production data source | Production Svelte component | Action |
|---|---|---|---|---|
| Ambient background | `components/ambient-background.tsx` | Canonical daily roll hex when available; otherwise the mapped signature/mood fallback; validated profile media/color configuration | `ProfileShell.svelte` + profile configuration | adapt |
| Minimal chm.lol header | `app/page.tsx` top-bar markup | Current route, canonical public username URL, auth/owner predicate, existing navigation handlers | `src/lib/ProfileModeHeader.svelte` + `src/App.svelte` | translate |
| Identity card | `components/bio-card.tsx` | `loadProfileContext()` mapped profile, published v1 configuration, earned badges, safe cosmetics, public links | `src/lib/IdentityCard.svelte` | adapt |
| Avatar | `components/bio-card.tsx` avatar image | Validated public profile media with the existing monogram/logo-mark fallback and Profile Border | `src/lib/IdentityCard.svelte` + `ProfileBorderEffect.svelte` | preserve existing |
| Display name | `components/bio-card.tsx` `profile.name`/`profile.handle` hierarchy | Safe public `targetProfile.username`; no separate display-name field | `src/lib/IdentityCard.svelte` | adapt |
| Handle | `components/bio-card.tsx` `profile.handle` | Safe public `targetProfile.username` | `src/lib/IdentityCard.svelte` | translate |
| Profile URL | `components/bio-card.tsx` `profile.url` | Canonical `/u/<username>` route derived from the existing route/share helper | `src/lib/IdentityCard.svelte` + `ProfileModeHeader.svelte` | adapt |
| Bio | `components/bio-card.tsx` `profile.bio` | No public bio field exists in the current schema; the current composition uses a truthful mapped color-chapter count or a first-chapter state | `src/lib/IdentityCard.svelte` + `ProfileShell.svelte` | defer to Phase 11 |
| Founder or earned status | `components/bio-card.tsx` `profile.isFounder` | Public equipped `launch_edition` badge and existing badge metadata | `src/lib/IdentityCard.svelte` | adapt |
| Social links | `components/bio-card.tsx` `profile.socials` | Published, HTTPS-only v1 profile links; no placeholder URLs | `src/lib/IdentityCard.svelte` / `ProfileMusic.svelte` expression fallback | adapt |
| Today’s color | `components/orb-roll.tsx` settled orb | `get_my_daily_roll`, `get_public_profile_scores`, and canonical `roll_die` response | `src/lib/ProfileRoll.svelte` + `src/lib/TodayColor.svelte` | preserve existing |
| Decorative roll atmosphere | `components/orb-roll.tsx` candidate cycling | Decorative state only while the existing secure request is pending; canonical server result settles the UI | `src/lib/ProfileRoll.svelte` | adapt |
| Next-roll state | `components/orb-roll.tsx` `todayColor.cooldown` | Existing UTC countdown in `ProfileRoll.svelte`; no client eligibility inference | `src/lib/ProfileRoll.svelte` + `TodayColor.svelte` | preserve existing |
| Featured collection | `components/bio-card.tsx` collection progress bars | Public story collection projection, server-owned unlock threshold, canonical color/condition records | `src/lib/FeaturedCollection.svelte` | adapt |
| Music bar | `components/music-bar.tsx` | No production music configuration or playback contract exists | `src/lib/ProfileMusic.svelte` | defer to Phase 11 |
| Expression fallback bar | Mockup bottom music placement and selected-link intent | Published profile links or signature color when links are absent | `src/lib/ProfileMusic.svelte` + existing `ProfileExpression.svelte` data | adapt |
| Share action | `app/page.tsx` `handleShare()` | Canonical public profile URL; existing Web Share/clipboard capability and analytics seam | `src/lib/ProfileModeHeader.svelte` | adapt |
| Edit action | Required production owner boundary; not a public mockup feature | Existing validated draft/publish editor and owner compatibility controls | `src/lib/ProfileModeHeader.svelte` + `ProfileShell.svelte` owner detail | preserve existing |
| Optional tilt | `components/tilt-card.tsx` | No production data; existing reduced-motion contract | profile CSS only if subtle | reject from production |
| Grain and restrained dark base | `app/globals.css` `.grain` and root colors | Existing design tokens and profile accent CSS variables | profile styles | adapt |
| Mobile composition | `app/page.tsx` flex/min-svh layout and component responsive styles | Same mapped profile/roll data; mobile-first Svelte layout | `ProfileModeHeader.svelte`, `ProfileShell.svelte`, and focused profile components | translate |

## Data and authority decisions

- The reference assets and profile literals are inspection material only. No
  mock username, avatar, location, view count, track, swatches, social URL, or
  result is copied into production.
- There is no public bio, public avatar, location, view-count, or music data
  contract in the current production schema. The default profile uses safe
  existing fields and neutral fallbacks; richer identity/media/music data is a
  Phase 11 contract decision, not a Phase 10.2 fabrication.
- A completed canonical roll is never replaced by the reference’s local
  random cycling. Roll eligibility, score, rarity, conditions, rewards,
  history, and atmosphere settlement remain server-owned.
- No music bar is rendered when the production music flag is disabled. An
  explicit localhost-only visual fixture can show the lower expression anchor,
  but it has no playback, track, or mock production data and does not claim
  Spotify support.
- `legacy=1` continues to use the compatibility renderer and global shell; the
  new profile-mode header and visual composition apply to the default renderer.
