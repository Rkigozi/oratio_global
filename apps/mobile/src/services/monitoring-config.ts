export type MonitoringConfig = {
  dsn: string;
  environment: 'development' | 'staging' | 'production';
  version: string;
  build: string;
  gitSha: string;
  release: string;
};

export function getMonitoringConfig(input: {
  enabled?: string;
  dsn?: string;
  environment?: string;
  version?: string | null;
  build?: string | null;
  gitSha?: unknown;
  development: boolean;
}): MonitoringConfig | null {
  const { dsn, environment, version, build, gitSha, development } = input;
  if (input.enabled !== 'true' || !dsn) return null;
  try {
    const url = new URL(dsn);
    if (
      dsn !== dsn.trim() ||
      url.protocol !== 'https:' ||
      !/^[a-f0-9]{32}$/.test(url.username) ||
      !/^o[0-9]+\.ingest(?:\.[a-z]+)?\.sentry\.io$/.test(url.hostname) ||
      !/^\/[0-9]+$/.test(url.pathname) ||
      url.password ||
      url.port ||
      url.search ||
      url.hash
    )
      return null;
  } catch {
    return null;
  }
  if (environment !== 'development' && environment !== 'staging' && environment !== 'production')
    return null;
  if (development !== (environment === 'development')) return null;
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) return null;
  if (!build || (development ? build !== 'development' : !/^\d+(?:\.\d+)*$/.test(build)))
    return null;
  if (typeof gitSha !== 'string' || !/^[a-f0-9]{40}$/.test(gitSha)) return null;
  return {
    dsn,
    environment,
    version,
    build,
    gitSha,
    release: `com.oratio.app@${version}+${build}.${gitSha}`,
  };
}
