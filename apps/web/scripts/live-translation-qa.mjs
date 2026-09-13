import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const email = process.env.ORATIO_QA_EMAIL;
const password = process.env.ORATIO_QA_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are required');
}

if (!email || !password) {
  throw new Error('ORATIO_QA_EMAIL and ORATIO_QA_PASSWORD are required');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

try {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  const sourceText = 'Please pray for hope today';
  const { data, error } = await supabase.functions.invoke('translate', {
    body: { q: sourceText, target: 'es' },
  });
  if (error) {
    const status = error.context instanceof Response ? error.context.status : 'unknown';
    throw new Error(`Translation function failed with status ${status}`);
  }

  const translation = data?.data?.translations?.[0];
  if (
    typeof translation?.translatedText !== 'string' ||
    translation.translatedText === sourceText
  ) {
    throw new Error('Translation function did not return changed text');
  }

  console.log(
    JSON.stringify(
      {
        status: 'pass',
        checks: {
          authenticatedInvocation: true,
          translatedTextReturned: true,
          sourceLanguageDetected: typeof translation.detectedSourceLanguage === 'string',
          contentPrinted: false,
        },
      },
      null,
      2
    )
  );
} finally {
  await supabase.auth.signOut().catch(() => undefined);
}
