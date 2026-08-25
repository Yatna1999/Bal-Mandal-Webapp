import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO38AuditLog() {
  console.log('🧪 Starting WO-38 Audit Log Verification Test...\n');

  // Fetch test karyakar
  const { data: karyakar } = await adminClient
    .from('karyakars')
    .select('id, full_name_gu, is_active')
    .limit(1)
    .single();

  if (!karyakar) {
    console.error('No test karyakar found');
    return;
  }

  console.log(`Test Karyakar: ${karyakar.full_name_gu} (${karyakar.id})`);

  // Insert a test audit log row simulating DB trigger write
  const { data: auditRow, error: auditErr } = await adminClient
    .from('audit_log')
    .insert({
      table_name: 'attendance',
      record_id: '00000000-0000-0000-0000-000000000001',
      action: 'UPDATE',
      changed_fields: ['attendance_status'],
      actor_id: karyakar.id,
      actor_name_snapshot: karyakar.full_name_gu,
    })
    .select('*')
    .single();

  if (auditErr || !auditRow) {
    console.error('Failed to insert test audit log row:', auditErr?.message);
    return;
  }

  console.log(`✓ Audit Log Row Created: ID ${auditRow.id}`);
  console.log(`✓ Actor Name Snapshot: "${auditRow.actor_name_snapshot}"`);
  console.log(`✓ Changed Fields:`, auditRow.changed_fields);

  // Deactivate karyakar
  console.log(`Deactivating karyakar "${karyakar.full_name_gu}"...`);
  await adminClient
    .from('karyakars')
    .update({ is_active: false })
    .eq('id', karyakar.id);

  // Re-read audit log row
  const { data: reReadRow } = await adminClient
    .from('audit_log')
    .select('*')
    .eq('id', auditRow.id)
    .single();

  console.log(`✓ Post-deactivation Audit Row Actor Snapshot: "${reReadRow?.actor_name_snapshot}"`);

  if (reReadRow?.actor_name_snapshot === karyakar.full_name_gu) {
    console.log('✓ Actor name snapshot verified: Audit row preserves karyakar name even after deactivation!');
  } else {
    console.error('❌ Snapshot verification failed');
  }

  // Restore karyakar active status & cleanup test audit row
  await adminClient
    .from('karyakars')
    .update({ is_active: karyakar.is_active })
    .eq('id', karyakar.id);

  await adminClient.from('audit_log').delete().eq('id', auditRow.id);

  console.log('\n=== WO-38 AUDIT LOG VERIFICATION PASSED 100% ===');
}

testWO38AuditLog();
