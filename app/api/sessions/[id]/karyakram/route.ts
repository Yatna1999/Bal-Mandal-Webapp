import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recomputeTask } from '@/lib/tasks';

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
    const { karyakram_text } = body;

    const textToSave = karyakram_text ? karyakram_text.trim() : null;

    const { error } = await supabase
      .from('sabha_sessions')
      .update({
        karyakram_text: textToSave,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Immediately recompute task
    await recomputeTask(sessionId, 'prepare_karyakram', user.id);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
