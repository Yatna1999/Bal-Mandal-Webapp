import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get sabha_ids the balak is enrolled in
    const { data: sabhaLinks } = await supabase
      .from('balak_sabhas')
      .select('sabha_id')
      .eq('balak_id', id);

    const sabhaIds = (sabhaLinks || []).map((s) => s.sabha_id);

    if (sabhaIds.length === 0) {
      return NextResponse.json({
        stats: { present: 0, total: 0, percent: 0 },
        sessions: [],
      });
    }

    // 2. Fetch last 12 held sessions for enrolled sabhas (excluding cancelled completely)
    const { data: sessionData } = await supabase
      .from('sabha_sessions')
      .select(`
        id,
        session_date,
        sabha_id,
        sabhas (
          name_gu
        )
      `)
      .in('sabha_id', sabhaIds)
      .eq('status', 'held')
      .order('session_date', { ascending: false })
      .limit(12);

    const sessionsList = sessionData || [];
    const sessionIds = sessionsList.map((s) => s.id);

    if (sessionIds.length === 0) {
      return NextResponse.json({
        stats: { present: 0, total: 0, percent: 0 },
        sessions: [],
      });
    }

    // 3. Fetch attendance records for these session IDs
    const { data: attendanceData } = await supabase
      .from('attendance')
      .select('session_id, attendance_status')
      .eq('balak_id', id)
      .in('session_id', sessionIds);

    const attMap = new Map<string, string | null>();
    (attendanceData || []).forEach((a) => {
      attMap.set(a.session_id, a.attendance_status);
    });

    let presentCount = 0;
    const totalCount = sessionsList.length;

    const mappedSessions = sessionsList.map((s) => {
      const status = attMap.get(s.id);
      const isPresent = status === 'present';
      if (isPresent) presentCount++;

      const rawSabha = s.sabhas as unknown as { name_gu: string } | null;

      return {
        id: s.id,
        sabha_name_gu: rawSabha?.name_gu || 'સભા',
        session_date: s.session_date,
        status: isPresent ? ('present' as const) : ('absent' as const),
      };
    });

    const percent = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

    return NextResponse.json({
      stats: { present: presentCount, total: totalCount, percent },
      sessions: mappedSessions,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
