import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateMobileAudit } from './mobile-audit-policy.mjs';

const policy = JSON.parse(
  readFileSync(new URL('./mobile-audit-exceptions.json', import.meta.url), 'utf8')
);
const versions = Object.assign({}, ...Object.values(policy.packages));
const braceUrl = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
const forgeUrl = 'https://github.com/advisories/GHSA-86w9-cpqp-85rv';
const advisory = (name, url, severity = 'high') => ({ name, url, severity });
const entry = (name, via, severity = 'high') => ({
  name,
  via,
  severity,
  nodes: [`node_modules/${name}`],
});
function report() {
  return update({
    auditReportVersion: 2,
    vulnerabilities: {
      braces: entry('braces', [advisory('braces', braceUrl)]),
      'node-forge': entry('node-forge', [advisory('node-forge', forgeUrl)]),
      metro: entry('metro', ['metro-config', 'metro-file-map']),
      'metro-config': entry('metro-config', ['metro']),
      'metro-file-map': entry('metro-file-map', ['braces']),
    },
    metadata: {},
  });
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
function evaluate(result = report(), options = {}) {
  return evaluateMobileAudit(result, {
    policy: structuredClone(policy),
    versions: { ...versions },
    forgeVerified: true,
    now: new Date('2026-10-14T12:00:00Z'),
    ...options,
  });
}

test('only the reviewed packages and advisory paths qualify, including real Metro cycles', () => {
  const verdict = evaluate();
  assert.equal(verdict.passed, true);
  assert.equal(verdict.accepted.length, 5);
  assert.equal(verdict.counts.high, 5);
});

test('new high advisory inside an already reviewed package fails', () => {
  const result = report();
  result.vulnerabilities.braces.via.push(
    advisory('braces', 'https://github.com/advisories/GHSA-new1-new2-new3')
  );
  assert.equal(evaluate(result).passed, false);
});

test('all critical findings fail, including a formerly approved advisory elevated to critical', () => {
  const result = report();
  result.vulnerabilities.braces.severity = 'critical';
  result.vulnerabilities.braces.via[0].severity = 'critical';
  assert.equal(evaluate(update(result)).passed, false);
});

test('a new parent package cannot inherit the exception', () => {
  const result = report();
  result.vulnerabilities.unreviewed = entry('unreviewed', ['braces']);
  assert.equal(evaluate(update(result)).passed, false);
});

test('changed versions, new install paths and missing paths fail', () => {
  assert.equal(
    evaluate(report(), { versions: { ...versions, 'node_modules/braces': '3.0.4' } }).passed,
    false
  );
  const result = report();
  result.vulnerabilities.braces.nodes = ['node_modules/example/node_modules/braces'];
  assert.equal(evaluate(result).passed, false);
  delete result.vulnerabilities.braces.nodes;
  assert.equal(evaluate(result).passed, false);
});

test('exception expires exactly at the deadline and cannot activate before approval', () => {
  assert.equal(evaluate(report(), { now: new Date(policy.expiresAt) }).passed, false);
  assert.equal(evaluate(report(), { now: new Date('2026-11-14T00:00:00Z') }).passed, false);
  assert.equal(evaluate(report(), { now: new Date('2026-10-13T23:59:59Z') }).passed, false);
});

test('release mode and absent verified source never use the exception', () => {
  assert.equal(evaluate(report(), { release: true }).passed, false);
  assert.equal(evaluate(report(), { forgeVerified: false }).passed, false);
});

test('network/error reports, count mismatches and unknown severities fail closed', () => {
  assert.throws(() => evaluate({ error: { code: 'ENOTFOUND' } }), /complete supported report/);
  const result = report();
  result.metadata.vulnerabilities.high = 0;
  assert.throws(() => evaluate(result), /counts do not match/);
  result.vulnerabilities.braces.severity = 'unknown';
  assert.throws(() => evaluate(result), /Unknown audit severity/);
});

test('dangling dependency paths and cycles without an advisory leaf fail', () => {
  const result = report();
  result.vulnerabilities.braces.via = ['missing'];
  assert.equal(evaluate(result).passed, false);
  result.vulnerabilities.braces.via = ['braces'];
  assert.equal(evaluate(result).passed, false);
});

test('invalid dates, longer approvals and a third advisory rule are rejected', () => {
  assert.throws(
    () => evaluate(report(), { now: new Date('invalid') }),
    /Invalid audit policy date/
  );
  const changed = structuredClone(policy);
  changed.expiresAt = '2026-12-14T00:00:00Z';
  assert.throws(() => evaluate(report(), { policy: changed }), /30-day bound/);
  changed.expiresAt = policy.expiresAt;
  changed.advisories['https://github.com/advisories/GHSA-new1-new2-new3'] = { package: 'braces' };
  assert.throws(() => evaluate(report(), { policy: changed }), /Unapproved advisory/);
});

test('moderate findings stay visible, without being silently removed or waived', () => {
  const result = report();
  result.vulnerabilities.example = entry(
    'example',
    [advisory('example', 'https://github.com/advisories/GHSA-mod1-mod2-mod3', 'moderate')],
    'moderate'
  );
  const verdict = evaluate(update(result));
  assert.equal(verdict.passed, true);
  assert.equal(verdict.counts.moderate, 1);
  assert.equal(Object.keys(result.vulnerabilities).length, 6);
});

test('a falsely downgraded report cannot hide a critical advisory', () => {
  const result = report();
  result.vulnerabilities.braces.severity = 'moderate';
  result.vulnerabilities.braces.via[0].severity = 'critical';
  assert.throws(() => evaluate(update(result)), /below its advisory severity/);
});

test('prototype property names cannot qualify as an approved advisory URL', () => {
  for (const url of ['constructor', '__proto__', 'toString']) {
    const result = report();
    result.vulnerabilities.braces.via = [advisory('braces', url)];
    assert.equal(evaluate(result).passed, false);
  }
});

test('malformed advisory identities fail instead of inheriting a rule', () => {
  const result = report();
  delete result.vulnerabilities.braces.via[0].name;
  assert.equal(evaluate(result).passed, false);
});
