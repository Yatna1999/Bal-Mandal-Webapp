import webPush from 'web-push';
import { adminClient } from '@/lib/supabase/admin';
import { formatInTimeZone } from 'date-fns-tz';
import { TZ } from '@/lib/format';
import { t } from '@/lib/i18n';

const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivate = process.env.VAPID_PRIVATE_KEY || '';
const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@balsabha.local';

if (vapidPublic && vapidPrivate) {
  try {
    webPush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  } catch (err) {
    console.error('Failed to set VAPID details:', err);
  }
}

/**
 * Check if current HH:mm in IST falls inside quiet hours (default 22:00 to 07:00).
 */
function isQuietHours(nowTimeStr: string, quietStart: string, quietEnd: string): boolean {
  // quietStart e.g. "22:00", quietEnd e.g. "07:00"
  if (quietStart > quietEnd) {
    // Overnight window (e.g. 22:00 to 07:00)
    return nowTimeStr >= quietStart || nowTimeStr < quietEnd;
  } else {
    // Same-day window (e.g. 01:00 to 06:00)
    return nowTimeStr >= quietStart && nowTimeStr < quietEnd;
  }
}

/**
 * Check if current HH:mm in IST is within +/- 15 minutes of any slot in reminderSlots.
 */
function isInsideReminderSlot(nowMinutes: number, slots: string[]): boolean {
  return slots.some((slotStr) => {
    const [h, m] = slotStr.split(':').map(Number);
    const slotMinutes = h * 60 + m;
    const diff = Math.abs(nowMinutes - slotMinutes);
    return diff <= 15 || Math.abs(diff - 1440) <= 15;
  });
}

/**
 * Only if now() is inside a reminder slot window (+/- 15 min)
 * AND outside quiet hours. Both read from app_settings.
 * Merge multiple open tasks for one karyakar into a single push.
 */
