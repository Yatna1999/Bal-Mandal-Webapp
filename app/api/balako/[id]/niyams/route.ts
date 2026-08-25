import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { NiyamStatusT } from '@/lib/database.types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: balakId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title_gu, start_date, duration_months, notes_gu } = body;

    const trimmedTitle = (title_gu || '').trim();
    if (!trimmedTitle || !start_date || !duration_months) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // Insert niyam row without end_date (Postgres generated column)
    const { data: newNiyam, error } = await supabase
      .from('niyams')
      .insert({
        balak_id: balakId,
        title_gu: trimmedTitle,
        start_date,
        duration_months: Number(duration_months),
        notes_gu: notes_gu ? notes_gu.trim() : null,
        status: 'active',
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, niyamId: newNiyam.id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: balakId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { niyam_id, status } = body;

    if (!niyam_id || (status !== 'completed' && status !== 'lapsed')) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { error } = await supabase
      .from('niyams')
      .update({
        status: status as NiyamStatusT,
        updated_at: new Date().toISOString(),
      })
      .eq('id', niyam_id)
      .eq('balak_id', balakId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
