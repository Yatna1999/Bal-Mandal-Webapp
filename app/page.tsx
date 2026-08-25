import { requireKaryakar } from '@/lib/auth.server';
import { t } from '@/lib/i18n';

export default async function HomePage() {
  const karyakar = await requireKaryakar();

  return (
    <main className="min-h-screen bg-paper p-6 max-w-[600px] mx-auto">
      <header className="border-b border-rule pb-4 mb-6">
        <h1 className="font-display text-[28px] text-ink leading-relaxed">
          {t('app.name')}
        </h1>
        <p className="text-[13px] text-ink-faint leading-relaxed">
          {t('app.vistar')}
        </p>
      </header>

      <section className="bg-sheet border border-rule rounded-md p-4 space-y-2">
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
      </section>
    </main>
  );
}
