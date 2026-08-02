import { supabase } from './supabase';
import {
  getPrayerLocationKey,
  hasMappablePrayerLocation,
  normalizePrayerLocation,
  type PrayerRequest,
} from './prayer-data';
import { logError } from '../../lib/logger';

export type PrayerAudience = 'public' | 'circle' | 'private';
export type FeedAudienceMode = Exclude<PrayerAudience, 'private'>;

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

export type PrayerCircleState = 'none' | 'pending_sent' | 'pending_received' | 'connected' | 'self';

export interface PrayerCircleStatus {
  state: PrayerCircleState;
  inviteId?: string;
}

export interface PrayerCircleUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  connected_at?: string;
}

export interface PrayerCircleInvite {
  id: string;
  requester_id: string;
  recipient_id: string;
  message: string | null;
  created_at: string;
  requester: PrayerCircleUser;
  recipient: PrayerCircleUser;
}

type PrayerProfileRow = {
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
};

type MapHotspotTotalRow = Record<string, unknown>;
type RpcResponse<T> = {
  data: T | null;
  error: unknown;
};

const COMMENT_SELECT = `
  id, prayer_id, user_id, parent_id, body, created_at, updated_at,
  profiles(username, display_name, avatar_url)
`;

function mapPrayerRequest(
  row: Record<string, unknown>,
  profileOverride?: PrayerProfileRow | null
): PrayerRequest {
  const profile =
    profileOverride ?? ((row.profiles as PrayerProfileRow | null | undefined) || null);
  const isAnonymous = row.is_anonymous === true;
  const attribution = profile?.display_name || profile?.username || undefined;
  const location = normalizePrayerLocation(
    (row.location_city as string | null) || 'Unknown',
    (row.location_country as string | null) || 'Unknown'
  );

  return {
    id: row.id as string,
    city: location.city,
    country: location.country,
    text: row.body as string,
    audience: (row.audience as PrayerAudience | null) || 'public',
    name: isAnonymous ? undefined : attribution,
    displayName: isAnonymous ? undefined : attribution,
    username: isAnonymous ? undefined : profile?.username || undefined,
    prayerCount: (row.prayer_count as number) || 0,
    lat: (row.location_lat as number) || 0,
    lng: (row.location_lng as number) || 0,
    category: (row.category as string) || undefined,
    createdAt: row.created_at as string,
    editedAt: (row.edited_at as string | null) || undefined,
    commentCount: (row.comment_count as number) || 0,
    commentsEnabled: row.comments_enabled !== false,
    avatarUrl: isAnonymous ? undefined : profile?.avatar_url || undefined,
    authorId: (row.user_id as string | null) || undefined,
  };
}

function mapHotspotTotal(row: Record<string, unknown>): PrayerRequest {
  const location = normalizePrayerLocation(
    (row.location_city as string | null) || 'Unknown',
    (row.location_country as string | null) || 'Unknown'
  );

  return {
    id: `location:${getPrayerLocationKey(location.city, location.country)}`,
    city: location.city,
    country: location.country,
    text: '',
    prayerCount: Number(row.prayer_count || 0),
    requestCount: Number(row.request_count || 0),
    lat: Number(row.location_lat || 0),
    lng: Number(row.location_lng || 0),
    createdAt: row.latest_created_at as string,
  };
}

// ─── Map Hotspots ──────────────────────────────────────────────────────

