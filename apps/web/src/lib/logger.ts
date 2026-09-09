// Web logging shim: routes the shared logger to Sentry in production.
import { setExceptionSink, logError } from '@oratio/shared/logger';
import { captureException } from './monitoring';

setExceptionSink((exception, context, extra) => {
  if (import.meta.env.PROD) {
    captureException(exception, context, extra);
  }
});

export { logError };
