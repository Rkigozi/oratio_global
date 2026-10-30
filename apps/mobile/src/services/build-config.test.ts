/// <reference types="node" />

import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(__dirname, '../..');
const config = JSON.parse(readFileSync(resolve(appRoot, 'eas.json'), 'utf8'));
const app = JSON.parse(readFileSync(resolve(appRoot, 'app.json'), 'utf8')).expo;
const pkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
const rootPkg = JSON.parse(readFileSync(resolve(appRoot, '../../package.json'), 'utf8'));
const webPkg = JSON.parse(readFileSync(resolve(appRoot, '../web/package.json'), 'utf8'));
const nativeVersions = JSON.parse(
  readFileSync(require.resolve('expo/bundledNativeModules.json'), 'utf8')
);
const validEnv = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://ci-preflight.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_ci_build_check_only',
};
const check = (env: Record<string, string>) =>
  spawnSync(process.execPath, [resolve(appRoot, 'scripts/check-build-env.cjs')], {
    env: { NODE_ENV: 'test', ...env },
    encoding: 'utf8',
  });
const jwt = (role: string) =>
  ['{"alg":"HS256"}', JSON.stringify({ role }), 'test-signature']
    .map((part) => Buffer.from(part).toString('base64url'))
    .join('.');

describe('iOS build configuration', () => {
  it('aligns SDK 58 native modules and the shared React/test runtime', () => {
    expect(pkg.dependencies.expo).toMatch(/^~58\./);
    expect(rootPkg.devDependencies.expo).toBe(pkg.dependencies.expo);
    for (const name of [
      '@sentry/react-native',
      'expo-application',
      'expo-clipboard',
      'expo-constants',
      'expo-font',
      'expo-image-picker',
      'expo-location',
      'expo-status-bar',
      'react',
      'react-native',
      'react-native-maps',
      'react-native-safe-area-context',
      'react-native-screens',
      'react-native-svg',
    ]) {
      expect(pkg.dependencies[name]).toBe(nativeVersions[name]);
    }
    expect(pkg.devDependencies['jest-expo']).toBe(nativeVersions['jest-expo']);
    expect(pkg.dependencies['expo-modules-core']).toBeUndefined();
    for (const name of ['react', 'react-dom']) {
      expect(rootPkg.devDependencies[name]).toBe(nativeVersions[name]);
      expect(rootPkg.overrides[name]).toBe(nativeVersions[name]);
      expect(webPkg.dependencies[name]).toBe(nativeVersions[name]);
      expect(webPkg.peerDependencies[name]).toBe(nativeVersions[name]);
    }
    expect(rootPkg.devDependencies['react-native']).toBe(nativeVersions['react-native']);
    expect(rootPkg.overrides['react-native']).toBe(nativeVersions['react-native']);
    expect(rootPkg.devDependencies['react-test-renderer']).toBe(nativeVersions.react);
    expect(rootPkg.overrides['@testing-library/react-native']['react-test-renderer']).toBe(
      nativeVersions.react
    );
  });

  it('uses a committed store release with remote build-number increments', () => {
    expect(config.cli).toMatchObject({ requireCommit: true, appVersionSource: 'remote' });
    expect(config.build.production).toMatchObject({
      distribution: 'store',
      environment: 'production',
      autoIncrement: true,
      ios: { buildConfiguration: 'Release' },
    });
    expect(config.build.production.developmentClient).not.toBe(true);
    expect(config.build.production.ios.simulator).not.toBe(true);
    expect(config.build.production.env).toBeUndefined();
  });

  it('keeps simulator builds separate from store distribution and version increments', () => {
    expect(config.build.simulator).toMatchObject({
      extends: 'production',
      distribution: 'internal',
      environment: 'preview',
      autoIncrement: false,
      ios: { simulator: true },
    });
  });

  it('checks client credentials before a native build can proceed', () => {
    expect(pkg.scripts['eas-build-post-install']).toBe(
      'node ../../scripts/security-backports/forge-backport.mjs --verify-only && npm run check:build-env'
    );
    expect(pkg.scripts['check:build-env']).toBe('node scripts/check-build-env.cjs');
    expect(pkg.scripts['export:ios']).toContain('--clear');
  });

  it('retains the app identity and requests only the media access in use', () => {
    expect(app.name).toBe('Oratio');
    expect(app.owner).toBe('oratioglobals-team');
    expect(app.slug).toBe('oratio-global');
    expect(app.extra.eas.projectId).toBe('7a80432c-c964-448f-a42c-b42268268bf3');
    expect(app.ios.bundleIdentifier).toBe('com.oratio.app');
    expect(app.scheme).toBe('oratio');
    const picker = app.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-image-picker'
    );
    expect(picker[1]).toMatchObject({ cameraPermission: false, microphonePermission: false });
    expect(picker[1].photosPermission).toContain('profile photo');
  });
});