export async function getMapHotspots(): Promise<PrayerRequest[]> {
  const aggregateResult = (await supabase.rpc('get_map_hotspot_totals')) as unknown as RpcResponse<
    MapHotspotTotalRow[]
  >;

  if (!aggregateResult.error && aggregateResult.data) {
    return aggregateResult.data.map(mapHotspotTotal).filter(hasMappablePrayerLocation);
  }

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `
    )
    .eq('audience', 'public')
    .not('location_lat', 'is', null)
    .not('location_lng', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error || !data) {
    logError('getMapHotspots', error);
    return [];
  }

  return data
    .map((row: Record<string, unknown>) => mapPrayerRequest(row))
    .filter(hasMappablePrayerLocation);
}

// ─── Feed ──────────────────────────────────────────────────────────────

export async function getFeedPrayers(
  cursor?: string,
  pageLimit = 20,
  audienceMode: FeedAudienceMode = 'public'
): Promise<PrayerRequest[]> {
  let query = supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `
    )
    .order('created_at', { ascending: false })
    .limit(pageLimit);

  if (audienceMode === 'circle') {
    query = query.eq('audience', 'circle');
  } else {
    query = query.eq('audience', 'public');
  }

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  if (error || !data) {
    logError('getFeedPrayers', error);
    return [];
  }

  return data.map((row: Record<string, unknown>) => mapPrayerRequest(row));
}

export async function getPrayerById(prayerId: string): Promise<PrayerRequest | null> {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `
    )
    .eq('id', prayerId)
    .single();

  if (error || !data) {
    logError('fetch prayer', error);
    return null;
  }

  return mapPrayerRequest(data as Record<string, unknown>);
}

export async function createPrayerRequest(
  prayer: Omit<PrayerRequest, 'id' | 'createdAt'>
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const location = normalizePrayerLocation(prayer.city, prayer.country);

  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({
      user_id: user.id,
      body: prayer.text,
      category: prayer.category || null,
      audience: prayer.audience || 'public',
      location_city: location.city,
      location_country: location.country,
      location_lat: prayer.lat,
      location_lng: prayer.lng,
      is_anonymous: !prayer.username,
      comments_enabled: prayer.commentsEnabled ?? true,
    })
    .select('id')
    .single();

  if (error) {
    logError('create prayer', error);
    return null;
  }
  return (data as { id: string }).id;
}

export async function updatePrayerRequest(
  prayerId: string,
  body: string
): Promise<{ text: string; editedAt: string } | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ body })
    .eq('id', prayerId)
    .eq('user_id', user.id)
    .select('body, edited_at')
    .single();

  if (error || !data) {
    logError('update prayer', error);
    return null;
  }

  return {
    text: data.body as string,
    editedAt: data.edited_at as string,
  };
}

export async function deletePrayerRequest(prayerId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('prayer_requests')
    .delete()
    .eq('id', prayerId)
    .eq('user_id', user.id);

  if (error) {
    logError('delete prayer', error);
    return false;
  }
  return true;
}

// ─── Prayer Interactions ("I Prayed") ─────────────────────────────────

export async function togglePray(prayerId: string, prayed: boolean): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  if (prayed) {
    const { error } = await supabase
      .from('prayer_interactions')
      .insert({ user_id: user.id, prayer_id: prayerId });
    if (error) {
      logError('add prayer interaction', error);
      return false;
    }
    await supabase.rpc('increment_prayer_count', { p_prayer_id: prayerId });
  } else {
    const { error } = await supabase
      .from('prayer_interactions')
      .delete()
      .eq('user_id', user.id)
      .eq('prayer_id', prayerId);
    if (error) {
      logError('remove prayer interaction', error);
      return false;
    }
    await supabase.rpc('decrement_prayer_count', { p_prayer_id: prayerId });
  }
  return true;
}

// ─── Comments ──────────────────────────────────────────────────────────

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
  } catch (error) {
    logError('subscribe comments realtime', error);
    return () => {};
  }
}

// ─── Prayer Circle ─────────────────────────────────────────────────────

function mapCircleProfile(profile: unknown, fallbackId: string): PrayerCircleUser {
  const p = profile as Partial<PrayerCircleUser> | null;
  return {
    id: p?.id || fallbackId,
    username: p?.username || 'unknown',
    display_name: p?.display_name || null,
    avatar_url: p?.avatar_url || null,
  };
}

export async function sendPrayerCircleInvite(
  recipientId: string,
  message?: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === recipientId) return false;

  const { error } = await supabase.from('prayer_circle_invites').insert({
    requester_id: user.id,
    recipient_id: recipientId,
    message: message?.trim() || null,
  });

  if (error) {
    logError('send prayer circle invite', error);
    return false;
  }
  return true;
}

export async function cancelPrayerCircleInvite(inviteId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.rpc('cancel_prayer_circle_invite', {
    p_invite_id: inviteId,
  });

  if (error) {
    logError('cancel prayer circle invite', error);
    return false;
  }
  return true;
}

export async function respondToPrayerCircleInvite(
  inviteId: string,
  response: 'accepted' | 'declined'
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.rpc('respond_to_prayer_circle_invite', {
    p_invite_id: inviteId,
    p_status: response,
  });

  if (error) {
    logError('respond to prayer circle invite', error);
    return false;
  }
  return true;
}

export async function removeFromPrayerCircle(otherUserId: string): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.id === otherUserId) return false;

  const { error } = await supabase
    .from('prayer_circle_connections')
    .delete()
    .or(
      `and(user_a_id.eq.${user.id},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${user.id})`
    );

  if (error) {
    logError('remove from prayer circle', error);
    return false;
  }
  return true;
}

export async function getPrayerCircleStatus(otherUserId: string): Promise<PrayerCircleStatus> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { state: 'none' };
  if (user.id === otherUserId) return { state: 'self' };

  const { data: connection } = await supabase
    .from('prayer_circle_connections')
    .select('id')
    .or(
      `and(user_a_id.eq.${user.id},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${user.id})`
    )
    .maybeSingle();

  if (connection) return { state: 'connected' };

  const { data: invite } = await supabase
    .from('prayer_circle_invites')
    .select('id, requester_id, recipient_id')
    .eq('status', 'pending')
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${user.id})`
    )
    .maybeSingle();

  if (!invite) return { state: 'none' };

  const row = invite as { id: string; requester_id: string; recipient_id: string };
  return {
    state: row.requester_id === user.id ? 'pending_sent' : 'pending_received',
    inviteId: row.id,
  };
}

