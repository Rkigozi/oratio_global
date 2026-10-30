import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { ReactNativeOptions } from '@sentry/react-native';

const mockInit = jest.fn<(options: ReactNativeOptions) => void>();
const mockCapture = jest
  .fn<typeof import('@sentry/react-native').captureException>()
  .mockReturnValue('c'.repeat(32));
const mockIntegration = jest.fn().mockReturnValue({ name: 'ReactNativeErrorHandlers' });
const mockLoadSdk = jest.fn();
let sdkIntervals: jest.SpiedFunction<typeof setInterval> | undefined;
jest.mock('@sentry/react-native', () => {
  mockLoadSdk();
  return {
    init: mockInit,
    captureException: mockCapture,
    reactNativeErrorHandlersIntegration: mockIntegration,
  };
});
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0', extra: { monitoring: { gitSha: 'b'.repeat(40) } } } },
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.0.0',
  nativeBuildVersion: '12',
}));

const originalEnv = process.env;
const originalDev = __DEV__;
const load = () => require('./monitoring') as typeof import('./monitoring');

describe('native-app monitoring lifecycle', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockInit.mockImplementation(() => {});
    mockCapture.mockReturnValue('c'.repeat(32));
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_SENTRY_ENABLED: 'true',
      EXPO_PUBLIC_SENTRY_ENVIRONMENT: 'development',
      EXPO_PUBLIC_SENTRY_DSN: `https://${'a'.repeat(32)}@o1.ingest.sentry.io/1`,
    };
    Object.assign(globalThis, { __DEV__: true });
  });
  afterEach(() => {
    // The real SDK starts a module-level tracing-cache cleanup interval even
    // with tracing off. It belongs to the test sandbox, not a network transport.
    for (const result of sdkIntervals?.mock.results ?? []) {
      if (result.type === 'return') clearInterval(result.value);
    }
    sdkIntervals = undefined;
    process.env = originalEnv;
    Object.assign(globalThis, { __DEV__: originalDev });
    jest.restoreAllMocks();
  });

  it('does not load the SDK or install a sink when disabled', () => {
    delete process.env.EXPO_PUBLIC_SENTRY_ENABLED;
    const monitoring = load();
    expect(monitoring.initializeMonitoring()).toBe(false);
    expect(mockLoadSdk).not.toHaveBeenCalled();
    expect(monitoring.canSendMonitoringTest()).toBe(false);
    expect(monitoring.sendMonitoringTest()).toBeNull();
  });
  it('initializes only once with no native, replay, session, log or breadcrumb collection', () => {
    const monitoring = load();
    expect(monitoring.initializeMonitoring()).toBe(true);
    expect(monitoring.initializeMonitoring()).toBe(true);
    expect(mockInit).toHaveBeenCalledTimes(1);
    const options = mockInit.mock.calls[0][0];
    expect(options).toMatchObject({
      enableNative: false,
      enableNativeCrashHandling: false,
      autoInitializeNativeSdk: false,
      enableAutoSessionTracking: false,
      defaultIntegrations: false,
      sendDefaultPii: false,
      enableLogs: false,
      sendClientReports: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
    });
    expect(options.tracesSampleRate).toBeUndefined();
    expect(options.replaysSessionSampleRate).toBeUndefined();
    expect(options.beforeBreadcrumb?.({ message: 'private' })).toBeNull();
    const hint = { attachments: [{ filename: 'private.txt', data: 'private' }] };
    const event = {
      type: undefined,
      exception: { values: [{ value: 'private' }] },
      extra: { private: 'private' },
    };
    expect(JSON.stringify(options.beforeSend?.(event, hint))).not.toContain('private');
    expect(hint.attachments).toEqual([]);
  });
  it('connects shared errors without supplying arbitrary context or extras', () => {
    load().initializeMonitoring();
    const { logError } = require('@oratio/shared/logger');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const error = new Error('private');
    logError('create prayer', error, { reportText: 'private' });
    expect(mockCapture).toHaveBeenCalledWith(error, { tags: { operation: 'create prayer' } });
    logError('private@example.com', error);
    expect(mockCapture).toHaveBeenLastCalledWith(error, { tags: { operation: 'app-error' } });
  });
  it('does not break the app when initialization or capture fails', () => {
    mockInit.mockImplementationOnce(() => {
      throw new Error('provider unavailable');
    });
    const monitoring = load();
    expect(monitoring.initializeMonitoring()).toBe(false);
    expect(monitoring.initializeMonitoring()).toBe(true);
    mockCapture.mockImplementation(() => {
      throw new Error('provider unavailable');
    });
    const { logError } = require('@oratio/shared/logger');
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => logError('create prayer', new Error('original error'))).not.toThrow();
    expect(monitoring.sendMonitoringTest()).toBeNull();
  });
  it('queues a controlled test only on non-production builds, without claiming delivery', () => {
    const monitoring = load();
    monitoring.initializeMonitoring();
    expect(monitoring.canSendMonitoringTest()).toBe(true);
    expect(monitoring.sendMonitoringTest()).toBe('c'.repeat(32));
    expect(mockCapture).toHaveBeenCalledWith(expect.any(Error), {
      tags: { diagnostic: 'monitoring-smoke-test' },
    });
  });
  it('uses actual native build metadata and disables the test path in production', () => {
    Object.assign(globalThis, { __DEV__: false });
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT = 'production';
    const monitoring = load();
    expect(monitoring.initializeMonitoring()).toBe(true);
    expect(mockInit.mock.calls[0][0].dist).toBe('12');
    expect(monitoring.canSendMonitoringTest()).toBe(false);
    expect(monitoring.sendMonitoringTest()).toBeNull();
    expect(mockCapture).not.toHaveBeenCalled();
  });

  describe('real SDK envelope transport', () => {
    let sdk: typeof import('@sentry/react-native');
    let sdkVersion: string;

    // Cold Babel transformation of the real SDK is fixture setup, separate
    // from the test's existing timeout and one-second envelope flush budget.
    beforeEach(() => {
      sdkIntervals = jest.spyOn(globalThis, 'setInterval');
      sdk = jest.requireActual<typeof import('@sentry/react-native')>('@sentry/react-native');
      sdkVersion = require('@sentry/react-native/package.json').version;
    }, 60_000);

    it('scrubs real SDK envelopes, including internal errors and attachments, without network', async () => {
      load().initializeMonitoring();
      const options = mockInit.mock.calls[0][0];
      const send = jest
        .fn<() => Promise<{ statusCode: number }>>()
        .mockResolvedValue({ statusCode: 200 });
      const integrations = options.integrations as Array<{ name: string }>;
      const client = new sdk.ReactNativeClient({
        ...options,
        stackParser: () => [],
        integrations: integrations.filter((integration) => integration.name === 'OratioPrivacy'),
        transport: () => ({ send, flush: async () => true }),
      } as ConstructorParameters<typeof sdk.ReactNativeClient>[0]);
      client.init();
      for (const internal of [false, true]) {
        client.captureEvent(
          {
            message: 'PRIVATE prayer',
            user: { email: 'private@example.com' },
            exception: {
              values: [{ type: 'Error', value: 'PRIVATE report Bearer private-token' }],
            },
          },
          {
            data: { __sentry__: internal },
            attachments: [{ filename: 'private.txt', data: 'PRIVATE attachment' }],
          }
        );
      }
      await client.flush(1000);
      expect(send).toHaveBeenCalledTimes(2);
      const payload = JSON.stringify(send.mock.calls);
      expect(payload).not.toMatch(/PRIVATE|private@example|private-token|private\.txt/);
      expect(payload).toContain('Application error (details withheld)');
      expect(payload).toContain('"infer_ip":"never"');
      expect(payload).toContain(sdkVersion);
      await client.close();
    });
  });
});
