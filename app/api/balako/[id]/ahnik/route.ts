import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isoWeekStart } from '@/lib/format';

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

    // 1. Fetch 7 ahnik items ordered by sort_order
    const { data: itemsData } = await supabase
      .from('ahnik_items')
      .select('id, code, label_gu, sort_order')
      .eq('is_active', true)
      .order('sort_order');

    const items = itemsData || [];
    const itemIds = items.map((i) => i.id);

    // 2. Generate last 12 ISO week start dates (Mondays)
    const today = new Date();
    const currentWeekStartStr = isoWeekStart(today);
    const weekStartDates: string[] = [];

    const cursor = new Date(currentWeekStartStr);
    for (let i = 0; i < 12; i++) {
      const dStr = cursor.toISOString().split('T')[0];
      weekStartDates.push(dStr);
      cursor.setDate(cursor.getDate() - 7);
    }

    // 3. Fetch ahnik_weeks for this balak for these dates
    const { data: weeksData } = await supabase
      .from('ahnik_weeks')
      .select('id, week_start_date')
      .eq('balak_id', id)
      .in('week_start_date', weekStartDates);

    const weekMap = new Map<string, string>(); // week_start_date -> week_id
    (weeksData || []).forEach((w) => {
      weekMap.set(w.week_start_date, w.id);
    });

    const weekIds = Array.from(weekMap.values());

    // 4. Fetch entries
    const entriesMap = new Map<string, Map<string, boolean>>(); // week_id -> (item_id -> done)
    if (weekIds.length > 0) {
      const { data: entriesData } = await supabase
        .from('ahnik_entries')
        .select('ahnik_week_id, ahnik_item_id, done')
        .in('ahnik_week_id', weekIds);

      (entriesData || []).forEach((e) => {
        if (!entriesMap.has(e.ahnik_week_id)) {
          entriesMap.set(e.ahnik_week_id, new Map());
        }
        entriesMap.get(e.ahnik_week_id)!.set(e.ahnik_item_id, e.done);
      });
    }

    // 5. Build 12-week grid rows
    const weeks = weekStartDates.map((wDate) => {
      const weekId = weekMap.get(wDate);
      const hasRecord = !!weekId;
      const entryMap = weekId ? entriesMap.get(weekId) : null;

      const entries: Record<string, boolean | null> = {};
      itemIds.forEach((itemId) => {
        if (!hasRecord || !entryMap || !entryMap.has(itemId)) {
          entries[itemId] = null; // null represents unrecorded/pending
        } else {
          entries[itemId] = entryMap.get(itemId)!;
        }
      });

      return {
        week_start_date: wDate,
        has_record: hasRecord,
        entries,
      };
    });

    return NextResponse.json({
      items,
      weeks,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
