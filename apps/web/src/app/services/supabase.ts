import { createClient } from '@supabase/supabase-js';
import { setSupabaseClientProvider } from '@oratio/shared/client';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration: VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY must be set at build time.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// The shared query modules resolve the client through this provider.
setSupabaseClientProvider(() => supabase);
