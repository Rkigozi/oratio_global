import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';

export type ActivityEventType =
  | 'comment_on_prayer'
  | 'reply_to_comment'
  | 'prayer_prayed'
  | 'prayer_circle_invite'
  | 'prayer_circle_accepted'
  | 'report_reviewed';

export interface ActivityActor {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ActivityEvent {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  event_type: ActivityEventType;
  prayer_id: string | null;
  comment_id: string | null;
  report_id: string | null;
  invite_id: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  actor: ActivityActor | null;
}

type ActivityEventRow = {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  event_type: ActivityEventType;
  prayer_id?: string | null;
  comment_id?: string | null;
  report_id?: string | null;
  invite_id?: string | null;
  metadata?: unknown;
  read_at?: string | null;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapActivityActor(row: Record<string, unknown>): ActivityActor {
  return {
    id: row.id as string,
    username: row.username as string,
    display_name: (row.display_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
  };
}

export async function getActivityEvents(limit = 50): Promise<ActivityEvent[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('activity_events')
    .select(
      'id, recipient_user_id, actor_user_id, event_type, prayer_id, comment_id, report_id, invite_id, metadata, read_at, created_at'
    )
    .eq('recipient_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    logError('fetch activity events', error);
    return [];
  }

  const rows = data as ActivityEventRow[];
  const actorIds = Array.from(
    new Set(rows.map((row) => row.actor_user_id).filter((id): id is string => Boolean(id)))
  );
  const actorsById = new Map<string, ActivityActor>();

  if (actorIds.length > 0) {
    const { data: actors, error: actorsError } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', actorIds);

    if (actorsError) {
      logError('fetch activity actors', actorsError);
    } else {
      (actors as Array<Record<string, unknown>> | null)?.forEach((actor) => {
        const mapped = mapActivityActor(actor);
        actorsById.set(mapped.id, mapped);
      });
    }
  }

  return rows.map((row) => ({
    id: row.id,
    recipient_user_id: row.recipient_user_id,
    actor_user_id: row.actor_user_id,
    event_type: row.event_type,
    prayer_id: row.prayer_id ?? null,
    comment_id: row.comment_id ?? null,
    report_id: row.report_id ?? null,
    invite_id: row.invite_id ?? null,
    metadata: asRecord(row.metadata),
    read_at: row.read_at ?? null,
    created_at: row.created_at,
    actor: row.actor_user_id ? (actorsById.get(row.actor_user_id) ?? null) : null,
  }));
}

export async function getUnreadActivityCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from('activity_events')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_user_id', user.id)
    .is('read_at', null);

  if (error || count === null) {
    logError('fetch unread activity count', error);
    return 0;
  }

  return count;
}

export async function markActivityEventsRead(eventIds?: string[]): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  let query = supabase
    .from('activity_events')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_user_id', user.id)
    .is('read_at', null);

  if (eventIds && eventIds.length > 0) {
    query = query.in('id', eventIds);
  }

  const { error } = await query;

  if (error) {
    logError('mark activity read', error);
    return false;
  }

  return true;
}

export async function deleteActivityEvent(eventId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('activity_events')
    .delete()
    .eq('id', eventId)
    .eq('recipient_user_id', user.id);

  if (error) {
    logError('delete activity event', error);
    return false;
  }

  return true;
}
