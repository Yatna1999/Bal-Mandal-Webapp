'use client';

import { useEffect } from 'react';
import Forbidden from '@/components/ui/Forbidden';
import { t } from '@/lib/i18n';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Unhandled error boundary caught:', error);
  }, [error]);

  if (
    error.name === 'ForbiddenError' ||
    error.message?.includes('Forbidden') ||
    error.message?.includes('permission')
  ) {
    return <Forbidden />;
  }

  return (
    <main className="min-h-[70vh] flex items-center justify-center bg-paper p-6">
      <div className="w-full max-w-[340px] text-center">
        <h1 className="text-[18px] font-semibold text-ink leading-relaxed mb-2">
          {t('errors.saveFailed')}
        </h1>
        <p className="text-[15px] text-ink-soft leading-relaxed mb-6">
          {t('errors.saveFailed')}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center h-[44px] px-6 border border-indigo text-indigo bg-transparent rounded-md font-medium text-[15px] leading-relaxed transition-colors hover:bg-indigo-wash"
        >
          {t('common.retry')}
        </button>
      </div>
    </main>
  );
}
