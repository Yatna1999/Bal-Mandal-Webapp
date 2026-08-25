'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { useToast } from '@/components/ui/Toast';
import { formatWeekdayDateGu, formatTimeRangeGu } from '@/lib/format';
import { t } from '@/lib/i18n';

export function KaryakramClient({
  sessionId,
  sabhaNameGu,
  sessionDate,
  startTime,
  endTime,
  initialText,
}: {
  sessionId: string;
  sabhaNameGu: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  initialText: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/karyakram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ karyakram_text: text }),
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
      <AppHeader
        title={t('task.prepare_karyakram')}
        backHref={`/session/${sessionId}`}
      />

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
        <form onSubmit={handleSubmit} className="space-y-4 bg-sheet border border-rule rounded-md p-4">
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('task.prepare_karyakram')}
            </label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="અહીં કાર્યક્રમની નોંધ લખો..."
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
