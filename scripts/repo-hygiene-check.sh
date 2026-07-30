#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

required_files=(
  "AGENTS.md"
  "docs/11_PRODUCT_DIRECTION_ADDENDUM.md"
  "docs/12_NEXT_PHASES_ROADMAP.md"
  "docs/milestones/PHASE_10_VISION_RECONCILIATION.md"
  "checklists/PROFILE_FIRST_GATE.md"
  "docs/PHASE_10_REPORT.md"
  "docs/milestones/PHASE_11_CONTINUOUS_PROFILE_COMPOSITION.md"
  "docs/PHASE_11_VISUAL_CONTRACT.md"
  "docs/PHASE_11_REPORT.md"
)

missing=()
for required_file in "${required_files[@]}"; do
  [[ -f "$required_file" ]] || missing+=("$required_file")
done

if (( ${#missing[@]} > 0 )); then
  printf 'Repository hygiene check failed: missing %s\n' "${missing[*]}" >&2
  exit 1
fi

tracked_forbidden="$(git ls-files | rg '(^|/)(\.env$|\.env\..*\.local$|node_modules/|dist/)' || true)"
if [[ -n "$tracked_forbidden" ]]; then
  printf 'Repository hygiene check failed: forbidden tracked paths:\n%s\n' "$tracked_forbidden" >&2
  exit 1
fi

rg -q 'docs/11_PRODUCT_DIRECTION_ADDENDUM\.md' AGENTS.md
rg -q 'docs/12_NEXT_PHASES_ROADMAP\.md' docs/06_ROADMAP.md

printf 'Repository hygiene check passed: required phase documents exist and no forbidden tracked paths were found.\n'
