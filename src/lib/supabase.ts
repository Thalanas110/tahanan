import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. Did you forget to configure Supabase env vars?',
  );
}

import { supabaseStorageAdapter } from './supabaseStorageAdapter';

// Note: we intentionally do NOT pass a `Database` generic here. Every hook in
// src/hooks casts query results to the hand-written types in
// src/types/database.ts, which is simpler and more reliable than keeping a
// full hand-maintained `Database` generic (Views/Functions/Enums/etc.) in
// sync with supabase-js's stricter generic constraints.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: supabaseStorageAdapter,
  },
});

/**
 * Invoke a Supabase Edge Function with the current user's access token
 * automatically attached (supabase-js does this for us). Throws a plain
 * Error with the function's error message on failure so callers can show
 * it directly to the user.
 */
export async function invokeEdgeFunction<T>(
  name: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
  });

  if (error) {
    // FunctionsHttpError carries the real error message in the response body.
    const context = (error as { context?: Response }).context;
    if (context) {
      let payload: { error?: string } | null = null;
      try {
        payload = await context.clone().json();
      } catch {
        // JSON parse failed; fall through to generic message
      }
      throw new Error(payload?.error ?? error.message);
    }
    throw new Error(error.message);
  }

  return data as T;
}
