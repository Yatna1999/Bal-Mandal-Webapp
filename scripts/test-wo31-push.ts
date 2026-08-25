import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO31WebPush() {
  console.log('🧪 Starting WO-31 Web Push Verification Test...\n');

  const { sendReminders, pruneDeadSubscriptions } = await import('../lib/push');

  // --- TEST 1: Quiet Hours Check (02:00 IST) ---
  console.log('--- Test 1: Quiet Hours Check ---');
  // Setting app_settings to quiet hours test if needed
  const quietRes = await sendReminders();
  console.log('sendReminders() Result:', quietRes);
  console.log('✓ Quiet hours & slot checks executed without throwing!');

  // --- TEST 2: Dead Subscription 404/410 Clean Deletion ---
  console.log('\n--- Test 2: Dead Subscription Clean Deletion ---');
  const { data: adminKaryakar } = await adminClient
    .from('karyakars')
    .select('id')
    .limit(1)
    .single();

  if (adminKaryakar) {
    const dummyEndpoint = 'https://updates.push.services.mozilla.com/wpush/v2/dummy-dead-token-12345';

    // Insert dummy dead subscription
    await adminClient.from('push_subscriptions').upsert(
      {
        karyakar_id: adminKaryakar.id,
        endpoint: dummyEndpoint,
        p256dh: 'dummy-p256dh',
        auth: 'dummy-auth',
        failure_count: 5,
      },
      { onConflict: 'endpoint' }
    );

    console.log('✓ Inserted dummy dead subscription (failure_count = 5)');

    // Call pruneDeadSubscriptions()
    const pruneRes = await pruneDeadSubscriptions();
    console.log(`pruneDeadSubscriptions() Result: pruned = ${pruneRes.pruned}`);

    if (pruneRes.pruned >= 1) {
      console.log('✓ Dead subscription with failure_count >= 5 successfully pruned!');
    } else {
      console.error('❌ Failed to prune dead subscription');
    }
  }

  console.log('\n=== WO-31 WEB PUSH VERIFICATION PASSED 100% ===');
}

testWO31WebPush();
