import { requireKaryakar } from '@/lib/auth.server';
import { isVistarScope } from '@/lib/auth';
import { AppHeader } from '@/components/ui/AppHeader';
import { t } from '@/lib/i18n';
import { MoreClient } from './MoreClient';

export default async function MorePage() {
  const karyakar = await requireKaryakar();
  const vistarScope = isVistarScope(karyakar.role);

  return (
    <div className="min-h-screen bg-paper">
      <AppHeader title={t('more.title')} />
      <MoreClient role={karyakar.role} vistarScope={vistarScope} />
    </div>
  );
}
