import { supabase } from '../supabase';
import { mapPrayerRequest, PRAYER_SELECT } from './shared';
import type { PrayerRequest } from '../prayer-data';
import { logError } from '../../../lib/logger';

// ─── "I Prayed" ────────────────────────────────────────────────────────

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
