import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { BalakForm, type StandardOption, type SabhaOption } from '@/components/balak/BalakForm';

export default async function NewBalakPage() {
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

  return (
    <BalakForm
      vistarId={karyakar.vistar_id}
      standards={standards}
      sabhas={sabhas}
    />
  );
}
