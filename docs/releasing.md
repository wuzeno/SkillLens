# Publication checklist

Release target: [wuzeno/SkillLens](https://github.com/wuzeno/SkillLens), public, MIT, v0.1.0 early preview. This is a checklist, not a claim that every item has passed; see the dated [verification record](verification.md) for completed checks and remaining limitations.

## Owner decisions

- Project name selected: **SkillLens**; skill identifier: `skill-lens`. Check repository/registry availability and possible brand conflicts before publication; selection is not a clearance claim.
- Choose GitHub owner/organization, public/private visibility and MIT licensing acceptance.
- Confirm permission to create/push the repository. Do not request or commit tokens; owner logs in through GitHub's normal flow.
- Finalize the security contact/private reporting route.

## Local checks

```sh
node --test
node skills/skill-lens/scripts/check.mjs skills --json
node skills/skill-lens/scripts/check.mjs examples/healthy --json
node skills/skill-lens/scripts/check.mjs examples/broken --json
```

The first three commands must succeed. The intentionally broken demo must exit 1 with NAME_COLLISION, REFERENCE_MISSING and METADATA_MISSING. Exit 1 here is expected evidence, not an ignored failure. Review JSON coverage and unexpected findings.

- Install only `skills/skill-lens/` into a temporary/explicit host skill store and verify entry discovery and bundled script resolution.
- Exercise one live agent invocation with an explicitly authorized synthetic target. Confirm the agent does not execute target commands or change files.
- Run the remote Node 22/24, Linux/Windows/macOS CI matrix after pushing. Do not advertise matrix success before it runs.
- Review tracked files for private paths, credentials, unlicensed assets and generated outputs. Inspect the exact Git diff before publishing.

## Repository setup and release

- Add actual repository links and a real remote install command to both READMEs, then test it. No fake badges or download counts.
- Enable Issues and private vulnerability reporting if supported. Add a concise description and topics (agent-skills, developer-tools, static-analysis).
- Initial description: “A local-first skill that checks agent skill installations for broken metadata, duplicate names and missing references.”
- Keep the npm package private: this release is a GitHub skill repository, not an npm CLI distribution.
- Tag v0.1.0 only after owner approval and review. Release notes must distinguish synthetic demonstrations, local verification and remote verification.

## Candidate launch text

SkillLens is a skill that checks your skills. It runs local, read-only checks for entry metadata issues, repeated names, identical entry files and missing relative Markdown destinations, then explains the evidence. No model API is needed by the checker. It does not prove semantic conflicts, infer host loading order, or certify safety.

Replace this draft with the actual repository link and verified installation instructions before publishing. No growth or real-user accuracy claims are supported yet.
