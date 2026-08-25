'use client';

import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { useToast } from '@/components/ui/Toast';
import { t } from '@/lib/i18n';

// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function NotificationsClient({
  hasExistingSub,
}: {
  hasExistingSub: boolean;
}) {
  const { showToast } = useToast();

  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unknown'>('unknown');
  const [subscribed, setSubscribed] = useState(hasExistingSub);
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [showOemHelpModal, setShowOemHelpModal] = useState(false);
  const [showOemCard, setShowOemCard] = useState(hasExistingSub);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;

      const ios =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream?: unknown }).MSStream;

      setIsStandalone(standalone);
      setIsIOS(ios);

      if ('Notification' in window) {
        setPermission(Notification.permission);
      }
    }
  }, []);

  const handleSubscribe = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showToast(t('errors.network'));
      return;
    }

    setLoading(true);

    try {
      // 1. Request permission only on explicit user tap
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        showToast(t('errors.network'));
        setLoading(false);
        return;
      }

      // 2. Register service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // 3. Subscribe to Push Manager
      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        const keyRes = await fetch('/api/push/subscribe');
        const keyData = await keyRes.json();
        vapidPublicKey = keyData.vapidPublicKey;
      }

      if (!vapidPublicKey) {
        showToast(t('errors.network'));
        setLoading(false);
        return;
      }

      const convertedKey = urlBase64ToUint8Array(vapidPublicKey);
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey,
      });

      const subJson = sub.toJSON();

      // 4. Send subscription to server
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: subJson.keys,
        }),
      });

      if (res.ok) {
        setSubscribed(true);
        setShowOemCard(true);
        showToast(t('push.enabled'));
      } else {
        const data = await res.json();
        showToast(data.error || t('errors.saveFailed'));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setTestLoading(true);
    try {
      const res = await fetch('/api/push/test', {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(t('push.sendTest') + ' ✓');
      } else {
        showToast(data.error || t('errors.saveFailed'));
      }
    } catch {
      showToast(t('errors.network'));
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader title={t('push.title')} backHref="/more" />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        {/* iOS Safari Walkthrough if iOS and NOT standalone */}
        {isIOS && !isStandalone ? (
          <div className="bg-sheet border border-rule rounded-md p-6 space-y-4">
            <h2 className="text-[18px] font-semibold text-ink leading-relaxed">
              {t('push.iosHelpTitle')}
            </h2>
            <p className="text-[14px] text-ink-soft leading-relaxed">
              {t('push.iosHelpBody')}
            </p>
            <div className="bg-paper border border-rule rounded-md p-4 space-y-2 text-[14px] text-ink">
              <p className="font-medium">{t('push.iosStep1')}</p>
              <p className="font-medium">{t('push.iosStep2')}</p>
              <p className="font-medium">{t('push.iosStep3')}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Explanation Block & Subscription Button */}
            <div className="bg-sheet border border-rule rounded-md p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-[18px] font-semibold text-ink leading-relaxed">
                  {t('push.title')}
                </h2>
                <p className="text-[14px] text-ink-soft leading-relaxed">
                  {t('push.sub')}
                </p>
              </div>

              {subscribed ? (
                <div className="p-3 bg-indigo-wash border border-indigo rounded-md text-[14px] text-indigo font-semibold flex items-center justify-between">
                  <span>✓ {t('push.enabled')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={loading || permission === 'denied'}
                  className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
                >
                  {loading
                    ? t('common.saving')
                    : permission === 'denied'
                    ? 'સૂચનાઓ બ્લોક છે (Settings માં ચાલુ કરો)'
                    : t('push.enable')}
                </button>
              )}

              {/* Test Push Button */}
              {subscribed && (
                <button
                  type="button"
                  onClick={handleSendTestPush}
                  disabled={testLoading}
                  className="w-full h-[48px] bg-sheet border border-indigo text-indigo text-[15px] font-semibold rounded-md flex items-center justify-center transition-colors hover:bg-indigo-wash disabled:opacity-50"
                >
                  {testLoading ? t('common.saving') : t('push.sendTest')}
                </button>
              )}
            </div>

            {/* Android OEM Battery Optimization Card */}
            {showOemCard && (
              <div className="bg-sheet border border-amber rounded-md p-5 space-y-3">
                <h3 className="text-[16px] font-semibold text-ink flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber" />
                  {t('push.oemCardTitle')}
                </h3>
                <p className="text-[14px] text-ink-soft leading-relaxed">
                  {t('push.oemCardBody')}
                </p>

                <button
                  type="button"
                  onClick={() => setShowOemHelpModal(true)}
                  className="text-[13px] font-semibold text-indigo hover:underline"
                >
                  ફોનના Settings માટે મદદ (MIUI, ColorOS, FunTouch, One UI) →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* OEM Help Modal */}
      {showOemHelpModal && (
        <div className="fixed inset-0 z-50 bg-ink/40 flex items-center justify-center p-4">
          <div className="bg-sheet border border-rule rounded-md p-6 max-w-[500px] w-full space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-rule pb-3">
              <h3 className="text-[18px] font-semibold text-ink">
                ફોન પ્રમાણે Settings (Battery Optimization)
              </h3>
              <button
                type="button"
                onClick={() => setShowOemHelpModal(false)}
                className="text-ink-faint hover:text-ink text-[20px] font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-[14px] text-ink leading-relaxed divide-y divide-rule">
              <div className="pt-2">
                <h4 className="font-semibold text-indigo">MIUI (Xiaomi / Redmi / POCO)</h4>
                <p className="text-ink-soft text-[13px]">
                  Settings → Apps → Manage Apps → બાળ સભા → Battery Saver → No Restrictions.
                </p>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-indigo">ColorOS & Realme UI (OPPO / Realme)</h4>
                <p className="text-ink-soft text-[13px]">
                  Settings → Battery → App Battery Management → બાળ સભા → Allow Background Activity & Auto-launch.
                </p>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-indigo">FunTouch OS (Vivo)</h4>
                <p className="text-ink-soft text-[13px]">
                  Settings → Battery → Background power consumption management → બાળ સભા → High background power usage.
                </p>
              </div>

              <div className="pt-2">
                <h4 className="font-semibold text-indigo">One UI (Samsung)</h4>
                <p className="text-ink-soft text-[13px]">
                  Settings → Apps → બાળ સભા → Battery → Unrestricted.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowOemHelpModal(false)}
              className="w-full h-[44px] bg-paper border border-rule text-ink font-semibold rounded-md text-[15px] hover:bg-sheet"
            >
              બંધ કરો
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
