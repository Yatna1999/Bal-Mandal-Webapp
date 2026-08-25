'use client';

import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Pill } from '@/components/ui/Pill';
import { Chandlo } from '@/components/ui/Chandlo';
import { formatWeekdayDateGu, formatTimeRangeGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { TaskTypeT } from '@/lib/database.types';

export interface TodaySessionItem {
  id: string;
  session_date: string;
  start_time: string;
  end_time: string;
  sabha_type: 'pakki' | 'kachi';
  sabha_name_gu: string;
}

export interface HomeTaskItem {
  id: string;
  session_id: string;
  task_type: TaskTypeT;
  due_at: string;
  opens_at: string;
  status: string;
  sabha_name_gu: string;
}

export function HomeClient({
  todayTomorrowSessions,
  openTasks,
  totalOpenTasksCount,
  attendanceRate,
  totalBalako,
  consecutiveAbsent,
  vistarScope,
}: {
  todayTomorrowSessions: TodaySessionItem[];
  openTasks: HomeTaskItem[];
  totalOpenTasksCount: number;
  attendanceRate: number;
  totalBalako: number;
  consecutiveAbsent: number;
  vistarScope: boolean;
}) {
  const hasSessions = todayTomorrowSessions.length > 0;
  const hasTasks = openTasks.length > 0;
  const showEmptyState = !hasSessions && !hasTasks;

  const nowIso = new Date().toISOString();

  const getTaskLink = (task: HomeTaskItem) => {
    if (task.task_type === 'prepare_karyakram') return `/session/${task.session_id}/karyakram`;
    if (task.task_type === 'presabha_followup') return `/session/${task.session_id}/presabha`;
    if (task.task_type === 'mark_attendance') return `/session/${task.session_id}/attendance`;
    if (task.task_type === 'ahnik_followup') return `/session/${task.session_id}/ahnik`;
    if (task.task_type === 'aheval') return `/session/${task.session_id}/aheval`;
    return `/session/${task.session_id}`;
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader title={t('app.title')} />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        {/* Empty State when no sessions in next 2 days & no open tasks */}
        {showEmptyState && (
          <div className="bg-sheet border border-rule rounded-md p-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-wash text-indigo mx-auto flex items-center justify-center text-[22px]">
              ✨
            </div>
            <p className="text-[15px] text-ink leading-relaxed font-medium">
              {t('empty.tasks')}
            </p>
            <Link
              href="/sabha"
              className="inline-block px-4 py-2 bg-indigo text-white text-[14px] font-semibold rounded-md hover:opacity-95 transition-opacity"
            >
              {t('empty.tasksCta')}
            </Link>
          </div>
        )}

        {/* Section 1: આજ અને આવતીકાલ (Today & Tomorrow Sessions) */}
        {hasSessions && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
              {t('dashboard.todayTomorrow')}
            </h2>
            <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
              {todayTomorrowSessions.map((s) => (
                <Link
                  key={s.id}
                  href={`/session/${s.id}`}
                  className="p-4 flex items-center justify-between hover:bg-paper transition-colors group"
                >
                  <div className="space-y-1">
                    <h3 className="text-[16px] font-semibold text-ink group-hover:text-indigo transition-colors">
                      {s.sabha_name_gu}
                    </h3>
                    <p className="text-[13px] text-ink-soft font-data leading-relaxed">
                      {formatWeekdayDateGu(s.session_date)} • {formatTimeRangeGu(s.start_time, s.end_time)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <Pill
                      selected={s.sabha_type === 'pakki'}
                      label={s.sabha_type === 'pakki' ? t('sabha.typePakki') : t('sabha.typeKachi')}
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
                      className="text-ink-faint group-hover:text-ink transition-colors"
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: બાકી કામ (Open Tasks - Three Nearest) */}
        {hasTasks && (
          <section className="space-y-3">
            <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
              {t('task.title')}
            </h2>
            <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
              {openTasks.slice(0, 3).map((task) => {
                const isOverdue = task.due_at < nowIso;
                const taskName = t(`task.${task.task_type}` as Parameters<typeof t>[0]) || task.task_type;

                return (
                  <Link
                    key={task.id}
                    href={getTaskLink(task)}
                    className={`p-4 flex items-center justify-between transition-colors ${
                      isOverdue ? 'bg-amber-wash hover:bg-amber/15' : 'hover:bg-paper'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Chandlo
                        state={isOverdue ? 'not-done' : 'pending'}
                        size={20}
                        label={taskName}
                      />
                      <div>
                        <h3 className={`text-[16px] font-medium leading-relaxed ${isOverdue ? 'text-amber font-semibold' : 'text-ink'}`}>
                          {taskName}
                        </h3>
                        <p className="text-[13px] text-ink-soft leading-relaxed">
                          {task.sabha_name_gu} • {isOverdue ? 'મુદત વીતી ગઈ છે!' : 'બાકી છે'}
                        </p>
                      </div>
                    </div>

                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={isOverdue ? 'text-amber' : 'text-ink-faint'}
                    >
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                );
              })}
            </div>

            {/* Link to view all tasks (shown ONLY when > 3 open tasks exist) */}
            {totalOpenTasksCount > 3 && (
              <div className="text-right pt-1">
                <Link
                  href="/tasks"
                  className="text-[14px] font-semibold text-indigo hover:underline inline-flex items-center gap-1"
                >
                  {t('dashboard.viewAllTasks')}
                </Link>
              </div>
            )}
          </section>
        )}

        {/* Section 3: આ મહિનો (This Month Stats) */}
        <section className="space-y-3">
          <h2 className="text-[13px] font-semibold text-ink-soft uppercase tracking-wider">
            {t('dashboard.thisMonth')}
          </h2>

          <div className="bg-sheet border border-rule rounded-md p-4 flex items-center justify-between divide-x divide-rule">
            {/* Stat 1: Attendance Rate */}
            <div className="flex-1 text-center px-2">
              <span className="block text-[22px] font-bold text-ink font-data leading-none mb-1">
                {toGu(attendanceRate)}%
              </span>
              <span className="text-[12px] text-ink-soft leading-tight block">
                {t('dashboard.attendanceRate')}
              </span>
            </div>

            {/* Stat 2: Total Balako */}
            <div className="flex-1 text-center px-2">
              <span className="block text-[22px] font-bold text-ink font-data leading-none mb-1">
                {toGu(totalBalako)}
              </span>
              <span className="text-[12px] text-ink-soft leading-tight block">
                {t('dashboard.totalBalako')}
              </span>
            </div>

            {/* Stat 3: Consecutive Absent */}
            <div className="flex-1 text-center px-2">
              <span className="block text-[22px] font-bold text-amber font-data leading-none mb-1">
                {toGu(consecutiveAbsent)}
              </span>
              <span className="text-[12px] text-ink-soft leading-tight block">
                {t('dashboard.consecutiveAbsent')}
              </span>
            </div>
          </div>

          {/* Vistar Scope Extra Row to Dashboard */}
          {vistarScope && (
            <Link
              href="/dashboard"
              className="p-4 bg-sheet border border-rule rounded-md flex items-center justify-between text-indigo hover:bg-indigo-wash transition-colors group"
            >
              <span className="text-[15px] font-semibold">
                {t('dashboard.vistarTitle')}
              </span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </Link>
          )}
        </section>
      </main>
    </div>
  );
}
