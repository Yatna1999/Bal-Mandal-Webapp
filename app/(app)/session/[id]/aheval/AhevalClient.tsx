'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Chandlo } from '@/components/ui/Chandlo';
import { useToast } from '@/components/ui/Toast';
import { formatWeekdayDateGu, formatTimeRangeGu } from '@/lib/format';
import { t } from '@/lib/i18n';

export function AhevalClient({
  sessionId,
  sabhaNameGu,
  sessionDate,
  startTime,
  endTime,
  initialDone,
}: {
  sessionId: string;
  sabhaNameGu: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  initialDone: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [isDone, setIsDone] = useState(initialDone);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/aheval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aheval_done: isDone }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      showToast(t('common.lastUpdated'));
      router.push(`/session/${sessionId}`);
      router.refresh();
    } catch {
      showToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader title={t('task.aheval')} backHref={`/session/${sessionId}`} />

      {/* Context Strip */}
      <div className="bg-sheet border-b border-rule p-4 space-y-0.5">
        <p className="text-[15px] font-semibold text-ink truncate leading-relaxed">
          {sabhaNameGu}
        </p>
        <p className="text-[13px] font-data text-ink-soft leading-relaxed">
          {formatWeekdayDateGu(sessionDate)} • {formatTimeRangeGu(startTime, endTime)}
        </p>
      </div>

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6 bg-sheet border border-rule rounded-md p-4">
          <div
            onClick={() => setIsDone(!isDone)}
            className="flex items-center justify-between p-4 border border-rule rounded-md cursor-pointer hover:bg-paper transition-colors"
          >
            <span className="text-[16px] font-medium text-ink">
              {t('task.aheval')}
            </span>
            <Chandlo
              size={28}
              state={isDone ? 'done' : 'not-done'}
              label={t('task.aheval')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </main>
    </div>
  );
}
