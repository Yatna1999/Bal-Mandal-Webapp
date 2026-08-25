import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Row } from '@/components/ui/Row';
import { t } from '@/lib/i18n';

export default async function MorePage() {
  const karyakar = await requireKaryakar();
  const vistarScope = isVistarScope(karyakar.role);

  return (
    <div className="space-y-4">
      <SectionHeader>{t('nav.more')}</SectionHeader>

      <div className="border border-rule rounded-md overflow-hidden bg-sheet">
        {karyakar.role === 'super_admin' && (
          <Row
            href="/admin/karyakars"
            title={t('admin.title')}
            subtitle="નવા કાર્યકર ઉમેરો, હોદ્દા અને સભા સંચાલન"
            right={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
                <path d="M9 18l6-6-6-6" />
              </svg>
            }
          />
        )}

        {vistarScope && (
          <Row
            href="/admin/sabhas"
            title={t('admin.sabhaTitle')}
            subtitle="સભાના દિવસ, સમય, સ્થળ અને પ્રકારની વિગત"
            right={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
                <path d="M9 18l6-6-6-6" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
