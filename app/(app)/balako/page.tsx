import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { BalakoListClient, type SabhaFilter } from './BalakoListClient';
import type { BalakRowData } from '@/components/balak/BalakRow';

export default async function BalakoListPage() {
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  // 1. Fetch photo_grace_days from app_settings
  const { data: graceSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'photo_grace_days')
    .single();

  const photoGraceDays =
    typeof graceSetting?.value === 'number'
      ? graceSetting.value
      : Number(graceSetting?.value) || 10;

  // 2. Fetch visible sabhas for filter chips
  const { data: sabhaData } = await supabase
    .from('sabhas')
    .select('id, name_gu')
    .eq('vistar_id', karyakar.vistar_id)
    .eq('is_active', true)
    .order('name_gu');

  const sabhas: SabhaFilter[] = (sabhaData || []).map((s) => ({
    id: s.id,
    name_gu: s.name_gu,
  }));

  // 3. Explicit column selection query (strictly excluding sensitive columns)
  const { data: balakData } = await supabase
    .from('balako')
    .select(`
      id,
      full_name_gu,
      full_name_en,
      photo_path,
      standard_code,
      status,
      created_at,
      balak_sabhas (
        sabha_id,
        sabhas (
          name_gu
        )
      ),
      standards (
        label_gu
      )
    `)
    .eq('vistar_id', karyakar.vistar_id)
    .eq('status', 'active')
    .order('full_name_gu');

  const initialBalako: BalakRowData[] = (balakData || []).map((b) => {
    const rawSabhas = b.balak_sabhas as unknown as Array<{
      sabha_id: string;
      sabhas: { name_gu: string } | null;
    }> | null;
    const primarySabha = rawSabhas?.[0]?.sabhas?.name_gu;

    const rawStandard = b.standards as unknown as {
      label_gu: string;
    } | null;

    return {
      id: b.id,
      full_name_gu: b.full_name_gu,
      full_name_en: b.full_name_en,
      photo_path: b.photo_path,
      standard_code: b.standard_code,
      status: b.status,
      created_at: b.created_at,
      standard_label_gu: rawStandard?.label_gu || b.standard_code,
      sabha_name_gu: primarySabha,
      rawSabhaIds: (rawSabhas || []).map((s) => s.sabha_id),
    };
  });

  return (
    <BalakoListClient
      initialBalako={initialBalako}
      sabhas={sabhas}
      photoGraceDays={photoGraceDays}
    />
  );
}
