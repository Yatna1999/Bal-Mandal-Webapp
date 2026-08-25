import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SabhaListClient, type AccessibleSabha, type UpcomingSession } from './SabhaListClient';

export default async function SabhaListPage() {
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  const vistarScope = isVistarScope(karyakar.role);

  // 1. Determine accessible sabha IDs
  let accessibleSabhaIds: string[] = [];

  if (vistarScope) {
    const { data: vSabhas } = await supabase
      .from('sabhas')
      .select('id')
      .eq('vistar_id', karyakar.vistar_id)
      .eq('is_active', true);
    accessibleSabhaIds = (vSabhas || []).map((s) => s.id);
  } else {
    const { data: kSabhas } = await supabase
      .from('karyakar_sabhas')
      .select('sabha_id')
      .eq('karyakar_id', karyakar.id);
    accessibleSabhaIds = (kSabhas || []).map((s) => s.sabha_id);
  }

  if (accessibleSabhaIds.length === 0) {
    return (
      <SabhaListClient sabhas={[]} upcomingSessions={[]} />
    );
  }

  // 2. Fetch sabha details
  const { data: sabhaData } = await supabase
    .from('sabhas')
    .select('id, name_gu, default_weekday, default_start_time, default_end_time, sabha_type')
    .in('id', accessibleSabhaIds)
    .eq('is_active', true)
    .order('name_gu');

  // 3. Count active balako per sabha
  const { data: balakSabhaCounts } = await supabase
    .from('balak_sabhas')
    .select('sabha_id, balako!inner(status)')
    .in('sabha_id', accessibleSabhaIds)
    .eq('balako.status', 'active');

  const countMap = new Map<string, number>();
  (balakSabhaCounts || []).forEach((row) => {
    countMap.set(row.sabha_id, (countMap.get(row.sabha_id) || 0) + 1);
  });

  const sabhas: AccessibleSabha[] = (sabhaData || []).map((s) => ({
    id: s.id,
    name_gu: s.name_gu,
    default_weekday: s.default_weekday,
    default_start_time: s.default_start_time,
    default_end_time: s.default_end_time,
    sabha_type: s.sabha_type,
    balak_count: countMap.get(s.id) || 0,
  }));

  // 4. Fetch next 5 scheduled sessions sorted by date
  const { data: sessionData } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      sabha_id,
      session_date,
      start_time,
      end_time,
      sabha_type,
      sabhas (
        name_gu
      )
    `)
    .in('sabha_id', accessibleSabhaIds)
    .eq('status', 'scheduled')
    .order('session_date', { ascending: true })
    .limit(5);

  const upcomingSessions: UpcomingSession[] = (sessionData || []).map((s) => {
    const rawSabha = s.sabhas as unknown as { name_gu: string } | null;
    return {
      id: s.id,
      sabha_id: s.sabha_id,
      sabha_name_gu: rawSabha?.name_gu || 'સભા',
      session_date: s.session_date,
      start_time: s.start_time,
      end_time: s.end_time,
      sabha_type: s.sabha_type,
    };
  });

  return (
    <SabhaListClient
      sabhas={sabhas}
      upcomingSessions={upcomingSessions}
    />
  );
}
