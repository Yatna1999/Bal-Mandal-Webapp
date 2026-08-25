import { SectionHeader } from '@/components/ui/SectionHeader';
import { t } from '@/lib/i18n';

export default function MorePage() {
  return (
    <div className="space-y-4">
      <SectionHeader>{t('nav.more')}</SectionHeader>
    </div>
  );
}
