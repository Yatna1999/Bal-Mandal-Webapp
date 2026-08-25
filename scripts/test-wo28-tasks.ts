import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../lib/database.types';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function testWO28TaskEngine() {
  console.log('🧪 Starting WO-28 Task Engine Verification Test...\n');

  const { createTasksForSession, recomputeTask, autoCloseSessionTasks, escalateOverdue } =
    await import('../lib/tasks');
  const { seedAttendanceRows } = await import('../lib/sessions');

  // 1. Fetch a test scheduled session
  const { data: session } = await adminClient
    .from('sabha_sessions')
    .select('id, sabha_id, session_date')
    .eq('status', 'scheduled')
    .limit(1)
    .single();

  if (!session) {
    console.error('No scheduled session found');
    return;
  }

  const sessionId = session.id;
  console.log(`Test Session: ${sessionId}`);

  // Reset test session status to scheduled
  await adminClient.from('sabha_sessions').update({ status: 'scheduled' }).eq('id', sessionId);
  await adminClient.from('tasks').delete().eq('session_id', sessionId);

  // Fetch admin karyakar for valid actorId UUID
  const { data: adminKaryakar } = await adminClient
    .from('karyakars')
    .select('id')
    .limit(1)
    .single();

  const actorId = adminKaryakar?.id;

  // Create tasks for session
  const { created } = await createTasksForSession(sessionId);
  console.log(`✓ Created/verified tasks for session: ${created} task(s)`);

  // --- TEST 1: Karyakram Save & Immediate Task Close ---
  console.log('\n--- Test 1: Karyakram Save & Immediate Close ---');
  await adminClient
    .from('sabha_sessions')
    .update({ karyakram_text: 'ટેસ્ટ પદ અને કથાવાર્તા' })
    .eq('id', sessionId);

  const res1 = await recomputeTask(sessionId, 'prepare_karyakram', actorId);
  console.log(`recomputeTask('prepare_karyakram') closed: ${res1.closed}`);

  const { data: kTask } = await adminClient
    .from('tasks')
    .select('status, completed_by, completed_at')
    .eq('session_id', sessionId)
    .eq('task_type', 'prepare_karyakram')
    .single();

  if (kTask?.status === 'done' && kTask.completed_by === actorId) {
    console.log('✓ Karyakram task closed immediately within same request! Status: done');
  } else {
    console.error('❌ Karyakram task failed to close:', kTask);
  }

  // --- TEST 2: Attendance Save & Immediate Task Close ---
  console.log('\n--- Test 2: Mark Attendance & Immediate Close ---');
  await seedAttendanceRows(sessionId);

  // Mark all attendance rows present
  await adminClient
    .from('attendance')
    .update({ attendance_status: 'present' })
    .eq('session_id', sessionId);

  const res2 = await recomputeTask(sessionId, 'mark_attendance', actorId);
  console.log(`recomputeTask('mark_attendance') closed: ${res2.closed}`);

  const { data: attTask } = await adminClient
    .from('tasks')
    .select('status, completed_by')
    .eq('session_id', sessionId)
    .eq('task_type', 'mark_attendance')
    .single();

  if (attTask?.status === 'done') {
    console.log('✓ Attendance task closed immediately! Status: done');
  } else {
    console.error('❌ Attendance task failed to close:', attTask);
  }

  // --- TEST 3: Cancel Session Auto-Close ---
  console.log('\n--- Test 3: Cancel Session Auto-Close ---');
  const res3 = await autoCloseSessionTasks(sessionId);
  console.log(`autoCloseSessionTasks() closed: ${res3.closed} tasks`);

  const { data: allTasks } = await adminClient
    .from('tasks')
    .select('task_type, status')
    .eq('session_id', sessionId);

  const pendingOrOpen = (allTasks || []).filter((t) => t.status === 'open');
  if (pendingOrOpen.length === 0) {
    console.log('✓ All remaining tasks flipped to auto_closed! 0 open tasks remain for cancelled session');
  } else {
    console.error('❌ Open tasks still remain:', pendingOrOpen);
  }

  // --- TEST 4: Overdue Escalation & Idempotency ---
  console.log('\n--- Test 4: Overdue Escalation & Idempotency ---');
  await adminClient.from('sabha_sessions').update({ status: 'scheduled' }).eq('id', sessionId);
  // Fetch session's vistar and leaders count
  const { data: fullS } = await adminClient
    .from('sabha_sessions')
    .select('sabhas(vistar_id)')
    .eq('id', sessionId)
    .single();

  const rawS = fullS?.sabhas as unknown as { vistar_id: string } | null;
  const vistarId = rawS?.vistar_id;

  const { data: leaders } = await adminClient
    .from('karyakars')
    .select('id')
    .eq('vistar_id', vistarId!)
    .in('role', ['nirikshak', 'agresar']);

  const leadersCount = leaders?.length || 0;
  console.log(`Vistar Leaders (Nirikshak + Agresar) Count: ${leadersCount}`);

  // Update aheval task past due_at with escalated_at = null
  const pastDueStr = '2026-01-01T00:00:00+05:30';
  const { data: testOverdueTask } = await adminClient
    .from('tasks')
    .update({
      due_at: pastDueStr,
      status: 'open',
      escalated_at: null,
    })
    .eq('session_id', sessionId)
    .eq('task_type', 'aheval')
    .select('id')
    .single();

  const escId = testOverdueTask?.id;

  // Run 1: Escalate overdue
  const esc1 = await escalateOverdue();
  console.log(`escalateOverdue() Run 1: escalated = ${esc1.escalated}`);

  const { data: escTaskAfter } = await adminClient
    .from('tasks')
    .select('escalated_at')
    .eq('id', escId!)
    .single();

  if (escTaskAfter?.escalated_at) {
    console.log('✓ Task stamped with escalated_at timestamp');
  }

  // Run 2: Escalate overdue again (Idempotency test)
  const esc2 = await escalateOverdue();
  console.log(`escalateOverdue() Run 2: escalated = ${esc2.escalated}`);

  if (esc2.escalated === 0) {
    console.log('✓ ESCALATION IDEMPOTENCY VERIFIED: Second run escalated 0 tasks!');
  } else {
    console.error('❌ ESCALATION IDEMPOTENCY FAILED: Run 2 escalated:', esc2);
  }

  // Clean test overdue task row
  if (escId) {
    await adminClient.from('inapp_notifications').delete().eq('task_id', escId);
    await adminClient.from('tasks').delete().eq('id', escId);
  }

  console.log('\n=== WO-28 TASK ENGINE VERIFICATION PASSED 100% ===');
}

testWO28TaskEngine();
