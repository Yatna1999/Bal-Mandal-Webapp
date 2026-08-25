import { requireKaryakar } from '@/lib/auth.server';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { t } from '@/lib/i18n';

export default async function HomePage() {
  const karyakar = await requireKaryakar();

  return (
    <div className="space-y-4">
      <SectionHeader>{t('nav.home')}</SectionHeader>
      <div className="bg-sheet border border-rule rounded-md p-4 space-y-2">
        <div className="flex justify-between items-center text-[15px]">
          <span className="text-ink-soft">{t('common.karyakar')}:</span>
          <span className="font-semibold text-ink">{karyakar.full_name_gu}</span>
        </div>
        <div className="flex justify-between items-center text-[15px]">
          <span className="text-ink-soft">{t('common.role')}:</span>
          <span className="font-medium text-indigo">
            {t(`roles.${karyakar.role}` as Parameters<typeof t>[0])}
          </span>
        </div>
      </div>
    </div>
  );
}