describe('mobile build environment guard', () => {
  const monitoringEnv = {
    EXPO_PUBLIC_SENTRY_ENABLED: 'true',
    EXPO_PUBLIC_SENTRY_DSN: `https://${'a'.repeat(32)}@o1.ingest.us.sentry.io/1`,
    EXPO_PUBLIC_SENTRY_ENVIRONMENT: 'staging',
    EAS_BUILD_GIT_COMMIT_HASH: 'b'.repeat(40),
  };

  it('accepts opt-in monitoring with complete build metadata without printing the DSN', () => {
    const result = check({ ...validEnv, ...monitoringEnv });
    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).not.toContain(monitoringEnv.EXPO_PUBLIC_SENTRY_DSN);
  });

  it.each([
    { EXPO_PUBLIC_SENTRY_ENABLED: 'yes' },
    { EXPO_PUBLIC_SENTRY_DSN: '' },
    { EXPO_PUBLIC_SENTRY_DSN: 'https://secret@unapproved.example/1' },
    { EXPO_PUBLIC_SENTRY_DSN: `${monitoringEnv.EXPO_PUBLIC_SENTRY_DSN}?token=secret` },
    { EXPO_PUBLIC_SENTRY_ENVIRONMENT: 'development' },
    { EAS_BUILD_GIT_COMMIT_HASH: 'invalid-sha' },
  ])('rejects incomplete monitoring in a native build: %j', (change) => {
    const result = check({ ...validEnv, ...monitoringEnv, ...change });
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain('secret@');
  });

  it('copies only a valid commit into Expo public config, preserving existing app metadata', () => {
    const saved = process.env;
    try {
      process.env = {
        NODE_ENV: 'test',
        EAS_BUILD_GIT_COMMIT_HASH: 'b'.repeat(40),
        SENTRY_AUTH_TOKEN: 'never-public',
      };
      const dynamicConfig = require('../../app.config.js');
      const result = dynamicConfig({ config: app });
      expect(result.extra).toEqual({ ...app.extra, monitoring: { gitSha: 'b'.repeat(40) } });
      expect(JSON.stringify(result)).not.toContain('never-public');
      process.env.EAS_BUILD_GIT_COMMIT_HASH = 'invalid';
      expect(dynamicConfig({ config: app }).extra.monitoring.gitSha).toBeUndefined();
    } finally {
      process.env = saved;
    }
  });

  it('allows an isolated HTTPS notice endpoint for preview QA', () => {
    expect(
      check({
        ...validEnv,
        EXPO_PUBLIC_SERVICE_NOTICE_URL: 'https://preview.example/.netlify/functions/service-notice',
      }).status
    ).toBe(0);
  });

  it.each([
    'http://preview.example/.netlify/functions/service-notice',
    'https://user:password@preview.example/.netlify/functions/service-notice',
    'https://preview.example/.netlify/functions/service-notice?manage=1',
    'https://preview.example/.netlify/functions/service-notice#fragment',
    'https://preview.example/',
    'not-a-url',
  ])('rejects invalid preview notice endpoints without echoing them: %s', (url) => {
    const result = check({ ...validEnv, EXPO_PUBLIC_SERVICE_NOTICE_URL: url });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SERVICE_NOTICE_URL');
    expect(result.stderr).not.toContain(url);
  });

  it('accepts publishable credentials without printing their values', () => {
    const result = check(validEnv);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(validEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    expect(result.stdout).not.toContain(validEnv.EXPO_PUBLIC_SUPABASE_URL);
  });

  it('accepts an existing legacy anon key', () => {
    expect(check({ ...validEnv, EXPO_PUBLIC_SUPABASE_ANON_KEY: jwt('anon') }).status).toBe(0);
  });

  it('fails clearly when the build environment has not been configured', () => {
    const result = check({});
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(result.stderr).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  });

  it.each([
    'http://ci-preflight.supabase.co',
    'https://your-project.supabase.co',
    'https://user:password@ci-preflight.supabase.co',
    'https://ci-preflight.supabase.co/rest/v1',
    'https://ci-preflight.supabase.co?key=private',
    ' https://ci-preflight.supabase.co ',
  ])('rejects an invalid release project URL without echoing it: %s', (url) => {
    const result = check({ ...validEnv, EXPO_PUBLIC_SUPABASE_URL: url });
    expect(result.status).toBe(1);
    expect(result.stderr).not.toContain(url);
  });

  it.each([
    'sb_secret_not_for_mobile',
    jwt('service_role'),
    jwt('authenticated'),
    'your-anon-key',
    '',
  ])('rejects a non-public key without logging its value', (key) => {
    const result = check({ ...validEnv, EXPO_PUBLIC_SUPABASE_ANON_KEY: key });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('publishable or legacy anon key');
    if (key) expect(result.stderr).not.toContain(key);
  });
});
