import Link from 'next/link';
import { t } from '@/lib/i18n';

export function AppHeader({
  title,
  backHref,
  action,
}: {
  title?: string;
  backHref?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 h-[52px] bg-sheet border-b border-rule px-4 flex items-center justify-between">
      <div className="flex items-center gap-3 min-w-0">
        {backHref ? (
          <>
            <Link
              href={backHref}
              className="inline-flex items-center justify-center w-10 h-10 -ml-2 rounded-md text-ink transition-colors hover:bg-paper"
              aria-label={t('common.back')}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </Link>
            {title && (
              <h1 className="text-[18px] font-semibold text-ink leading-relaxed truncate">
                {title}
              </h1>
            )}
          </>
        ) : (
          <h1 className="font-display text-[22px] text-ink leading-relaxed truncate">
            {title || t('app.name')}
          </h1>
        )}
      </div>

      {action && <div className="shrink-0 flex items-center ml-2">{action}</div>}
    </header>
  );
}
