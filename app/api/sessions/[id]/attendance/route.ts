import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

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
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: true, updatedCount: 0 });
    }

    const now = new Date().toISOString();

    // Batch update each row
    const updatePromises = rows.map((r: { attendance_id: string; attendance_status: 'present' | 'absent' | null }) => {
      const updates: Database['public']['Tables']['attendance']['Update'] = {
        attendance_status: r.attendance_status,
        updated_by: user.id,
        updated_at: now,
      };

      return supabase
        .from('attendance')
        .update(updates)
        .eq('id', r.attendance_id)
        .eq('session_id', sessionId);
    });

    const results = await Promise.all(updatePromises);
    const hasError = results.some((res) => res.error);

    if (hasError) {
      const errObj = results.find((res) => res.error);
      return NextResponse.json({ error: errObj?.error?.message || 'Save failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, updatedCount: rows.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
