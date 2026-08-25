import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { balak_id, week_start_date, entries } = body;

    if (!balak_id || !week_start_date || !entries) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 1. Fetch existing ahnik_weeks row for (balak_id, week_start_date)
    const { data: existingWeek } = await supabase
      .from('ahnik_weeks')
      .select('id, captured_by')
      .eq('balak_id', balak_id)
      .eq('week_start_date', week_start_date)
      .maybeSingle();

    let weekId = existingWeek?.id;

    if (!existingWeek) {
      // Create new ahnik_weeks row
      const { data: newWeek, error: wErr } = await supabase
        .from('ahnik_weeks')
        .insert({
          balak_id,
          week_start_date,
          captured_at_session: sessionId,
          captured_by: user.id,
          updated_by: user.id,
        })
        .select('id')
        .single();

      if (wErr || !newWeek) {
        return NextResponse.json({ error: wErr?.message || 'Failed to create week record' }, { status: 400 });
      }
      weekId = newWeek.id;
    } else {
      // Update existing ahnik_weeks row
      await supabase
        .from('ahnik_weeks')
        .update({
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingWeek.id);
    }

    if (!weekId) {
      return NextResponse.json({ error: 'Failed to create week record' }, { status: 400 });
    }

    // 2. Batch upsert ahnik_entries for this week
    const itemIds = Object.keys(entries);
    const entryRows = itemIds.map((itemId) => ({
      ahnik_week_id: weekId,
      ahnik_item_id: itemId,
      done: !!entries[itemId],
    }));

    const { error: eErr } = await supabase
      .from('ahnik_entries')
      .upsert(entryRows, {
        onConflict: 'ahnik_week_id,ahnik_item_id',
      });

    if (eErr) {
      return NextResponse.json({ error: eErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, weekId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
