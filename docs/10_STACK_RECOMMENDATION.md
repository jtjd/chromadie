# Stack Recommendation

## Recommended Target Stack

- Frontend: **SvelteKit** (migrate incrementally from the existing Svelte SPA)
- Language: Svelte 5 + TypeScript
- Database: Supabase PostgreSQL
- Auth: Supabase Auth
- Security: PostgreSQL RLS + server-authoritative RPCs
- Storage: Supabase Storage
- Hosting: Cloudflare Pages/Workers with SvelteKit adapter
- Business logic: PostgreSQL functions and Supabase Edge Functions

## Why

The current backend architecture is already a strong fit. The biggest limitation is the frontend architecture, not the technology choices.

Do **not** rewrite the project in React, Next.js, or another framework.

Instead:

1. Keep the existing backend.
2. Preserve authentication, scoring, achievements, inventory, and RLS.
3. Gradually migrate the SPA into SvelteKit.
4. Move public profiles to server-rendered routes.
5. Introduce a modular profile architecture instead of large page components.

## Migration Strategy

Phase 0: Audit and regression tests.

Phase 1: Design system.

Phase 2: Introduce SvelteKit routing while preserving existing behavior.

Phase 3: Render public profiles through server routes.

Phase 4: Replace legacy screens one at a time.

Never perform a full rewrite.

## Principles

- Preserve working backend logic.
- Keep roll execution server-authoritative.
- Use server rendering for shareable public profiles.
- Build profile modules instead of page-specific code.
- Separate domain logic from UI.
- Prefer incremental migrations with rollback points.
