'use client';

import Link from 'next/link';
import { usePwa } from '@/components/pwa/PwaProvider';
import { Row } from '@/components/ui/Row';
import { t } from '@/lib/i18n';

export function MoreClient({
  role,
  vistarScope,
}: {
  role: string;
  vistarScope: boolean;
}) {
  const { canInstall, promptInstall } = usePwa();

  return (
    <div className="space-y-4 max-w-[600px] mx-auto p-4 pb-[116px]">
      <div className="border border-rule rounded-md overflow-hidden bg-sheet divide-y divide-rule">
        {/* Install App row when prompt is available */}
        {canInstall && (
          <Row
            title={t('more.installApp')}
            subtitle="ફોનમાં હોમ સ્ક્રીન પર ઉમેરીને ઝડપથી વાપરો"
            onClick={promptInstall}
            right={
              <span className="text-[13px] font-semibold text-indigo bg-indigo-wash px-2.5 py-1 rounded-md">
                ઇન્સ્ટોલ કરો
              </span>
            }
          />
        )}

        {/* Notifications */}
        <Row
          href="/more/notifications"
          title={t('more.notifications')}
          subtitle="સૂચનાઓ ચાલુ અને બંધ કરો"
          right={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
              <path d="M9 18l6-6-6-6" />
            </svg>
          }
        />

        {/* Report Export */}
        <Row
          href="/export"
          title={t('more.export')}
          subtitle="Excel અને PDF અહેવાલ ડાઉનલોડ કરો"
          right={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
              <path d="M9 18l6-6-6-6" />
            </svg>
          }
        />

        {/* Karyakar Management (Super Admin) */}
        {role === 'super_admin' && (
          <Row
            href="/admin/karyakars"
            title={t('more.karyakarAdmin')}
            subtitle="નવા કાર્યકર ઉમેરો, હોદ્દા અને સભા સંચાલન"
            right={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
                <path d="M9 18l6-6-6-6" />
              </svg>
            }
          />
        )}

        {/* Sabha Management (Vistar Scope) */}
        {vistarScope && (
          <Row
            href="/admin/sabhas"
            title={t('more.sabhaAdmin')}
            subtitle="સભાના દિવસ, સમય, સ્થળ અને પ્રકારની વિગત"
            right={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
                <path d="M9 18l6-6-6-6" />
              </svg>
            }
          />
        )}
      </div>

      {/* Logout Action Button */}
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="w-full h-[48px] bg-paper border border-rule text-kumkum font-semibold rounded-md flex items-center justify-center text-[15px] hover:bg-sheet transition-colors"
        >
          {t('more.logout')}
        </button>
      </form>
    </div>
  );
}
