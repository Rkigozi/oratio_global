import type { SupabaseClient } from '@supabase/supabase-js';

// Each app registers its own Supabase client at startup. The query modules
// live in packages/shared and resolve the client lazily through this holder,
// so the same code runs on web (env-var client) and mobile (AsyncStorage
// client) without coupling shared code to either platform.

let provider: (() => SupabaseClient) | null = null;
let cached: SupabaseClient | null = null;

export function setSupabaseClientProvider(fn: () => SupabaseClient) {
  provider = fn;
}

export function getSupabaseClient(): SupabaseClient {
  if (cached) return cached;
  if (!provider) {
    throw new Error(
      'Supabase client provider has not been configured — call setSupabaseClientProvider() at app startup'
    );
  }
  cached = provider();
  return cached;
}
