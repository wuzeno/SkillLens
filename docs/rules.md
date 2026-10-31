# Detection contract — default schemaVersion 1

The original static rules below remain unchanged by default. Explicit `--conflicts` adds a schemaVersion 2 report with bounded candidates, a source/pair review packet and an optional citation-checked agent assessment. See [the conflict contract](conflicts.md) for its separate coverage, JSON format, limitations and exit semantics. Rule candidates are not semantic verdicts.

Profile: `portable-static`. These are project conventions, not a certification against any host version. Discovery is recursive and case-sensitive for the exact filename `SKILL.md`. A directory without that file is not assumed to be a damaged skill. No host search paths or precedence rules are inferred.

## Rules

| Rule | Severity | Evidence / boundary |
| --- | --- | --- |
| METADATA_MISSING | error | No opening `---` on first line (optional BOM accepted), or no exact closing `---`. |
| METADATA_REQUIRED | error | Supported metadata has missing/empty name or description. |
| METADATA_UNVERIFIED | warning | Unsupported metadata syntax or duplicate parsed keys. Skip name/description validation and name grouping for this entry. |
| NAME_FORMAT | warning | Name is outside lowercase ASCII letter/digit segments separated by single hyphens, max 64 characters. This is a portable convention, not a proven host rejection. |
| NAME_COLLISION | warning | Same parsed name in multiple discovered entries. No loading priority inferred. |
| DUPLICATE_CONTENT | info | Entire entry files have equal SHA-256 after CRLF-to-LF normalization. Frontmatter is included, support files are not. |
| REFERENCE_MISSING | warning | Recognized local Markdown destination has a missing/non-directory path component. It may be optional. |
| REFERENCE_OUT_OF_SCOPE | info | Lexically resolved destination leaves authorized canonical root; no target inspection. |
| REFERENCE_SYMLINK_SKIPPED | info | A destination traverses a symlink/junction; no traversal. |
| SYMLINK_SKIPPED | info | Discovery encountered a symlink/junction; no traversal. |
| SCAN_INCOMPLETE | warning | An operation failed or a limit was reached; coverage.complete=false and exit 2. |
| NO_SKILLS | info | No readable entries analyzed. Not evidence of a healthy installation. |

Rule locations are relative to the root, slash-normalized. Frontmatter findings cite line 1 as the start of the block, not an invented precise field location. Reference findings cite the link's source line. Cross-file group findings use the first stable path and list all members in evidence.

## Metadata subset

Top-level name/description may be plain strings, JSON-compatible double-quoted strings, YAML single-quoted strings (doubled quote escape), or simple `|`, `>`, `|-`, `>-`, `|+`, `>+` block strings. Block indentation is simplified and content folded for validation only. Plain inline comments are stripped before type checking. Recognized booleans, null and decimal number literals are unverified rather than silently coerced. Other YAML scalar types are not exhaustively recognized: this reader is not a full YAML validator.

Extra top-level fields are ignored, including their indented continuation lines. Unrecognized top-level syntax and duplicate parsed keys mark metadata unverified. YAML aliases/tags/flow collections in required fields and complex quoted syntax are unsupported. Valid YAML outside this subset is not an error. No description length, tool allowlist, name-directory equality, or host-specific schema validation is promised.

## Reference subset

Inline Markdown `[label](./target)` and `![label](../target)` only, including angle destinations and optional double-quoted titles. UTF-8 percent escapes are decoded after removal of query/fragment. Targets can be files or directories. Paths containing backslashes, NUL, invalid escapes, unsupported parentheses, or unsupported destination syntax are not analyzed. External URLs, anchors, bare relative paths, reference-style links, HTML and command paths are ignored. Fenced code and simple single-line inline code are excluded heuristically; this is not a complete CommonMark parser and complex Markdown may be missed or misinterpreted. Supporting Markdown files are not recursively read.

## Scope and limits

Excluded directory names at every depth: `.git`, `node_modules`, `.venv`, `venv`. Other hidden directories are eligible. Symbolic links and Windows junctions are skipped; any symlink component in a supplied root is rejected. Use an explicitly authorized physical path instead. macOS users may need the physical `/private/...` path rather than a `/var/...` alias.

Production limits: 2,000 directories, 10,000 file entries, nesting depth 16 below root, 262,144 bytes per entry, 8,388,608 bytes of entry content total. Reaching a limit marks coverage incomplete. Directory enumeration itself is not a memory-hard sandbox. A concurrent adversary can change a path between checks: do not scan actively hostile/mutating trees.

`coverage.complete` refers only to operational completion within this subset. Unsupported metadata, excluded directories, ignored link syntaxes and symlinks do not by themselves make it false. They remain coverage limitations. Root failures emit a separate failure object and exit 2. A missing root is never interpreted as an empty installation.

## JSON and CI

Success-shaped reports: schemaVersion, root, profile, coverage, counts, skills, findings. Fatal failures: schemaVersion, failure {code,message}. A report with error findings still uses the report shape. Exit 2 takes precedence over exit 1 when coverage is incomplete. Exit 0 permits warnings/info; CI users requiring stricter policy must examine JSON rather than assume warnings fail the build. In opt-in conflict mode it also permits pending semantic review and agent-assessed conflicts: these never become static errors implicitly. Incomplete conflict packets or invalid review imports return 2. No suppressions, baseline mode, severity overrides or automatic fixes exist in this release.