export async function sendReminders(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const nowTimeStr = formatInTimeZone(now, TZ, 'HH:mm'); // e.g. "09:05"
  const [currH, currM] = nowTimeStr.split(':').map(Number);
  const nowMinutes = currH * 60 + currM;

  // 1. Read quiet hours & slots settings from app_settings
  const { data: settings } = await adminClient
    .from('app_settings')
    .select('key, value');

  const settingsMap = new Map<string, string>();
  (settings || []).forEach((s) => {
    settingsMap.set(s.key, typeof s.value === 'string' ? s.value : JSON.stringify(s.value));
  });

  const quietStart = settingsMap.get('quiet_hours_start')?.replace(/"/g, '') || '22:00';
  const quietEnd = settingsMap.get('quiet_hours_end')?.replace(/"/g, '') || '07:00';

  let slots: string[] = ['09:00', '13:00', '17:00', '21:00'];
  const rawSlots = settingsMap.get('reminder_slots');
  if (rawSlots) {
    try {
      const parsed = JSON.parse(rawSlots);
      if (Array.isArray(parsed) && parsed.length > 0) {
        slots = parsed;
      }
    } catch {
      // Use defaults
    }
  }

  // 2. Quiet Hours check
  if (isQuietHours(nowTimeStr, quietStart, quietEnd)) {
    console.log(`[Push] Skipping reminders: Quiet hours (${quietStart} - ${quietEnd}), current IST: ${nowTimeStr}`);
    return { sent: 0, skipped: 0 };
  }

  // 3. Reminder Slot Window check (+/- 15 min)
  if (!isInsideReminderSlot(nowMinutes, slots)) {
    console.log(`[Push] Skipping reminders: Outside reminder slots window (+/- 15m of ${slots.join(', ')}), current IST: ${nowTimeStr}`);
    return { sent: 0, skipped: 0 };
  }

  // 4. Fetch all active push subscriptions
  const { data: subscriptions } = await adminClient
    .from('push_subscriptions')
    .select(`
      id,
      karyakar_id,
      endpoint,
      p256dh,
      auth,
      failure_count
    `);

  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  let sentCount = 0;
  let skippedCount = 0;

  // Group subscriptions by karyakar_id
  for (const sub of subscriptions) {
    // Query open tasks for karyakar's assigned sabhas
    const { data: karyakarSabhas } = await adminClient
      .from('karyakar_sabhas')
      .select('sabha_id')
      .eq('karyakar_id', sub.karyakar_id);

    const sabhaIds = (karyakarSabhas || []).map((ks) => ks.sabha_id);
    if (sabhaIds.length === 0) {
      skippedCount++;
      continue;
    }

    const { data: openTasks } = await adminClient
      .from('tasks')
      .select(`
        id,
        session_id,
        task_type,
        due_at,
        sabha_sessions (
          sabhas (
            name_gu
          )
        )
      `)
      .in('sabha_id', sabhaIds)
      .eq('status', 'open');

    if (!openTasks || openTasks.length === 0) {
      skippedCount++;
      continue;
    }

    // Merge multiple open tasks for this karyakar into a single push
    const firstTask = openTasks[0];
    const rawS = firstTask.sabha_sessions as unknown as { sabhas: { name_gu: string } | null } | null;
    const sabhaName = rawS?.sabhas?.name_gu || 'સભા';

    let pushTitle = t('task.title');
    let pushBody = '';
    let pushUrl = `/session/${firstTask.session_id}`;

    if (openTasks.length === 1) {
      const taskName = t(`task.${firstTask.task_type}` as Parameters<typeof t>[0]) || firstTask.task_type;
      pushTitle = `${sabhaName}: ${taskName}`;
      pushBody = `તમારું ૧ કામ બાકી છે.`;
      if (firstTask.task_type === 'mark_attendance') {
        pushUrl = `/session/${firstTask.session_id}/attendance`;
      } else if (firstTask.task_type === 'presabha_followup') {
        pushUrl = `/session/${firstTask.session_id}/presabha`;
      } else if (firstTask.task_type === 'ahnik_followup') {
        pushUrl = `/session/${firstTask.session_id}/ahnik`;
      }
    } else {
      pushTitle = `${sabhaName}: ${openTasks.length} કામ બાકી છે`;
      pushBody = `તમારા ${openTasks.length} કામ બાકી છે. કૃપા કરીને પૂર્ણ કરો.`;
    }

    const pushPayload = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      tag: `task-${firstTask.id}`,
      url: pushUrl,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
    });

    const pushSubscriptionObj = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    try {
      await webPush.sendNotification(pushSubscriptionObj, pushPayload);
      sentCount++;
      // Reset failure count and update last_success_at on success
      if (sub.failure_count > 0) {
        await adminClient
          .from('push_subscriptions')
          .update({ failure_count: 0, last_success_at: new Date().toISOString() })
          .eq('id', sub.id);
      }
    } catch (err: unknown) {
      const statusCode = (err as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        // Subscription dead -> Delete immediately
        console.log(`[Push] Sub ${sub.id} dead (HTTP ${statusCode}). Deleting...`);
        await adminClient.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        // Increment failure count
        console.error(`[Push] Failed to send sub ${sub.id} (HTTP ${statusCode}):`, err);
        await adminClient
          .from('push_subscriptions')
          .update({
            failure_count: sub.failure_count + 1,
          })
          .eq('id', sub.id);
      }
    }
  }

  return { sent: sentCount, skipped: skippedCount };
}

/**
 * Delete subscriptions where failure_count >= 5.
 */
export async function pruneDeadSubscriptions(): Promise<{ pruned: number }> {
  const { data: deleted, error } = await adminClient
    .from('push_subscriptions')
    .delete()
    .gte('failure_count', 5)
    .select('id');

  if (error) {
    console.error('Failed to prune dead subscriptions:', error);
    throw new Error(error.message);
  }

  return { pruned: deleted ? deleted.length : 0 };
}
