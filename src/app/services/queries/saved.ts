import { supabase } from '../supabase';
import { mapPrayerRequest, PRAYER_SELECT } from './shared';
import type { PrayerRequest } from '../prayer-data';
import { logError } from '../../../lib/logger';

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

export async function getSavedPrayers(): Promise<PrayerRequest[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const savedIds = await getSavedPrayerIds();
  if (savedIds.length === 0) return [];

  const { data, error } = await supabase
    .from('prayer_requests')
    .select(PRAYER_SELECT)
    .in('id', savedIds)
    .order('created_at', { ascending: false });

  if (error || !data) {
    logError('fetch saved prayers', error);
    return [];
  }

  return (data as Array<Record<string, unknown>>).map((row) => mapPrayerRequest(row));
}
