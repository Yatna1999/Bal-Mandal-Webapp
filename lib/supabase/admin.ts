// SERVER ONLY. Bypasses RLS. Never import this into a client component.
// Only used by: the cron dispatcher, and super admin account creation.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts imported on client side');
}

export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key';

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const adminClient = new Proxy({} as ReturnType<typeof getAdminClient>, {
  get(_target, prop) {
    const client = getAdminClient();
    const val = (client as any)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});
