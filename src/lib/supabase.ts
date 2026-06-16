import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// When the env vars are missing, `createClient(undefined, undefined)` throws
// synchronously while this module is being evaluated — i.e. before React ever
// mounts. That crash can't be caught by the ErrorBoundary and leaves the user
// staring at the blue splash background with no way forward. Guard against it
// with valid placeholder values so the app still boots; auth/data calls will
// fail gracefully and the misconfiguration is reported in the console.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Oratio] Missing Supabase configuration: VITE_SUPABASE_URL and " +
      "VITE_SUPABASE_ANON_KEY must be set at build time. Sign-in and data " +
      "features will be unavailable until these are configured.",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
);
