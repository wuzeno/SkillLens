# Changelog

## 0.2.0 — 2026-10-31

- Opt-in schemaVersion 2 via `--conflicts`; default schemaVersion 1 and static rules/counts remain unchanged.
- Bounded opposing-directive and description-overlap candidates, full entry snapshots and all included unordered pairs, including those with no rule matches.
- Agent workflow compares task/target/stage, conditions and exceptions; optional `--review` validates fresh snapshots, complete pair coverage and exact evidence without certifying semantic reasoning.
- Separate pending and unresolved pairs; conditional agent assessments remain distinct from observed host behavior. Explicit source/pair/description/candidate limits and no automatic repairs or model calls in the checker.
- Four synthetic paired demonstrations, 92 passing local tests and updated bilingual usage. A user-run WorkBuddy task produced four review files; independent CLI evidence validation accepted all four and confirmed the eight source entries retained their byte hashes. This is not universal host compatibility or a semantic accuracy measurement. See the dated verification record for remote CI results as they are obtained.

## 0.1.0 — Repository published; no version tag/Release

- Selected project name **SkillLens**, with installable identifier `skill-lens`; aligned local paths, commands and CLI branding. Name availability has not yet been checked.

- Installable `skill-lens` instruction entry with a self-contained, zero-runtime-dependency Node.js checker.
- Portable frontmatter subset checks; name collisions; entire-entry duplicate detection; missing explicit relative inline Markdown destinations.
- Evidence-based terminal and schemaVersion 1 JSON reports, stable ordering and explicit coverage limits.
- Reader-first agent report instructions: plain-language conclusion, prioritized findings, bounded next actions, then technical evidence. No wide default report tables; original rules, severity, JSON and exit codes are unchanged. Prompt behavior still requires live-host acceptance testing.
- Local-only, read-only operation with symlink/junction precautions and no automatic repair.
- Synthetic broken/healthy demonstrations, automated tests, bilingual README and CI configuration.

Not included: same-body/different-metadata similarity detection, dependency solving, host discovery/precedence adapters, semantic conflict proofs, remote checks or automatic fixes. Cross-platform CI and live agent invocation remain release-time verification tasks until actually run.
