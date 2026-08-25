'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Pill } from '@/components/ui/Pill';
import { Chandlo } from '@/components/ui/Chandlo';
import { ActionBar } from '@/components/ui/ActionBar';
import { useToast } from '@/components/ui/Toast';
import { telHref, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { PresabhaT, ContactedT } from '@/lib/database.types';

export interface PresabhaBalakRow {
  attendance_id: string;
  balak_id: string;
  full_name_gu: string;
  photo_path: string | null;
  mother_mobile: string;
  father_mobile: string;
  presabha_status: PresabhaT;
  presabha_contacted: ContactedT;
  presabha_by: string | null;
}

export interface SabhaKaryakar {
  id: string;
  full_name_gu: string;
}

export function PresabhaClient({
  sessionId,
  sabhaNameGu,
  rows: initialRows,
  sabhaKaryakars,
  initialFollowupKaryakarIds,
}: {
  sessionId: string;
  sabhaNameGu: string;
  rows: PresabhaBalakRow[];
  sabhaKaryakars: SabhaKaryakar[];
  initialFollowupKaryakarIds: string[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<PresabhaBalakRow[]>(initialRows);
  const [selectedKaryakarIds, setSelectedKaryakarIds] = useState<string[]>(
    initialFollowupKaryakarIds
  );

  const totalCount = rows.length;
  const pendingCount = rows.filter((r) => r.presabha_status === 'pending').length;
  const progressPercent =
    totalCount > 0 ? Math.round(((totalCount - pendingCount) / totalCount) * 100) : 100;

  // Handle call button tap: updates presabha_contacted stamp (does NOT set outcome)
  const handleCallTap = async (row: PresabhaBalakRow, target: 'mother' | 'father') => {
    let nextContacted: ContactedT = target;
    if (
      (row.presabha_contacted === 'mother' && target === 'father') ||
      (row.presabha_contacted === 'father' && target === 'mother') ||
      row.presabha_contacted === 'both'
    ) {
      nextContacted = 'both';
    }

    // Optimistic UI update
    setRows((prev) =>
      prev.map((r) =>
        r.attendance_id === row.attendance_id
          ? { ...r, presabha_contacted: nextContacted }
          : r
      )
    );

    try {
      await fetch(`/api/sessions/${sessionId}/presabha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: row.attendance_id,
          presabha_contacted: nextContacted,
        }),
      });
    } catch {
      // Non-blocking background call update error
    }
  };

  // Handle outcome selection tap (will_come, wont_come, no_response)
  const handleOutcomeTap = async (
    row: PresabhaBalakRow,
    status: 'will_come' | 'wont_come' | 'no_response'
  ) => {
    const prevStatus = row.presabha_status;

    // Optimistic UI update
    setRows((prev) =>
      prev.map((r) =>
        r.attendance_id === row.attendance_id
          ? { ...r, presabha_status: status }
          : r
      )
    );

    try {
      const res = await fetch(`/api/sessions/${sessionId}/presabha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendance_id: row.attendance_id,
          presabha_status: status,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        // Rollback on failure
        setRows((prev) =>
          prev.map((r) =>
            r.attendance_id === row.attendance_id
              ? { ...r, presabha_status: prevStatus }
              : r
          )
        );
        showToast(t('errors.saveFailed'));
      }
    } catch {
      setRows((prev) =>
        prev.map((r) =>
          r.attendance_id === row.attendance_id
            ? { ...r, presabha_status: prevStatus }
            : r
        )
      );
      showToast(t('errors.saveFailed'));
    }
  };

  // Toggle followup karyakar chip
  const handleToggleKaryakar = async (karyakarId: string) => {
    let nextIds: string[];
    if (selectedKaryakarIds.includes(karyakarId)) {
      nextIds = selectedKaryakarIds.filter((id) => id !== karyakarId);
    } else {
      nextIds = [...selectedKaryakarIds, karyakarId];
    }

    setSelectedKaryakarIds(nextIds);

    try {
      await fetch(`/api/sessions/${sessionId}/presabha`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followup_karyakar_ids: nextIds,
        }),
      });
    } catch {
      // Non-blocking sync error
    }
  };

  const handleFinish = () => {
    showToast(t('common.lastUpdated'));
    router.push(`/session/${sessionId}`);
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader
        title={t('attendance.presabhaTitle')}
        backHref={`/session/${sessionId}`}
      />

      {/* Instruction Block */}
      <div className="bg-sheet border-b border-rule p-4">
        <p className="text-[14px] text-ink-soft leading-relaxed">
          {t('attendance.presabhaSub')}
        </p>
      </div>

      {/* Progress Strip */}
      <div className="w-full bg-rule h-1 overflow-hidden">
        <div
          className="bg-kumkum h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      <div className="px-4 py-2 text-right">
        <span
          className={`font-data text-[13px] font-medium ${
            pendingCount > 0 ? 'text-amber' : 'text-ink-faint'
          }`}
        >
          {t('attendance.presabhaRemaining', { n: toGu(pendingCount) })}
        </span>
      </div>

      {/* Balak Rows List */}
      <main className="max-w-[600px] mx-auto divide-y divide-rule border-t border-b border-rule bg-sheet">
        {rows.map((row) => (
          <div
            key={row.attendance_id}
            className="min-h-[76px] p-3 flex items-center justify-between gap-3"
          >
            {/* Left Avatar + Name + Call Buttons */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-8 h-8 rounded-full border border-rule bg-paper flex items-center justify-center text-ink-faint shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <p className="text-[15px] font-medium text-ink truncate leading-tight">
                  {row.full_name_gu}
                </p>

                {/* Two side-by-side call buttons */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <a
                    href={telHref(row.mother_mobile)}
                    onClick={() => handleCallTap(row, 'mother')}
                    className={`h-[36px] px-2 bg-paper border border-rule rounded-md flex items-center gap-1 text-[12px] font-medium transition-colors ${
                      row.presabha_contacted === 'mother' ||
                      row.presabha_contacted === 'both'
                        ? 'text-indigo border-indigo font-semibold'
                        : 'text-ink hover:bg-sheet'
                    }`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{t('attendance.callMother')}</span>
                  </a>

                  <a
                    href={telHref(row.father_mobile)}
                    onClick={() => handleCallTap(row, 'father')}
                    className={`h-[36px] px-2 bg-paper border border-rule rounded-md flex items-center gap-1 text-[12px] font-medium transition-colors ${
                      row.presabha_contacted === 'father' ||
                      row.presabha_contacted === 'both'
                        ? 'text-indigo border-indigo font-semibold'
                        : 'text-ink hover:bg-sheet'
                    }`}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{t('attendance.callFather')}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Right edge: 3 Outcome Chandlo options */}
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleOutcomeTap(row, 'will_come')}
                className="flex items-center gap-1.5 text-[11px] font-medium text-ink hover:opacity-80"
              >
                <Chandlo
                  size={14}
                  state={row.presabha_status === 'will_come' ? 'done' : 'not-done'}
                  label={t('attendance.willCome')}
                  onClick={() => handleOutcomeTap(row, 'will_come')}
                />
                <span className={row.presabha_status === 'will_come' ? 'font-semibold text-ink' : 'text-ink-soft'}>
                  {t('attendance.willCome')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOutcomeTap(row, 'wont_come')}
                className="flex items-center gap-1.5 text-[11px] font-medium text-ink hover:opacity-80"
              >
                <Chandlo
                  size={14}
                  state={row.presabha_status === 'wont_come' ? 'done' : 'not-done'}
                  label={t('attendance.wontCome')}
                  onClick={() => handleOutcomeTap(row, 'wont_come')}
                />
                <span className={row.presabha_status === 'wont_come' ? 'font-semibold text-ink' : 'text-ink-soft'}>
                  {t('attendance.wontCome')}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOutcomeTap(row, 'no_response')}
                className="flex items-center gap-1.5 text-[11px] font-medium text-ink hover:opacity-80"
              >
                <Chandlo
                  size={14}
                  state={row.presabha_status === 'no_response' ? 'done' : 'not-done'}
                  label={t('attendance.noResponse')}
                  onClick={() => handleOutcomeTap(row, 'no_response')}
                />
                <span className={row.presabha_status === 'no_response' ? 'font-semibold text-ink' : 'text-ink-soft'}>
                  {t('attendance.noResponse')}
                </span>
              </button>
            </div>
          </div>
        ))}
      </main>

      {/* Footer Block: Followup Karyakars Multi-select */}
      <div className="max-w-[600px] mx-auto mt-6 bg-sheet border border-rule rounded-md p-4 space-y-3">
        <SectionHeader>{t('attendance.whoDidFollowup')}</SectionHeader>
        <p className="text-[12px] text-ink-faint leading-relaxed">
          {t('attendance.whoDidFollowupHint')}
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          {sabhaKaryakars.map((karyakar) => {
            const isSelected = selectedKaryakarIds.includes(karyakar.id);
            return (
              <Pill
                key={karyakar.id}
                label={karyakar.full_name_gu}
                selected={isSelected}
                onClick={() => handleToggleKaryakar(karyakar.id)}
              />
            );
          })}
        </div>
      </div>

      {/* ActionBar */}
      <ActionBar
        label={t('attendance.presabhaDone')}
        disabled={pendingCount > 0}
        onClick={handleFinish}
      />
    </div>
  );
}
