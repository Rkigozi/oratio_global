import { getSupabaseClient } from '../client';

const supabase = getSupabaseClient();
export const BLOCKED_ACCOUNTS_PAGE_SIZE = 50;

export interface BlockedAccount {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  blocked_at: string;
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error('Sign in again to manage blocked accounts.');
  return data.user;
}

export async function blockUser(userId: string): Promise<void> {
  const user = await requireUser();
  if (!userId || userId === user.id) throw new Error('Choose another account to block.');
  const { error } = await supabase.rpc('block_user', { p_user_id: userId });
  if (error) throw new Error("We couldn't block this account. Please try again.");
}

export async function unblockUser(userId: string): Promise<void> {
  await requireUser();
  const { error } = await supabase.rpc('unblock_user', { p_user_id: userId });
  if (error) throw new Error("We couldn't unblock this account. Please try again.");
}

export async function getBlockedAccounts(offset = 0): Promise<BlockedAccount[]> {
  await requireUser();
  const { data, error } = await supabase.rpc('get_blocked_accounts', {
    p_limit: BLOCKED_ACCOUNTS_PAGE_SIZE,
    p_offset: Math.max(0, Math.trunc(offset) || 0),
  });
  if (error) throw new Error("We couldn't load blocked accounts. Please try again.");
  return (data ?? []) as BlockedAccount[];
}
