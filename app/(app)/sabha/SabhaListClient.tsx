'use client';

import Link from 'next/link';
import { Row } from '@/components/ui/Row';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DataText } from '@/components/ui/DataText';
import { WEEKDAYS_GU, formatTimeRangeGu, formatWeekdayDateGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { SabhaTypeT } from '@/lib/database.types';

export interface AccessibleSabha {
  id: string;
  name_gu: string;
  default_weekday: number;
  default_start_time: string;
  default_end_time: string;
  sabha_type: SabhaTypeT;
  balak_count: number;
}

export interface UpcomingSession {
  id: string;
  sabha_id: string;
  sabha_name_gu: string;
  session_date: string;
  start_time: string;
  end_time: string;
  sabha_type: SabhaTypeT;
}

export function SabhaListClient({
  sabhas,
  upcomingSessions,
}: {
  sabhas: AccessibleSabha[];
  upcomingSessions: UpcomingSession[];
}) {
  return (
    <div className="space-y-6">
      <SectionHeader>{t('sabha.title')}</SectionHeader>

      {/* Sabha List */}
      <div className="border border-rule rounded-md overflow-hidden bg-sheet">
        {sabhas.map((sabha) => (
          <Row
            key={sabha.id}
            title={sabha.name_gu}
            subtitle={`${WEEKDAYS_GU[sabha.default_weekday]} • ${formatTimeRangeGu(
              sabha.default_start_time,
              sabha.default_end_time
            )}`}
            right={
              <div className="flex items-center gap-3">
                <Pill
                  label={
                    sabha.sabha_type === 'pakki'
                      ? t('sabha.typePakki')
                      : t('sabha.typeKachi')
                  }
                  selected={sabha.sabha_type === 'pakki'}
                />
                <DataText className="text-[14px] text-ink-soft">
                  {toGu(sabha.balak_count)} બાળકો
                </DataText>
              </div>
            }
          />
        ))}
      </div>

      {/* Upcoming Sessions Section */}
      <div className="space-y-3">
        <SectionHeader>{t('sabha.upcoming')}</SectionHeader>

        {upcomingSessions.length > 0 ? (
          <div className="border border-rule rounded-md overflow-hidden bg-sheet">
            {upcomingSessions.map((session) => (
              <Link
                key={session.id}
                href={`/session/${session.id}`}
                className="flex items-center justify-between min-h-[56px] px-4 py-3 border-b border-rule bg-transparent hover:bg-paper transition-colors"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-[16px] font-medium text-ink truncate leading-relaxed">
                    {session.sabha_name_gu}
                  </p>
                  <p className="text-[13px] text-ink-soft leading-relaxed font-data">
                    {formatWeekdayDateGu(session.session_date)} •{' '}
                    {formatTimeRangeGu(session.start_time, session.end_time)}
                  </p>
                </div>

                <div className="shrink-0 flex items-center gap-2 ml-3">
                  <Pill
                    label={
                      session.sabha_type === 'pakki'
                        ? t('sabha.typePakki')
                        : t('sabha.typeKachi')
                    }
                    selected={session.sabha_type === 'pakki'}
                  />
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-ink-faint"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-sheet border border-rule rounded-md p-6 text-center text-[14px] text-ink-soft leading-relaxed">
            {t('empty.tasks')}
          </div>
        )}
      </div>
    </div>
  );
}
