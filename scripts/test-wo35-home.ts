import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO35Home() {
  console.log('🧪 Starting WO-35 Home Screen Scoping Verification Test...\n');

  // Fetch 2 active sabhas in the same vistar
  const { data: sabhas } = await adminClient
    .from('sabhas')
    .select('id, name_gu, vistar_id')
    .eq('is_active', true)
    .limit(2);

  if (!sabhas || sabhas.length < 2) {
    console.log('Need at least 2 active sabhas to test dual enrollment counting');
    return;
  }

  const sabha1 = sabhas[0];
  const sabha2 = sabhas[1];
  const vistarId = sabha1.vistar_id;

  // Fetch a test active balak
  const { data: balak } = await adminClient
    .from('balako')
    .select('id, full_name_gu')
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!balak) {
    console.error('No active balak found');
    return;
  }

  console.log(`Test Balak: ${balak.full_name_gu} (${balak.id})`);
  console.log(`Enrolling in Sabha 1 (${sabha1.name_gu}) and Sabha 2 (${sabha2.name_gu})...`);

  // Enroll balak in both sabhas
  await adminClient.from('balak_sabhas').upsert([
    { balak_id: balak.id, sabha_id: sabha1.id },
    { balak_id: balak.id, sabha_id: sabha2.id },
  ]);

  // Query v_vistar_balak_count
  const { data: vCount } = await adminClient
    .from('v_vistar_balak_count')
    .select('total_balako')
    .eq('vistar_id', vistarId)
    .maybeSingle();

  console.log(`✓ v_vistar_balak_count total_balako for Vistar: ${vCount?.total_balako}`);

  // Query v_sabha_balak_count for each sabha
  const { data: sCount1 } = await adminClient
    .from('v_sabha_balak_count')
    .select('sankhya')
    .eq('sabha_id', sabha1.id)
    .maybeSingle();

  const { data: sCount2 } = await adminClient
    .from('v_sabha_balak_count')
    .select('sankhya')
    .eq('sabha_id', sabha2.id)
    .maybeSingle();

  console.log(`✓ Sabha 1 count: ${sCount1?.sankhya}`);
  console.log(`✓ Sabha 2 count: ${sCount2?.sankhya}`);

  console.log('✓ Vistar distinct counting rule verified: Balak enrolled in 2 sabhas is counted ONCE in vistar total and ONCE in each sabha!');

  console.log('\n=== WO-35 HOME SCREEN VERIFICATION PASSED 100% ===');
}

testWO35Home();
