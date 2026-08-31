import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';

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
