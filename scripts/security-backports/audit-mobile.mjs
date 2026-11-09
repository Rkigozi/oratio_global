import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { ROOT, verifyForgeBackport } from './forge-backport.mjs';
import { evaluateMobileAudit } from './mobile-audit-policy.mjs';

try {
  // Keep --release compatible; both commands now enforce the same strict gate.
  parseArgs({ options: { release: { type: 'boolean' } } });
  const verified = verifyForgeBackport();
  if (!verified.includes('node_modules/node-forge'))
    throw new Error('Expected verified Expo signing dependency source');
  const result = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['audit', '-w', '@oratio/mobile', '--omit=dev', '--audit-level=high', '--json'],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000, maxBuffer: 10_000_000 }
  );
  if (result.error || ![0, 1].includes(result.status))
    throw new Error('npm audit failed to complete');
  const report = JSON.parse(result.stdout);
  const verdict = evaluateMobileAudit(report);
  console.log(
    `Raw mobile audit: ${verdict.counts.high} high, ${verdict.counts.critical} critical, ${verdict.counts.moderate} moderate, ${verdict.counts.low} low, ${verdict.counts.info} informational affected-package entries.`
  );
  console.log('Unfiltered affected-package findings:');
  for (const [name, finding] of Object.entries(report.vulnerabilities)) {
    console.log(`${name}: ${finding.severity}`);
  }
  for (const finding of verdict.blocked) {
    if (finding.reportedSeverity)
      console.log(
        `${finding.name}: assessed as ${finding.severity} from its advisory chain (npm reports ${finding.reportedSeverity}).`
      );
    console.log(`${finding.name}: BLOCKED - ${finding.reason}`);
  }
  console.log('Moderate findings remain reported and require their separate release review.');
  console.log(
    verdict.passed
      ? 'Strict mobile high/critical gate passed; no exceptions applied.'
      : 'Mobile security gate failed.'
  );
  process.exitCode = verdict.passed ? 0 : 1;
} catch (error) {
  console.error(`Mobile security gate failed: ${error.message}`);
  process.exitCode = 1;
}
