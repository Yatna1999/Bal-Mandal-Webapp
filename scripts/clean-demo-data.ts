import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error('Missing Supabase keys in .env.local');
  process.exit(1);
}

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function cleanDemoData() {
  console.log('🧹 Starting Demo Data Cleanup...\n');

  // 1. Find demo balako with tag [DEMO]
  const { data: demoBalako } = await adminClient
    .from('balako')
    .select('id, full_name_en')
    .or('full_name_en.ilike.[DEMO]%,full_name_en.ilike.demo_%');

  const demoBalakIds = (demoBalako || []).map((b) => b.id);

  if (demoBalakIds.length > 0) {
    console.log(`Found ${demoBalakIds.length} demo balako. Cleaning up related records...`);

    // Delete attendance rows
    await adminClient.from('attendance').delete().in('balak_id', demoBalakIds);

    // Delete ahnik weeks & entries
    const { data: aWeeks } = await adminClient
      .from('ahnik_weeks')
      .select('id')
      .in('balak_id', demoBalakIds);
    const weekIds = (aWeeks || []).map((w) => w.id);
    if (weekIds.length > 0) {
      await adminClient.from('ahnik_entries').delete().in('ahnik_week_id', weekIds);
      await adminClient.from('ahnik_weeks').delete().in('balak_id', demoBalakIds);
    }

    // Delete niyams
    await adminClient.from('niyams').delete().in('balak_id', demoBalakIds);

    // Delete balak_sabhas
    await adminClient.from('balak_sabhas').delete().in('balak_id', demoBalakIds);

    // Delete balako
    await adminClient.from('balako').delete().in('id', demoBalakIds);

    console.log(`✓ Removed ${demoBalakIds.length} demo balako and all associated records`);
  } else {
    console.log('No demo balako found.');
  }

  // 2. Find demo karyakars (demo_*@balsabha.local)
  const { data: userList } = await adminClient.auth.admin.listUsers();
  const demoUsers = (userList?.users || []).filter((u) => u.email?.startsWith('demo_'));

  if (demoUsers.length > 0) {
    console.log(`\nFound ${demoUsers.length} demo karyakars. Cleaning up...`);

    for (const u of demoUsers) {
      // Delete karyakar_sabhas
      await adminClient.from('karyakar_sabhas').delete().eq('karyakar_id', u.id);

      // Delete session_followup_karyakars
      await adminClient.from('session_followup_karyakars').delete().eq('karyakar_id', u.id);

      // Delete karyakar record
      await adminClient.from('karyakars').delete().eq('id', u.id);

      // Delete auth user
      await adminClient.auth.admin.deleteUser(u.id);

      console.log(`✓ Removed demo karyakar auth user: ${u.email}`);
    }
  } else {
    console.log('No demo karyakars found.');
  }

  console.log('\n=== DEMO DATA CLEANUP COMPLETE ===');
}

cleanDemoData();
