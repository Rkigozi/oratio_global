import Constants from 'expo-constants';
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import { setExceptionSink } from '@oratio/shared/logger';
import { getMonitoringConfig, type MonitoringConfig } from './monitoring-config';
import {
  safeOperation,
  sanitizeMonitoringEvent,
  sanitizeMonitoringEnvelope,
} from './monitoring-privacy';

type SentrySdk = typeof import('@sentry/react-native');
let active: { sdk: SentrySdk; config: MonitoringConfig } | null = null;

export function initializeMonitoring(): boolean {
  if (active) return true;
  const config = getMonitoringConfig({
    enabled: process.env.EXPO_PUBLIC_SENTRY_ENABLED,
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT,
    version: __DEV__ ? Constants.expoConfig?.version : nativeApplicationVersion,
    build: __DEV__ ? 'development' : nativeBuildVersion,
    gitSha: Constants.expoConfig?.extra?.monitoring?.gitSha,
    development: __DEV__,
  });
  if (!config) return false;
  try {
    // The SDK is not evaluated at all when monitoring is disabled.
    const sdk: SentrySdk = require('@sentry/react-native');
    sdk.init({
      dsn: config.dsn,
      environment: config.environment,
      release: config.release,
      dist: config.build,
      debug: false,
      sendDefaultPii: false,
      enableNative: false,
      enableNativeCrashHandling: false,
      autoInitializeNativeSdk: false,
      enableNativeNagger: false,
      enableAutoSessionTracking: false,
      enableAutoPerformanceTracing: false,
      enableCaptureFailedRequests: false,
      enableLogs: false,
      sendClientReports: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      maxBreadcrumbs: 0,
      defaultIntegrations: false,
      integrations: [
        {
          name: 'OratioPrivacy',
          setup: (client) => {
            client.on('beforeEnvelope', (envelope) => sanitizeMonitoringEnvelope(envelope, config));
          },
        },
        sdk.reactNativeErrorHandlersIntegration({ patchGlobalPromise: false }),
      ],
      beforeBreadcrumb: () => null,
      beforeSendTransaction: () => null,
      beforeSend: (event, hint) => {
        hint.attachments = [];
        try {
          return sanitizeMonitoringEvent(event, config);
        } catch {
          return null;
        }
      },
    });
    active = { sdk, config };
    setExceptionSink((exception, context) => {
      try {
        sdk.captureException(exception, { tags: { operation: safeOperation(context) } });
      } catch {
        /* Reporting is best effort. */
      }
    });
    return true;
  } catch {
    // Missing/broken telemetry must not prevent registration or normal app use.
    return false;
  }
}

export function canSendMonitoringTest(): boolean {
  return active !== null && active.config.environment !== 'production';
}

export function sendMonitoringTest(): string | null {
  if (!active || !canSendMonitoringTest()) return null;
  try {
    return active.sdk.captureException(new Error('Oratio monitoring smoke test'), {
      tags: { diagnostic: 'monitoring-smoke-test' },
    });
  } catch {
    return null;
  }
}
