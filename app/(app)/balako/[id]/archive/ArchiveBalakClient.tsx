'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Chandlo } from '@/components/ui/Chandlo';
import { useToast } from '@/components/ui/Toast';
import { t } from '@/lib/i18n';
import type { BalakStatusT } from '@/lib/database.types';

export function ArchiveBalakClient({
  balakId,
  balakNameGu,
}: {
  balakId: string;
  balakNameGu: string;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [status, setStatus] = useState<BalakStatusT>('archived');
  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMsg(t('errors.required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/balako/${balakId}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          archive_reason_gu: trimmedReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      showToast(t('common.lastUpdated'));
      router.push(`/balako/${balakId}`);
      router.refresh();
    } catch {
      setErrorMsg(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader
        title={t('balak.archive')}
        backHref={`/balako/${balakId}`}
      />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        <div className="bg-sheet border border-rule rounded-md p-4 space-y-1">
          <span className="text-[13px] text-ink-soft font-medium">
            {t('common.karyakar')}:
          </span>
          <p className="text-[18px] font-semibold text-ink leading-relaxed">
            {balakNameGu}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Outcome Radio Options */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-2">
              {t('common.selectOne')}
            </label>
            <div className="space-y-3 bg-sheet p-4 border border-rule rounded-md">
              <div
                onClick={() => setStatus('archived')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Chandlo
                  state={status === 'archived' ? 'done' : 'not-done'}
                  label={t('balak.archived')}
                  onClick={() => setStatus('archived')}
                />
                <span className="text-[15px] font-medium text-ink leading-relaxed">
                  {t('balak.archived')}
                </span>
              </div>

              <div
                onClick={() => setStatus('transferred_kishore')}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Chandlo
                  state={status === 'transferred_kishore' ? 'done' : 'not-done'}
                  label={t('balak.transferKishore')}
                  onClick={() => setStatus('transferred_kishore')}
                />
                <span className="text-[15px] font-medium text-ink leading-relaxed">
                  {t('balak.transferKishore')}
                </span>
              </div>
            </div>
          </div>

          {/* Mandatory Reason Textarea */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.archiveReason')} *
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[96px] p-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="આર્કાઇવ કરવાનું પૂરું કારણ લખો"
            />
            {errorMsg && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Confirmation Notice */}
          <div className="p-4 bg-paper border border-rule rounded-md text-[14px] text-ink-soft leading-relaxed">
            {t('balak.archiveConfirm')}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('balak.archive')}
          </button>
        </form>
      </main>
    </div>
  );
}
