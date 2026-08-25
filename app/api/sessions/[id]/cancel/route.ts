import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { autoCloseSessionTasks } from '@/lib/tasks';

export const dynamic = 'force-dynamic';

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

    const { error } = await supabase
      .from('sabha_sessions')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Auto-close all tasks for this session
    await autoCloseSessionTasks(sessionId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
