import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { AhevalClient } from './AhevalClient';

export default async function AhevalPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: sessionId } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('sabha_sessions')
    .select(`
      id,
      session_date,
      start_time,
      end_time,
      aheval_done,
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

  return (
    <AhevalClient
      sessionId={session.id}
      sabhaNameGu={sabhaNameGu}
      sessionDate={session.session_date}
      startTime={session.start_time}
      endTime={session.end_time}
      initialDone={!!session.aheval_done}
    />
  );
}
