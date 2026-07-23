# Phase 0 Codex Kickoff Prompt

Copy this prompt into Codex from the repository root:

```text
Read AGENTS.md and the entire docs directory. Begin Phase 0 — Baseline and Safety from docs/06_ROADMAP.md.

This is an audit and stabilization milestone, not a redesign implementation milestone.

Tasks:

1. Inspect the current Svelte application structure, routes, stores, major components, profile rendering, roll flow, shop, leaderboard, cosmetics, and Supabase integration.
2. Produce docs/CURRENT_SYSTEM_MAP.md containing:
   - route map;
   - component ownership map;
   - store/state map;
   - client-to-RPC/API map;
   - public-profile data flow;
   - roll transaction flow;
   - cosmetic/achievement/shop data sources;
   - deployment and metadata flow;
   - known coupling and migration hazards.
3. Run and record the full existing validation suite in docs/PROGRESS.md.
4. Add only the minimum regression tests needed to protect:
   - owner versus visitor profile behavior;
   - guest versus authenticated behavior;
   - roll readiness and canonical result updates;
   - public profile route parsing;
   - existing critical profile data mapping.
5. Do not redesign the UI or change product behavior.
6. Do not alter scoring, economy, rewards, RLS, or production data semantics.
7. Create docs/PHASE_0_REPORT.md with:
   - baseline status;
   - failures discovered;
   - test coverage added;
   - recommended boundaries for Phase 1;
   - explicit go/no-go assessment.
8. Update docs/PROGRESS.md, docs/DECISIONS.md, and docs/CHANGELOG_2_0.md.

Before editing, show the implementation plan. After editing, run every applicable command required by AGENTS.md and report exact results.
```
