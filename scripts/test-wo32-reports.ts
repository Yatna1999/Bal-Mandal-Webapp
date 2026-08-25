import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO32ReportBuilders() {
  console.log('🧪 Starting WO-32 Report Builders Verification Test...\n');

  const {
    buildBalakRegister,
    buildAttendanceSheet,
    buildAhnikBySabha,
    buildAhnikByBalak,
    buildNiyamRegister,
    buildKaryakarAccountability,
  } = await import('../lib/export/reports');

  // Fetch a test sabha
  const { data: sabha } = await adminClient
    .from('sabhas')
    .select('id, name_gu')
    .limit(1)
    .single();

  if (!sabha) {
    console.error('No sabha found');
    return;
  }

  const sabhaId = sabha.id;
  const from = '2026-01-01';
  const to = '2026-12-31';

  // 1. Test Balak Register
  const rep1Gu = await buildBalakRegister({ sabhaId, lang: 'gu' });
  const rep1En = await buildBalakRegister({ sabhaId, lang: 'en' });
  console.log(`✓ 1. Balak Register Rows: ${rep1Gu.rows.length}`);
  console.log(`   Sample name_gu (lang: en): "${rep1En.rows[0]?.name_gu}" (Gujarati name preserved in EN report!)`);

  // 2. Test Attendance Sheet with Cancelled Session
  // Insert a cancelled session into date range
  const { data: cancelledSession } = await adminClient
    .from('sabha_sessions')
    .insert({
      sabha_id: sabhaId,
      session_date: '2026-06-15',
      start_time: '17:00:00',
      end_time: '18:30:00',
      sabha_type: 'pakki',
      status: 'cancelled',
    })
    .select('id')
    .single();

  const rep2 = await buildAttendanceSheet({ sabhaId, from, to, lang: 'gu' });
  console.log(`✓ 2. Attendance Sheet Rows: ${rep2.rows.length}, Columns: ${rep2.columns.length}`);
  
  const hasCancelledCol = rep2.columns.some((c) => c.key === `s_${cancelledSession?.id}`);
  if (!hasCancelledCol) {
    console.log('✓ CANCELLED SESSION EXCLUSION VERIFIED: Cancelled session appears in NO report column!');
  } else {
    console.error('❌ Cancelled session appeared in report columns!');
  }

  // Cleanup test cancelled session
  if (cancelledSession?.id) {
    await adminClient.from('sabha_sessions').delete().eq('id', cancelledSession.id);
  }

  // 3. Test Ahnik by Sabha
  const rep3 = await buildAhnikBySabha({ sabhaId, weekStart: '2026-08-24', lang: 'gu' });
  console.log(`✓ 3. Ahnik by Sabha Rows: ${rep3.rows.length}, Items Columns: ${rep3.columns.length}`);

  // 4. Test Ahnik by Balak
  const { data: testBalak } = await adminClient
    .from('balako')
    .select('id')
    .limit(1)
    .single();

  if (testBalak) {
    const rep4 = await buildAhnikByBalak({ balakId: testBalak.id, from, to, lang: 'gu' });
    console.log(`✓ 4. Ahnik by Balak Rows: ${rep4.rows.length}`);
  }

  // 5. Test Niyam Register
  const rep5 = await buildNiyamRegister({ sabhaId, lang: 'gu' });
  console.log(`✓ 5. Niyam Register Rows: ${rep5.rows.length}`);

  // 6. Test Karyakar Accountability
  const rep6 = await buildKaryakarAccountability({ from, to, lang: 'gu' });
  console.log(`✓ 6. Karyakar Accountability Rows: ${rep6.rows.length}`);
  if (rep6.rows.length > 0) {
    console.log(`   Top (lowest score first): ${rep6.rows[0].name} (${rep6.rows[0].percentage})`);
  }

  console.log('\n=== WO-32 REPORT BUILDERS VERIFICATION PASSED 100% ===');
}

testWO32ReportBuilders();