export async function getPrayerCircleUsernames(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('prayer_circle_connections')
    .select(
      `
      user_a_id,
      user_b_id,
      user_a:profiles!user_a_id(username),
      user_b:profiles!user_b_id(username)
    `
    )
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (!data) return [];

  return (data as Array<Record<string, unknown>>)
    .map((r) => {
      const isUserA = r.user_a_id === user.id;
      const profile = (isUserA ? r.user_b : r.user_a) as { username: string } | null;
      return profile?.username;
    })
    .filter(Boolean) as string[];
}

export async function getPrayerCircleMemberIds(includeSelf = false): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('prayer_circle_connections')
    .select('user_a_id, user_b_id')
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (!data) return includeSelf ? [user.id] : [];

  const ids = new Set<string>();
  if (includeSelf) ids.add(user.id);

  (data as Array<Record<string, unknown>>).forEach((row) => {
    const otherId = row.user_a_id === user.id ? row.user_b_id : row.user_a_id;
    if (typeof otherId === 'string') ids.add(otherId);
  });

  return Array.from(ids);
}

export async function getPrayerCircle(): Promise<PrayerCircleUser[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('prayer_circle_connections')
    .select(
      `
      user_a_id,
      user_b_id,
      created_at,
      user_a:profiles!user_a_id(id, username, display_name, avatar_url),
      user_b:profiles!user_b_id(id, username, display_name, avatar_url)
    `
    )
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (!data) return [];

  return (data as Array<Record<string, unknown>>).map((row) => {
    const isUserA = row.user_a_id === user.id;
    const profile = isUserA ? row.user_b : row.user_a;
    return {
      ...mapCircleProfile(profile, (isUserA ? row.user_b_id : row.user_a_id) as string),
      connected_at: row.created_at as string,
    };
  });
}

