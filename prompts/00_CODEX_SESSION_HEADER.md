# Codex Session Header

Use this at the beginning of every major Codex session:

```text
Read AGENTS.md and all documentation it marks as required for the active milestone before changing code.

Work only on the currently active milestone in docs/PROGRESS.md. Inspect the current implementation before proposing changes. Preserve existing authentication, RLS, server-authoritative rolling, scoring parity, account data, public routes, metadata, and deployment behavior.

First provide:
1. A concise audit of the relevant current files.
2. A concrete implementation plan.
3. Risks, migrations, and tests.
4. The exact acceptance criteria you will use.

Then implement the milestone completely. Run all required validation commands. Update docs/PROGRESS.md, docs/DECISIONS.md, and docs/CHANGELOG_2_0.md before finishing.

Do not begin later roadmap phases or perform unrelated refactors.
```
