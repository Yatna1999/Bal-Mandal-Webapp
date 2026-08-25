import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/database.types';

export async function PATCH(
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

    // Case 1: Update single attendance row
    if (body.attendance_id) {
      const updates: Database['public']['Tables']['attendance']['Update'] = {};

      if (body.presabha_contacted) {
        updates.presabha_contacted = body.presabha_contacted;
        updates.presabha_by = user.id;
      }

      if (body.presabha_status) {
        updates.presabha_status = body.presabha_status;
        updates.presabha_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('attendance')
        .update(updates)
        .eq('id', body.attendance_id)
        .eq('session_id', sessionId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      const { recomputeTask } = await import('@/lib/tasks');
      await recomputeTask(sessionId, 'presabha_followup', user.id);

      return NextResponse.json({ success: true });
    }

    // Case 2: Update session_followup_karyakars
    if (Array.isArray(body.followup_karyakar_ids)) {
      const karyakarIds: string[] = body.followup_karyakar_ids;

      // Delete existing
      await supabase
        .from('session_followup_karyakars')
        .delete()
        .eq('session_id', sessionId);

      if (karyakarIds.length > 0) {
        const rows = karyakarIds.map((kId) => ({
          session_id: sessionId,
          karyakar_id: kId,
        }));

        const { error: insErr } = await supabase
          .from('session_followup_karyakars')
          .insert(rows);

        if (insErr) {
          return NextResponse.json({ error: insErr.message }, { status: 400 });
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
