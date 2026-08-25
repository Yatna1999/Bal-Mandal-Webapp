import { adminClient } from '@/lib/supabase/admin';
import { formatInTimeZone } from 'date-fns-tz';
import { TZ } from '@/lib/format';
import { t } from '@/lib/i18n';

/**
 * Flip active niyams whose end_date has passed to 'expired' and write
 * ONE in-app notification per niyam. NEVER sends push.
 */
export async function expireNiyams(): Promise<{ expired: number; notified: number }> {
  const now = new Date();
  const currentDateStr = formatInTimeZone(now, TZ, 'yyyy-MM-dd');

  // 1. Select niyams where status = 'active' and end_date < current_date
  const { data: expiredNiyams, error: fetchErr } = await adminClient
    .from('niyams')
    .select(`
      id,
      balak_id,
      title_gu,
      start_date,
      end_date,
      status,
      balako (
        full_name_gu,
        balak_sabhas (
          sabha_id,
          is_primary
        )
      )
    `)
    .eq('status', 'active')
    .lt('end_date', currentDateStr);

  if (fetchErr || !expiredNiyams || expiredNiyams.length === 0) {
    return { expired: 0, notified: 0 };
  }

  const expiredIds = expiredNiyams.map((n) => n.id);

  // 2. Flip status to 'expired'
  const { error: updateErr } = await adminClient
    .from('niyams')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .in('id', expiredIds);

  if (updateErr) {
    console.error('Failed to flip expired niyams:', updateErr);
    throw new Error(updateErr.message);
  }

  let notificationCount = 0;

  // 3. For each expired niyam, write in-app notification to primary sabha karyakars
  for (const niyam of expiredNiyams) {
    const rawBalak = niyam.balako as unknown as {
      full_name_gu: string;
      balak_sabhas: Array<{ sabha_id: string; is_primary: boolean }>;
    } | null;

    if (!rawBalak) continue;

    const primarySabhaLink = (rawBalak.balak_sabhas || []).find((bs) => bs.is_primary);
    if (!primarySabhaLink) continue;

    // Fetch karyakars assigned to this primary sabha
    const { data: sabhaKaryakars } = await adminClient
      .from('karyakar_sabhas')
      .select('karyakar_id')
      .eq('sabha_id', primarySabhaLink.sabha_id);

    if (!sabhaKaryakars || sabhaKaryakars.length === 0) continue;

    const notifTitle = t('niyam.expiredNotifTitle');
    const notifBody = t('niyam.expiredNotifBody', {
      name: rawBalak.full_name_gu,
      niyam: niyam.title_gu,
    });
    const notifLink = `/balako/${niyam.balak_id}`;

    const notificationRows = sabhaKaryakars.map((k) => ({
      karyakar_id: k.karyakar_id,
      kind: 'niyam_expired',
      title_gu: notifTitle,
      body_gu: notifBody,
      link_url: notifLink,
    }));

    const { data: createdNotifs, error: nErr } = await adminClient
      .from('inapp_notifications')
      .insert(notificationRows)
      .select('id');

    if (!nErr && createdNotifs) {
      notificationCount += createdNotifs.length;
    }
  }

  return {
    expired: expiredIds.length,
    notified: notificationCount,
  };
}
