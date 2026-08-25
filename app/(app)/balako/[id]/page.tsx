import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { BalakProfileClient, type BalakProfileData, type BalakNiyamItem } from './BalakProfileClient';

export default async function BalakProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // Explicit column selection query including mobile and address
  const { data: balakData } = await supabase
    .from('balako')
    .select(`
      id,
      vistar_id,
      full_name_gu,
      full_name_en,
      photo_path,
      dob,
      standard_code,
      medium,
      school_gu,
      school_en,
      address_gu,
      satsang_status,
      mother_name_gu,
      mother_mobile,
      father_name_gu,
      father_mobile,
      status,
      created_at,
      archive_reason_gu,
      archived_at,
      archived_by,
      standards (
        label_gu
      )
    `)
    .eq('id', id)
    .eq('vistar_id', karyakar.vistar_id)
    .single();

  if (!balakData) {
    notFound();
  }

  let archivedByNameGu: string | null = null;
  if (balakData.archived_by) {
    const { data: archKaryakar } = await supabase
      .from('karyakars')
      .select('full_name_gu')
      .eq('id', balakData.archived_by)
      .single();
    if (archKaryakar) {
      archivedByNameGu = archKaryakar.full_name_gu;
    }
  }

  const rawStandard = balakData.standards as unknown as {
    label_gu: string;
  } | null;

  const balak: BalakProfileData = {
    ...balakData,
    archived_by_name_gu: archivedByNameGu,
    standard_label_gu: rawStandard?.label_gu || balakData.standard_code,
  };

  // Fetch special niyams for this balak
  const { data: niyamData } = await supabase
    .from('niyams')
    .select('id, title_gu, start_date, end_date, status')
    .eq('balak_id', id)
    .order('start_date', { ascending: false });

  const niyams: BalakNiyamItem[] = (niyamData || []).map((n) => ({
    id: n.id,
    title: n.title_gu,
    start_date: n.start_date,
    end_date: n.end_date || n.start_date,
    status: n.status as BalakNiyamItem['status'],
  }));

  return (
    <BalakProfileClient
      balak={balak}
      niyams={niyams}
      userRole={karyakar.role}
    />
  );
}
