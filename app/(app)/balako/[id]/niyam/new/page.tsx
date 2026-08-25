import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { NewNiyamClient } from './NewNiyamClient';

export default async function NewNiyamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  const { data: balak } = await supabase
    .from('balako')
    .select('id, full_name_gu')
    .eq('id', id)
    .single();

  if (!balak) {
    notFound();
  }

  return (
    <NewNiyamClient
      balakId={balak.id}
      balakNameGu={balak.full_name_gu}
    />
  );
}
