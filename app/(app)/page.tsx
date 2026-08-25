import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { TZ } from '@/lib/format';
import { HomeClient } from './HomeClient';
import type { TodaySessionItem, HomeTaskItem } from './HomeClient';
import type { TaskTypeT } from '@/lib/database.types';

export default async function HomePage() {
  const karyakar = await requireKaryakar();
  const supabase = await createClient();
  const vistarScope = isVistarScope(karyakar.role);

  // 1. Fetch Accessible Sabhas
  let accessibleSabhaIds: string[] = [];
  if (vistarScope) {
    const { data: sabhaData } = await supabase
      .from('sabhas')
      .select('id')
      .eq('vistar_id', karyakar.vistar_id)
      .eq('is_active', true);
    accessibleSabhaIds = (sabhaData || []).map((s) => s.id);
  } else {
    const { data: ksData } = await supabase
      .from('karyakar_sabhas')
      .select('sabha_id, sabhas!inner(is_active)')
      .eq('karyakar_id', karyakar.id)
      .eq('sabhas.is_active', true);
    accessibleSabhaIds = (ksData || []).map((ks) => ks.sabha_id);
  }

  // Fallback if no accessible sabhas
  if (accessibleSabhaIds.length === 0) {
    return (
      <HomeClient
        todayTomorrowSessions={[]}
        openTasks={[]}
        totalOpenTasksCount={0}
        attendanceRate={0}
        totalBalako={0}
        consecutiveAbsent={0}
        vistarScope={vistarScope}
      />
    );
  }

  // 2. Section 1: Today & Tomorrow Sessions (Asia/Kolkata)
  const now = new Date();
  const todayStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');
  const tomorrowStr = formatInTimeZone(addDays(now, 1), TZ, 'yyyy-MM-dd');

  const { data: sessionRows } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      sabha_type,
      sabhas ( name_gu )
    `)
    .in('sabha_id', accessibleSabhaIds)
    .neq('status', 'cancelled')
    .gte('session_date', todayStr)
    .lte('session_date', tomorrowStr)
    .order('session_date', { ascending: true })
    .order('start_time', { ascending: true });

  const todayTomorrowSessions: TodaySessionItem[] = (sessionRows || []).map((s) => {
    const rawS = s.sabhas as unknown as { name_gu: string } | null;
    return {
      id: s.id,
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      sabha_type: s.sabha_type,
      sabha_name_gu: rawS?.name_gu || 'સભા',
    };
  });

  // 3. Section 2: Open Tasks (3 Nearest)
  const { data: rawTasks } = await supabase
    .from('tasks')
    .select(`
      id,
      session_id,
      task_type,
      due_at,
      opens_at,
      status,
      sabhas ( name_gu ),
      sabha_sessions!inner ( status )
    `)
    .in('sabha_id', accessibleSabhaIds)
    .eq('status', 'open')
    .neq('sabha_sessions.status', 'cancelled')
    .order('due_at', { ascending: true });

  const allOpenTasks = rawTasks || [];
  const totalOpenTasksCount = allOpenTasks.length;

  const openTasks: HomeTaskItem[] = allOpenTasks.slice(0, 3).map((t) => {
    const rawS = t.sabhas as unknown as { name_gu: string } | null;
    return {
      id: t.id,
      session_id: t.session_id,
      task_type: t.task_type as TaskTypeT,
      due_at: t.due_at,
      opens_at: t.opens_at,
      status: t.status,
      sabha_name_gu: rawS?.name_gu || 'સભા',
    };
  });

  // 4. Section 3: This Month Stats
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // Total Balako count
  let totalBalako = 0;
  if (vistarScope) {
    // Vistar-level COUNT(DISTINCT balak_id) from v_vistar_balak_count view
    const { data: vCount } = await supabase
      .from('v_vistar_balak_count')
      .select('total_balako')
      .eq('vistar_id', karyakar.vistar_id)
      .maybeSingle();

    totalBalako = vCount?.total_balako || 0;
  } else {
    // Sabha-level unique active balako count
    const { data: sBalako } = await supabase
      .from('balak_sabhas')
      .select('balak_id, balako!inner(status)')
      .in('sabha_id', accessibleSabhaIds)
      .eq('balako.status', 'active');

    const uniqueSet = new Set((sBalako || []).map((b) => b.balak_id));
    totalBalako = uniqueSet.size;
  }

  // Attendance Rate count in this month
  const { data: monthSessions } = await supabase
    .from('sabha_sessions')
    .select('id')
    .in('sabha_id', accessibleSabhaIds)
    .neq('status', 'cancelled')
    .gte('session_date', firstDayStr)
    .lte('session_date', lastDayStr);

  const monthSessionIds = (monthSessions || []).map((s) => s.id);
  let attendanceRate = 0;

  if (monthSessionIds.length > 0) {
    const { data: attRows } = await supabase
      .from('attendance')
      .select('attendance_status')
      .in('session_id', monthSessionIds);

    const validAtt = (attRows || []).filter((a) => a.attendance_status !== null);
    const presentCount = validAtt.filter((a) => a.attendance_status === 'present').length;
    attendanceRate = validAtt.length > 0 ? Math.round((presentCount / validAtt.length) * 100) : 0;
  }

  // Consecutive Absent count
  const { data: caRows } = await supabase
    .from('v_consecutive_absent')
    .select('balak_id')
    .in('sabha_id', accessibleSabhaIds)
    .gte('streak', 3);

  const uniqueCaSet = new Set((caRows || []).map((c) => c.balak_id));
  const consecutiveAbsent = uniqueCaSet.size;

  return (
    <HomeClient
      todayTomorrowSessions={todayTomorrowSessions}
      openTasks={openTasks}
      totalOpenTasksCount={totalOpenTasksCount}
      attendanceRate={attendanceRate}
      totalBalako={totalBalako}
      consecutiveAbsent={consecutiveAbsent}
      vistarScope={vistarScope}
    />
  );
}
