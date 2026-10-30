#!/usr/bin/env node
import { readdir, lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

export const LIMITS = Object.freeze({ directories: 2000, files: 10000, depth: 16, documentBytes: 262144, totalBytes: 8388608 });
const EXCLUDED = new Set(['.git', 'node_modules', '.venv', 'venv']);
const slash = value => value.split(path.sep).join('/');
const inside = (root, candidate) => { const rel = path.relative(root, candidate); return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel)); };

// Intentionally NOT a YAML parser. Unknown syntax produces unknown coverage,
// never a guessed name or an invalid-YAML accusation.
export function metadata(text) {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  if (lines[0] !== '---') return { missing: true, fields: {}, unsupported: false };
  const end = lines.indexOf('---', 1);
  if (end < 0) return { unclosed: true, fields: {}, unsupported: false };
  const fields = {};
  let unsupported = false;
  const seen = new Set();
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const match = /^([A-Za-z][\w-]*):(?:\s+(.*)|\s*)$/.exec(line);
    if (!match) { unsupported = true; continue; }
    const [, key, raw = ''] = match;
    if (seen.has(key)) unsupported = true;
    seen.add(key);
    // Other fields may have nested YAML; do not interpret them.
    if (!['name', 'description'].includes(key)) {
      while (i + 1 < end && /^\s+/.test(lines[i + 1])) i++;
      continue;
    }
    let value = raw.trim();
    if (/^[|>][-+]?$/.test(value)) {
      const block = [];
      while (i + 1 < end && (/^\s+/.test(lines[i + 1]) || !lines[i + 1].trim())) block.push(lines[++i].trim());
      value = block.join(' ').trim();
    } else if (value.startsWith('"')) {
      try { value = JSON.parse(value); } catch { unsupported = true; continue; }
      if (typeof value !== 'string') { unsupported = true; continue; }
    } else if (value.startsWith("'")) {
      if (!/^'(?:[^']|'')*'$/.test(value)) { unsupported = true; continue; }
      value = value.slice(1, -1).replace(/''/g, "'");
    } else {
      value = value.replace(/(?:^|\s+)#.*$/, '').trim();
      if (/^[\[\]{},&*!>|%@`]/.test(value) || /:\s/.test(value) || /^(?:null|true|false|~|[-+]?\d+(?:\.\d+)?)$/i.test(value)) { unsupported = true; continue; }
    }
    fields[key] = value;
  }
  return { fields, unsupported, body: lines.slice(end + 1).join('\n'), bodyOffset: end + 1 };
}

function withoutCode(text) {
  let fence = null;
  return text.split('\n').map(line => {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (m) {
      if (!fence) fence = m[1];
      else if (m[1][0] === fence[0] && m[1].length >= fence.length) fence = null;
      return '';
    }
    return fence ? '' : line.replace(/(`+)[^`]*?\1/g, '');
  }).join('\n');
}

export async function scan(input, limits = LIMITS) {
  const supplied = path.resolve(input);
  let ancestor = path.parse(supplied).root;
  for (const part of path.relative(ancestor, supplied).split(path.sep).filter(Boolean)) {
    ancestor = path.join(ancestor, part);
    if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Scan root must be a real directory; symbolic links in its path are not allowed.');
  }
  const rootStat = await lstat(supplied);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Scan root must be a real directory, not a file or symbolic link.');
  const root = await realpath(supplied);
  const findings = [];
  const entries = [];
  let complete = true, directories = 0, files = 0, bytes = 0;
  const add = (rule, severity, file, evidence, suggestion, line) => findings.push({ rule, severity, file, ...(line ? { line } : {}), evidence, suggestion });
  const incomplete = (file, evidence) => { complete = false; add('SCAN_INCOMPLETE', 'warning', file, evidence, 'Narrow the scan scope or resolve the access/size issue, then scan again.'); };
  async function walk(dir, depth) {
    if (depth > limits.depth || ++directories > limits.directories) { incomplete(slash(path.relative(root, dir)) || '.', 'Directory/depth limit reached.'); return; }
    const children = await readdir(dir, { withFileTypes: true });
    children.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
    for (const child of children) {
      const absolute = path.join(dir, child.name);
      const relative = slash(path.relative(root, absolute));
      if (child.isSymbolicLink()) { add('SYMLINK_SKIPPED', 'info', relative, 'Symbolic link was not followed.', 'Inspect its target separately only if you trust and authorize it.'); continue; }
      if (child.isDirectory()) {
        if (EXCLUDED.has(child.name)) continue;
        if (directories >= limits.directories) { incomplete(relative, 'Directory limit reached; remaining siblings skipped.'); break; }
        try { await walk(absolute, depth + 1); } catch (error) { incomplete(relative, `Cannot inspect directory (${error.code || 'read error'}).`); }
      } else if (child.isFile()) {
        if (++files > limits.files) { incomplete(relative, 'File limit reached.'); return; }
        if (child.name === 'SKILL.md') entries.push({ absolute, relative });
      }
    }
  }
  await walk(root, 0);
  const skills = [];
  for (const entry of entries) {
    try {
      // Recheck the entry before reading; a running scan is not a sandbox
      // against concurrent hostile filesystem mutation.
      const st = await lstat(entry.absolute);
      if (!st.isFile() || st.isSymbolicLink()) { incomplete(entry.relative, 'Entry changed during scan.'); continue; }
      if (st.size > limits.documentBytes || bytes + st.size > limits.totalBytes) { incomplete(entry.relative, 'Document or total byte limit reached.'); continue; }
      const buffer = await readFile(entry.absolute);
      bytes += buffer.length;
      if (buffer.length > limits.documentBytes || bytes > limits.totalBytes) { incomplete(entry.relative, 'Document grew beyond byte limit.'); continue; }
      const text = buffer.toString('utf8').replace(/\r\n/g, '\n');
      const meta = metadata(text);
      let name = null;
      if (meta.missing || meta.unclosed) {
        add('METADATA_MISSING', 'error', entry.relative, meta.unclosed ? 'Opening frontmatter delimiter has no closing delimiter.' : 'No frontmatter beginning with --- on the first line.', 'Add delimited frontmatter with name and description.', 1);
      } else if (meta.unsupported) {
        add('METADATA_UNVERIFIED', 'warning', entry.relative, 'Metadata uses syntax outside the built-in scalar subset; name/description checks skipped.', 'Review manually; this is not a claim that the YAML is invalid.', 1);
      } else {
        for (const field of ['name', 'description']) if (!meta.fields[field]?.trim()) add('METADATA_REQUIRED', 'error', entry.relative, `Missing or empty ${field}.`, `Provide a non-empty ${field} string.`, 1);
        if (meta.fields.name) {
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.fields.name) || meta.fields.name.length > 64) add('NAME_FORMAT', 'warning', entry.relative, `Name ${JSON.stringify(meta.fields.name)} is outside the portable lowercase-hyphen convention (max 64 characters).`, 'Check the target host requirements; rename only with permission.', 1);
          name = meta.fields.name;
        }
      }
      const digest = createHash('sha256').update(text).digest('hex');
      skills.push({ file: entry.relative, name, sha256: digest });
      const prose = withoutCode(meta.body !== undefined ? '\n'.repeat(meta.bodyOffset) + meta.body : text);
      // Conservative subset: inline Markdown destinations beginning ./ or ../.
      // Reference links, HTML, bare paths and paths containing parentheses are not interpreted.
      const links = /!?\[[^\]\n]*\]\(\s*(<[^>\n]+>|[^\s()]+)(?:\s+"[^"\n]*")?\s*\)/g;
      for (const match of prose.matchAll(links)) {
        let target = match[1].replace(/^<|>$/g, '');
        if (!/^\.\.?\//.test(target)) continue;
        target = target.split(/[?#]/)[0];
        try { target = decodeURIComponent(target); } catch { continue; }
        if (target.includes('\0') || target.includes('\\') || path.isAbsolute(target)) continue;
        const resolved = path.resolve(path.dirname(entry.absolute), target);
        const line = prose.slice(0, match.index).split('\n').length;
        if (!inside(root, resolved)) { add('REFERENCE_OUT_OF_SCOPE', 'info', entry.relative, `Reference ${JSON.stringify(target)} leaves the authorized root; not checked.`, 'Authorize its containing directory separately if needed.', line); continue; }
        const parts = path.relative(root, resolved).split(path.sep).filter(Boolean);
        let cursor = root, skipped = false;
        try {
          for (const part of parts) {
            cursor = path.join(cursor, part);
            const stat = await lstat(cursor);
            if (stat.isSymbolicLink()) { add('REFERENCE_SYMLINK_SKIPPED', 'info', entry.relative, `Reference ${JSON.stringify(target)} traverses a symbolic link; not followed.`, 'Review the target separately if authorized.', line); skipped = true; break; }
          }
        } catch (error) {
          if (error.code === 'ENOENT' || error.code === 'ENOTDIR') add('REFERENCE_MISSING', 'warning', entry.relative, `Local Markdown destination ${JSON.stringify(target)} does not exist.`, 'Check whether the link is required, optional, or stale before changing it.', line);
          else { incomplete(entry.relative, `Cannot inspect reference ${JSON.stringify(target)} (${error.code || 'read error'}).`); }
        }
        if (skipped) continue;
      }
    } catch (error) { incomplete(entry.relative, `Cannot read skill (${error.code || 'read error'}).`); }
  }
  const names = new Map(), hashes = new Map();
  for (const skill of skills) {
    if (skill.name) { const group = names.get(skill.name) || []; group.push(skill.file); names.set(skill.name, group); }
    const group = hashes.get(skill.sha256) || []; group.push(skill.file); hashes.set(skill.sha256, group);
  }
  for (const [name, group] of names) if (group.length > 1) add('NAME_COLLISION', 'warning', group[0], `Name ${JSON.stringify(name)} appears in: ${group.join(', ')}.`, 'Review all copies. No host loading order or override behavior is inferred.');
  for (const group of hashes.values()) if (group.length > 1) add('DUPLICATE_CONTENT', 'info', group[0], `Identical LF-normalized entry files: ${group.join(', ')}.`, 'These are not proven duplicate packages: supporting files may differ.');
  if (!skills.length) add('NO_SKILLS', 'info', '.', 'No readable SKILL.md entries were analyzed.', 'Choose a directory containing installed skills; this is not a clean bill of health.');
  findings.sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : a.rule < b.rule ? -1 : a.rule > b.rule ? 1 : (a.line || 0) - (b.line || 0));
  const counts = { error: 0, warning: 0, info: 0 };
  for (const finding of findings) counts[finding.severity]++;
  return { schemaVersion: 1, root, profile: 'portable-static', coverage: { complete, skills: skills.length, directories, files, bytes, excludedDirectories: [...EXCLUDED], limitations: ['No host discovery or precedence inference.', 'Metadata parser supports a limited scalar subset, not full YAML.', 'Only inline Markdown destinations starting ./ or ../ are checked.', 'No reference links, HTML, command dependency checks or semantic conflict proof.', 'No files other than discovered SKILL.md entries are read as document content.', 'Symbolic links are not followed. Not hardened against concurrent filesystem mutation.'] }, counts, skills, findings };
}

export function exitCode(report) { return !report.coverage.complete ? 2 : report.counts.error ? 1 : 0; }
export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) {
    console.log('Usage: node check.mjs <directory> [--json]\nRead-only static skill checks. Exit: 0 no errors (warnings possible), 1 errors, 2 failed/incomplete scan.'); return 0;
  }
  const json = args.includes('--json');
  const positional = args.filter(arg => arg !== '--json');
  if (positional.length !== 1 || positional[0].startsWith('-') || args.filter(arg => arg === '--json').length > 1) {
    const message = 'Usage: node check.mjs <directory> [--json]';
    if (json) console.log(JSON.stringify({ schemaVersion: 1, failure: { code: 'USAGE', message } }, null, 2)); else console.error(message);
    return 2;
  }
  try {
    const report = await scan(positional[0]);
    if (json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`SkillLens — ${report.root}\nProfile: ${report.profile}; coverage: ${report.coverage.complete ? 'complete within documented scope' : 'INCOMPLETE'}\n${report.coverage.skills} skill(s), ${report.counts.error} error(s), ${report.counts.warning} warning(s), ${report.counts.info} info`);
      for (const f of report.findings) console.log(`\n[${f.severity}] ${f.rule} ${f.file}${f.line ? `:${f.line}` : ''}\n  ${f.evidence}\n  Next: ${f.suggestion}`);
      console.log('\nNot a security certification. Run --json for coverage limitations.');
    }
    return exitCode(report);
  } catch (error) {
    const failure = { code: error.code || 'SCAN_FAILED', message: error.message };
    if (json) console.log(JSON.stringify({ schemaVersion: 1, failure }, null, 2)); else console.error(`Scan failed: ${failure.message}`);
    return 2;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();
