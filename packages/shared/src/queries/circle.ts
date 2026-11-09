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
  connection_id?: string;
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
  message?: string,
  attempt?: WriteAttempt
): Promise<boolean> {
  if (attempt) return performCircleWrite({ kind: 'invite', recipientId, message }, attempt);
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

export async function cancelPrayerCircleInvite(
  inviteId: string,
  attempt?: WriteAttempt
): Promise<boolean> {
  if (attempt) return performCircleWrite({ kind: 'cancel', inviteId }, attempt);
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
  response: 'accepted' | 'declined',
  attempt?: WriteAttempt
): Promise<boolean> {
  if (attempt) return performCircleWrite({ kind: 'respond', inviteId, response }, attempt);
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

export async function removeFromPrayerCircle(
  otherUserId: string,
  attempt?: WriteAttempt & { connectionId?: string }
): Promise<boolean> {
  if (attempt)
    return performCircleWrite(
      { kind: 'remove', otherUserId, connectionId: attempt.connectionId },
      attempt
    );
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

export async function getPrayerCircleStatus(
  otherUserId: string,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<PrayerCircleStatus> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (throwOnError && (authError || !user)) {
    throw authError || new Error('Sign in to manage your Prayer Circle.');
  }
  if (!user) return { state: 'none' };
  if (user.id === otherUserId) return { state: 'self' };

  const { data: connection, error: connectionError } = await supabase
    .from('prayer_circle_connections')
    .select('id')
    .or(
      `and(user_a_id.eq.${user.id},user_b_id.eq.${otherUserId}),and(user_a_id.eq.${otherUserId},user_b_id.eq.${user.id})`
    )
    .maybeSingle();

  if (throwOnError && connectionError) throw connectionError;
  if (connection) return { state: 'connected' };

  const { data: invite, error: inviteError } = await supabase
    .from('prayer_circle_invites')
    .select('id, requester_id, recipient_id')
    .eq('status', 'pending')
    .or(
      `and(requester_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},recipient_id.eq.${user.id})`
    )
    .maybeSingle();

  if (throwOnError && inviteError) throw inviteError;
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

export async function getPrayerCircle({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<PrayerCircleUser[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (throwOnError && (authError || !user)) throw new Error('Prayer Circle unavailable');
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_circle_connections')
    .select(
      `
      id,
      user_a_id,
      user_b_id,
      created_at,
      user_a:profiles!user_a_id(id, username, display_name, avatar_url),
      user_b:profiles!user_b_id(id, username, display_name, avatar_url)
    `
    )
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (throwOnError) throw new Error('Prayer Circle unavailable');
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => {
    const isUserA = row.user_a_id === user.id;
    const profile = isUserA ? row.user_b : row.user_a;
    return {
      ...mapCircleProfile(profile, (isUserA ? row.user_b_id : row.user_a_id) as string),
      connected_at: row.created_at as string,
      connection_id: row.id as string,
    };
  });
}

export async function getPrayerCircleInvites({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<{
  incoming: PrayerCircleInvite[];
  outgoing: PrayerCircleInvite[];
}> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (throwOnError && (authError || !user)) throw new Error('Prayer Circle invites unavailable');
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
    if (throwOnError) throw new Error('Prayer Circle invites unavailable');
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

export async function getPrayerCircleCount(
  userId: string,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<number> {
  const { count, error } = await supabase
    .from('prayer_circle_connections')
    .select('id', { count: 'exact', head: true })
    .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

  if (throwOnError && (error || count == null)) {
    throw error || new Error('Prayer Circle count unavailable.');
  }
  return count ?? 0;
}

type CircleWrite =
  | { kind: 'invite'; recipientId: string; message?: string }
  | { kind: 'cancel'; inviteId: string }
  | { kind: 'respond'; inviteId: string; response: 'accepted' | 'declined' }
  | { kind: 'remove'; otherUserId: string; connectionId?: string };

async function performCircleWrite(action: CircleWrite, attempt: WriteAttempt): Promise<boolean> {
  let writeStarted = false;
  try {
    const user = await getWriteUser(attempt);
    if (action.kind === 'invite') {
      if (!action.recipientId || action.recipientId === user.id) throw new WriteOutcomeError(false);
      const message = action.message?.trim() || null;
      const recover = async () => {
        const { data, error } = await withWriteSignal(
          supabase
            .from('prayer_circle_invites')
            .select('id, requester_id, recipient_id, message, status')
            .eq('id', attempt.requestId)
            .eq('requester_id', user.id)
            .eq('recipient_id', action.recipientId),
          attempt
        ).maybeSingle();
        if (error) throw new WriteOutcomeError(true);
        if (!data) return false;
        if (
          data.id !== attempt.requestId ||
          data.requester_id !== user.id ||
          data.recipient_id !== action.recipientId ||
          data.message !== message ||
          !['pending', 'accepted', 'declined', 'cancelled'].includes(data.status)
        )
          throw new WriteOutcomeError(true);
        return true;
      };
      if (attempt.verifyExisting && (await recover())) return true;
      assertWriteDeadline(attempt);
      writeStarted = true;
      const { error } = await withWriteSignal(
        supabase.from('prayer_circle_invites').insert({
          id: attempt.requestId,
          requester_id: user.id,
          recipient_id: action.recipientId,
          message,
        }),
        attempt
      );
      if (error?.code === '23505') {
        if (await recover()) return true;
        throw new WriteOutcomeError(true);
      }
      if (error) throw error;
      return true;
    }
    if (action.kind === 'remove') {
      if (!action.connectionId || action.otherUserId === user.id)
        throw new WriteOutcomeError(false);
      const pair = `and(user_a_id.eq.${user.id},user_b_id.eq.${action.otherUserId}),and(user_a_id.eq.${action.otherUserId},user_b_id.eq.${user.id})`;
      if (attempt.verifyExisting) {
        const { data, error } = await withWriteSignal(
          supabase
            .from('prayer_circle_connections')
            .select('id')
            .eq('id', action.connectionId)
            .or(pair),
          attempt
        ).maybeSingle();
        if (error) throw error;
        if (!data) return true;
      }
      assertWriteDeadline(attempt);
      writeStarted = true;
      const { error } = await withWriteSignal(
        supabase.from('prayer_circle_connections').delete().eq('id', action.connectionId).or(pair),
        attempt
      );
      if (error) throw error;
      return true;
    }
    const desired = action.kind === 'cancel' ? 'cancelled' : action.response;
    const { data: invite, error: readError } = await withWriteSignal(
      supabase
        .from('prayer_circle_invites')
        .select('id, status')
        .eq('id', action.inviteId)
        .eq(action.kind === 'cancel' ? 'requester_id' : 'recipient_id', user.id),
      attempt
    ).maybeSingle();
    if (readError) throw readError;
    if (!invite) throw new WriteOutcomeError(attempt.verifyExisting);
    if (invite.status === desired) return true;
    if (invite.status !== 'pending') return false;
    assertWriteDeadline(attempt);
    writeStarted = true;
    const { error } = await withWriteSignal(
      action.kind === 'cancel'
        ? supabase.rpc('cancel_prayer_circle_invite', { p_invite_id: action.inviteId })
        : supabase.rpc('respond_to_prayer_circle_invite', {
            p_invite_id: action.inviteId,
            p_status: action.response,
          }),
      attempt
    );
    if (error) throw error;
    return true;
  } catch (cause) {
    const error = writeOutcomeError(cause, attempt, writeStarted);
    logError('update prayer circle', error);
    throw error;
  }
}
