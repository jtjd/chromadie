# Audit Checklist

Use this when reviewing Chromadie for launch readiness.

## First Pass

- Confirm the app boots on a clean install.
- Confirm guest mode works without a Supabase session.
- Confirm authenticated users load a real profile.
- Confirm the header shows the username on mobile and desktop.
- Confirm account-only UI does not leak into guest mode.

## Security Pass

- Check RLS policies on `profiles`, `scores`, `inventory`, and `user_follows`.
- Check direct table writes are not possible from the browser.
- Check gameplay mutations go through RPCs only.
- Check reroll, purchase, follow, and profile-update flows are server-authoritative.
- Check no secrets or service-role keys are exposed.

## Gameplay Integrity Pass

- Verify daily rolls cannot be duplicated.
- Verify rerolls cannot be replayed, raced, or refreshed into extra gains.
- Verify leaderboard entries cannot be forged.
- Verify inventory cannot be self-granted.
- Verify rivals cannot bypass server limits.

## UX Pass

- Verify guest messaging is guest-specific.
- Verify auth loading does not block guest play.
- Verify login / signup / reset-password flows are usable.
- Verify mobile layouts do not overflow or overlap.
- Verify cosmetic frames, name effects, and leaderboard themes render correctly.

## Deployment Pass

- Verify `npm run build` succeeds.
- Verify `npx eslint src/` succeeds.
- Verify SPA routes are compatible with static hosting.
- Verify Cloudflare Pages env vars and redirect URLs are documented.
- Verify `supabase/seed.sql` contains the seed rows needed for a fresh reset.

## Repo Context

- Root summary: `README.md`
- Current state: `PROJECT_STATUS.md`
- Review prompt: `AUDIT_BRIEF.md`
- Deployment notes: `DEPLOYMENT.md`

