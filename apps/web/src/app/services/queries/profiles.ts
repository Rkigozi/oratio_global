import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';
import type { RpcResponse } from './shared';

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
