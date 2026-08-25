import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import Forbidden from '@/components/ui/Forbidden';
import { createClient } from '@/lib/supabase/server';
import { subDays, differenceInDays } from 'date-fns';
import { DashboardClient } from './DashboardClient';
import type {
  SabhaStatItem,
  ConsecutiveAbsentItem,
  OverdueTaskItem,
} from './DashboardClient';
import type { TaskTypeT } from '@/lib/database.types';

export default async function DashboardPage() {
  const karyakar = await requireKaryakar();

  // Role Guard: super_admin, agresar, nirikshak only.
  // Sabha-scope users get Forbidden component, NOT a redirect.
  if (!isVistarScope(karyakar.role)) {
    return <Forbidden />;
  }

  const supabase = await createClient();
  const vistarId = karyakar.vistar_id;

  // Date range defaults to current month
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  // 1. Fetch Sabhas in Vistar
  const { data: vSabhas } = await supabase
    .from('sabhas')
    .select('id, name_gu, vistars(name_gu)')
    .eq('vistar_id', vistarId)
    .eq('is_active', true)
    .order('name_gu');

  const sabhaList = vSabhas || [];
  const sabhaIds = sabhaList.map((s) => s.id);
  const rawV = sabhaList[0]?.vistars as unknown as { name_gu: string } | null;
  const vistarName = rawV?.name_gu || 'વિસ્તાર';

  // 2. Total Distinct Balako (using v_vistar_balak_count view)
  const { data: vCount } = await supabase
    .from('v_vistar_balak_count')
    .select('total_balako')
    .eq('vistar_id', vistarId)
    .maybeSingle();

  const totalDistinctBalako = vCount?.total_balako || 0;

  // 3. Held Sessions in Date Range (EXCLUDING CANCELLED SESSIONS)
  const { data: heldSessions } = await supabase
    .from('sabha_sessions')
    .select('id, sabha_id')
    .in('sabha_id', sabhaIds)
    .neq('status', 'cancelled')
    .gte('session_date', firstDayStr)
    .lte('session_date', lastDayStr);

  const sessionList = heldSessions || [];
  const sessionIds = sessionList.map((s) => s.id);

  // Attendance Records for Overall Rate
  let overallAttendanceRate = 0;
  const perSabhaAttMap = new Map<string, { present: number; total: number }>();
  sabhaIds.forEach((id) => perSabhaAttMap.set(id, { present: 0, total: 0 }));

  if (sessionIds.length > 0) {
    const { data: attRows } = await supabase
      .from('attendance')
      .select('session_id, attendance_status')
      .in('session_id', sessionIds);

    const validAtt = (attRows || []).filter((a) => a.attendance_status !== null);
    const totalCount = validAtt.length;
    const presentCount = validAtt.filter((a) => a.attendance_status === 'present').length;

    overallAttendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    // Per-sabha attendance breakdown
    const sessionSabhaMap = new Map<string, string>();
    sessionList.forEach((s) => sessionSabhaMap.set(s.id, s.sabha_id));

    validAtt.forEach((a) => {
      const sId = sessionSabhaMap.get(a.session_id);
      if (sId && perSabhaAttMap.has(sId)) {
        const entry = perSabhaAttMap.get(sId)!;
        entry.total++;
        if (a.attendance_status === 'present') entry.present++;
      }
    });
  }

  // 4. Per Sabha Balak Counts (using v_sabha_balak_count view)
  const { data: sabhaBalakCounts } = await supabase
    .from('v_sabha_balak_count')
    .select('sabha_id, sankhya')
    .in('sabha_id', sabhaIds);

  const sabhaCountMap = new Map<string, number>();
  (sabhaBalakCounts || []).forEach((c) => {
    if (c.sabha_id) sabhaCountMap.set(c.sabha_id, c.sankhya || 0);
  });

  const sabhaStats: SabhaStatItem[] = sabhaList.map((s) => {
    const attInfo = perSabhaAttMap.get(s.id) || { present: 0, total: 0 };
    const rate = attInfo.total > 0 ? Math.round((attInfo.present / attInfo.total) * 100) : 0;
    return {
      id: s.id,
      name_gu: s.name_gu,
      balak_count: sabhaCountMap.get(s.id) || 0,
      attendance_rate: rate,
    };
  });

  // 5. Overall Karyakar Accountability Pct (EXCLUDING CANCELLED)
  let overallAccountabilityPct = 100;
  const { data: monthTasks } = await supabase
    .from('tasks')
    .select('id, status, sabha_sessions!inner(status)')
    .in('sabha_id', sabhaIds)
    .neq('sabha_sessions.status', 'cancelled')
    .gte('sabha_sessions.session_date', firstDayStr)
    .lte('sabha_sessions.session_date', lastDayStr);

  const tList = monthTasks || [];
  if (tList.length > 0) {
    const doneTasks = tList.filter((t) => t.status === 'done').length;
    overallAccountabilityPct = Math.round((doneTasks / tList.length) * 100);
  }

  // 6. Consecutive Absent Balako (v_consecutive_absent view where streak >= 3)
  const { data: caRows } = await supabase
    .from('v_consecutive_absent')
    .select(`
      balak_id,
      sabha_id,
      streak,
      balako (
        full_name_gu,
        photo_path,
        mother_mobile,
        father_mobile
      ),
      sabhas ( name_gu )
    `)
    .in('sabha_id', sabhaIds)
    .gte('streak', 3);

  const consecutiveAbsentList: ConsecutiveAbsentItem[] = (caRows || []).map((c) => {
    const rawB = c.balako as unknown as {
      full_name_gu: string;
      photo_path: string | null;
      mother_mobile: string;
      father_mobile: string;
    } | null;
    const rawS = c.sabhas as unknown as { name_gu: string } | null;

    return {
      balak_id: c.balak_id || '',
      full_name_gu: rawB?.full_name_gu || 'બાળક',
      photo_path: rawB?.photo_path || null,
      sabha_name_gu: rawS?.name_gu || 'સભા',
      mother_mobile: rawB?.mother_mobile || '',
      father_mobile: rawB?.father_mobile || '',
      streak: c.streak || 3,
    };
  });

  // 7. Overdue Tasks (amber treatment)
  const nowIso = new Date().toISOString();
  const { data: overdueTaskRows } = await supabase
    .from('tasks')
    .select(`
      id,
      session_id,
      task_type,
      due_at,
      sabhas ( name_gu ),
      sabha_sessions!inner ( status )
    `)
    .in('sabha_id', sabhaIds)
    .eq('status', 'open')
    .lt('due_at', nowIso)
    .neq('sabha_sessions.status', 'cancelled')
    .order('due_at', { ascending: true });

  const overdueTasks: OverdueTaskItem[] = (overdueTaskRows || []).map((t) => {
    const rawS = t.sabhas as unknown as { name_gu: string } | null;
    const due = new Date(t.due_at);
    const daysOverdue = Math.max(1, differenceInDays(now, due));

    return {
      id: t.id,
      session_id: t.session_id,
      task_type: t.task_type as TaskTypeT,
      due_at: t.due_at,
      sabha_name_gu: rawS?.name_gu || 'સભા',
      days_overdue: daysOverdue,
    };
  });

  // 8. Incomplete Profiles Count (active balako registered > 14 days ago without photo)
  const fourteenDaysAgoStr = subDays(now, 14).toISOString();
  const { count: incompleteCount } = await supabase
    .from('balako')
    .select('id', { count: 'exact', head: true })
    .eq('vistar_id', vistarId)
    .eq('status', 'active')
    .is('photo_path', null)
    .lte('created_at', fourteenDaysAgoStr);

  return (
    <DashboardClient
      sabhaStats={sabhaStats}
      consecutiveAbsentList={consecutiveAbsentList}
      overdueTasks={overdueTasks}
      incompleteProfilesCount={incompleteCount || 0}
      overallAttendanceRate={overallAttendanceRate}
      totalDistinctBalako={totalDistinctBalako}
      overallAccountabilityPct={overallAccountabilityPct}
      initialPeriod="thisMonth"
      initialFrom={firstDayStr}
      initialTo={lastDayStr}
      vistarName={vistarName}
    />
  );
}
