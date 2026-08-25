import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { KaryakramClient } from './KaryakramClient';

export default async function KaryakramPage({
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
      karyakram_text,
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
    <KaryakramClient
      sessionId={session.id}
      sabhaNameGu={sabhaNameGu}
      sessionDate={session.session_date}
      startTime={session.start_time}
      endTime={session.end_time}
      initialText={session.karyakram_text || ''}
    />
  );
}
