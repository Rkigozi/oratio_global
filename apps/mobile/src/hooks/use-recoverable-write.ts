import { useEffect, useRef, useState } from 'react';
import { WriteOutcomeError, type WriteAttempt } from '@oratio/shared/write-outcome';
import { createSubmissionId } from '../services/submission-id';
import { REQUEST_TIMEOUT_MS, withRequestTimeout } from '../services/request-timeout';

type Outcome<T> = { status: 'saved'; value: T } | { status: 'failed' | 'uncertain' | 'ignored' };

export function useRecoverableWrite<Intent, Value>(
  scope: string,
  userId: string | undefined,
  perform: (intent: Intent, attempt: WriteAttempt) => Promise<Value>
) {
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const pending = useRef(false);
  const saved = useRef<{ intent: Intent; requestId: string; identity: string } | null>(null);
  const identity = `${userId ?? ''}:${scope}`;
  const currentIdentity = useRef(identity);
  const generation = useRef(0);
  const mounted = useRef(true);
  const controller = useRef<AbortController | null>(null);
  currentIdentity.current = identity;

  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    saved.current = null;
    setBusy(false);
    setUncertain(false);
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      controller.current?.abort();
    };
  }, [identity]);

  const execute = async (intent: Intent, retry: boolean): Promise<Outcome<Value>> => {
    if (
      !mounted.current ||
      currentIdentity.current !== identity ||
      !userId ||
      pending.current ||
      (!retry && saved.current)
    )
      return { status: 'ignored' };
    let original = saved.current;
    if (!retry) {
      try {
        original = { intent, requestId: createSubmissionId(), identity };
      } catch {
        return { status: 'failed' };
      }
    }
    if (!original || original.identity !== identity) return { status: 'ignored' };
    const request = ++generation.current;
    const cancellation = new AbortController();
    controller.current = cancellation;
    const active = () =>
      mounted.current && request === generation.current && currentIdentity.current === identity;
    pending.current = true;
    setBusy(true);
    try {
      const value = await withRequestTimeout(
        perform(original.intent, {
          requestId: original.requestId,
          expectedUserId: userId,
          verifyExisting: retry,
          deadlineAt: Date.now() + REQUEST_TIMEOUT_MS,
          signal: cancellation.signal,
        })
      );
      if (!active()) return { status: 'ignored' };
      saved.current = null;
      setUncertain(false);
      return { status: 'saved', value };
    } catch (error) {
      if (!active()) return { status: 'ignored' };
      // Retry failures cannot discard an already uncertain intent.
      const unresolved = retry || !(error instanceof WriteOutcomeError) || error.uncertain;
      saved.current = unresolved ? original : null;
      setUncertain(unresolved);
      return { status: unresolved ? 'uncertain' : 'failed' };
    } finally {
      cancellation.abort();
      if (controller.current === cancellation) controller.current = null;
      if (active()) {
        pending.current = false;
        setBusy(false);
      }
    }
  };

  return {
    busy,
    uncertain,
    locked: busy || uncertain,
    isLocked: () => pending.current || Boolean(saved.current),
    run: (intent: Intent) => execute(intent, false),
    retry: () =>
      saved.current
        ? execute(saved.current.intent, true)
        : Promise.resolve<Outcome<Value>>({ status: 'ignored' }),
  };
}
