import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, getSupabaseEnvOptional } from "@/lib/env";

let cachedBrowserClient: SupabaseClient | null = null;

export function createSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function createSupabaseBrowserClientOptional() {
  const env = getSupabaseEnvOptional();

  if (!env) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

export function getSupabaseBrowserClient() {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  cachedBrowserClient = createSupabaseBrowserClientOptional();
  return cachedBrowserClient;
}
