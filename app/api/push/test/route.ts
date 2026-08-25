import { NextResponse } from 'next/server';
import webPush from 'web-push';
import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

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

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sub } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('karyakar_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!sub) {
      return NextResponse.json({ error: 'No push subscription found' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title: t('push.testTitle'),
      body: t('push.testBody'),
      tag: 'test-push',
      url: '/more/notifications',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-96.png',
    });

    const pushSubObj = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    await webPush.sendNotification(pushSubObj, payload);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
