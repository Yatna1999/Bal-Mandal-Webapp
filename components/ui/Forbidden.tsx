import Link from 'next/link';
import { t } from '@/lib/i18n';

export default function Forbidden() {
  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-paper p-6">
      <div className="w-full max-w-[340px] text-center">
        <h1 className="text-[18px] font-semibold text-ink leading-relaxed mb-2">
          {t('errors.noPermission')}
        </h1>
        <p className="text-[15px] text-ink-soft leading-relaxed mb-6">
          {t('errors.noPermission')}
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-[44px] px-6 border border-indigo text-indigo bg-transparent rounded-md font-medium text-[15px] leading-relaxed transition-colors hover:bg-indigo-wash"
        >
          {t('common.back')}
        </Link>
      </div>
    </main>
  );
}
