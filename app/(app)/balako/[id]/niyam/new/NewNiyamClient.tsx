'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addMonths, parseISO, format } from 'date-fns';
import { AppHeader } from '@/components/ui/AppHeader';
import { Pill } from '@/components/ui/Pill';
import { useToast } from '@/components/ui/Toast';
import { formatDateGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';

export function NewNiyamClient({
  balakId,
  balakNameGu,
}: {
  balakId: string;
  balakNameGu: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const [titleGu, setTitleGu] = useState('');
  const [startDate, setStartDate] = useState(todayStr);
  const [durationPreset, setDurationPreset] = useState<number | 'other'>(1);
  const [customDuration, setCustomDuration] = useState<number>(1);
  const [notesGu, setNotesGu] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const durationMonths =
    durationPreset === 'other' ? Math.max(1, customDuration || 1) : durationPreset;

  // Calculate live end date preview
  let endDatePreview = '';
  try {
    const sDate = parseISO(startDate);
    if (!isNaN(sDate.getTime())) {
      const eDate = addMonths(sDate, durationMonths);
      endDatePreview = formatDateGu(format(eDate, 'yyyy-MM-dd'));
    }
  } catch {
    endDatePreview = '';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedTitle = titleGu.trim();
    if (!trimmedTitle) {
      setErrorMsg(t('errors.required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/balako/${balakId}/niyams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_gu: trimmedTitle,
          start_date: startDate,
          duration_months: durationMonths,
          notes_gu: notesGu.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      showToast(t('niyam.saved'));
      router.push(`/balako/${balakId}`);
      router.refresh();
    } catch {
      setErrorMsg(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const presets = [1, 2, 3, 6, 12];

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader title={t('niyam.add')} backHref={`/balako/${balakId}`} />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        <div className="bg-sheet border border-rule rounded-md p-4 space-y-0.5">
          <span className="text-[13px] text-ink-soft font-medium">
            {t('common.karyakar')}:
          </span>
          <p className="text-[18px] font-semibold text-ink leading-relaxed">
            {balakNameGu}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 bg-sheet border border-rule rounded-md p-4">
          {/* Title Field */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('niyam.titleField')} *
            </label>
            <input
              type="text"
              required
              value={titleGu}
              onChange={(e) => setTitleGu(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder={t('niyam.titlePlaceholder')}
            />
          </div>

          {/* Start Date Field */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('niyam.startDate')} *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
            />
          </div>

          {/* Duration Months Presets */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-2">
              {t('niyam.duration')} *
            </label>
            <div className="flex flex-wrap gap-2">
              {presets.map((months) => (
                <Pill
                  key={months}
                  label={`${toGu(months)} ${t('niyam.months')}`}
                  selected={durationPreset === months}
                  onClick={() => setDurationPreset(months)}
                />
              ))}
              <Pill
                label={t('common.other')}
                selected={durationPreset === 'other'}
                onClick={() => setDurationPreset('other')}
              />
            </div>

            {durationPreset === 'other' && (
              <div className="mt-3">
                <input
                  type="number"
                  min={1}
                  max={60}
                  required
                  value={customDuration}
                  onChange={(e) => setCustomDuration(parseInt(e.target.value, 10) || 1)}
                  className="w-[120px] h-[44px] px-3 bg-sheet border border-rule rounded-md text-[15px] font-data text-ink focus:outline-none focus:border-indigo"
                />
              </div>
            )}
          </div>

          {/* Live End Date Preview */}
          {endDatePreview && (
            <div className="p-3 bg-paper border border-rule rounded-md flex items-center justify-between text-[14px]">
              <span className="text-ink-soft font-medium">{t('niyam.endDate')}</span>
              <span className="font-data font-semibold text-indigo">{endDatePreview}</span>
            </div>
          )}

          {/* Notes Field */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('niyam.notes')}
            </label>
            <textarea
              rows={3}
              value={notesGu}
              onChange={(e) => setNotesGu(e.target.value)}
              className="w-full min-h-[80px] p-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            />
          </div>

          {errorMsg && (
            <p className="text-[13px] text-kumkum font-medium">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('niyam.save')}
          </button>
        </form>
      </main>
    </div>
  );
}
