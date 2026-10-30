import { getSupabaseClient } from '../client';
import { logError } from '../logger';
import {
  assertWriteDeadline,
  getWriteUser,
  withWriteSignal,
  writeOutcomeError,
  WriteOutcomeError,
  type WriteAttempt,
} from '../write-outcome';

const supabase = getSupabaseClient();

export interface Comment {
  id: string;
  prayer_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  user?: { username: string; display_name: string | null; avatar_url: string | null } | null;
}

const COMMENT_SELECT = `
  id, prayer_id, user_id, parent_id, body, created_at, updated_at,
  profiles(username, display_name, avatar_url)
`;

function mapComment(row: Record<string, unknown>): Comment {
  const profile = row.profiles as {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;

  return {
    id: row.id as string,
    prayer_id: row.prayer_id as string,
    user_id: row.user_id as string,
    parent_id: (row.parent_id as string) || null,
    body: row.body as string,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    user: profile
      ? {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        }
      : null,
  };
}

export async function getComments(
  prayerId: string,
  limit = 20,
  offset = 0,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('prayer_id', prayerId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    logError('fetch comments', new Error('Comments are unavailable'));
    if (throwOnError) throw new Error('Comments are unavailable');
    return [];
  }

  return (data as Array<Record<string, unknown>>).map(mapComment);
}

export async function getCommentCount(
  prayerId: string,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('prayer_id', prayerId);

  if (error || count == null) {
    if (throwOnError) throw new Error('Comment count is unavailable');
    return 0;
  }
  return count;
}

export async function createComment(
  input: {
    prayer_id: string;
    body: string;
    parent_id?: string | null;
  },
  attempt?: WriteAttempt
): Promise<Comment | null> {
  if (attempt) return createCommentAttempt(input, attempt);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('comments')
    .insert({
      prayer_id: input.prayer_id,
      user_id: user.id,
      body: input.body,
      parent_id: input.parent_id || null,
    })
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    logError('create comment', error);
    return null;
  }

  return mapComment(data as Record<string, unknown>);
}

export async function updateComment(
  commentId: string,
  body: string,
  attempt?: WriteAttempt & { expectedUpdatedAt: string }
): Promise<Comment | null> {
  if (attempt) return updateCommentAttempt(commentId, body, attempt);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('comments')
    .update({ body })
    .eq('id', commentId)
    .eq('user_id', user.id)
    .select(COMMENT_SELECT)
    .single();

  if (error || !data) {
    logError('update comment', error);
    return null;
  }

  return mapComment(data as Record<string, unknown>);
}

export async function deleteComment(commentId: string, attempt?: WriteAttempt): Promise<boolean> {
  if (attempt) {
    let writeStarted = false;
    try {
      await getWriteUser(attempt);
      if (attempt.verifyExisting) {
        const { data, error } = await withWriteSignal(
          supabase.from('comments').select('id').eq('id', commentId),
          attempt
        ).maybeSingle();
        if (error) throw error;
        if (!data) return true;
      }
      assertWriteDeadline(attempt);
      writeStarted = true;
      const { data, error } = await withWriteSignal(
        supabase.from('comments').delete().eq('id', commentId).select('id'),
        attempt
      );
      if (error) throw error;
      if (!data?.some((row: { id: string }) => row.id === commentId))
        throw new WriteOutcomeError(true);
      return true;
    } catch (cause) {
      const error = writeOutcomeError(cause, attempt, writeStarted);
      logError('delete comment', error);
      throw error;
    }
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('comments').delete().eq('id', commentId);

  if (error) {
    logError('delete comment', error);
    return false;
  }
  return true;
}

async function createCommentAttempt(
  input: { prayer_id: string; body: string; parent_id?: string | null },
  attempt: WriteAttempt
): Promise<Comment> {
  let writeStarted = false;
  try {
    const user = await getWriteUser(attempt);
    const body = input.body.trim();
    if (!body || body.length > 500) throw new WriteOutcomeError(false);
    const recover = async () => {
      const { data, error } = await withWriteSignal(
        supabase
          .from('comments')
          .select(COMMENT_SELECT)
          .eq('id', attempt.requestId)
          .eq('user_id', user.id)
          .eq('prayer_id', input.prayer_id),
        attempt
      ).maybeSingle();
      if (error) throw new WriteOutcomeError(true);
      if (!data) return null;
      const row = mapComment(data as Record<string, unknown>);
      if (
        row.id !== attempt.requestId ||
        row.user_id !== user.id ||
        row.prayer_id !== input.prayer_id ||
        row.body !== body ||
        row.parent_id !== (input.parent_id || null)
      )
        throw new WriteOutcomeError(true);
      return row;
    };
    if (attempt.verifyExisting) {
      const existing = await recover();
      if (existing) return existing;
    }
    assertWriteDeadline(attempt);
    writeStarted = true;
    const { data, error } = await withWriteSignal(
      supabase
        .from('comments')
        .insert({
          id: attempt.requestId,
          user_id: user.id,
          prayer_id: input.prayer_id,
          body,
          parent_id: input.parent_id || null,
        })
        .select(COMMENT_SELECT),
      attempt
    ).single();
    if (error?.code === '23505') {
      const existing = await recover();
      if (existing) return existing;
      throw new WriteOutcomeError(true);
    }
    if (error) throw error;
    if (!data || data.id !== attempt.requestId) throw new WriteOutcomeError(true);
    return mapComment(data as Record<string, unknown>);
  } catch (cause) {
    const error = writeOutcomeError(cause, attempt, writeStarted);
    logError('create comment', error);
    throw error;
  }
}

async function updateCommentAttempt(
  commentId: string,
  body: string,
  attempt: WriteAttempt & { expectedUpdatedAt: string }
): Promise<Comment> {
  let writeStarted = false;
  try {
    const user = await getWriteUser(attempt);
    body = body.trim();
    if (!body || body.length > 500 || !attempt.expectedUpdatedAt)
      throw new WriteOutcomeError(false);
    const { data: current, error: readError } = await withWriteSignal(
      supabase.from('comments').select(COMMENT_SELECT).eq('id', commentId).eq('user_id', user.id),
      attempt
    ).maybeSingle();
    if (readError) throw readError;
    if (!current) throw new WriteOutcomeError(attempt.verifyExisting);
    if (current.body === body) return mapComment(current as Record<string, unknown>);
    if (current.updated_at !== attempt.expectedUpdatedAt)
      throw new WriteOutcomeError(attempt.verifyExisting);
    assertWriteDeadline(attempt);
    writeStarted = true;
    const { data, error } = await withWriteSignal(
      supabase
        .from('comments')
        .update({ body })
        .eq('id', commentId)
        .eq('user_id', user.id)
        .eq('updated_at', attempt.expectedUpdatedAt)
        .select(COMMENT_SELECT),
      attempt
    ).single();
    if (error) throw error;
    if (!data || data.id !== commentId || data.body !== body) throw new WriteOutcomeError(true);
    return mapComment(data as Record<string, unknown>);
  } catch (cause) {
    const error = writeOutcomeError(cause, attempt, writeStarted);
    logError('update comment', error);
    throw error;
  }
}

export function subscribeToPrayerCommentChanges(
  prayerId: string,
  onChange: () => void
): () => void {
  try {
    const channel = supabase
      .channel(`comments:${prayerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `prayer_id=eq.${prayerId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  } catch {
    // Realtime is optional. Browsers can deny WebSockets through privacy or
    // network policies; comments still load and update through normal queries.
    return () => {};
  }
}
