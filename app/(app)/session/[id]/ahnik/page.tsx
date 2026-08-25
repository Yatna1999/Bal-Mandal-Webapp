import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { isoWeekStart } from '@/lib/format';
import {
  AhnikClient,
  type AhnikItem,
  type AhnikBalak,
} from './AhnikClient';

export default async function AhnikFollowupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // 1. Fetch session details
  const { data: session } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      sabha_id,
      session_date,
      sabha_type,
      sabhas (
        name_gu
      )
    `)
    .eq('id', sessionId)
    .single();

  if (!session) {
    notFound();
  }

  const rawSabha = session.sabhas as unknown as { name_gu: string } | null;
  const sabhaNameGu = rawSabha?.name_gu || 'સભા';
  const weekStartDate = isoWeekStart(session.session_date);

  // Kachi sabha guard
  if (session.sabha_type !== 'pakki') {
    return (
      <AhnikClient
        sessionId={session.id}
        sabhaNameGu={sabhaNameGu}
        sabhaType="kachi"
        weekStartDate={weekStartDate}
        items={[]}
        balako={[]}
      />
    );
  }

  // 2. Fetch 7 ahnik items ordered by sort_order
  const { data: itemsData } = await supabase
    .from('ahnik_items')
    .select('id, code, label_gu, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const items: AhnikItem[] = itemsData || [];
  const itemIds = items.map((i) => i.id);

  // 3. Fetch active enrolled balako in this sabha
  const { data: enrolledData } = await supabase
    .from('balak_sabhas')
    .select(`
      balak_id,
      balako (
        id,
        full_name_gu,
        photo_path,
        satsang_status,
        standard_code,
        status,
        standards (
          label_gu
        )
      )
    `)
    .eq('sabha_id', session.sabha_id);

  const activeEnrolled = (enrolledData || []).filter((e) => {
    const rawB = e.balako as unknown as { status: string } | null;
    return rawB?.status === 'active';
  });

  const balakIds = activeEnrolled.map((e) => e.balak_id);

  // 4. Query ahnik_weeks records for these balako for this weekStartDate
  const { data: weekRecords } = balakIds.length > 0
    ? await supabase
        .from('ahnik_weeks')
        .select(`
          id,
          balak_id,
          captured_at_session,
          sabha_sessions (
            sabhas (
              name_gu
            )
          )
        `)
        .in('balak_id', balakIds)
        .eq('week_start_date', weekStartDate)
    : { data: [] };

  const weekRecordMap = new Map<string, {
    week_id: string;
    captured_at_session: string | null;
    capturing_sabha_name_gu?: string | null;
  }>();

  (weekRecords || []).forEach((w) => {
    const rawS = w.sabha_sessions as unknown as { sabhas: { name_gu: string } | null } | null;
    weekRecordMap.set(w.balak_id, {
      week_id: w.id,
      captured_at_session: w.captured_at_session,
      capturing_sabha_name_gu: rawS?.sabhas?.name_gu || null,
    });
  });

  const weekIds = Array.from(weekRecordMap.values()).map((w) => w.week_id);

  // 5. Query ahnik_entries for these weeks
  const entriesMap = new Map<string, Record<string, boolean>>(); // week_id -> (item_id -> done)

  if (weekIds.length > 0) {
    const { data: entriesData } = await supabase
      .from('ahnik_entries')
      .select('ahnik_week_id, ahnik_item_id, done')
      .in('ahnik_week_id', weekIds);

    (entriesData || []).forEach((e) => {
      if (!entriesMap.has(e.ahnik_week_id)) {
        entriesMap.set(e.ahnik_week_id, {});
      }
      entriesMap.get(e.ahnik_week_id)![e.ahnik_item_id] = e.done;
    });
  }

  // 6. Build balako list
  const balakoList: AhnikBalak[] = activeEnrolled.map((e) => {
    const rawB = e.balako as unknown as {
      id: string;
      full_name_gu: string;
      photo_path: string | null;
      satsang_status: AhnikBalak['satsang_status'];
      standard_code: string;
      standards: { label_gu: string } | null;
    } | null;

    const bId = rawB?.id || e.balak_id;
    const weekRec = weekRecordMap.get(bId);
    let weekRecord: AhnikBalak['weekRecord'] = null;

    if (weekRec) {
      const eMap = entriesMap.get(weekRec.week_id) || {};
      const entriesObj: Record<string, boolean> = {};
      itemIds.forEach((itemId) => {
        entriesObj[itemId] = !!eMap[itemId];
      });

      weekRecord = {
        week_id: weekRec.week_id,
        captured_at_session: weekRec.captured_at_session,
        capturing_sabha_name_gu: weekRec.capturing_sabha_name_gu,
        entries: entriesObj,
      };
    }

    return {
      id: bId,
      full_name_gu: rawB?.full_name_gu || 'બાળક',
      photo_path: rawB?.photo_path || null,
      standard_label_gu: rawB?.standards?.label_gu || rawB?.standard_code || '',
      satsang_status: rawB?.satsang_status || 'satsangi',
      weekRecord,
    };
  });

  // Sort balako alphabetically by full_name_gu
  balakoList.sort((a, b) => a.full_name_gu.localeCompare(b.full_name_gu, 'gu'));

  return (
    <AhnikClient
      sessionId={session.id}
      sabhaNameGu={sabhaNameGu}
      sabhaType={session.sabha_type}
      weekStartDate={weekStartDate}
      items={items}
      balako={balakoList}
    />
  );
}
