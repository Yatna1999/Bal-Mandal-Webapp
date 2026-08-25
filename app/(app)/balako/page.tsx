import { SectionHeader } from '@/components/ui/SectionHeader';
import { t } from '@/lib/i18n';

export default function BalakoPage() {
  return (
    <div className="space-y-4">
      <SectionHeader>{t('nav.balako')}</SectionHeader>
      <p className="text-[14px] text-ink-soft leading-relaxed">
        {t('empty.balako')}
      </p>
    </div>
  );
}
