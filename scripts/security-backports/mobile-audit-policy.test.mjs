import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { evaluateMobileAudit } from './mobile-audit-policy.mjs';

const policy = JSON.parse(
  readFileSync(new URL('./mobile-audit-exceptions.json', import.meta.url), 'utf8')
);
const versions = Object.assign({}, ...Object.values(policy.packages));
const zodUrl = 'https://github.com/advisories/GHSA-mrhx-c7xc-m3w5';
const advisory = (name, url, severity = 'high') => ({ name, url, severity });
const entry = (name, via, severity = 'high') => ({
  name,
  via,
  severity,
  nodes: [name === 'zod' ? 'node_modules/@expo/cli/node_modules/zod' : `node_modules/${name}`],
});
function report() {
  return update({
    auditReportVersion: 2,
    vulnerabilities: {
      zod: entry('zod', [advisory('zod', zodUrl)]),
      '@expo/cli': entry('@expo/cli', ['expo', 'zod']),
      expo: entry('expo', ['@expo/cli']),
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
    now: new Date('2026-10-30T12:00:00Z'),
    ...options,
  });
}

test('only the reviewed Zod parents and advisory qualify, including dependency cycles', () => {
  const verdict = evaluate();
  assert.equal(verdict.passed, true);
  assert.equal(verdict.accepted.length, 3);
  assert.equal(verdict.counts.high, 3);
});

test('new high advisory inside an already reviewed package fails', () => {
  const result = report();
  result.vulnerabilities.zod.via.push(
    advisory('zod', 'https://github.com/advisories/GHSA-new1-new2-new3')
  );
  assert.equal(evaluate(result).passed, false);
});

test('all critical findings fail, including a formerly approved advisory elevated to critical', () => {
  const result = report();
  result.vulnerabilities.zod.severity = 'critical';
  result.vulnerabilities.zod.via[0].severity = 'critical';
  assert.equal(evaluate(update(result)).passed, false);
});

test('a new parent package cannot inherit the exception', () => {
  const result = report();
  result.vulnerabilities.unreviewed = entry('unreviewed', ['zod']);
  assert.equal(evaluate(update(result)).passed, false);
});

test('changed versions, new install paths and missing paths fail', () => {
  for (const path of Object.keys(versions)) {
    assert.equal(evaluate(report(), { versions: { ...versions, [path]: '0.0.0' } }).passed, false);
  }
  const result = report();
  result.vulnerabilities.zod.nodes = ['node_modules/zod'];
  assert.equal(evaluate(result).passed, false);
  delete result.vulnerabilities.zod.nodes;
  assert.equal(evaluate(result).passed, false);
});

test('exception expires exactly at the deadline and cannot activate before approval', () => {
  assert.equal(evaluate(report(), { now: new Date(policy.expiresAt) }).passed, false);
  assert.equal(evaluate(report(), { now: new Date('2026-11-14T00:00:00Z') }).passed, false);
  assert.equal(evaluate(report(), { now: new Date('2026-10-29T23:59:59Z') }).passed, false);
  assert.equal(evaluate(report(), { now: new Date('2026-11-12T23:59:59Z') }).passed, true);
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
  result.vulnerabilities.zod.severity = 'unknown';
  assert.throws(() => evaluate(result), /Unknown audit severity/);
});

test('dangling dependency paths and cycles without an advisory leaf fail', () => {
  const result = report();
  result.vulnerabilities.zod.via = ['missing'];
  assert.equal(evaluate(result).passed, false);
  result.vulnerabilities.zod.via = ['zod'];
  assert.equal(evaluate(result).passed, false);
});

test('invalid dates, longer approvals and an extra advisory rule are rejected', () => {
  assert.throws(
    () => evaluate(report(), { now: new Date('invalid') }),
    /Invalid audit policy date/
  );
  const changed = structuredClone(policy);
  changed.expiresAt = '2026-12-14T00:00:00Z';
  assert.throws(() => evaluate(report(), { policy: changed }), /30-day bound/);
  changed.expiresAt = policy.expiresAt;
  changed.advisories['https://github.com/advisories/GHSA-new1-new2-new3'] = { package: 'zod' };
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
  assert.equal(Object.keys(result.vulnerabilities).length, 4);
});

test('a falsely downgraded report cannot hide a critical advisory', () => {
  const result = report();
  result.vulnerabilities.zod.severity = 'moderate';
  result.vulnerabilities.zod.via[0].severity = 'critical';
  assert.throws(() => evaluate(update(result)), /below its advisory severity/);
});

test('prototype property names cannot qualify as an approved advisory URL', () => {
  for (const url of ['constructor', '__proto__', 'toString']) {
    const result = report();
    result.vulnerabilities.zod.via = [advisory('zod', url)];
    assert.equal(evaluate(result).passed, false);
  }
});

test('malformed advisory identities fail instead of inheriting a rule', () => {
  const result = report();
  delete result.vulnerabilities.zod.via[0].name;
  assert.equal(evaluate(result).passed, false);
});

test('the replaced Forge and braces approvals cannot accept new findings', () => {
  for (const [name, url] of [
    ['braces', 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm'],
    ['node-forge', 'https://github.com/advisories/GHSA-86w9-cpqp-85rv'],
  ]) {
    const result = report();
    result.vulnerabilities[name] = entry(name, [advisory(name, url)]);
    assert.equal(evaluate(update(result)).passed, false);
  }
  const historical = JSON.parse(
    readFileSync(new URL('./approval-history/2026-10-14.json', import.meta.url), 'utf8')
  );
  assert.throws(() => evaluate(report(), { policy: historical }), /Invalid temporary audit policy/);
});

test('the approval window cannot be moved or extended even within the 30-day maximum', () => {
  for (const changes of [
    { expiresAt: '2026-11-14T00:00:00Z' },
    { approvedAt: '2026-10-29T00:00:00Z' },
  ]) {
    assert.throws(
      () => evaluate(report(), { policy: { ...structuredClone(policy), ...changes } }),
      /reviewed window/
    );
  }
});

test('editing the configured versions or adding approved paths cannot expand the exception', () => {
  for (const change of [
    (p) => {
      p.packages.zod['node_modules/@expo/cli/node_modules/zod'] = '3.25.77';
    },
    (p) => {
      p.packages.zod['node_modules/zod'] = '3.25.76';
    },
    (p) => {
      p.packages.unreviewed = { 'node_modules/unreviewed': '1.0.0' };
    },
    (p) => {
      delete p.packages.expo;
    },
  ]) {
    const changed = structuredClone(policy);
    change(changed);
    assert.throws(() => evaluate(report(), { policy: changed }), /Unapproved package/);
  }
});

test('the approved URL cannot be reused for a different advisory package', () => {
  const changed = structuredClone(policy);
  changed.advisories[zodUrl].package = 'example';
  assert.throws(() => evaluate(report(), { policy: changed }), /Unapproved advisory/);
  const result = report();
  result.vulnerabilities.zod.via[0].name = 'example';
  assert.equal(evaluate(result).passed, false);
});
