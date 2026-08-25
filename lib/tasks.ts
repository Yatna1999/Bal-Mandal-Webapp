import { adminClient } from '@/lib/supabase/admin';
import { parseISO, subDays, addDays, addMinutes, format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { TZ, isoWeekStart } from '@/lib/format';
import { t } from '@/lib/i18n';
import {
  isKaryakramDone,
  isPresabhaDone,
  isAttendanceDone,
  isAhnikDone,
  isAhevalDone,
  seedAttendanceRows,
} from '@/lib/sessions';
import type { Database, TaskTypeT } from '@/lib/database.types';

/**
 * Create the 4 or 5 task rows for a session. Idempotent via unique(session_id, task_type).
 */
export async function createTasksForSession(sessionId: string): Promise<{ created: number }> {
  const { data: session } = await adminClient
    .from('sabha_sessions')
    .select('id, sabha_id, session_date, start_time, end_time, sabha_type, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'cancelled') {
    return { created: 0 };
  }

  const { session_date: D, start_time: S, end_time: E, sabha_type, sabha_id } = session;
  const dDate = parseISO(D);
  const dMinus2 = subDays(dDate, 2);
  const dMinus1 = subDays(dDate, 1);
  const dPlus1 = addDays(dDate, 1);

  const dMinus2Str = format(dMinus2, 'yyyy-MM-dd');
  const dMinus1Str = format(dMinus1, 'yyyy-MM-dd');
  const dPlus1Str = format(dPlus1, 'yyyy-MM-dd');

  // aheval opens_at: D at E plus 30 min
  const endTimeDate = parseISO(`${D}T${E}`);
  const ahevalOpensDate = addMinutes(endTimeDate, 30);
  const ahevalOpensStr = formatInTimeZone(ahevalOpensDate, TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");

  const taskRows: Array<Database['public']['Tables']['tasks']['Insert']> = [
    {
      session_id: sessionId,
      sabha_id,
      task_type: 'prepare_karyakram',
      opens_at: `${dMinus2Str}T09:00:00+05:30`,
      due_at: `${D}T${S}+05:30`,
      status: 'open',
    },
    {
      session_id: sessionId,
      sabha_id,
      task_type: 'presabha_followup',
      opens_at: `${dMinus1Str}T09:00:00+05:30`,
      due_at: `${D}T${S}+05:30`,
      status: 'open',
    },
    {
      session_id: sessionId,
      sabha_id,
      task_type: 'mark_attendance',
      opens_at: `${D}T${E}+05:30`,
      due_at: `${dPlus1Str}T12:00:00+05:30`,
      status: 'open',
    },
  ];

  if (sabha_type === 'pakki') {
    taskRows.push({
      session_id: sessionId,
      sabha_id,
      task_type: 'ahnik_followup',
      opens_at: `${D}T${E}+05:30`,
      due_at: `${dPlus1Str}T12:00:00+05:30`,
      status: 'open',
    });
  }

  taskRows.push({
    session_id: sessionId,
    sabha_id,
    task_type: 'aheval',
    opens_at: ahevalOpensStr,
    due_at: `${dPlus1Str}T21:00:00+05:30`,
    status: 'open',
  });

  const { data: inserted, error } = await adminClient
    .from('tasks')
    .upsert(taskRows, {
      onConflict: 'session_id,task_type',
      ignoreDuplicates: true,
    })
    .select('id');

  if (error) {
    console.error('Failed to create tasks for session:', error);
    throw new Error(error.message);
  }

  return { created: inserted ? inserted.length : 0 };
}

/** For all scheduled sessions in the horizon. Cron calls this. */
export async function createTasksForUpcoming(): Promise<{ created: number }> {
  const { data: sessions } = await adminClient
    .from('sabha_sessions')
    .select('id')
    .eq('status', 'scheduled');

  if (!sessions || sessions.length === 0) {
    return { created: 0 };
  }

  let totalCreated = 0;
  for (const s of sessions) {
    const res = await createTasksForSession(s.id);
    totalCreated += res.created;
  }

  return { created: totalCreated };
}

/**
 * Re-check one task's closing condition. If satisfied, set status='done',
 * completed_at=now(), completed_by=actorId.
 * Called immediately by every server action that could close a task,
 * so the UI updates without waiting for the 30-minute cron.
 */
export async function recomputeTask(
  sessionId: string,
  type: TaskTypeT,
  actorId?: string
): Promise<{ closed: boolean }> {
  // 1. Fetch task row
  const { data: task } = await adminClient
    .from('tasks')
    .select('id, status')
    .eq('session_id', sessionId)
    .eq('task_type', type)
    .maybeSingle();

  if (!task || task.status === 'done' || task.status === 'auto_closed') {
    return { closed: false };
  }

  // 2. Fetch session info
  const { data: session } = await adminClient
    .from('sabha_sessions')
    .select('id, sabha_id, session_date, karyakram_text, aheval_done, status')
    .eq('id', sessionId)
    .single();

  if (!session || session.status === 'cancelled') {
    return { closed: false };
  }

  let isSatisfied = false;

  if (type === 'prepare_karyakram') {
    isSatisfied = isKaryakramDone(session);
  } else if (type === 'presabha_followup') {
    const { data: attRows } = await adminClient
      .from('attendance')
      .select('presabha_status')
      .eq('session_id', sessionId);
    isSatisfied = isPresabhaDone(attRows || []);
  } else if (type === 'mark_attendance') {
    const { data: attRows } = await adminClient
      .from('attendance')
      .select('attendance_status')
      .eq('session_id', sessionId);
    isSatisfied = isAttendanceDone(attRows || []);
  } else if (type === 'ahnik_followup') {
    const weekStart = isoWeekStart(session.session_date);

    // Active enrolled balako in this sabha
    const { data: enrolled } = await adminClient
      .from('balak_sabhas')
      .select('balak_id, balako!inner(status)')
      .eq('sabha_id', session.sabha_id)
      .eq('balako.status', 'active');

    const enrolledCount = enrolled?.length || 0;
    const balakIds = (enrolled || []).map((e) => e.balak_id);

    let recordedCount = 0;
    if (balakIds.length > 0) {
      const { data: weekRecs } = await adminClient
        .from('ahnik_weeks')
        .select('balak_id')
        .in('balak_id', balakIds)
        .eq('week_start_date', weekStart);

      recordedCount = weekRecs?.length || 0;
    }

    isSatisfied = isAhnikDone(enrolledCount, recordedCount);
  } else if (type === 'aheval') {
    isSatisfied = isAhevalDone(session);
  }

  if (isSatisfied) {
    const now = new Date().toISOString();
    const updates: Database['public']['Tables']['tasks']['Update'] = {
      status: 'done',
      completed_at: now,
      completed_by: actorId || null,
    };

    const { error: uErr } = await adminClient
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    if (uErr) {
      console.error(`Failed to close task ${type} for session ${sessionId}:`, uErr);
      return { closed: false };
    }

    return { closed: true };
  }

  return { closed: false };
}

/** All open tasks. Cron calls this. */
export async function recomputeOpenTasks(): Promise<{ closed: number }> {
  const { data: openTasks } = await adminClient
    .from('tasks')
    .select('session_id, task_type')
    .eq('status', 'open');

  if (!openTasks || openTasks.length === 0) {
    return { closed: 0 };
  }

  let closedCount = 0;
  for (const t of openTasks) {
    const res = await recomputeTask(t.session_id, t.task_type);
    if (res.closed) closedCount++;
  }

  return { closed: closedCount };
}

/** Cancelled sessions: flip every task to 'auto_closed'. */
export async function autoCloseSessionTasks(sessionId: string): Promise<{ closed: number }> {
  const updates: Database['public']['Tables']['tasks']['Update'] = {
    status: 'auto_closed',
  };

  const { data: updated, error } = await adminClient
    .from('tasks')
    .update(updates)
    .eq('session_id', sessionId)
    .neq('status', 'done')
    .select('id');

  if (error) {
    console.error('Failed to auto close session tasks:', error);
    throw new Error(error.message);
  }

  return { closed: updated ? updated.length : 0 };
}

/**
 * Open tasks past due_at with escalated_at null:
 * write one 'escalation' notification to every nirikshak and agresar
 * of the vistar, then stamp escalated_at so it never repeats.
 */
export async function escalateOverdue(): Promise<{ escalated: number }> {
  const nowStr = new Date().toISOString();

  // Query open tasks past due_at with escalated_at IS NULL
  const { data: overdueTasks } = await adminClient
    .from('tasks')
    .select(`
      id,
      session_id,
      task_type,
      due_at,
      escalated_at,
      status,
      sabha_sessions (
        sabhas (
          vistar_id,
          name_gu
        )
      )
    `)
    .eq('status', 'open')
    .lt('due_at', nowStr)
    .is('escalated_at', null);

  if (!overdueTasks || overdueTasks.length === 0) {
    return { escalated: 0 };
  }

  let escalatedCount = 0;

  for (const task of overdueTasks) {
    const rawSession = task.sabha_sessions as unknown as {
      sabhas: { vistar_id: string; name_gu: string } | null;
    } | null;

    const vistarId = rawSession?.sabhas?.vistar_id;
    const sabhaNameGu = rawSession?.sabhas?.name_gu || 'સભા';

    if (!vistarId) continue;

    // Find all nirikshak and agresar karyakars in this vistar
    const { data: leaders } = await adminClient
      .from('karyakars')
      .select('id')
      .eq('vistar_id', vistarId)
      .in('role', ['nirikshak', 'agresar'])
      .eq('is_active', true);

    if (leaders && leaders.length > 0) {
      const taskLabel = t(`task.${task.task_type}` as Parameters<typeof t>[0]) || task.task_type;
      const notifTitle = t('task.escalationTitle');
      const notifBody = t('task.escalationBody', {
        sabha: sabhaNameGu,
        task: taskLabel,
      });
      const notifLink = `/session/${task.session_id}`;

      const notifRows = leaders.map((l) => ({
        karyakar_id: l.id,
        kind: 'escalation',
        title_gu: notifTitle,
        body_gu: notifBody,
        link_url: notifLink,
        task_id: task.id,
      }));

      await adminClient.from('inapp_notifications').insert(notifRows);
    }

    // Stamp escalated_at so it never repeats
    const updates: Database['public']['Tables']['tasks']['Update'] = {
      escalated_at: nowStr,
    };

    await adminClient
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    escalatedCount++;
  }

  return { escalated: escalatedCount };
}
