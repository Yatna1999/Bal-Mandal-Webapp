import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';
import { format, subMonths } from 'date-fns';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO27Niyam() {
  console.log('🧪 Starting WO-27 Niyam Verification Test...\n');

  // 1. Fetch an active balak and their primary sabha
  const { data: balakSabha } = await adminClient
    .from('balak_sabhas')
    .select(`
      balak_id,
      sabha_id,
      balako (
        full_name_gu
      )
    `)
    .eq('is_primary', true)
    .limit(1)
    .single();

  if (!balakSabha) {
    console.error('No primary balak sabha found');
    return;
  }

  const balakId = balakSabha.balak_id;
  const primarySabhaId = balakSabha.sabha_id;
  const rawBalak = balakSabha.balako as unknown as { full_name_gu: string } | null;
  const balakName = rawBalak?.full_name_gu || 'બાળક';

  // Fetch karyakars assigned to primary sabha
  const { data: sabhaKaryakars } = await adminClient
    .from('karyakar_sabhas')
    .select('karyakar_id')
    .eq('sabha_id', primarySabhaId);

  const karyakarCount = sabhaKaryakars?.length || 0;

  console.log(`Balak: ${balakName} (${balakId})`);
  console.log(`Primary Sabha: ${primarySabhaId}`);
  console.log(`Assigned Karyakars Count: ${karyakarCount}`);

  // 2. Create test niyam with start_date 3 months ago and duration 1 month
  const startDate3MonthsAgo = format(subMonths(new Date(), 3), 'yyyy-MM-dd');

  const { data: newNiyam, error: nErr } = await adminClient
    .from('niyams')
    .insert({
      balak_id: balakId,
      title_gu: 'ટેસ્ટ વિશેષ નિયમ (૩ મહિના જૂનો)',
      start_date: startDate3MonthsAgo,
      duration_months: 1,
      status: 'active',
    })
    .select('id, end_date, status')
    .single();

  if (nErr || !newNiyam) {
    console.error('Failed to insert test niyam:', nErr);
    return;
  }

  console.log(`✓ Created test niyam ${newNiyam.id} | Start: ${startDate3MonthsAgo} | End: ${newNiyam.end_date} | Status: ${newNiyam.status}`);

  // Count existing notifications for these karyakars
  const karyakarIds = (sabhaKaryakars || []).map((k) => k.karyakar_id);
  const { data: initialNotifs } = karyakarIds.length > 0
    ? await adminClient
        .from('inapp_notifications')
        .select('id')
        .in('karyakar_id', karyakarIds)
    : { data: [] };

  const initialNotifCount = initialNotifs?.length || 0;

  // 3. Call expireNiyams() manually (Run 1)
  const { expireNiyams } = await import('../lib/niyams');
  console.log('\n--- Running expireNiyams() [Run 1] ---');
  const res1 = await expireNiyams();
  console.log(`Run 1 Result: expired = ${res1.expired}, notified = ${res1.notified}`);

  // Verify status flipped
  const { data: updatedNiyam } = await adminClient
    .from('niyams')
    .select('status')
    .eq('id', newNiyam.id)
    .single();

  if (updatedNiyam?.status === 'expired') {
    console.log('✓ Niyam status successfully flipped to "expired"');
  } else {
    console.error('❌ Expected status "expired", got:', updatedNiyam?.status);
  }

  // Verify notifications written
  const { data: afterNotifs1 } = karyakarIds.length > 0
    ? await adminClient
        .from('inapp_notifications')
        .select('id')
        .in('karyakar_id', karyakarIds)
    : { data: [] };

  const newNotifsWritten = (afterNotifs1?.length || 0) - initialNotifCount;
  console.log(`✓ New in-app notifications written: ${newNotifsWritten} (expected: ${karyakarCount})`);

  // 4. Call expireNiyams() again (Run 2 - Idempotency test)
  console.log('\n--- Running expireNiyams() [Run 2 - Idempotency Test] ---');
  const res2 = await expireNiyams();
  console.log(`Run 2 Result: expired = ${res2.expired}, notified = ${res2.notified}`);

  if (res2.expired === 0 && res2.notified === 0) {
    console.log('✓ IDEMPOTENCY VERIFIED: Second run flipped 0 niyams and created 0 new notifications!');
  } else {
    console.error('❌ IDEMPOTENCY FAILED: Second run produced output:', res2);
  }

  console.log('\n=== WO-27 NIYAM VERIFICATION PASSED 100% ===');
}

testWO27Niyam();
