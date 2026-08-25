import { notFound } from 'next/navigation';
import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { BalakForm, type StandardOption, type SabhaOption, type BalakInitialData } from '@/components/balak/BalakForm';

export default async function EditBalakPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // Fetch standards sorted by sort_order
  const { data: standardsData } = await supabase
    .from('standards')
    .select('code, label_gu')
    .order('sort_order');

  const standards: StandardOption[] = (standardsData || []).map((s) => ({
    code: s.code,
    label_gu: s.label_gu,
  }));

  // Fetch active sabhas in vistar
  const { data: sabhaData } = await supabase
    .from('sabhas')
    .select('id, name_gu')
    .eq('vistar_id', karyakar.vistar_id)
    .eq('is_active', true)
    .order('name_gu');

  const sabhas: SabhaOption[] = (sabhaData || []).map((s) => ({
    id: s.id,
    name_gu: s.name_gu,
  }));

  // Fetch balak profile
  const { data: balak } = await supabase
    .from('balako')
    .select(`
      *,
      balak_sabhas (
        sabha_id,
        is_primary
      )
    `)
    .eq('id', id)
    .eq('vistar_id', karyakar.vistar_id)
    .single();

  if (!balak) {
    notFound();
  }

  const rawSabhas = balak.balak_sabhas as unknown as Array<{
    sabha_id: string;
    is_primary: boolean;
  }> | null;

  const sabha_ids = (rawSabhas || []).map((s) => s.sabha_id);
  const primarySabha = rawSabhas?.find((s) => s.is_primary)?.sabha_id || sabha_ids[0] || '';

  const initialData: BalakInitialData = {
    id: balak.id,
    vistar_id: balak.vistar_id,
    full_name_gu: balak.full_name_gu,
    full_name_en: balak.full_name_en,
    photo_path: balak.photo_path,
    dob: balak.dob,
    standard_code: balak.standard_code,
    medium: balak.medium,
    school_gu: balak.school_gu,
    school_en: balak.school_en,
    address_gu: balak.address_gu,
    satsang_status: balak.satsang_status,
    mother_name_gu: balak.mother_name_gu,
    mother_mobile: balak.mother_mobile,
    father_name_gu: balak.father_name_gu,
    father_mobile: balak.father_mobile,
    sabha_ids,
    primary_sabha_id: primarySabha,
  };

  return (
    <BalakForm
      initialData={initialData}
      vistarId={karyakar.vistar_id}
      standards={standards}
      sabhas={sabhas}
    />
  );
}
