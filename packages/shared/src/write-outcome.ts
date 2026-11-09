import { getSupabaseClient } from './client';

export interface WriteAttempt {
  requestId: string;
  expectedUserId: string;
  verifyExisting: boolean;
  deadlineAt: number;
  signal?: AbortSignal;
}

export class WriteOutcomeError extends Error {
  constructor(public readonly uncertain: boolean) {
    super(uncertain ? 'The change could not be confirmed.' : 'The change could not be saved.');
    this.name = 'WriteOutcomeError';
  }
}

export function assertWriteDeadline(attempt: WriteAttempt) {
  if (
    attempt.signal?.aborted ||
    !Number.isFinite(attempt.deadlineAt) ||
    Date.now() >= attempt.deadlineAt
  )
    throw new WriteOutcomeError(attempt.verifyExisting);
}

export async function getWriteUser(attempt: WriteAttempt) {
  if (
    !attempt.expectedUserId ||
    !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(attempt.requestId)
  )
    throw new WriteOutcomeError(attempt.verifyExisting);
  assertWriteDeadline(attempt);
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user || data.user.id !== attempt.expectedUserId)
    throw new WriteOutcomeError(attempt.verifyExisting);
  assertWriteDeadline(attempt);
  return data.user;
}

export function writeOutcomeError(cause: unknown, attempt: WriteAttempt, writeStarted: boolean) {
  if (cause instanceof WriteOutcomeError)
    return new WriteOutcomeError(attempt.verifyExisting || writeStarted || cause.uncertain);
  const code = cause && typeof cause === 'object' && 'code' in cause ? String(cause.code) : '';
  // Only an explicit PostgreSQL rejection proves the write was rejected.
  // Transport/HTTP/representation failures may follow a committed transaction.
  const rejected = [
    '42501',
    '23514',
    '23503',
    '23505',
    '22023',
    '22P02',
    '23502',
    '40001',
    '40P01',
  ].includes(code);
  return new WriteOutcomeError(attempt.verifyExisting || (writeStarted && !rejected));
}

export function withWriteSignal<T extends { abortSignal(signal: AbortSignal): T }>(
  query: T,
  attempt: WriteAttempt
): T {
  return attempt.signal ? query.abortSignal(attempt.signal) : query;
}

export async function setPrayerMembership(
  table: 'saved_prayers' | 'prayer_interactions',
  prayerId: string,
  desired: boolean,
  attempt: WriteAttempt
): Promise<boolean> {
  let writeStarted = false;
  try {
    const user = await getWriteUser(attempt);
    const client = getSupabaseClient();
    const exists = async () => {
      const { data, error } = await withWriteSignal(
        client.from(table).select('prayer_id').eq('prayer_id', prayerId).eq('user_id', user.id),
        attempt
      ).maybeSingle();
      if (error) throw error;
      if (data && data.prayer_id !== prayerId) throw new WriteOutcomeError(true);
      return Boolean(data);
    };
    if ((await exists()) === desired) return true;
    assertWriteDeadline(attempt);
    writeStarted = true;
    const { error } = await withWriteSignal(
      desired
        ? client.from(table).insert({ user_id: user.id, prayer_id: prayerId })
        : client.from(table).delete().eq('user_id', user.id).eq('prayer_id', prayerId),
      attempt
    );
    if (error?.code === '23505' && desired && (await exists())) return true;
    if (error) throw error;
    return true;
  } catch (cause) {
    throw writeOutcomeError(cause, attempt, writeStarted);
  }
}
