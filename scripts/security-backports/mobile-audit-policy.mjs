const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const rank = (severity) => severities.indexOf(severity);
const nonemptyString = (value) => typeof value === 'string' && value.trim().length > 0;

// Development and release use the same strict gate. Archived approvals are not
// inputs: no package, advisory, date or command flag can waive a high finding.
export function evaluateMobileAudit(report) {
  if (
    report?.error ||
    report?.auditReportVersion !== 2 ||
    !report.vulnerabilities ||
    typeof report.vulnerabilities !== 'object' ||
    Array.isArray(report.vulnerabilities) ||
    !report.metadata?.vulnerabilities
  ) {
    throw new Error('Dependency audit did not return a complete supported report');
  }

  const findings = report.vulnerabilities;
  const entries = Object.entries(findings);
  for (const [name, entry] of entries) {
    if (!entry || rank(entry.severity) < 0) throw new Error('Unknown audit severity');
    if (
      entry.name !== name ||
      !Array.isArray(entry.nodes) ||
      entry.nodes.length === 0 ||
      entry.nodes.some((path) => !nonemptyString(path)) ||
      !Array.isArray(entry.via) ||
      entry.via.length === 0
    ) {
      throw new Error('Incomplete audit finding');
    }
  }

  function roots(name, seen = new Set()) {
    if (!Object.hasOwn(findings, name)) throw new Error('Incomplete audit dependency path');
    if (seen.has(name)) return [];
    const next = new Set([...seen, name]);
    return findings[name].via.flatMap((via) => {
      if (typeof via === 'string') return roots(via, next);
      if (!via || !nonemptyString(via.name) || !nonemptyString(via.url) || rank(via.severity) < 0) {
        throw new Error('Incomplete advisory');
      }
      return [via];
    });
  }

  const blocked = [];
  for (const [name, entry] of entries) {
    const advisories = roots(name);
    if (advisories.length === 0) throw new Error('Audit dependency path has no advisory');
    const severity =
      severities[Math.max(rank(entry.severity), ...advisories.map((via) => rank(via.severity)))];
    if (rank(severity) >= rank('high')) {
      blocked.push({
        name,
        severity,
        ...(severity !== entry.severity ? { reportedSeverity: entry.severity } : {}),
        reason: 'High and critical findings are blocked; no active exceptions',
      });
    }
  }

  const counts = report.metadata.vulnerabilities;
  for (const severity of severities) {
    if (counts[severity] !== entries.filter(([, entry]) => entry.severity === severity).length)
      throw new Error('Audit counts do not match findings');
  }
  if (counts.total !== entries.length) throw new Error('Audit counts do not match findings');

  return { passed: blocked.length === 0, blocked, counts };
}