export async function getPrayerCircleInvites(): Promise<{
  incoming: PrayerCircleInvite[];
  outgoing: PrayerCircleInvite[];
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { incoming: [], outgoing: [] };

  const { data, error } = await supabase
    .from('prayer_circle_invites')
    .select(
      `
      id,
      requester_id,
      recipient_id,
      message,
      created_at,
      requester:profiles!requester_id(id, username, display_name, avatar_url),
      recipient:profiles!recipient_id(id, username, display_name, avatar_url)
    `
    )
    .eq('status', 'pending')
    .or(`requester_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error || !data) {
    logError('get prayer circle invites', error);
    return { incoming: [], outgoing: [] };
  }

  const invites = (data as Array<Record<string, unknown>>).map((row) => {
    return {
      id: row.id as string,
      requester_id: row.requester_id as string,
      recipient_id: row.recipient_id as string,
      message: (row.message as string | null) || null,
      created_at: row.created_at as string,
      requester: mapCircleProfile(row.requester, row.requester_id as string),
      recipient: mapCircleProfile(row.recipient, row.recipient_id as string),
    };
  });

  return {
    incoming: invites.filter((invite) => invite.recipient_id === user.id),
    outgoing: invites.filter((invite) => invite.requester_id === user.id),
  };
}

export async function getPrayerCircleCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('prayer_circle_connections')
    .select('id', { count: 'exact', head: true })
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  return count ?? 0;
}

// ─── Activity / Updates ────────────────────────────────────────────────

export type ActivityEventType =
  | 'comment_on_prayer'
  | 'reply_to_comment'
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

// ─── Reports ───────────────────────────────────────────────────────────

export type CreateReportResult = 'created' | 'already_reported' | 'failed';

export async function createReport(input: {
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
}): Promise<CreateReportResult> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 'failed';

  const { data: existingReport, error: existingReportError } = await supabase
    .from('reports')
    .select('id')
    .eq('reportable_type', input.reportable_type)
    .eq('reportable_id', input.reportable_id)
    .eq('reported_by', user.id)
    .eq('status', 'pending')
    .maybeSingle();

  if (existingReportError) {
    logError('check existing report', existingReportError);
    return 'failed';
  }

  if (existingReport) return 'already_reported';

  const { error } = await supabase.from('reports').insert({
    reportable_type: input.reportable_type,
    reportable_id: input.reportable_id,
    reported_by: user.id,
    reason: input.reason,
  });

  if (error) {
    if ('code' in error && error.code === '23505') {
      return 'already_reported';
    }
    logError('create report', error);
    return 'failed';
  }
  return 'created';
}

export interface ReportRecord {
  id: string;
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  moderator_note: string | null;
  reported_by: string;
  reporter_profile: ReportProfile | null;
  resolver_profile: ReportProfile | null;
}

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportStatusFilter = ReportStatus | 'all';

export interface ReportProfile {
  id: string;
  username: string | null;
  display_name: string | null;
}

type ReportRow = {
  id: string;
  reportable_type: 'prayer' | 'comment';
  reportable_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
  moderator_note?: string | null;
  reported_by: string;
};

function mapReportProfile(row: Record<string, unknown>): ReportProfile {
  return {
    id: row.id as string,
    username: (row.username as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
  };
}

export async function getReports(status: ReportStatusFilter = 'pending'): Promise<ReportRecord[]> {
  let query = supabase.from('reports').select('*').order('created_at', { ascending: false });

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const { data, error } = await query;

  if (error) {
    logError('fetch reports', error);
    return [];
  }

  const reports = (data as ReportRow[] | null) || [];
  const profileIds = Array.from(
    new Set(
      reports
        .flatMap((report) => [report.reported_by, report.resolved_by])
        .filter((id): id is string => Boolean(id))
    )
  );

  const profilesById = new Map<string, ReportProfile>();

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', profileIds);

    if (profilesError) {
      logError('fetch report profiles', profilesError);
    } else {
      (profiles as Array<Record<string, unknown>> | null)?.forEach((profile) => {
        const mapped = mapReportProfile(profile);
        profilesById.set(mapped.id, mapped);
      });
    }
  }

  return reports.map((report) => ({
    ...report,
    resolved_at: report.resolved_at ?? null,
    resolved_by: report.resolved_by ?? null,
    moderator_note: report.moderator_note ?? null,
    reporter_profile: profilesById.get(report.reported_by) ?? null,
    resolver_profile: report.resolved_by ? (profilesById.get(report.resolved_by) ?? null) : null,
  }));
}

export async function getPendingReports(): Promise<ReportRecord[]> {
  return getReports('pending');
}

export async function resolveReport(
  reportId: string,
  status: Exclude<ReportStatus, 'pending'>,
  moderatorNote?: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from('reports')
    .update({
      status,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
      moderator_note: moderatorNote ?? null,
    })
    .eq('id', reportId);

  if (error) {
    logError('resolve report', error);
    return false;
  }
  return true;
}

export async function isCurrentUserModerator(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('profiles')
    .select('is_moderator')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('check moderator access', error);
    return false;
  }

  return (data as { is_moderator?: boolean }).is_moderator === true;
}

// ─── Profiles ──────────────────────────────────────────────────────────

export async function updateProfile(data: {
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
}): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from('profiles').update(data).eq('id', user.id);

  if (error) {
    logError('update profile', error);
    return false;
  }
  return true;
}

export async function getMyProfile(): Promise<{
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  created_at: string;
} | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, location, created_at')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('fetch my profile', error);
    return null;
  }
  return data;
}

export async function getProfileByUsername(username: string): Promise<{
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
} | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .eq('username', username)
    .single();

  if (error || !data) {
    logError('fetch profile', error);
    return null;
  }
  return data;
}

export async function getUserPrayers(username: string): Promise<PrayerRequest[]> {
  const profile = await getProfileByUsername(username);
  if (!profile) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, created_at, edited_at, comments_enabled
    `
    )
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    logError('fetch user prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row, profile));
}

export async function searchUsers(
  query: string
): Promise<Array<{ username: string; display_name: string | null }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, display_name')
    .ilike('username', `%${query}%`)
    .limit(20);

  if (error || !data) {
    logError('search users', error);
    return [];
  }
  return data;
}

