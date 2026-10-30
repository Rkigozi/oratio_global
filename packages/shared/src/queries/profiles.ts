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
import type { RpcResponse } from './shared';

const supabase = getSupabaseClient();

type ProfileUpdate = {
  username?: string;
  display_name?: string;
  bio?: string;
  location?: string;
  avatar_url?: string;
};

export async function updateProfile(
  data: ProfileUpdate,
  attempt?: WriteAttempt & { expectedValues: Partial<Record<keyof ProfileUpdate, string | null>> }
): Promise<boolean> {
  if (attempt) {
    let writeStarted = false;
    try {
      const user = await getWriteUser(attempt);
      const keys = Object.keys(data) as Array<keyof ProfileUpdate>;
      if (!keys.length || keys.some((key) => !Object.hasOwn(attempt.expectedValues, key)))
        throw new WriteOutcomeError(attempt.verifyExisting);
      const { data: current, error: readError } = await withWriteSignal(
        supabase
          .from('profiles')
          .select('id, username, display_name, bio, location, avatar_url')
          .eq('id', user.id),
        attempt
      ).maybeSingle();
      if (readError) throw readError;
      if (!current || current.id !== user.id) throw new WriteOutcomeError(attempt.verifyExisting);
      if (keys.every((key) => current[key] === data[key])) return true;
      if (keys.some((key) => (current[key] ?? null) !== attempt.expectedValues[key]))
        throw new WriteOutcomeError(attempt.verifyExisting);
      assertWriteDeadline(attempt);
      let query = supabase.from('profiles').update(data).eq('id', user.id);
      for (const key of keys)
        query =
          attempt.expectedValues[key] == null
            ? query.is(key, null)
            : query.eq(key, attempt.expectedValues[key]!);
      writeStarted = true;
      const { data: updated, error } = await withWriteSignal(
        query.select('id, username, display_name, bio, location, avatar_url'),
        attempt
      ).single();
      if (error) throw error;
      if (!updated || updated.id !== user.id || !keys.every((key) => updated[key] === data[key]))
        throw new WriteOutcomeError(true);
      return true;
    } catch (cause) {
      const error = writeOutcomeError(cause, attempt, writeStarted);
      logError('update profile', error);
      throw error;
    }
  }
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

export async function getMyProfile({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<{
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
    error: authError,
  } = await supabase.auth.getUser();
  if (!user || authError) {
    if (throwOnError) throw new Error('Profile unavailable');
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, location, created_at')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('fetch my profile', error);
    if (throwOnError) throw new Error('Profile unavailable');
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
  const normalizedUsername = username.trim().toLowerCase();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, created_at')
    .eq('username', normalizedUsername)
    .maybeSingle();

  if (error) {
    logError('fetch profile', error);
    return null;
  }

  if (data) return data;

  const resolveResult = (await supabase.rpc('resolve_profile_by_username', {
    p_username: normalizedUsername,
  })) as unknown as RpcResponse<
    Array<{
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      created_at: string;
    }>
  >;

  if (resolveResult.error) {
    logError('resolve profile username', resolveResult.error);
    return null;
  }

  return resolveResult.data?.[0] ?? null;
}

export async function searchUsers(
  query: string,
  { throwOnError = false }: { throwOnError?: boolean } = {}
): Promise<Array<{ username: string; display_name: string | null }>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username, display_name')
    .ilike('username', `%${query}%`)
    .limit(20);

  if (error || !data) {
    logError('search users', error);
    if (throwOnError) throw new Error('User search unavailable');
    return [];
  }
  return data;
}

export interface ProfilePreferences {
  notify_on_prayed: boolean;
  notify_on_comment: boolean;
  language: string;
  comments_enabled_default: boolean;
  profile_location_mode: 'manual' | 'auto';
  theme: 'system' | 'light' | 'dark';
}

const defaultPreferences: ProfilePreferences = {
  notify_on_prayed: true,
  notify_on_comment: true,
  language: 'auto',
  comments_enabled_default: true,
  profile_location_mode: 'manual',
  theme: 'system',
};

export async function getProfilePreferences({
  throwOnError = false,
}: { throwOnError?: boolean } = {}): Promise<ProfilePreferences> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (throwOnError && (authError || !user)) throw new Error('Settings unavailable');
  if (!user) return defaultPreferences;

  const { data, error } = await supabase
    .from('profiles')
    .select('preferences')
    .eq('id', user.id)
    .single();

  if (error || !data) {
    logError('fetch preferences', error);
    if (throwOnError) throw new Error('Settings unavailable');
    return defaultPreferences;
  }

  const merged = {
    ...defaultPreferences,
    ...((data.preferences as Partial<ProfilePreferences>) || {}),
  };
  return {
    ...merged,
    profile_location_mode: merged.profile_location_mode === 'auto' ? 'auto' : 'manual',
    theme:
      merged.theme === 'light' || merged.theme === 'dark' || merged.theme === 'system'
        ? merged.theme
        : 'system',
  };
}

export async function updateProfilePreferences(
  prefs: Partial<ProfilePreferences>,
  attempt?: WriteAttempt
): Promise<boolean> {
  if (attempt) {
    let writeStarted = false;
    try {
      const user = await getWriteUser(attempt);
      const { data: current, error: readError } = await withWriteSignal(
        supabase.from('profiles').select('id, preferences').eq('id', user.id),
        attempt
      ).maybeSingle();
      if (readError) throw readError;
      if (!current || current.id !== user.id) throw new WriteOutcomeError(attempt.verifyExisting);
      const merged = { ...defaultPreferences, ...current.preferences, ...prefs };
      if (
        attempt.verifyExisting &&
        Object.entries(prefs).every(
          ([key, value]) => ({ ...defaultPreferences, ...current.preferences })[key] === value
        )
      )
        return true;
      assertWriteDeadline(attempt);
      writeStarted = true;
      let query = supabase.from('profiles').update({ preferences: merged }).eq('id', user.id);
      query =
        current.preferences == null
          ? query.is('preferences', null)
          : query.eq('preferences', JSON.stringify(current.preferences));
      const { data, error } = await withWriteSignal(
        query.select('id, preferences'),
        attempt
      ).single();
      if (error) throw error;
      if (
        !data ||
        data.id !== user.id ||
        !Object.entries(prefs).every(([key, value]) => data.preferences?.[key] === value)
      )
        throw new WriteOutcomeError(true);
      return true;
    } catch (cause) {
      const error = writeOutcomeError(cause, attempt, writeStarted);
      logError('update preferences', error);
      throw error;
    }
  }
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
