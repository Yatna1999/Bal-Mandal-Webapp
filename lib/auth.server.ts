import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { RoleT, Database } from '@/lib/database.types';
import { ForbiddenError } from './auth';

export type KaryakarRow = Database['public']['Tables']['karyakars']['Row'];

export async function requireKaryakar(): Promise<KaryakarRow> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: karyakar } = await supabase
    .from('karyakars')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!karyakar || !karyakar.is_active) {
    await supabase.auth.signOut();
    redirect('/login?error=accountInactive');
  }

  if (karyakar.must_change_password) {
    redirect('/first-password');
  }

  return karyakar;
}

export async function requireRole(...roles: RoleT[]): Promise<KaryakarRow> {
  const karyakar = await requireKaryakar();

  if (!roles.includes(karyakar.role)) {
    throw new ForbiddenError('No permission for this role');
  }

  return karyakar;
}
