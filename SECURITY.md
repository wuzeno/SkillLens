# Security boundaries

The checker is read-only, local and dependency-free. It does not execute scanned commands, import scanned code, make network requests, install software, repair files or follow symbolic links. Roots with symlink components are rejected. Its default output contains local paths, names and limited evidence. Opt-in `--conflicts --json` also contains bounded full entry snapshots, including code/examples/quoted text: treat this as potentially sensitive, not a redacted report, and review before sharing. The checker does not save reports itself.

The skill instructs the agent to obtain explicit scope, treat scanned content as untrusted data, and ask before repairs. These instructions are not a technical sandbox for the agent. An agent reading private data may send context to its provider; use provider controls appropriate to your data. The optional third-party installer has its own network and write behavior.

This is not a malware scanner, prompt-injection detector, host compatibility certification, or complete Markdown/YAML parser. “No errors” does not certify safety. Do not run it over a concurrently hostile/mutating filesystem: path checks are not atomic against replacement races. File size and traversal limits bound ordinary scans, not adversarial resource exhaustion. Symlink skipping is a scope precaution, not a hardened isolation boundary.

## Reporting

Use GitHub's [private vulnerability reporting](https://github.com/wuzeno/SkillLens/security/advisories/new) for this repository; it is enabled. Do not disclose exploit details in a public issue. Do not include credentials, private skill contents or full private paths unless essential and appropriately redacted. For non-sensitive bugs and feature requests, use [Issues](https://github.com/wuzeno/SkillLens/issues).
