'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Avatar } from '@/components/ui/Avatar';
import { telHref, formatWeekdayDateGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { TaskTypeT } from '@/lib/database.types';

export type PeriodType = 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom';

export interface SabhaStatItem {
  id: string;
  name_gu: string;
  balak_count: number;
  attendance_rate: number;
}

export interface ConsecutiveAbsentItem {
  balak_id: string;
  full_name_gu: string;
  photo_path: string | null;
  sabha_name_gu: string;
  mother_mobile: string;
  father_mobile: string;
  streak: number;
}

export interface OverdueTaskItem {
  id: string;
  session_id: string;
  task_type: TaskTypeT;
  due_at: string;
  sabha_name_gu: string;
  days_overdue: number;
}

export function DashboardClient({
  sabhaStats,
  consecutiveAbsentList,
  overdueTasks,
  incompleteProfilesCount,
  overallAttendanceRate,
  totalDistinctBalako,
  overallAccountabilityPct,
  initialPeriod = 'thisMonth',
  initialFrom,
  initialTo,
  vistarName,
}: {
  sabhaStats: SabhaStatItem[];
  consecutiveAbsentList: ConsecutiveAbsentItem[];
  overdueTasks: OverdueTaskItem[];
  incompleteProfilesCount: number;
  overallAttendanceRate: number;
  totalDistinctBalako: number;
  overallAccountabilityPct: number;
  initialPeriod?: PeriodType;
  initialFrom: string;
  initialTo: string;
  vistarName: string;
}) {
  const [period, setPeriod] = useState<PeriodType>(initialPeriod);
  const [fromDate, setFromDate] = useState(initialFrom);
  const [toDate, setToDate] = useState(initialTo);

  const getTaskLink = (task: OverdueTaskItem) => {
    if (task.task_type === 'prepare_karyakram') return `/session/${task.session_id}/karyakram`;
    if (task.task_type === 'presabha_followup') return `/session/${task.session_id}/presabha`;
    if (task.task_type === 'mark_attendance') return `/session/${task.session_id}/attendance`;
    if (task.task_type === 'ahnik_followup') return `/session/${task.session_id}/ahnik`;
    if (task.task_type === 'aheval') return `/session/${task.session_id}/aheval`;
    return `/session/${task.session_id}`;
  };

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader title={t('dashboard.vistarTitle')} backHref="/" />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        {/* Period Selector Header */}
        <div className="bg-sheet border border-rule rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-soft">
              {t('dashboard.period')}
            </span>
            <span className="text-[12px] font-data text-ink-faint">
              {vistarName}
            </span>
          </div>

          <div className="grid grid-cols-4 p-1 bg-paper border border-rule rounded-md gap-1 text-[13px]">
            <button
              type="button"
              onClick={() => setPeriod('thisMonth')}
              className={`h-[36px] font-medium rounded transition-colors ${
                period === 'thisMonth' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('dashboard.thisMonth')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('lastMonth')}
              className={`h-[36px] font-medium rounded transition-colors ${
                period === 'lastMonth' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('dashboard.lastMonth')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('last3Months')}
              className={`h-[36px] font-medium rounded transition-colors ${
                period === 'last3Months' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('dashboard.last3Months')}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              className={`h-[36px] font-medium rounded transition-colors ${
                period === 'custom' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('dashboard.custom')}
            </button>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[12px] text-ink-faint mb-1">શરૂઆત</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-[40px] px-3 bg-sheet border border-rule rounded-md text-[13px] text-ink font-data"
                />
              </div>
              <div>
                <label className="block text-[12px] text-ink-faint mb-1">અંત</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-[40px] px-3 bg-sheet border border-rule rounded-md text-[13px] text-ink font-data"
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Three Headline Stats */}
        <div className="bg-sheet border border-rule rounded-md p-4 flex items-center justify-between divide-x divide-rule">
          <div className="flex-1 text-center px-2">
            <span className="block text-[24px] font-bold text-ink font-data leading-none mb-1">
              {toGu(overallAttendanceRate)}%
            </span>
            <span className="text-[12px] text-ink-soft leading-tight block">
              {t('dashboard.attendanceRate')}
            </span>
          </div>

          <div className="flex-1 text-center px-2">
            <span className="block text-[24px] font-bold text-ink font-data leading-none mb-1">
              {toGu(totalDistinctBalako)}
            </span>
            <span className="text-[12px] text-ink-soft leading-tight block">
              {t('dashboard.totalBalako')}
            </span>
          </div>

          <div className="flex-1 text-center px-2">
            <span className="block text-[24px] font-bold text-indigo font-data leading-none mb-1">
              {toGu(overallAccountabilityPct)}%
            </span>
            <span className="text-[12px] text-ink-soft leading-tight block">
              {t('dashboard.accountability')}
            </span>
          </div>
        </div>

        {/* Section 2: સભા પ્રમાણે (By Sabha Breakdown) */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
            {t('dashboard.bySabha')}
          </h2>

          <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
            {sabhaStats.map((sabha) => (
              <div key={sabha.id} className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-medium text-ink">
                    {sabha.name_gu}
                  </h3>
                  <p className="text-[13px] text-ink-soft font-data">
                    {toGu(sabha.balak_count)} બાળકો
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  {/* 6px tall bar on --rule track, filled --kumkum */}
                  <div className="w-[100px] h-[6px] bg-rule rounded-full overflow-hidden">
                    <div
                      className="h-full bg-kumkum rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, sabha.attendance_rate))}%` }}
                    />
                  </div>
                  <span className="text-[13px] font-bold text-ink font-data w-[40px] text-right">
                    {toGu(sabha.attendance_rate)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: સતત ગેરહાજર બાળકો (Consecutive Absent Balako - Tappable Call Action) */}
        <section className="space-y-3">
          <div>
            <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
              {t('dashboard.consecutiveAbsent')}
            </h2>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              {t('dashboard.consecutiveAbsentSub')}
            </p>
          </div>

          {consecutiveAbsentList.length === 0 ? (
            <div className="bg-sheet border border-rule rounded-md p-4 text-center text-[14px] text-ink-soft">
              કોઈ બાળક સતત ૩ વાર ગેરહાજર નથી.
            </div>
          ) : (
            <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
              {consecutiveAbsentList.map((item) => {
                const phone = item.mother_mobile || item.father_mobile;
                return (
                  <div
                    key={item.balak_id}
                    className="p-3 flex items-center justify-between hover:bg-paper transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={item.photo_path}
                        name={item.full_name_gu}
                        size={32}
                      />
                      <div>
                        <Link
                          href={`/balako/${item.balak_id}`}
                          className="text-[15px] font-medium text-ink hover:text-indigo transition-colors"
                        >
                          {item.full_name_gu}
                        </Link>
                        <p className="text-[12px] text-ink-soft font-data">
                          {item.sabha_name_gu} • {toGu(item.streak)} સભાથી ગેરહાજર
                        </p>
                      </div>
                    </div>

                    {phone ? (
                      <a
                        href={telHref(phone)}
                        className="h-[36px] px-3 border border-indigo text-indigo rounded-md text-[13px] font-semibold flex items-center gap-1.5 hover:bg-indigo-wash transition-colors shrink-0"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        <span>ફોન</span>
                      </a>
                    ) : (
                      <span className="text-[12px] text-ink-faint font-data">નંબર નથી</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 4: બાકી કામ (Overdue Tasks with Amber Treatment) */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
            {t('dashboard.pendingTasks')}
          </h2>

          {overdueTasks.length === 0 ? (
            <div className="bg-sheet border border-rule rounded-md p-4 text-center text-[14px] text-ink-soft">
              કોઈ કામ મુદત વીતી ગયા પછી બાકી નથી.
            </div>
          ) : (
            <div className="space-y-2">
              {overdueTasks.map((task) => {
                const taskName = t(`task.${task.task_type}` as Parameters<typeof t>[0]) || task.task_type;
                return (
                  <Link
                    key={task.id}
                    href={getTaskLink(task)}
                    className="block p-4 bg-amber-wash border-l-[3px] border-l-amber border-t border-r border-b border-rule rounded-md hover:bg-amber/15 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[15px] font-semibold text-amber">
                          {taskName}
                        </h3>
                        <p className="text-[13px] text-ink-soft">
                          {task.sabha_name_gu} • {toGu(task.days_overdue)} દિવસથી બાકી
                        </p>
                      </div>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Section 5: અધૂરી પ્રોફાઇલ (Incomplete Profiles) */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
            {t('dashboard.incompleteProfiles')}
          </h2>

          <Link
            href="/balako"
            className="p-4 bg-sheet border border-rule rounded-md flex items-center justify-between hover:bg-paper transition-colors group"
          >
            <div>
              <h3 className="text-[15px] font-medium text-ink">
                ફોટો વગરના બાળકો (૧૪ દિવસ જૂના)
              </h3>
              <p className="text-[13px] text-ink-soft font-data">
                કુલ {toGu(incompleteProfilesCount)} બાળકોની પ્રોફાઇલ અધૂરી છે
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-amber font-data">
                {toGu(incompleteProfilesCount)}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint group-hover:text-ink transition-colors">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </Link>
        </section>

        {/* Bottom Full-Width Outline Button to Export */}
        <div className="pt-2">
          <Link
            href="/export"
            className="w-full h-[52px] bg-sheet border border-indigo text-indigo text-[16px] font-semibold rounded-md flex items-center justify-center gap-2 transition-colors hover:bg-indigo-wash"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{t('dashboard.downloadReport')}</span>
          </Link>
        </div>

        {/* Footnote under the whole screen */}
        <p className="text-[12px] text-ink-faint text-center leading-relaxed pt-2">
          {t('dashboard.cancelledFootnote')}
        </p>
      </main>
    </div>
  );
}
