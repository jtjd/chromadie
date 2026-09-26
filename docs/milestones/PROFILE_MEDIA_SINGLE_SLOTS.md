# Profile media slots and bounded libraries

## Plan and acceptance

- Free accounts keep one avatar and one background. A successful selection replaces
  the previous file in that slot; failed uploads preserve the current selection.
- Enforce replacement and paid retention in SQL using the existing entitlement
  authority. Retire replaced assets transactionally and use the existing R2
  deletion/cache-purge queue, with immediate best-effort cleanup from the client.
- Preserve existing files on migration. Older free libraries remain accessible
  in a collapsed recovery browser until the owner replaces that slot.
- Use a shared, collapsed library with kind filters, six files per page, selected
  state, and per-file check/use/delete actions. No unbounded warning lists.
- Retain Plus/staff storage, playlist limits, validation, RLS, and public delivery.
- Test replacement, failed selection, entitlement retention, concurrency limits,
  recovery, keyboard/mobile presentation, and the complete required suite.

## Compatibility and migration

Add a migration replacing upload-intent and image-selection function bodies;
keep signatures and grants. Existing libraries are not bulk-deleted. Deletion
starts only after an owner successfully changes or clears a free image slot.
A single temporary upload candidate is allowed per free slot so replacement is
safe without enabling an accumulating free library. Paid capacity is unchanged.

## Validation and rollout

Complete locally on 2026-09-26. All 892 unit tests and the complete mandatory
suite pass, including database reset, strict SQL lint and new SQL lifecycle
regressions. Browser evidence under `artifacts/profile-media-library/` covers
a synthetic 200-file library on desktop/mobile, keyboard, reduced motion,
filtering, pagination and mutations. Real R2 upload/CDN-purge integration was
not run. Production migration `20260926120000_profile_media_single_slots.sql` was applied
on 2026-09-26 under the owner-authorized live-testing release, before the
matching frontend push.

Replacement cleanup uses at most six immediate deletions; remaining files and
failed purges are handled by the existing durable worker. An uncertain network
response after selection never deletes the potentially equipped replacement.
