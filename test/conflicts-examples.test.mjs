import test from 'node:test';
import assert from 'node:assert/strict';
import { scan, exitCode } from '../skills/skill-lens/scripts/check.mjs';

// These assertions test packet generation, NOT the semantic gold verdict.
// The language pair deliberately has no opposing-directive rule hit.
for (const name of ['approval', 'conditional', 'language', 'overlap']) {
  test(`paired demonstration keeps full review evidence: ${name}`, async () => {
    const report = await scan(`examples/conflicts/${name}`, undefined, { conflicts: true });
    assert.deepEqual(report.counts, { error: 0, warning: 0, info: 0 });
    assert.equal(exitCode(report), 0);
    assert.equal(report.conflicts.coverage.complete, true);
    assert.equal(report.conflicts.review.sources.length, 2);
    assert.equal(report.conflicts.review.pairs.length, 1);
    assert.equal(report.conflicts.counts.pendingPairs, 1);
    assert.equal(report.conflicts.coverage.semanticReview, 'not_run');
    assert.equal(report.conflicts.counts.potentialInstructionConflicts, name === 'approval' ? 1 : 0);
    assert.equal(report.conflicts.counts.triggerOverlaps, 1);
    assert.ok(report.conflicts.review.sources.every(source => !source.truncated && source.lines.length >= 6));
  });
}
