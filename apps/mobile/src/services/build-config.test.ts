import { describe, expect, it } from '@jest/globals';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const appRoot = resolve(__dirname, '../..');
const config = JSON.parse(readFileSync(resolve(appRoot, 'eas.json'), 'utf8'));
const app = JSON.parse(readFileSync(resolve(appRoot, 'app.json'), 'utf8')).expo;
const pkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'));
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
    expect(pkg.scripts['eas-build-post-install']).toBe('npm run check:build-env');
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
