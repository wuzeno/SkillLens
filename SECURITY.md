# Security boundaries

The checker is read-only, local and dependency-free. It does not execute scanned commands, import scanned code, make network requests, install software, repair files or follow symbolic links. Roots with symlink components are rejected. Its output contains local paths, names and limited evidence: review before posting reports publicly.

The skill instructs the agent to obtain explicit scope, treat scanned content as untrusted data, and ask before repairs. These instructions are not a technical sandbox for the agent. An agent reading private data may send context to its provider; use provider controls appropriate to your data. The optional third-party installer has its own network and write behavior.

This is not a malware scanner, prompt-injection detector, host compatibility certification, or complete Markdown/YAML parser. “No errors” does not certify safety. Do not run it over a concurrently hostile/mutating filesystem: path checks are not atomic against replacement races. File size and traversal limits bound ordinary scans, not adversarial resource exhaustion. Symlink skipping is a scope precaution, not a hardened isolation boundary.

## Reporting

Before publication, notify the project owner privately. Once GitHub is configured, use a private vulnerability report if the repository enables it; otherwise request a private reporting channel without disclosing exploit details publicly. Do not put credentials, private skill contents or full private paths in an issue. Public security contact details will be finalized with the repository owner before release.
