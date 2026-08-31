import { supabase } from '../supabase';
import { logError } from '../../../lib/logger';

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
