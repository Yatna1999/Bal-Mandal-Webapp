import { requireRole } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { SabhaManagementClient } from './SabhaManagementClient';

export default async function SabhaManagementPage() {
  // Require vistar scope role (super_admin, agresar, or nirikshak)
  const karyakar = await requireRole('super_admin', 'agresar', 'nirikshak');

  const supabase = await createClient();

  const { data: sabhas } = await supabase
    .from('sabhas')
    .select('*')
    .eq('vistar_id', karyakar.vistar_id)
    .order('name_gu');

  return (
    <SabhaManagementClient
      initialSabhas={sabhas || []}
      userRole={karyakar.role}
    />
  );
}
