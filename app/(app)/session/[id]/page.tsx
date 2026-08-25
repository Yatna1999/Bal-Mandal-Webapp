import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import {
  isKaryakramDone,
  isPresabhaDone,
  isAttendanceDone,
  isAhnikDone,
  isAhevalDone,
} from '@/lib/sessions';
import { isoWeekStart } from '@/lib/format';
import { SessionHubClient, type SessionHubData } from './SessionHubClient';

export default async function SessionHubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // 1. Fetch session details
  const { data: sessionData } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      sabha_id,
      session_date,
      start_time,
      end_time,
      sabha_type,
      karyakram_text,
      aheval_done,
      sabhas (
        name_gu,
        vistar_id
      )
    `)
    .eq('id', id)
    .single();

  if (!sessionData) {
    notFound();
  }

  // 2. Fetch attendance rows for task 2 (presabha) & task 3 (attendance)
  const { data: attRows } = await supabase
    .from('attendance')
    .select('presabha_status, attendance_status')
    .eq('session_id', id);

  const attendanceList = (attRows || []).map((a) => ({
    presabha_status: a.presabha_status,
    attendance_status: a.attendance_status,
  }));

  // 3. For pakki sabha: compute ahnik status using enrolled balako and ahnik_weeks for week_start_date
  let enrolledBalakCount = 0;
  let ahnikWeeksCount = 0;

  if (sessionData.sabha_type === 'pakki') {
    const { data: enrolled } = await supabase
      .from('balak_sabhas')
      .select('balak_id, balako!inner(status)')
      .eq('sabha_id', sessionData.sabha_id)
      .eq('balako.status', 'active');

    enrolledBalakCount = enrolled ? enrolled.length : 0;

    if (enrolledBalakCount > 0) {
      const enrolledBalakIds = enrolled!.map((e) => e.balak_id);
      const weekStartDate = isoWeekStart(sessionData.session_date);

      const { data: ahnikWeeks } = await supabase
        .from('ahnik_weeks')
        .select('id')
        .in('balak_id', enrolledBalakIds)
        .eq('week_start_date', weekStartDate);

      ahnikWeeksCount = ahnikWeeks ? ahnikWeeks.length : 0;
    }
  }

  const rawSabha = sessionData.sabhas as unknown as {
    name_gu: string;
    vistar_id: string;
  } | null;

  const sessionHubData: SessionHubData = {
    id: sessionData.id,
    sabha_id: sessionData.sabha_id,
    sabha_name_gu: rawSabha?.name_gu || 'સભા',
    session_date: sessionData.session_date,
    start_time: sessionData.start_time,
    end_time: sessionData.end_time,
    sabha_type: sessionData.sabha_type,
    karyakram_text: sessionData.karyakram_text,
    aheval_done: sessionData.aheval_done,
    isKaryakramDone: isKaryakramDone(sessionData),
    isPresabhaDone: isPresabhaDone(attendanceList),
    isAttendanceDone: isAttendanceDone(attendanceList),
    isAhnikDone: isAhnikDone(enrolledBalakCount, ahnikWeeksCount),
    isAhevalDone: isAhevalDone(sessionData),
  };

  return <SessionHubClient session={sessionHubData} />;
}
