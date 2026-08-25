import { requireRole } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { KaryakarManagementClient, type KaryakarWithSabhas, type SabhaOption } from './KaryakarManagementClient';

export default async function KaryakarManagementPage() {
  // Guard route with super_admin role requirement
  const currentKaryakar = await requireRole('super_admin');

  const supabase = await createClient();

  // Fetch all sabhas in vistar
  const { data: sabhaData } = await supabase
    .from('sabhas')
    .select('id, name_gu')
    .eq('vistar_id', currentKaryakar.vistar_id)
    .eq('is_active', true)
    .order('name_gu');

  const sabhas: SabhaOption[] = (sabhaData || []).map((s) => ({
    id: s.id,
    name_gu: s.name_gu,
  }));

  // Fetch all karyakars with their sabhas
  const { data: karyakarData } = await supabase
    .from('karyakars')
    .select(`
      id,
      full_name_gu,
      full_name_en,
      mobile,
      role,
      is_active,
      must_change_password,
      karyakar_sabhas (sabha_id)
    `)
    .eq('vistar_id', currentKaryakar.vistar_id)
    .order('full_name_gu');

  const karyakars: KaryakarWithSabhas[] = (karyakarData || []).map((k) => {
    const rawSabhas = k.karyakar_sabhas as unknown as Array<{ sabha_id: string }> | null;
    const sabhaIds = (rawSabhas || []).map((s) => s.sabha_id);
    return {
      id: k.id,
      full_name_gu: k.full_name_gu,
      full_name_en: k.full_name_en,
      mobile: k.mobile,
      role: k.role,
      is_active: k.is_active,
      must_change_password: k.must_change_password,
      sabha_ids: sabhaIds,
    };
  });

  return (
    <KaryakarManagementClient
      initialKaryakars={karyakars}
      sabhas={sabhas}
    />
  );
}
