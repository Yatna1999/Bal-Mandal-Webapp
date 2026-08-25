import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { ArchiveBalakClient } from './ArchiveBalakClient';

export default async function ArchiveBalakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karyakar = await requireRole('super_admin', 'agresar', 'nirikshak');
  const supabase = await createClient();

  const { data: balak } = await supabase
    .from('balako')
    .select('id, full_name_gu, vistar_id')
    .eq('id', id)
    .eq('vistar_id', karyakar.vistar_id)
    .single();

  if (!balak) {
    notFound();
  }

  return (
    <ArchiveBalakClient
      balakId={balak.id}
      balakNameGu={balak.full_name_gu}
    />
  );
}
