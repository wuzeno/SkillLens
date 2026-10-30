# Contributing

Requires Node.js 22+. No dependency installation is needed. Run `node --test` and `node skills/skill-lens/scripts/check.mjs skills` before proposing a change.

Every new rule needs a stable identifier, evidence definition, severity rationale, documented limitations, a failing fixture and a normal/counterexample fixture. Do not turn uncertain host behavior into a deterministic error. Keep rule results deterministic and local. Never add execution of scanned commands or external uploads as an implicit part of scanning.

Keep agent instructions under `skills/skill-lens/`, tests under `test/`, demonstrations under `examples/`, and reference documentation under `docs/`. The bundled script must continue working when only the skill directory is installed, without importing repository-level dependencies.

For host adapters, cite the actual supported host documentation/version and test precedence behavior. For parser extensions, add both accepted and unsupported examples. Changes to exit codes, finding identifiers or JSON structure need release notes and a schema-version decision.

Use synthetic or explicitly authorized, redacted examples. Never commit personal skill stores, credentials, machine-specific scan reports or copied third-party assets without license review.