// ─── Saved Prayers ─────────────────────────────────────────────────────

export async function toggleSavePrayer(prayerId: string, save: boolean): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  if (save) {
    const { error } = await supabase
      .from('saved_prayers')
      .insert({ user_id: user.id, prayer_id: prayerId });
    if (error) {
      logError('save prayer', error);
      return false;
    }
  } else {
    const { error } = await supabase
      .from('saved_prayers')
      .delete()
      .eq('user_id', user.id)
      .eq('prayer_id', prayerId);
    if (error) {
      logError('unsave prayer', error);
      return false;
    }
  }
  return true;
}

export async function getSavedPrayerIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase.from('saved_prayers').select('prayer_id').eq('user_id', user.id);

  return (data || []).map((r: { prayer_id: string }) => r.prayer_id);
}

export async function getSavedPrayers(): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const savedIds = await getSavedPrayerIds();
  if (savedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
      profiles!inner(username, display_name, avatar_url)
    `
    )
    .in('id', savedIds)
    .order('created_at', { ascending: false });

  if (error || !data) {
    logError('fetch saved prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row));
}

export async function getMyPrayers(): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(
      `
      id, user_id, body, category,
      location_city, location_country, location_lat, location_lng,
      is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) {
    logError('fetch my prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row));
}

export async function getMyPrayedForPrayers(): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_interactions')
    .select(
      `
      prayer_id,
      prayer_requests!inner(
        id, user_id, body, category,
        location_city, location_country, location_lat, location_lng,
        is_anonymous, audience, prayer_count, comment_count, created_at, edited_at, comments_enabled,
        profiles!inner(username, display_name, avatar_url)
      )
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) {
    logError('fetch prayed-for prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const prayer = row.prayer_requests as Record<string, unknown>;
    return mapPrayerRequest(prayer);
  });
}

// ─── Waitlist ──────────────────────────────────────────────────────────

export async function subscribeToWaitlist(
  email: string,
  source: 'landing' | 'info' = 'landing'
): Promise<'subscribed' | 'exists' | 'error'> {
  const { error } = await supabase.from('waitlist').insert({ email, source });

  if (!error) return 'subscribed';

  if (error.code === '23505') return 'exists';

  logError('subscribe', error);
  return 'error';
}

// ─── Comments Toggle ──────────────────────────────────────────────────

export async function toggleCommentsEnabled(prayerId: string, enabled: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('prayer_requests')
    .update({ comments_enabled: enabled })
    .eq('id', prayerId);

  if (error) {
    logError('toggle comments', error);
    return false;
  }
  return true;
}

// ─── Account Deletion ─────────────────────────────────────────────────

type DeleteAccountResponse = {
  success?: boolean;
  error?: string;
};

type DeleteAccountInvokeResult = {
  data: DeleteAccountResponse | null;
  error: { message?: unknown } | null;
};

export async function deleteAccount(): Promise<string | null> {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      logError('delete account session', sessionError);
      return 'Please sign in again before deleting your account.';
    }
    if (!session) return 'Not authenticated';

    const result = (await supabase.functions.invoke<DeleteAccountResponse>('delete-account', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })) as unknown as DeleteAccountInvokeResult;

    if (result.error) {
      const message = result.error.message;
      return typeof message === 'string' && message
        ? message
        : "We couldn't delete your account. Please check your connection and try again.";
    }

    if (result.data?.error) return result.data.error;
    if (result.data?.success === false) return 'Failed to delete account';
    return null;
  } catch (error) {
    logError('delete account', error);
    return "We couldn't delete your account. Please check your connection and try again.";
  }
}

// ─── Prayer Interactions for current user ────────────────────────────

export async function getMyPrayedIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_interactions')
    .select('prayer_id')
    .eq('user_id', user.id);

  if (error || !data) {
    logError('fetch prayed IDs', error);
    return [];
  }

  return data.map((row: { prayer_id: string }) => row.prayer_id);
}

export async function getMySavedIds(): Promise<string[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_prayers')
    .select('prayer_id')
    .eq('user_id', user.id);

  if (error || !data) {
    logError('fetch saved IDs', error);
    return [];
  }

  return data.map((row: { prayer_id: string }) => row.prayer_id);
}

// ─── Profile Preferences ──────────────────────────────────────────────

export interface ProfilePreferences {
  notify_on_prayed: boolean;
  notify_on_comment: boolean;
  language: string;
  comments_enabled_default: boolean;
  profile_location_mode: 'manual' | 'auto';
}

const defaultPreferences: ProfilePreferences = {
  notify_on_prayed: true,
  notify_on_comment: true,
  language: 'auto',
  comments_enabled_default: true,
  profile_location_mode: 'manual',
};

export async function getProfilePreferences(): Promise<ProfilePreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return defaultPreferences;

  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('fetch preferences', error);
    return defaultPreferences;
  }

  const merged = {
    ...defaultPreferences,
    ...((data.preferences as Partial<ProfilePreferences>) || {}),
  };
  return {
    ...merged,
    profile_location_mode: merged.profile_location_mode === 'auto' ? 'auto' : 'manual',
  };
}

export async function updateProfilePreferences(
  prefs: Partial<ProfilePreferences>
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const current = await getProfilePreferences();
  const merged = { ...current, ...prefs };

  const { error } = await supabase
    .from('profiles')
    .update({ preferences: merged })
    .eq('id', user.id);

  if (error) {
    logError('update preferences', error);
    return false;
  }
  return true;
}
