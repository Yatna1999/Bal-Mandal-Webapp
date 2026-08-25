import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExportClient } from './ExportClient';

export default async function ExportPage() {
  const karyakar = await requireKaryakar();
  const supabase = await createClient();
  const vistarScope = isVistarScope(karyakar.role);

  let sabhas: Array<{ id: string; name_gu: string }> = [];

  if (vistarScope) {
    const { data } = await supabase
      .from('sabhas')
      .select('id, name_gu')
      .eq('is_active', true)
      .order('name_gu');
    sabhas = data || [];
  } else {
    const { data: ks } = await supabase
      .from('karyakar_sabhas')
      .select('sabha_id, sabhas(id, name_gu, is_active)')
      .eq('karyakar_id', karyakar.id);

    sabhas = (ks || [])
      .map((item) => item.sabhas as unknown as { id: string; name_gu: string; is_active: boolean } | null)
      .filter((s): s is { id: string; name_gu: string; is_active: boolean } => Boolean(s && s.is_active));
  }

  return (
    <ExportClient
      sabhas={sabhas}
      vistarScope={vistarScope}
      actorName={karyakar.full_name_gu}
    />
  );
}
