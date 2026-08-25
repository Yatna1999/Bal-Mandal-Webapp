import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing Supabase environment variables in .env.local');
  process.exit(1);
}

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const anonClient = createClient<Database>(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let passedCount = 0;
let failedCount = 0;

function assert(name: string, condition: boolean, detail = '') {
  if (condition) {
    console.log(`PASS: ${name}`);
    passedCount++;
  } else {
    console.error(`FAIL: ${name}${detail ? ` - ${detail}` : ''}`);
    failedCount++;
  }
}

async function createTestUser(email: string, role: Database['public']['Enums']['role_t'], fullName: string, vistarId: string) {
  const password = 'TestPassword123!';

  // Delete old user if left over from previous failed run
  const { data: existingUsers } = await adminClient.auth.admin.listUsers();
  const oldUser = existingUsers?.users?.find(u => u.email === email);
  if (oldUser) {
    await adminClient.from('karyakars').delete().eq('id', oldUser.id);
    await adminClient.auth.admin.deleteUser(oldUser.id);
  }

  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create auth user ${email}: ${authError?.message}`);
  }

  const userId = authData.user.id;

  const { error: kError } = await adminClient.from('karyakars').insert({
    id: userId,
    vistar_id: vistarId,
    full_name_gu: fullName,
    full_name_en: fullName,
    mobile: '9876543210',
    role,
    is_active: true,
    must_change_password: false,
  });

  if (kError) {
    throw new Error(`Failed to insert karyakar ${email}: ${kError.message}`);
  }

  // Create signed in client for this user
  const userClient = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: signInError } = await userClient.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    throw new Error(`Failed to sign in user ${email}: ${signInError.message}`);
  }

  return { userId, client: userClient };
}

async function runTests() {
  console.log('=== STARTING RLS VERIFICATION HARNESS ===\n');

  let vistarId = '';
  let sabhaAId = '';
  let sabhaBId = '';

  let userAdmin: Awaited<ReturnType<typeof createTestUser>> | null = null;
  let userAgresar: Awaited<ReturnType<typeof createTestUser>> | null = null;
  let userNirikshak: Awaited<ReturnType<typeof createTestUser>> | null = null;
  let userSanchalakA: Awaited<ReturnType<typeof createTestUser>> | null = null;
  let userSanchalakB: Awaited<ReturnType<typeof createTestUser>> | null = null;

  let balakAId = '';
  let balakBId = '';
  let sessionId = '';

  try {
    // 1. SETUP: Fetch org IDs
    const { data: vistarData, error: vError } = await adminClient
      .from('vistars')
      .select('id')
      .eq('name_en', 'Paldi')
      .single();

    if (vError || !vistarData) {
      throw new Error(`Paldi vistar not found in DB: ${vError?.message}`);
    }
    vistarId = vistarData.id;

    const { data: sabhasData, error: sError } = await adminClient
      .from('sabhas')
      .select('id, name_en')
      .eq('vistar_id', vistarId);

    if (sError || !sabhasData || sabhasData.length < 2) {
      throw new Error(`Sabhas not found: ${sError?.message}`);
    }

    const sabhaA = sabhasData.find(s => s.name_en === 'Paldi Bal Sabha') || sabhasData[0];
    const sabhaB = sabhasData.find(s => s.name_en === 'River Side Park Sabha') || sabhasData[1];

    sabhaAId = sabhaA.id;
    sabhaBId = sabhaB.id;

    console.log('Setup: Creating 5 test users...');
    userAdmin = await createTestUser('t_admin@test.local', 'super_admin', 'Test Admin', vistarId);
    userAgresar = await createTestUser('t_agresar@test.local', 'agresar', 'Test Agresar', vistarId);
    userNirikshak = await createTestUser('t_nirikshak@test.local', 'nirikshak', 'Test Nirikshak', vistarId);
    userSanchalakA = await createTestUser('t_sanchalak_a@test.local', 'sanchalak', 'Test Sanchalak A', vistarId);
    userSanchalakB = await createTestUser('t_sanchalak_b@test.local', 'sanchalak', 'Test Sanchalak B', vistarId);

    // Assign sanchalaks to sabhas
    await adminClient.from('karyakar_sabhas').insert([
      { karyakar_id: userSanchalakA.userId, sabha_id: sabhaAId },
      { karyakar_id: userSanchalakB.userId, sabha_id: sabhaBId },
    ]);

    console.log('Setup: Inserting test balako and session...');

    // Insert 2 balako
    const { data: bA, error: bAErr } = await adminClient.from('balako').insert({
      vistar_id: vistarId,
      full_name_gu: 'બાળક એ',
      full_name_en: 'TEST_BALAK_A',
      dob: '2015-01-01',
      standard_code: 'std_5',
      medium: 'gujarati',
      school_gu: 'શાળા',
      school_en: 'School A',
      address_gu: 'સરનામું',
      satsang_status: 'satsangi',
      mother_name_gu: 'માતા એ',
      mother_mobile: '9999900001',
      father_name_gu: 'પિતા એ',
      father_mobile: '9999900002',
      status: 'active',
    }).select().single();

    if (bAErr || !bA) throw new Error(`Failed to insert BALAK_A: ${bAErr?.message}`);
    balakAId = bA.id;

    const { data: bB, error: bBErr } = await adminClient.from('balako').insert({
      vistar_id: vistarId,
      full_name_gu: 'બાળક બી',
      full_name_en: 'TEST_BALAK_B',
      dob: '2016-02-02',
      standard_code: 'std_4',
      medium: 'gujarati',
      school_gu: 'શાળા',
      school_en: 'School B',
      address_gu: 'સરનામું',
      satsang_status: 'satsangi',
      mother_name_gu: 'માતા બી',
      mother_mobile: '9999900003',
      father_name_gu: 'પિતા બી',
      father_mobile: '9999900004',
      status: 'active',
    }).select().single();

    if (bBErr || !bB) throw new Error(`Failed to insert BALAK_B: ${bBErr?.message}`);
    balakBId = bB.id;

    // Enroll balak A in Sabha A, balak B in Sabha B
    await adminClient.from('balak_sabhas').insert([
      { balak_id: balakAId, sabha_id: sabhaAId, is_primary: true },
      { balak_id: balakBId, sabha_id: sabhaBId, is_primary: true },
    ]);

    // Insert scheduled session for Sabha A
    const { data: sess, error: sessErr } = await adminClient.from('sabha_sessions').insert({
      sabha_id: sabhaAId,
      session_date: '2026-09-01',
      start_time: '21:00:00',
      end_time: '22:30:00',
      sabha_type: 'pakki',
      status: 'scheduled',
    }).select().single();

    if (sessErr || !sess) throw new Error(`Failed to insert session: ${sessErr?.message}`);
    sessionId = sess.id;

    console.log('\n--- EXECUTING RLS ASSERTIONS ---\n');

    // Assertion 1: t_sanchalak_a selects balako -> sees TEST_BALAK_A, does NOT see TEST_BALAK_B
    const { data: saBalako } = await userSanchalakA.client.from('balako').select('id, full_name_en');
    const saIds = (saBalako || []).map(b => b.id);
    assert(
      '1. t_sanchalak_a selects balako -> sees BALAK_A, not BALAK_B',
      saIds.includes(balakAId) && !saIds.includes(balakBId),
      `Got IDs: ${JSON.stringify(saIds)}`
    );

    // Assertion 2: t_sanchalak_a selects balako filtered by TEST_BALAK_B id -> 0 rows
    const { data: saBalakB } = await userSanchalakA.client.from('balako').select('id').eq('id', balakBId);
    assert(
      '2. t_sanchalak_a selects balako filtered by BALAK_B id -> 0 rows',
      (saBalakB || []).length === 0
    );

    // Assertion 3: t_sanchalak_a selects only the column mother_mobile where id = TEST_BALAK_B -> 0 rows
    const { data: saMob } = await userSanchalakA.client.from('balako').select('mother_mobile').eq('id', balakBId);
    assert(
      '3. t_sanchalak_a selects mother_mobile where id = BALAK_B -> 0 rows',
      (saMob || []).length === 0
    );

    // Assertion 4: t_agresar selects balako -> sees both
    const { data: agBalako } = await userAgresar.client.from('balako').select('id');
    const agIds = (agBalako || []).map(b => b.id);
    assert(
      '4. t_agresar selects balako -> sees both BALAK_A and BALAK_B',
      agIds.includes(balakAId) && agIds.includes(balakBId)
    );

    // Assertion 5: t_nirikshak selects balako -> sees both
    const { data: nirBalako } = await userNirikshak.client.from('balako').select('id');
    const nirIds = (nirBalako || []).map(b => b.id);
    assert(
      '5. t_nirikshak selects balako -> sees both BALAK_A and BALAK_B',
      nirIds.includes(balakAId) && nirIds.includes(balakBId)
    );

    // Assertion 6: t_sanchalak_a updates TEST_BALAK_A set status='archived', archive_reason_gu='test' -> ERROR
    const { error: saArchErr } = await userSanchalakA.client
      .from('balako')
      .update({ status: 'archived', archive_reason_gu: 'test' })
      .eq('id', balakAId);
    assert(
      "6. t_sanchalak_a updates BALAK_A set status='archived' -> ERROR",
      saArchErr !== null
    );

    // Assertion 7: t_agresar does the same -> SUCCESS. Then revert to active.
    const { error: agArchErr } = await userAgresar.client
      .from('balako')
      .update({ status: 'archived', archive_reason_gu: 'test' })
      .eq('id', balakAId);
    assert(
      "7. t_agresar updates BALAK_A set status='archived' -> SUCCESS",
      agArchErr === null
    );
    // Revert to active
    await adminClient.from('balako').update({ status: 'active', archive_reason_gu: null }).eq('id', balakAId);

    // Assertion 8: t_sanchalak_a updates the session set status='cancelled', cancel_reason_gu='test' -> ERROR
    const { error: saCancelErr } = await userSanchalakA.client
      .from('sabha_sessions')
      .update({ status: 'cancelled', cancel_reason_gu: 'test' })
      .eq('id', sessionId);
    assert(
      "8. t_sanchalak_a updates session set status='cancelled' -> ERROR",
      saCancelErr !== null
    );

    // Assertion 9: t_nirikshak does the same -> SUCCESS. Then revert to scheduled.
    const { error: nirCancelErr } = await userNirikshak.client
      .from('sabha_sessions')
      .update({ status: 'cancelled', cancel_reason_gu: 'test' })
      .eq('id', sessionId);
    assert(
      "9. t_nirikshak updates session set status='cancelled' -> SUCCESS",
      nirCancelErr === null
    );
    // Revert to scheduled
    await adminClient.from('sabha_sessions').update({ status: 'scheduled', cancel_reason_gu: null }).eq('id', sessionId);

    // Assertion 10: t_agresar updates sabhas set sabha_type='kachi' on Sabha A -> ERROR
    const { error: agSabhaTypeErr } = await userAgresar.client
      .from('sabhas')
      .update({ sabha_type: 'kachi' })
      .eq('id', sabhaAId);
    assert(
      "10. t_agresar updates sabha_type='kachi' on Sabha A -> ERROR",
      agSabhaTypeErr !== null
    );

    // Assertion 11: t_admin does the same -> SUCCESS. Then revert to pakki.
    const { error: admSabhaTypeErr } = await userAdmin.client
      .from('sabhas')
      .update({ sabha_type: 'kachi' })
      .eq('id', sabhaAId);
    assert(
      "11. t_admin updates sabha_type='kachi' on Sabha A -> SUCCESS",
      admSabhaTypeErr === null
    );
    // Revert to pakki
    await adminClient.from('sabhas').update({ sabha_type: 'pakki' }).eq('id', sabhaAId);

    // Assertion 12: t_admin deletes from balako -> 0 rows affected or ERROR. Confirm TEST_BALAK_A still exists afterwards.
    const { error: delErr, data: delData } = await userAdmin.client.from('balako').delete().eq('id', balakAId).select();
    const { data: checkBalakA } = await adminClient.from('balako').select('id').eq('id', balakAId).single();
    assert(
      '12. t_admin deletes from balako -> fails or 0 rows; BALAK_A still exists',
      (delErr !== null || (delData || []).length === 0) && checkBalakA !== null
    );

    // Assertion 13: Signed-out client selects balako -> 0 rows
    const { data: anonBalako } = await anonClient.from('balako').select('id');
    assert(
      '13. Signed-out client selects balako -> 0 rows',
      (anonBalako || []).length === 0
    );

    // Assertion 14: Signed-out client selects karyakars -> 0 rows
    const { data: anonKaryakars } = await anonClient.from('karyakars').select('id');
    assert(
      '14. Signed-out client selects karyakars -> 0 rows',
      (anonKaryakars || []).length === 0
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`FATAL ERROR IN HARNESS SETUP/EXECUTION: ${msg}`);
    failedCount++;
  } finally {
    console.log('\n--- TEARDOWN CLEANUP ---');
    if (sessionId) {
      await adminClient.from('sabha_sessions').delete().eq('id', sessionId);
    }
    if (balakAId) {
      await adminClient.from('balak_sabhas').delete().eq('balak_id', balakAId);
      await adminClient.from('balako').delete().eq('id', balakAId);
    }
    if (balakBId) {
      await adminClient.from('balak_sabhas').delete().eq('balak_id', balakBId);
      await adminClient.from('balako').delete().eq('id', balakBId);
    }

    const testUsers = [userAdmin, userAgresar, userNirikshak, userSanchalakA, userSanchalakB];
    for (const u of testUsers) {
      if (u?.userId) {
        await adminClient.from('karyakar_sabhas').delete().eq('karyakar_id', u.userId);
        await adminClient.from('karyakars').delete().eq('id', u.userId);
        await adminClient.auth.admin.deleteUser(u.userId);
      }
    }
    console.log('Teardown complete.');

    console.log(`\n=== SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED ===`);
    if (failedCount > 0) {
      process.exit(1);
    }
  }
}

runTests();
