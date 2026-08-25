import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isVistarScope } from '@/lib/auth';
import { t } from '@/lib/i18n';
import type { BalakStatusT } from '@/lib/database.types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user: caller },
    } = await supabase.auth.getUser();

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: callerKaryakar } = await supabase
      .from('karyakars')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (!callerKaryakar) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, status, archive_reason_gu } = body;

    // Action 1: Unarchive (super_admin only)
    if (action === 'unarchive') {
      if (callerKaryakar.role !== 'super_admin') {
        return NextResponse.json({ error: t('errors.noPermission') }, { status: 403 });
      }

      const { error: unarchErr } = await supabase
        .from('balako')
        .update({
          status: 'active',
          archive_reason_gu: null,
          archived_at: null,
          archived_by: null,
        })
        .eq('id', id);

      if (unarchErr) {
        return NextResponse.json({ error: unarchErr.message }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Action 2: Archive / Transfer (isVistarScope required)
    if (!isVistarScope(callerKaryakar.role)) {
      return NextResponse.json({ error: t('errors.noPermission') }, { status: 403 });
    }

    const targetStatus: BalakStatusT =
      status === 'transferred_kishore' ? 'transferred_kishore' : 'archived';

    const trimmedReason = (archive_reason_gu || '').trim();
    if (!trimmedReason) {
      return NextResponse.json({ error: t('errors.required') }, { status: 400 });
    }

    const { error: archErr } = await supabase
      .from('balako')
      .update({
        status: targetStatus,
        archive_reason_gu: trimmedReason,
        archived_at: new Date().toISOString(),
        archived_by: caller.id,
      })
      .eq('id', id);

    if (archErr) {
      return NextResponse.json({ error: archErr.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
