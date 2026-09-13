import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const verifierEmail = process.env.ORATIO_QA_EMAIL;
const verifierPassword = process.env.ORATIO_QA_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required');
}

if (!verifierEmail || !verifierPassword) {
  throw new Error('ORATIO_QA_EMAIL and ORATIO_QA_PASSWORD are required');
}

const runId = Date.now().toString(36);
const email = `oratio.qa.delete.${runId}@example.com`;
const password = `OratioQA!${crypto.randomUUID()}`;
const username = `qa_delete_${runId}`;
const disposableClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const verifierClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let disposableUserId;
let disposablePrayerId;
let deletionSucceeded = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function deleteDisposableAccount(accessToken) {
  const { data, error } = await disposableClient.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) throw error;
  assert(data?.success === true, data?.error || 'Delete account did not return success');
  deletionSucceeded = true;
}

try {
  const { data: signUpData, error: signUpError } = await disposableClient.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (signUpError) throw signUpError;

  const session = signUpData.session;
  disposableUserId = signUpData.user?.id;
  assert(session && disposableUserId, 'Disposable signup did not return an authenticated session');

  const { data: profile, error: profileError } = await disposableClient
    .from('profiles')
    .select('id, username')
    .eq('id', disposableUserId)
    .single();
  if (profileError) throw profileError;
  assert(profile?.username === username, 'Disposable profile was not created correctly');

  const { data: prayer, error: prayerError } = await disposableClient
    .from('prayer_requests')
    .insert({
      user_id: disposableUserId,
      body: `Disposable account deletion QA prayer ${runId}`,
      category: 'Other',
      location_city: 'London',
      location_country: 'United Kingdom',
      is_anonymous: false,
    })
    .select('id')
    .single();
  if (prayerError) throw prayerError;
  disposablePrayerId = prayer.id;

  await deleteDisposableAccount(session.access_token);

  await disposableClient.auth.signOut();
  const { data: localSessionData } = await disposableClient.auth.getSession();
  assert(localSessionData.session === null, 'The disposable client retained a local session');

  const { error: deletedSignInError } = await disposableClient.auth.signInWithPassword({
    email,
    password,
  });
  assert(deletedSignInError, 'Deleted credentials unexpectedly signed in');

  const { error: verifierSignInError } = await verifierClient.auth.signInWithPassword({
    email: verifierEmail,
    password: verifierPassword,
  });
  if (verifierSignInError) throw verifierSignInError;

  const { data: remainingProfiles, error: remainingProfilesError } = await verifierClient
    .from('profiles')
    .select('id')
    .eq('id', disposableUserId);
  if (remainingProfilesError) throw remainingProfilesError;

  const { data: remainingPrayers, error: remainingPrayersError } = await verifierClient
    .from('prayer_requests')
    .select('id')
    .eq('id', disposablePrayerId);
  if (remainingPrayersError) throw remainingPrayersError;

  assert(remainingProfiles.length === 0, 'Deleted profile still exists');
  assert(remainingPrayers.length === 0, 'Deleted prayer still exists');

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        checks: {
          disposableSignup: true,
          dependentPrayerCreated: true,
          deleteFunctionSucceeded: true,
          localSessionCleared: true,
          deletedCredentialsRejected: true,
          profileRemoved: true,
          dependentPrayerRemoved: true,
        },
      },
      null,
      2
    )
  );
} finally {
  await verifierClient.auth.signOut().catch(() => undefined);

  if (!deletionSucceeded) {
    const {
      data: { session },
    } = await disposableClient.auth.getSession();
    if (session) {
      await deleteDisposableAccount(session.access_token).catch(() => undefined);
    }
  }
}
