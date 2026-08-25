// SERVER ONLY. Bypasses RLS. Never import this into a client component.
// Only used by: the cron dispatcher, and super admin account creation.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';

if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts imported on client side');
}

export const adminClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
