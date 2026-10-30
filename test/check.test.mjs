import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, realpath, symlink, rm, cp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { scan, metadata, exitCode, LIMITS } from '../skills/skill-lens/scripts/check.mjs';

const script = path.resolve('skills/skill-lens/scripts/check.mjs');
const valid = (name = 'example', body = 'Useful instructions.') => `---\nname: ${name}\ndescription: Checks a specific task.\n---\n${body}\n`;
async function fixture(t, files) {
  const root = await realpath(await mkdtemp(path.join(os.tmpdir(), 'skill-lens-test-')));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(files)) {
    const target = path.join(root, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}
const rules = report => report.findings.map(f => f.rule);

test('healthy skill, quoted description, block scalar and extra nested fields', async t => {
  const root = await fixture(t, { 'one/SKILL.md': '---\nname: example\ndescription: >-\n  Checks a task.\n  And explains results.\nmetadata:\n  author: someone\n---\nInstructions.\n' });
  const report = await scan(root);
  assert.deepEqual(report.counts, { error: 0, warning: 0, info: 0 });
  assert.equal(report.skills[0].name, 'example');
  assert.equal(exitCode(report), 0);
});
test('missing and unclosed frontmatter produce errors', async t => {
  const root = await fixture(t, { 'one/SKILL.md': '# No metadata', 'two/SKILL.md': '---\nname: two' });
  const report = await scan(root);
  assert.equal(report.counts.error, 2);
  assert.equal(exitCode(report), 1);
});
test('empty required values are errors', async t => {
  const root = await fixture(t, { 'SKILL.md': '---\nname: x\ndescription: ""\n---\nbody' });
  assert.ok(rules(await scan(root)).includes('METADATA_REQUIRED'));
});
test('unsupported YAML is unknown, not invalid or guessed', async t => {
  const root = await fixture(t, { 'SKILL.md': '---\nname: &anchor foo\ndescription: okay\n---\nbody' });
  const report = await scan(root);
  assert.deepEqual(rules(report), ['METADATA_UNVERIFIED']);
  assert.equal(report.skills[0].name, null);
  assert.equal(report.counts.error, 0);
});
test('duplicate keys and numeric scalar remain unverified', () => {
  assert.equal(metadata('---\nname: a\nname: b\ndescription: hi\n---').unsupported, true);
  assert.equal(metadata('---\nname: 123\ndescription: hi\n---').unsupported, true);
});
test('quoted scalars, BOM, CRLF and comments are supported', () => {
  const result = metadata('\uFEFF---\r\nname: example # note\r\ndescription: \'It\'\'s useful\'\r\n---\r\nbody');
  assert.deepEqual(result.fields, { name: 'example', description: "It's useful" });
  assert.equal(result.unsupported, false);
});
test('same-name different content is a warning; no precedence guessed', async t => {
  const root = await fixture(t, { 'a/SKILL.md': valid('same', 'A'), 'b/SKILL.md': valid('same', 'B') });
  const report = await scan(root);
  assert.deepEqual(rules(report), ['NAME_COLLISION']);
  assert.equal(exitCode(report), 0);
  assert.match(report.findings[0].suggestion, /No host loading order/);
});
test('entry duplicate does not imply identical package', async t => {
  const root = await fixture(t, { 'a/SKILL.md': valid(), 'b/SKILL.md': valid(), 'a/data.txt': 'one', 'b/data.txt': 'two' });
  const report = await scan(root);
  assert.ok(rules(report).includes('DUPLICATE_CONTENT'));
  assert.match(report.findings.find(f => f.rule === 'DUPLICATE_CONTENT').suggestion, /supporting files may differ/);
});
test('inline local links checked but code, external and anchor links ignored', async t => {
  const body = '[missing](./gone.md)\n[exists](./real.md#heading)\n[web](https://example.com)\n[anchor](#x)\n`[not-link](./inline.md)`\n```md\n[fenced](./example.md)\n```\n';
  const root = await fixture(t, { 'SKILL.md': valid('example', body), 'real.md': 'exists' });
  const report = await scan(root);
  assert.deepEqual(rules(report), ['REFERENCE_MISSING']);
  assert.equal(report.findings[0].line, 5);
  assert.equal(report.counts.error, 0);
});
test('angle destinations, URL-encoded spaces, titles and images', async t => {
  const root = await fixture(t, { 'SKILL.md': valid('example', '[one](<./hello world.md>)\n[two](./hello%20world.md "Title")\n![image](./absent.png)'), 'hello world.md': 'hello' });
  const report = await scan(root);
  assert.equal(report.findings.filter(f => f.rule === 'REFERENCE_MISSING').length, 1);
});
test('references outside authorization are not inspected', async t => {
  const root = await fixture(t, { 'SKILL.md': valid('example', '[outside](../secret.md)\n[encoded](./%2e%2e/secret.md)') });
  const report = await scan(root);
  assert.equal(report.findings.filter(f => f.rule === 'REFERENCE_OUT_OF_SCOPE').length, 2);
  assert.ok(!rules(report).includes('REFERENCE_MISSING'));
});
test('ignored directories and non-entry documents are not parsed', async t => {
  const root = await fixture(t, { 'SKILL.md': valid(), 'node_modules/bad/SKILL.md': 'invalid', '.git/SKILL.md': 'invalid', 'other.md': '[x](./gone.md)' });
  const report = await scan(root);
  assert.equal(report.coverage.skills, 1);
  assert.equal(report.findings.length, 0);
});
test('symbolic links and junction targets are not followed', async t => {
  const outside = await fixture(t, { 'SKILL.md': 'bad metadata' });
  const root = await fixture(t, { 'SKILL.md': valid('example', '[link](./linked/SKILL.md)') });
  try { await symlink(outside, path.join(root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) { t.skip('OS does not permit test symlinks'); return; } throw e; }
  const report = await scan(root);
  assert.equal(report.coverage.skills, 1);
  assert.ok(rules(report).includes('SYMLINK_SKIPPED'));
  assert.ok(rules(report).includes('REFERENCE_SYMLINK_SKIPPED'));
  await assert.rejects(scan(path.join(root, 'linked')), /real directory/);
});
test('document byte limit produces incomplete exit 2', async t => {
  const root = await fixture(t, { 'SKILL.md': valid() });
  const report = await scan(root, { ...LIMITS, documentBytes: 1 });
  assert.equal(report.coverage.complete, false);
  assert.equal(exitCode(report), 2);
});
test('depth, file and directory limits are explicit', async t => {
  const root = await fixture(t, { 'one/deep/SKILL.md': valid(), 'two/SKILL.md': valid('two') });
  for (const override of [{ depth: 0 }, { files: 0 }, { directories: 1 }]) {
    const report = await scan(root, { ...LIMITS, ...override });
    assert.equal(exitCode(report), 2);
    assert.ok(rules(report).includes('SCAN_INCOMPLETE'));
  }
});
test('empty root is not described as a clean bill of health', async t => {
  const root = await fixture(t, {});
  assert.deepEqual(rules(await scan(root)), ['NO_SKILLS']);
});
test('stable reports and no document mutation', async t => {
  const root = await fixture(t, { 'SKILL.md': valid('example', '[missing](./absent.md)') });
  const before = await readFile(path.join(root, 'SKILL.md'));
  assert.deepEqual(await scan(root), await scan(root));
  assert.deepEqual(await readFile(path.join(root, 'SKILL.md')), before);
});
test('invalid portable name warns rather than inventing host rules', async t => {
  const root = await fixture(t, { 'SKILL.md': valid('MixedCase') });
  assert.ok(rules(await scan(root)).includes('NAME_FORMAT'));
});
test('metadata comments do not disguise empty or non-string values', () => {
  for (const value of ['true # note', '42 # note']) assert.equal(metadata(`---\nname: x\ndescription: ${value}\n---`).unsupported, true);
  assert.equal(metadata('---\nname: x\ndescription: # note\n---').fields.description, '');
});
test('symbolic link ancestors of the root are rejected', async t => {
  const outside = await fixture(t, { 'sub/SKILL.md': valid() });
  const holder = await fixture(t, {});
  try { await symlink(outside, path.join(holder, 'alias'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (e) { if (['EPERM', 'EACCES'].includes(e.code)) { t.skip('OS does not permit test symlinks'); return; } throw e; }
  await assert.rejects(scan(path.join(holder, 'alias', 'sub')), /symbolic links/);
});
test('metadata link examples are not interpreted as body references', async t => {
  const root = await fixture(t, { 'SKILL.md': '---\nname: example\ndescription: "Checks [examples](./not-a-required-file.md)"\n---\n[actual](./missing.md)\n' });
  const report = await scan(root);
  assert.deepEqual(rules(report), ['REFERENCE_MISSING']);
  assert.equal(report.findings[0].line, 5);
  assert.match(report.findings[0].evidence, /missing.md/);
});
test('bundled script works when only the skill directory is installed', async t => {
  const root = await fixture(t, { 'target/SKILL.md': valid() });
  await cp(path.resolve('skills/skill-lens'), path.join(root, 'installed'), { recursive: true });
  assert.equal(await readFile(path.join(root, 'installed/LICENSE'), 'utf8'), await readFile(path.resolve('LICENSE'), 'utf8'));
  const result = spawnSync(process.execPath, [path.join(root, 'installed/scripts/check.mjs'), path.join(root, 'target'), '--json'], { encoding: 'utf8', cwd: root });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).coverage.skills, 1);
});
test('repository demonstrations retain their documented findings', async () => {
  const good = await scan(path.resolve('examples/healthy'));
  assert.deepEqual(good.counts, { error: 0, warning: 0, info: 0 });
  const broken = await scan(path.resolve('examples/broken'));
  assert.deepEqual(rules(broken), ['NAME_COLLISION', 'REFERENCE_MISSING', 'METADATA_MISSING']);
  assert.equal(exitCode(broken), 1);
});
test('SkillLens package, skill identifier and CLI branding stay aligned', async () => {
  const pkg = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'));
  assert.equal(pkg.name, 'skill-lens');
  const report = await scan(path.resolve('skills'));
  assert.deepEqual(report.skills.map(skill => skill.name), ['skill-lens']);
  const result = spawnSync(process.execPath, [script, path.resolve('examples/healthy')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^SkillLens — /);
});
test('CLI JSON, help, usage, failure and exit status', async t => {
  const root = await fixture(t, { 'SKILL.md': '# no metadata' });
  const run = args => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const result = run([root, '--json']);
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).schemaVersion, 1);
  assert.equal(result.stderr, '');
  assert.equal(run(['--help']).status, 0);
  assert.equal(run([]).status, 2);
  assert.equal(JSON.parse(run(['--json']).stdout).failure.code, 'USAGE');
  assert.equal(run([path.join(root, 'does-not-exist')]).status, 2);
});
