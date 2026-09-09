import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';

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

export async function getComments(prayerId: string, limit = 20, offset = 0): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select(COMMENT_SELECT)
    .eq('prayer_id', prayerId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    logError('fetch comments', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map(mapComment);
}

export async function getCommentCount(prayerId: string): Promise<number> {
  const { count, error } = await supabase
    .from('comments')
    .select('id', { count: 'exact', head: true })
    .eq('prayer_id', prayerId);

  if (error || count === null) return 0;
  return count;
}

export async function createComment(input: {
  prayer_id: string;
  body: string;
  parent_id?: string | null;
}): Promise<Comment | null> {
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

export async function updateComment(commentId: string, body: string): Promise<Comment | null> {
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

export async function deleteComment(commentId: string): Promise<boolean> {
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
