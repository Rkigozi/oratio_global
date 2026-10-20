import type { ErrorEvent, Event, StackFrame } from '@sentry/react-native';
import type { MonitoringConfig } from './monitoring-config';

const errorTypes = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'EvalError',
]);
const operations = new Set([
  'create prayer',
  'update prayer',
  'delete prayer',
  'fetch prayer',
  'create comment',
  'update comment',
  'delete comment',
  'create report',
  'fetch profile',
  'update profile',
  'fetch preferences',
  'update preferences',
  'getFeedPrayers',
  'getMapHotspots',
  'getPublicPrayersAtLocation',
]);

export function safeOperation(context: string): string {
  return operations.has(context) ? context : 'app-error';
}

function safeFrame(frame: StackFrame): StackFrame | null {
  // Keep only bundle coordinates. Paths, functions, source snippets and variables
  // can contain user data; source-map upload/symbolication is a separate release gate.
  const file = frame.filename?.split(/[?#]/, 1)[0];
  const bundle = file?.match(
    /(?:^|\/)(main\.jsbundle|index\.bundle|index-[a-f0-9]{32}\.hbc)$/
  )?.[1];
  if (!bundle) return null;
  return {
    filename: `app:///${bundle}`,
    ...(Number.isSafeInteger(frame.lineno) && frame.lineno! >= 0 ? { lineno: frame.lineno } : {}),
    ...(Number.isSafeInteger(frame.colno) && frame.colno! >= 0 ? { colno: frame.colno } : {}),
  };
}

export function sanitizeMonitoringEvent(event: Event, config: MonitoringConfig): ErrorEvent | null {
  if (event.type || !event.exception?.values?.length) return null;
  // Rebuild from an allowlist rather than trying to find sensitive strings.
  const smoke =
    config.environment !== 'production' && event.tags?.diagnostic === 'monitoring-smoke-test';
  return {
    type: undefined,
    ...(event.event_id && /^[a-f0-9]{32}$/.test(event.event_id)
      ? { event_id: event.event_id }
      : {}),
    platform: 'javascript',
    level: event.level === 'fatal' ? 'fatal' : 'error',
    environment: config.environment,
    release: config.release,
    dist: config.build,
    sdk: {
      name: 'sentry.javascript.react-native',
      ...(/^\d+\.\d+\.\d+$/.test(event.sdk?.version ?? '') ? { version: event.sdk!.version } : {}),
      settings: { infer_ip: 'never' },
    },
    tags: {
      app_version: config.version,
      app_build: config.build,
      git_sha: config.gitSha,
      operation: safeOperation(String(event.tags?.operation ?? '')),
      ...(smoke ? { diagnostic: 'monitoring-smoke-test' } : {}),
    },
    exception: {
      values: event.exception.values.slice(-3).map((exception) => {
        const frames = (exception.stacktrace?.frames ?? []).slice(-50).flatMap((frame) => {
          const clean = safeFrame(frame);
          return clean ? [clean] : [];
        });
        return {
          type: errorTypes.has(exception.type ?? '') ? exception.type : 'Error',
          value: smoke ? 'Oratio monitoring smoke test' : 'Application error (details withheld)',
          mechanism: { type: 'generic', handled: exception.mechanism?.handled !== false },
          ...(frames.length ? { stacktrace: { frames } } : {}),
        };
      }),
    },
  };
}

export function sanitizeMonitoringEnvelope(
  envelope: [unknown, unknown[]],
  config: MonitoringConfig
): void {
  // Enforce the same boundary at the transport, including SDK-internal events
  // that can bypass beforeSend. No attachments or other envelope item types.
  envelope[0] = {};
  const cleanItems: unknown[] = [];
  try {
    for (const item of envelope[1]) {
      if (!Array.isArray(item) || item[0]?.type !== 'event') continue;
      const event = sanitizeMonitoringEvent(item[1] as Event, config);
      if (event) {
        cleanItems.push([{ type: 'event' }, event]);
        if (event.event_id) envelope[0] = { event_id: event.event_id };
      }
    }
    envelope[1].splice(0, envelope[1].length, ...cleanItems);
  } catch {
    envelope[1].splice(0);
  }
}
