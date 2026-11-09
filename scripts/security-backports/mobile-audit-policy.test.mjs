import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateMobileAudit } from './mobile-audit-policy.mjs';

const zodUrl = 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5';
const advisory = (name, severity = 'high') => ({
  name,
  url: name === 'zod' ? zodUrl : 'https://github.com/advisories/GHSA-test-test-test',
  severity,
});
const entry = (name, via, severity = 'high') => ({
  name,
  via,
  severity,
  nodes: [name === 'zod' ? 'node_modules/@expo/cli/node_modules/zod' : `node_modules/${name}`],
});
function report(vulnerabilities = {}) {
  return update({ auditReportVersion: 2, vulnerabilities, metadata: {} });
}
function update(result) {
  const counts = { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 };
  for (const finding of Object.values(result.vulnerabilities)) {
    counts[finding.severity]++;
    counts.total++;
  }
  result.metadata.vulnerabilities = counts;
  return result;
}
function zodReport() {
  return report({
    zod: entry('zod', [advisory('zod')]),
    '@expo/cli': entry('@expo/cli', ['expo', 'zod']),
    expo: entry('expo', ['@expo/cli']),
  });
}

test('an empty complete audit passes without approvals', () => {
  assert.deepEqual(evaluateMobileAudit(report()), {
    passed: true,
    blocked: [],
    counts: { info: 0, low: 0, moderate: 0, high: 0, critical: 0, total: 0 },
  });
});

test('low and moderate findings remain visible and unchanged for release review', () => {
  const input = report({
    low: entry('low', [advisory('low', 'low')], 'low'),
    moderate: entry('moderate', [advisory('moderate', 'moderate')], 'moderate'),
  });
  const original = structuredClone(input);
  const verdict = evaluateMobileAudit(input);
  assert.equal(verdict.passed, true);
  assert.equal(verdict.counts.low, 1);
  assert.equal(verdict.counts.moderate, 1);
  assert.deepEqual(input, original);
});

test('the formerly approved advisory and all propagated parents are blocked', () => {
  const verdict = evaluateMobileAudit(zodReport());
  assert.equal(verdict.passed, false);
  assert.deepEqual(verdict.blocked.map((finding) => finding.name).sort(), [
    '@expo/cli',
    'expo',
    'zod',
  ]);
  assert.ok(verdict.blocked.every((finding) => finding.severity === 'high'));
});

test('archived approval inputs, dates and release flags cannot activate an exception', () => {
  const policy = JSON.parse(
    readFileSync(new URL('./approval-history/2026-10-30.json', import.meta.url), 'utf8')
  );
  const versions = Object.assign({}, ...Object.values(policy.packages));
  for (const release of [false, true]) {
    for (const now of ['2026-10-30T12:00:00Z', '2026-11-13T00:00:00Z']) {
      const verdict = evaluateMobileAudit(zodReport(), {
        policy,
        versions,
        forgeVerified: true,
        now: new Date(now),
        release,
      });
      assert.equal(verdict.passed, false);
      assert.equal(verdict.blocked.length, 3);
    }
  }
});

test('a lower-labelled parent receives the full high-advisory assessment', () => {
  const input = zodReport();
  input.vulnerabilities.expo.severity = 'moderate';
  update(input);
  const original = structuredClone(input);
  const verdict = evaluateMobileAudit(input);
  assert.equal(verdict.passed, false);
  assert.equal(verdict.blocked.length, 3);
  assert.deepEqual(
    verdict.blocked.find((finding) => finding.name === 'expo'),
    {
      name: 'expo',
      severity: 'high',
      reportedSeverity: 'moderate',
      reason: 'High and critical findings are blocked; no active exceptions',
    }
  );
  assert.equal(verdict.counts.high, 2);
  assert.equal(verdict.counts.moderate, 1);
  assert.deepEqual(input, original);
});

test('critical advisories cannot be hidden by lower package labels', () => {
  const input = report({ zod: entry('zod', [advisory('zod', 'critical')], 'moderate') });
  const verdict = evaluateMobileAudit(input);
  assert.equal(verdict.passed, false);
  assert.equal(verdict.blocked[0].severity, 'critical');
  assert.equal(verdict.counts.critical, 0);
  assert.equal(verdict.counts.moderate, 1);
});

test('new high findings and conservatively high package labels are blocked', () => {
  for (const severity of ['high', 'moderate']) {
    const input = report({ example: entry('example', [advisory('example', severity)]) });
    assert.equal(evaluateMobileAudit(input).passed, false);
  }
});

test('incomplete, failed and unsupported reports fail closed', () => {
  for (const input of [
    null,
    {},
    { error: { code: 'ENOTFOUND' } },
    { ...report(), auditReportVersion: 1 },
    { ...report(), vulnerabilities: [] },
  ]) {
    assert.throws(() => evaluateMobileAudit(input), /complete supported report/);
  }
});

test('severity and total count mismatches fail closed', () => {
  for (const severity of ['info', 'low', 'moderate', 'high', 'critical', 'total']) {
    const input = zodReport();
    input.metadata.vulnerabilities[severity]++;
    assert.throws(() => evaluateMobileAudit(input), /counts do not match/);
  }
});

test('unknown severities and malformed finding/advisory fields fail closed', () => {
  for (const change of [
    (input) => {
      input.vulnerabilities.zod.severity = 'unknown';
    },
    (input) => {
      input.vulnerabilities.zod.name = 'different';
    },
    (input) => {
      input.vulnerabilities.zod.nodes = [];
    },
    (input) => {
      input.vulnerabilities.zod.nodes = [null];
    },
    (input) => {
      input.vulnerabilities.zod.via = [];
    },
    (input) => {
      input.vulnerabilities.zod.via = [null];
    },
    (input) => {
      input.vulnerabilities.zod.via[0].severity = 'unknown';
    },
    (input) => {
      input.vulnerabilities.zod.via[0].name = '';
    },
    (input) => {
      input.vulnerabilities.zod.via[0].url = '';
    },
  ]) {
    const input = zodReport();
    change(input);
    assert.throws(() => evaluateMobileAudit(input));
  }
});

test('dangling, inherited and advisory-free cyclic paths fail closed', () => {
  for (const path of ['missing', 'constructor', '__proto__', 'zod']) {
    const input = report({ zod: entry('zod', [path]) });
    assert.throws(() => evaluateMobileAudit(input), /dependency path/);
  }
});

test('the retired approval record is preserved byte-for-byte', () => {
  const bytes = readFileSync(new URL('./approval-history/2026-10-30.json', import.meta.url));
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    '8cf296cbe913d3ef4648de00febd494e441e0b4edd4e22960bbb369ea6fc4dd9'
  );
});
