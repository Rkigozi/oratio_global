import { getSupabaseClient } from '../client';
import { mapPrayerRequest, PRAYER_SELECT } from './shared';
import type { PrayerRequest } from '../prayer-data';
import { logError } from '../logger';
import { setPrayerMembership, type WriteAttempt } from '../write-outcome';

const supabase = getSupabaseClient();

// ─── "I Prayed" ────────────────────────────────────────────────────────

export async function togglePray(
  prayerId: string,
  prayed: boolean,
  attempt?: WriteAttempt
): Promise<boolean> {
  if (attempt) return setPrayerMembership('prayer_interactions', prayerId, prayed, attempt);
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
  }
  return true;
}

export async function getMyPrayedIds({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<string[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (throwOnError && (authError || !user)) throw new Error('Prayer responses unavailable');
  if (!user) return [];

  const { data, error } = await supabase
    .from('prayer_interactions')
    .select('prayer_id')
    .eq('user_id', user.id);

  if (error || !data) {
    logError('fetch prayed IDs', error);
    if (throwOnError) throw new Error('Prayer responses unavailable');
    return [];
  }

  return data.map((row: { prayer_id: string }) => row.prayer_id);
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
      prayer_requests!inner(${PRAYER_SELECT})
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
