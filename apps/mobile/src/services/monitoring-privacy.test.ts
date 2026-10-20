import { describe, expect, it } from '@jest/globals';
import type { Event } from '@sentry/react-native';
import { getMonitoringConfig } from './monitoring-config';
import { sanitizeMonitoringEvent, sanitizeMonitoringEnvelope } from './monitoring-privacy';

const config = getMonitoringConfig({
  enabled: 'true',
  dsn: `https://${'a'.repeat(32)}@o1.ingest.sentry.io/1`,
  environment: 'staging',
  version: '1.0.0',
  build: '12',
  gitSha: 'b'.repeat(40),
  development: false,
})!;
const secret = 'PRIVATE prayer/report user@example.com Bearer secret-token 51.5074,-0.1278';
const frame = {
  filename: `file:///private/${secret}/main.jsbundle?token=secret-token`,
  lineno: 1,
  colno: 250,
  function: secret,
  vars: { text: secret },
  pre_context: [secret],
  context_line: secret,
};

describe('monitoring payload allowlist', () => {
  it('keeps only safe bundle coordinates, generic error class and release metadata', () => {
    const event: Event = {
      event_id: 'c'.repeat(32),
      message: secret,
      user: { email: secret, id: secret },
      request: { url: secret, headers: { Authorization: secret }, data: secret },
      breadcrumbs: [{ message: secret, data: { secret } }],
      extra: { secret },
      contexts: { trace: { trace_id: secret, span_id: secret }, device: { name: secret } },
      tags: { operation: 'create prayer', secret },
      transaction: secret,
      server_name: secret,
      exception: {
        values: [
          {
            type: 'TypeError',
            value: secret,
            mechanism: { type: secret, handled: false, data: { secret } },
            stacktrace: { frames: [frame] },
          },
        ],
      },
      debug_meta: { images: [{ type: 'sourcemap', code_file: secret, debug_id: secret }] },
      sdkProcessingMetadata: { secret },
    };
    const clean = sanitizeMonitoringEvent(event, config)!;
    expect(JSON.stringify(clean)).not.toMatch(
      /PRIVATE|user@example|secret-token|51\.5074|private|Authorization/
    );
    expect(clean).toEqual({
      event_id: 'c'.repeat(32),
      level: 'error',
      platform: 'javascript',
      environment: 'staging',
      release: config.release,
      dist: '12',
      sdk: { name: 'sentry.javascript.react-native', settings: { infer_ip: 'never' } },
      tags: {
        app_version: '1.0.0',
        app_build: '12',
        git_sha: config.gitSha,
        operation: 'create prayer',
      },
      exception: {
        values: [
          {
            type: 'TypeError',
            value: 'Application error (details withheld)',
            mechanism: { type: 'generic', handled: false },
            stacktrace: { frames: [{ filename: 'app:///main.jsbundle', lineno: 1, colno: 250 }] },
          },
        ],
      },
    });
    expect(event.user?.email).toBe(secret);
  });
  it('drops custom error names, arbitrary operation labels, URLs and source paths', () => {
    const clean = sanitizeMonitoringEvent(
      {
        event_id: secret,
        tags: { operation: secret },
        exception: {
          values: [
            {
              type: secret,
              value: secret,
              stacktrace: {
                frames: [
                  { filename: `https://example.com/${secret}` },
                  { filename: '/Users/name/private.ts', lineno: 1 },
                  { filename: 'index.bundle', lineno: NaN, colno: -1 },
                ],
              },
            },
          ],
        },
      },
      config
    )!;
    expect(clean.event_id).toBeUndefined();
    expect(clean.tags?.operation).toBe('app-error');
    expect(clean.exception?.values?.[0]).toMatchObject({
      type: 'Error',
      stacktrace: { frames: [{ filename: 'app:///index.bundle' }] },
    });
    expect(JSON.stringify(clean)).not.toContain(secret);
  });
  it.each([{ message: secret }, { type: 'transaction' }, { type: 'replay_event' }])(
    'drops non-error events: %j',
    (event) => {
      expect(sanitizeMonitoringEvent(event as Event, config)).toBeNull();
    }
  );
  it.each([
    undefined,
    {},
    { frames: [] },
    { frames: [{ filename: `/Users/private/${secret}.ts`, lineno: 1 }] },
  ])('omits stack traces with no safe frames: %j', (stacktrace) => {
    const clean = sanitizeMonitoringEvent(
      { exception: { values: [{ type: 'Error', value: secret, stacktrace }] } },
      config
    )!;
    expect(clean.exception?.values?.[0]).toEqual({
      type: 'Error',
      value: 'Application error (details withheld)',
      mechanism: { type: 'generic', handled: true },
    });
    expect(sanitizeMonitoringEvent(clean, config)).toEqual(clean);
    const envelope: [unknown, unknown[]] = [{}, [[{ type: 'event' }, clean]]];
    sanitizeMonitoringEnvelope(envelope, config);
    expect(envelope[1]).toEqual([[{ type: 'event' }, clean]]);
    expect(JSON.stringify(envelope)).not.toContain('stacktrace');
    expect(JSON.stringify(envelope)).not.toContain(secret);
  });
  it('keeps a fixed smoke-test label only outside production', () => {
    const event: Event = {
      tags: { diagnostic: 'monitoring-smoke-test' },
      exception: { values: [{ value: secret }] },
    };
    expect(sanitizeMonitoringEvent(event, config)?.exception?.values?.[0].value).toBe(
      'Oratio monitoring smoke test'
    );
    const clean = sanitizeMonitoringEvent(event, { ...config, environment: 'production' });
    expect(clean?.tags?.diagnostic).toBeUndefined();
    expect(clean?.exception?.values?.[0].value).toBe('Application error (details withheld)');
  });

  it('strips envelope metadata, attachments and non-error types even if beforeSend was bypassed', () => {
    const envelope: [unknown, unknown[]] = [
      { trace: { user: secret }, sdk: { secret } },
      [
        [
          { type: 'event', filename: secret },
          {
            message: secret,
            exception: { values: [{ value: secret }] },
            sdk: { version: '7.11.0' },
          },
        ],
        [{ type: 'attachment', filename: secret }, secret],
        [{ type: 'session' }, { user: secret }],
        [{ type: 'client_report' }, { secret }],
        [{ type: 'log' }, { secret }],
      ],
    ];
    sanitizeMonitoringEnvelope(envelope, config);
    expect(envelope[0]).toEqual({});
    expect(envelope[1]).toHaveLength(1);
    expect(JSON.stringify(envelope)).not.toContain(secret);
    expect(JSON.stringify(envelope)).toContain('"infer_ip":"never"');
    expect(JSON.stringify(envelope)).toContain('7.11.0');
  });

  it('fails closed for malformed event payloads', () => {
    const envelope: [unknown, unknown[]] = [{ secret }, [[{ type: 'event' }, null]]];
    expect(() => sanitizeMonitoringEnvelope(envelope, config)).not.toThrow();
    expect(envelope).toEqual([{}, []]);
  });
});
