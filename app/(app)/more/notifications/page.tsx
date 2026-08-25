import { requireKaryakar } from '@/lib/auth.server';
import { createClient } from '@/lib/supabase/server';
import { NotificationsClient } from './NotificationsClient';

export default async function NotificationsPage() {
  const karyakar = await requireKaryakar();
  const supabase = await createClient();

  const { data: existingSub } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('karyakar_id', karyakar.id)
    .limit(1)
    .maybeSingle();

  return (
    <NotificationsClient
      hasExistingSub={!!existingSub}
    />
  );
}
