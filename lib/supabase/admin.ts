// SERVER ONLY. Bypasses RLS. Never import this into a client component.
// Only used by: the cron dispatcher, and super admin account creation.
//
// This file must have ZERO side effects at module evaluation time.
// Vercel's build process evaluates route modules to collect configuration
// (like `export const dynamic`) even when env vars are not available.
// Any top-level code that reads process.env and passes it to a function
// that validates it will crash the build.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

let _client: SupabaseClient<Database> | null = null;

function getAdminClient(): SupabaseClient<Database> {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These must be set as environment variables.'
    );
  }

  _client = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

/**
 * Lazy-initialised admin Supabase client.
 * Accessing any property on this object triggers client creation,
 * so the env vars are only read at runtime — never at build time.
 */
export const adminClient: SupabaseClient<Database> = new Proxy(
  {} as SupabaseClient<Database>,
  {
    get(_target, prop, receiver) {
      const client = getAdminClient();
      const value = Reflect.get(client, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    },
  }
);
