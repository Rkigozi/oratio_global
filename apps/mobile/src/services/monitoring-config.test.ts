import { describe, expect, it } from '@jest/globals';
import { getMonitoringConfig } from './monitoring-config';

const valid = {
  enabled: 'true',
  dsn: `https://${'a'.repeat(32)}@o1.ingest.us.sentry.io/123`,
  environment: 'staging',
  version: '1.0.0',
  build: '12',
  gitSha: 'b'.repeat(40),
  development: false,
};

describe('monitoring configuration', () => {
  it('uses validated release metadata and the actual native build', () => {
    expect(getMonitoringConfig(valid)).toMatchObject({
      release: `com.oratio.app@1.0.0+12.${valid.gitSha}`,
      build: '12',
      environment: 'staging',
    });
  });
  it('allows an explicitly configured Expo Go development test', () => {
    expect(
      getMonitoringConfig({
        ...valid,
        environment: 'development',
        build: 'development',
        development: true,
      })
    ).not.toBeNull();
  });
  it.each([
    { enabled: undefined },
    { enabled: 'false' },
    { dsn: undefined },
    { dsn: 'https://token@unapproved.example/1' },
    { dsn: valid.dsn.replace('https:', 'http:') },
    { dsn: `${valid.dsn}?secret=abc` },
    { dsn: `${valid.dsn}#secret` },
    { dsn: valid.dsn.replace('@', ':secret@') },
    { dsn: ` ${valid.dsn}` },
    { dsn: valid.dsn.replace('sentry.io', 'sentry.io.unapproved.example') },
    { environment: undefined },
    { environment: 'preview' },
    { environment: 'development' },
    { environment: 'production', development: true },
    { version: null },
    { version: 'user@example.com' },
    { build: null },
    { build: '12-token' },
    { gitSha: undefined },
    { gitSha: 'short-sha' },
    { gitSha: { secret: 'sensitive' } },
  ])('fails closed for incomplete or unsafe config: %j', (change) => {
    expect(getMonitoringConfig({ ...valid, ...change })).toBeNull();
  });
});
