import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT, verifyForgeBackport } from './forge-backport.mjs';
import { evaluateMobileAudit } from './mobile-audit-policy.mjs';

try {
  const { values } = parseArgs({ options: { release: { type: 'boolean' } } });
  const release = values.release === true;
  const verified = verifyForgeBackport();
  const policy = JSON.parse(
    readFileSync(new URL('./mobile-audit-exceptions.json', import.meta.url), 'utf8')
  );
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8'));
  const versions = {};
  for (const nodes of Object.values(policy.packages)) {
    for (const path of Object.keys(nodes)) {
      if (!path.startsWith('node_modules/') || path.split('/').includes('..'))
        throw new Error('Invalid approved package path');
      const pkg = JSON.parse(readFileSync(join(ROOT, path, 'package.json'), 'utf8'));
      if (pkg.version !== lock.packages[path]?.version)
        throw new Error('Installed version differs from the lockfile');
      versions[path] = pkg.version;
    }
  }
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['audit', '-w', '@oratio/mobile', '--omit=dev', '--audit-level=high', '--json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 10_000_000 }
  );
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('npm audit failed to complete; no exception applied');
  const report = JSON.parse(result.stdout);
  const verdict = evaluateMobileAudit(report, {
    policy,
    versions,
    forgeVerified: verified.includes('node_modules/node-forge'),
    release,
  });
  console.log(
    `Raw mobile audit: ${verdict.counts.high} high, ${verdict.counts.critical} critical, ${verdict.counts.moderate} moderate affected-package entries.`
  );
  console.log('Unfiltered affected-package findings:');
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    console.log(`${name}: ${finding.severity}`);
  }
  for (const finding of [...verdict.accepted, ...verdict.blocked]) {
    console.log(
      `${finding.name}: ${finding.reason ? `BLOCKED - ${finding.reason}` : 'KNOWN TOOLING FINDING - temporarily accepted for development review'}`
    );
  }
  if (verdict.accepted.length)
    console.log(
      `Owner-approved review exception expires ${verdict.expiresAt}. Findings remain reported; this is not public-release approval.`
    );
  console.log('Moderate findings remain reported and require their separate release review.');
  console.log(
    verdict.passed
      ? 'Mobile high/critical review gate passed under the recorded policy.'
      : 'Mobile security gate failed.'
  );
  process.exitCode = verdict.passed ? 0 : 1;
} catch (error) {
  console.error(`Mobile security gate failed: ${error.message}`);
  process.exitCode = 1;
}
