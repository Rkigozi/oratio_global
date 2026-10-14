export function evaluateMobileAudit(
  report,
  { policy, versions, forgeVerified, now = new Date(), release = false }
) {
  if (
    report?.error ||
    report?.auditReportVersion !== 2 ||
    !report.vulnerabilities ||
    !report.metadata?.vulnerabilities
  ) {
    throw new Error('Dependency audit did not return a complete supported report');
  }
  if (policy.schemaVersion !== 1 || policy.scope !== 'development-review-ci') {
    throw new Error('Invalid temporary audit policy');
  }
  const expiry = new Date(policy.expiresAt);
  const approved = new Date(policy.approvedAt);
  if (!Number.isFinite(+now) || !Number.isFinite(+expiry) || !Number.isFinite(+approved)) {
    throw new Error('Invalid audit policy date');
  }
  if (expiry <= approved || expiry - approved > 30 * 24 * 60 * 60 * 1000)
    throw new Error('Audit approval exceeds its 30-day bound');
  const allowed = [
    'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm',
    'https://github.com/advisories/GHSA-86w9-cpqp-85rv',
  ];
  if (
    Object.keys(policy.advisories).length !== 2 ||
    Object.keys(policy.advisories).some((url) => !allowed.includes(url))
  )
    throw new Error('Unapproved advisory exception');
  const active = !release && now >= approved && now < expiry && forgeVerified;
  const blocked = [];
  const accepted = [];

  function roots(name, seen = new Set()) {
    if (seen.has(name)) return [];
    const entry = report.vulnerabilities[name];
    if (!entry || !Array.isArray(entry.via) || entry.via.length === 0)
      throw new Error('Incomplete audit dependency path');
    const next = new Set([...seen, name]);
    return entry.via.flatMap((via) => {
      if (typeof via === 'string') return roots(via, next);
      if (
        !via ||
        typeof via.name !== 'string' ||
        typeof via.url !== 'string' ||
        !['info', 'low', 'moderate', 'high', 'critical'].includes(via.severity)
      )
        throw new Error('Incomplete advisory');
      return [via];
    });
  }

  for (const [name, entry] of Object.entries(report.vulnerabilities)) {
    if (!['info', 'low', 'moderate', 'high', 'critical'].includes(entry.severity))
      throw new Error('Unknown audit severity');
    const ranks = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };
    if (!['high', 'critical'].includes(entry.severity)) {
      if (roots(name).some((via) => ranks[via.severity] > ranks[entry.severity]))
        throw new Error('Audit severity is below its advisory severity');
    }
    if (!['high', 'critical'].includes(entry.severity)) continue;
    let reason = active
      ? ''
      : 'Release mode, expired/inactive approval, or missing verified backport';
    if (entry.severity === 'critical') reason = 'Critical findings never qualify for the exception';
    const approvedNodes = Object.hasOwn(policy.packages, name) ? policy.packages[name] : null;
    if (
      !approvedNodes ||
      !Array.isArray(entry.nodes) ||
      entry.nodes.length === 0 ||
      entry.name !== name
    ) {
      reason = 'Unreviewed package/path';
    } else if (
      entry.nodes.some((path) => !approvedNodes[path] || versions[path] !== approvedNodes[path]) ||
      Object.keys(approvedNodes).some((path) => !entry.nodes.includes(path))
    ) {
      reason = 'Package version/path changed';
    }
    try {
      const highRoots = roots(name).filter((via) => ['high', 'critical'].includes(via.severity));
      if (
        !highRoots.length ||
        highRoots.some((via) => {
          const rule = Object.hasOwn(policy.advisories, via.url)
            ? policy.advisories[via.url]
            : null;
          return !rule || via.severity !== 'high' || via.name !== rule.package;
        })
      )
        reason = 'New or unreviewed high/critical advisory';
    } catch {
      reason = 'Incomplete or cyclic audit dependency path';
    }
    (reason ? blocked : accepted).push({ name, severity: entry.severity, reason });
  }
  const counts = report.metadata.vulnerabilities;
  const actual = Object.values(report.vulnerabilities);
  for (const severity of ['info', 'low', 'moderate', 'high', 'critical']) {
    if (counts[severity] !== actual.filter((entry) => entry.severity === severity).length)
      throw new Error('Audit counts do not match findings');
  }
  return {
    passed: blocked.length === 0,
    blocked,
    accepted,
    counts,
    active,
    expiresAt: policy.expiresAt,
  };
}
