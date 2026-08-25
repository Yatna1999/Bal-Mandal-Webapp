'use client';

import Link from 'next/link';
import { useBalakPhotoUrl } from '@/lib/hooks/useBalakPhotoUrl';
import { t } from '@/lib/i18n';

export interface BalakRowData {
  id: string;
  full_name_gu: string;
  full_name_en: string;
  photo_path: string | null;
  standard_code: string;
  status: string;
  created_at: string;
  standard_label_gu?: string;
  sabha_name_gu?: string;
}

export function BalakRow({
  balak,
  photoGraceDays = 10,
}: {
  balak: BalakRowData;
  photoGraceDays?: number;
}) {
  const { data: photoUrl } = useBalakPhotoUrl(balak.photo_path);

  // Calculate photo overdue status
  const createdDate = new Date(balak.created_at);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const isPhotoMissing = !balak.photo_path;
  const isPhotoOverdue = isPhotoMissing && diffDays > photoGraceDays;

  const subtitle = [
    balak.standard_label_gu || balak.standard_code,
    balak.sabha_name_gu,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <Link
      href={`/balako/${balak.id}`}
      className="flex items-center justify-between min-h-[64px] px-4 py-2 border-b border-rule bg-transparent hover:bg-paper transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Photo or Dashed Camera Circle */}
        <div className="shrink-0">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={balak.full_name_gu}
              className="w-10 h-10 rounded-full object-cover border border-rule"
            />
          ) : (
            <div className="w-10 h-10 rounded-full border-[1.5px] border-dashed border-ink-faint flex items-center justify-center bg-sheet text-ink-faint">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center flex-wrap gap-1 leading-relaxed">
            <span className="text-[16px] font-medium text-ink truncate">
              {balak.full_name_gu}
            </span>
            {isPhotoMissing && (
              <span
                className={`text-[12px] font-medium leading-none px-1.5 py-0.5 rounded-sm ${
                  isPhotoOverdue
                    ? 'text-amber bg-amber-wash'
                    : 'text-ink-faint bg-paper'
                }`}
              >
                {isPhotoOverdue
                  ? t('balak.photoOverdue')
                  : t('balak.photoPending')}
              </span>
            )}
          </div>

          {subtitle && (
            <div className="text-[13px] text-ink-soft leading-relaxed truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right Chevron */}
      <div className="shrink-0 text-ink-faint ml-2">
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
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </Link>
  );
}
