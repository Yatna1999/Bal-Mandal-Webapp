'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Pill } from '@/components/ui/Pill';
import { Chandlo } from '@/components/ui/Chandlo';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { formatWeekdayDateGu, formatTimeRangeGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { SabhaTypeT } from '@/lib/database.types';

export interface SessionHubData {
  id: string;
  sabha_id: string;
  sabha_name_gu: string;
  session_date: string;
  start_time: string;
  end_time: string;
  sabha_type: SabhaTypeT;
  karyakram_text: string | null;
  aheval_done: boolean;
  isKaryakramDone: boolean;
  isPresabhaDone: boolean;
  isAttendanceDone: boolean;
  isAhnikDone: boolean;
  isAhevalDone: boolean;
}

export function SessionHubClient({ session }: { session: SessionHubData }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Edit Session Form State
  const [sessionDate, setSessionDate] = useState(session.session_date);
  const [startTime, setStartTime] = useState(session.start_time.slice(0, 5));
  const [endTime, setEndTime] = useState(session.end_time.slice(0, 5));
  const [loading, setLoading] = useState(false);
  const [ahevalState, setAhevalState] = useState(session.isAhevalDone);

  const handleToggleAheval = async () => {
    const nextState = !ahevalState;
    setAhevalState(nextState);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sabha_sessions')
        .update({
          aheval_done: nextState,
          aheval_done_at: nextState ? new Date().toISOString() : null,
        })
        .eq('id', session.id);

      if (error) {
        setAhevalState(!nextState);
        showToast(t('errors.saveFailed'));
      } else {
        showToast(t('common.lastUpdated'));
        router.refresh();
      }
    } catch {
      setAhevalState(!nextState);
      showToast(t('errors.network'));
    }
  };

  const handleSaveSessionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('sabha_sessions')
        .update({
          session_date: sessionDate,
          start_time: `${startTime}:00`,
          end_time: `${endTime}:00`,
        })
        .eq('id', session.id);

      if (error) {
        showToast(error.message);
        setLoading(false);
        return;
      }

      setIsEditSheetOpen(false);
      showToast(t('common.lastUpdated'));
      router.refresh();
    } catch {
      showToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const tasksList = [
    {
      type: 'prepare_karyakram' as const,
      isDone: session.isKaryakramDone,
      href: `/session/${session.id}/karyakram`,
      isInline: false,
    },
    {
      type: 'presabha_followup' as const,
      isDone: session.isPresabhaDone,
      href: `/session/${session.id}/presabha`,
      isInline: false,
    },
    {
      type: 'mark_attendance' as const,
      isDone: session.isAttendanceDone,
      href: `/session/${session.id}/attendance`,
      isInline: false,
    },
    ...(session.sabha_type === 'pakki'
      ? [
          {
            type: 'ahnik_followup' as const,
            isDone: session.isAhnikDone,
            href: `/session/${session.id}/ahnik`,
            isInline: false,
          },
        ]
      : []),
    {
      type: 'aheval' as const,
      isDone: ahevalState,
      href: '',
      isInline: true,
    },
  ];

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader
        title={session.sabha_name_gu}
        backHref="/sabha"
        action={
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center text-ink hover:bg-paper rounded-md transition-colors text-[20px]"
            aria-label="Menu"
          >
            ⋯
          </button>
        }
      />

      <main className="max-w-[600px] mx-auto p-4 space-y-6">
        {/* Context Block */}
        <div className="bg-sheet border border-rule rounded-md p-4 flex items-center justify-between">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-[18px] font-semibold text-ink leading-relaxed truncate">
              {formatWeekdayDateGu(session.session_date)}
            </h1>
            <p className="text-[14px] font-data text-ink-soft leading-relaxed">
              {formatTimeRangeGu(session.start_time, session.end_time)}
            </p>
          </div>

          <div className="shrink-0 ml-3">
            <Pill
              label={
                session.sabha_type === 'pakki'
                  ? t('sabha.typePakki')
                  : t('sabha.typeKachi')
              }
              selected={session.sabha_type === 'pakki'}
            />
          </div>
        </div>

        {/* Task Checklist */}
        <div className="border border-rule rounded-md overflow-hidden bg-sheet divide-y divide-rule">
          {tasksList.map((task) => {
            const taskTitle = t(`task.${task.type}` as Parameters<typeof t>[0]);

            if (task.isInline) {
              return (
                <div
                  key={task.type}
                  onClick={handleToggleAheval}
                  className="flex items-center justify-between min-h-[56px] px-4 py-3 bg-transparent hover:bg-paper transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Chandlo
                      state={task.isDone ? 'done' : 'not-done'}
                      label={taskTitle}
                      onClick={handleToggleAheval}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[16px] font-medium text-ink leading-relaxed truncate">
                        {taskTitle}
                      </p>
                      <p className="text-[13px] text-ink-soft leading-relaxed">
                        {task.isDone ? t('common.done') : 'બાકી'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={task.type}
                href={task.href}
                className="flex items-center justify-between min-h-[56px] px-4 py-3 bg-transparent hover:bg-paper transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Chandlo
                    state={task.isDone ? 'done' : 'not-done'}
                    label={taskTitle}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium text-ink leading-relaxed truncate">
                      {taskTitle}
                    </p>
                    <p className="text-[13px] text-ink-soft leading-relaxed">
                      {task.isDone ? t('common.done') : 'બાકી'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-ink-faint ml-2">
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
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      {/* Overflow Menu Sheet */}
      <Sheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title={session.sabha_name_gu}
      >
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => {
              setIsMenuOpen(false);
              setIsEditSheetOpen(true);
            }}
            className="w-full h-[48px] px-4 bg-paper border border-rule text-ink font-semibold rounded-md flex items-center justify-between text-[15px] hover:bg-sheet transition-colors"
          >
            <span>{t('sabha.editSession')}</span>
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
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        </div>
      </Sheet>

      {/* Edit Session Sheet */}
      <Sheet
        isOpen={isEditSheetOpen}
        onClose={() => setIsEditSheetOpen(false)}
        title={t('sabha.editSession')}
      >
        <form onSubmit={handleSaveSessionEdit} className="space-y-4">
          <div>
            <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
              {t('sabha.date')}
            </label>
            <input
              type="date"
              required
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                {t('sabha.time')} (શરૂઆતી)
              </label>
              <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
              />
            </div>
            <div>
              <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                (પૂરો)
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
              />
            </div>
          </div>

          {/* Note in Sheet */}
          <p className="text-[13px] text-ink-faint leading-relaxed pt-1">
            {t('sabha.editSessionNote')}
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
