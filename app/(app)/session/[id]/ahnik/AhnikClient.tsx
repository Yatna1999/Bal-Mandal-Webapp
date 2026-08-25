'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Chandlo } from '@/components/ui/Chandlo';
import { ActionBar } from '@/components/ui/ActionBar';
import { useToast } from '@/components/ui/Toast';
import { formatWeekRangeGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { SabhaTypeT, SatsangStatusT } from '@/lib/database.types';

export interface AhnikItem {
  id: string;
  code: string;
  label_gu: string;
  sort_order: number;
}

export interface AhnikBalak {
  id: string;
  full_name_gu: string;
  photo_path: string | null;
  standard_label_gu: string;
  satsang_status: SatsangStatusT;
  weekRecord?: {
    week_id: string;
    captured_at_session: string | null;
    capturing_sabha_name_gu?: string | null;
    entries: Record<string, boolean>; // item_id -> done
  } | null;
}

export function AhnikClient({
  sessionId,
  sabhaNameGu,
  sabhaType,
  weekStartDate,
  items,
  balako,
}: {
  sessionId: string;
  sabhaNameGu: string;
  sabhaType: SabhaTypeT;
  weekStartDate: string;
  items: AhnikItem[];
  balako: AhnikBalak[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [balakList, setBalakList] = useState<AhnikBalak[]>(balako);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Kachi sabha guard
  if (sabhaType !== 'pakki') {
    return (
      <div className="min-h-screen bg-paper pb-[116px]">
        <AppHeader title={t('ahnik.followupTitle')} backHref={`/session/${sessionId}`} />
        <main className="p-8 max-w-[340px] mx-auto text-center pt-16">
          <div className="bg-sheet border border-rule rounded-md p-8 text-center text-ink-soft text-[15px] leading-relaxed">
            {t('ahnik.notApplicable')}
          </div>
        </main>
      </div>
    );
  }

  const activeBalak = balakList[activeIndex] || balakList[0];

  // Current active balak's entry states (item_id -> boolean)
  const currentWeekRecord = activeBalak?.weekRecord;
  const isRecorded = !!currentWeekRecord;
  const isRecordedOtherSession =
    isRecorded && currentWeekRecord.captured_at_session !== sessionId;

  const [activeEntries, setActiveEntries] = useState<Record<string, boolean>>(() => {
    if (currentWeekRecord?.entries) {
      return { ...currentWeekRecord.entries };
    }
    const initial: Record<string, boolean> = {};
    items.forEach((item) => {
      initial[item.id] = false;
    });
    return initial;
  });

  // Switch active balak in strip
  const handleSelectBalak = (index: number) => {
    setActiveIndex(index);
    const selected = balakList[index];
    if (selected?.weekRecord?.entries) {
      setActiveEntries({ ...selected.weekRecord.entries });
    } else {
      const initial: Record<string, boolean> = {};
      items.forEach((item) => {
        initial[item.id] = false;
      });
      setActiveEntries(initial);
    }
  };

  // Toggle single item Chandlo
  const handleToggleItem = (itemId: string) => {
    setActiveEntries((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // Save current active balak and advance to next un-recorded balak
  const handleSaveAndNext = async () => {
    if (!activeBalak) return;
    setIsSaving(true);

    try {
      const res = await fetch(`/api/sessions/${sessionId}/ahnik`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          balak_id: activeBalak.id,
          week_start_date: weekStartDate,
          entries: activeEntries,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('errors.saveFailed'));
        setIsSaving(false);
        return;
      }

      // Update local state for this balak to show recorded dot
      setBalakList((prev) =>
        prev.map((b, idx) =>
          idx === activeIndex
            ? {
                ...b,
                weekRecord: {
                  week_id: data.weekId,
                  captured_at_session: sessionId,
                  capturing_sabha_name_gu: sabhaNameGu,
                  entries: { ...activeEntries },
                },
              }
            : b
        )
      );

      // Find next un-recorded balak index
      const unrecordedIndex = balakList.findIndex(
        (b, idx) => idx > activeIndex && !b.weekRecord
      );

      if (unrecordedIndex !== -1) {
        handleSelectBalak(unrecordedIndex);
      } else {
        // If no unrecorded balako after active index, check from beginning
        const firstUnrecorded = balakList.findIndex((b) => !b.weekRecord);
        if (firstUnrecorded !== -1 && firstUnrecorded !== activeIndex) {
          handleSelectBalak(firstUnrecorded);
        } else {
          // All balako recorded! Done.
          showToast(t('ahnik.saved'));
          router.push(`/session/${sessionId}`);
          router.refresh();
        }
      }
    } catch {
      showToast(t('errors.network'));
    } finally {
      setIsSaving(false);
    }
  };

  const isLastBalak = activeIndex === balakList.length - 1;

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader
        title={t('ahnik.followupTitle')}
        backHref={`/session/${sessionId}`}
      />

      {/* Sub-line & Instruction Block */}
      <div className="bg-sheet border-b border-rule p-4 space-y-1">
        <p className="text-[13px] font-data font-medium text-ink">
          {sabhaNameGu} • {formatWeekRangeGu(weekStartDate)}
        </p>
        <p className="text-[14px] text-ink-soft leading-relaxed">
          {t('ahnik.followupSub')}
        </p>
      </div>

      {/* Horizontal Balak Scrollable Strip */}
      <div className="bg-sheet border-b border-rule">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4 h-[72px]">
          {balakList.map((balak, idx) => {
            const isActive = idx === activeIndex;
            const hasRecordedDot = !!balak.weekRecord;
            const firstName = balak.full_name_gu.split(' ')[0] || balak.full_name_gu;

            return (
              <button
                key={balak.id}
                type="button"
                onClick={() => handleSelectBalak(idx)}
                className="flex flex-col items-center shrink-0 space-y-1 focus:outline-none"
              >
                <div className="relative">
                  <div
                    className={`w-[40px] h-[40px] rounded-full border border-rule bg-paper flex items-center justify-center text-ink-faint transition-all ${
                      isActive ? 'ring-2 ring-kumkum' : ''
                    }`}
                  >
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
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  {/* Filled Kumkum Dot for recorded balako */}
                  {hasRecordedDot && (
                    <span className="w-2.5 h-2.5 bg-kumkum rounded-full absolute bottom-0 right-0 border-2 border-sheet" />
                  )}
                </div>
                <span
                  className={`text-[11px] max-w-[50px] truncate leading-tight ${
                    isActive ? 'font-semibold text-kumkum' : 'text-ink-soft'
                  }`}
                >
                  {firstName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <main className="max-w-[600px] mx-auto p-4 space-y-4">
        {/* Active Balak Identity Block */}
        {activeBalak && (
          <div className="bg-sheet border border-rule rounded-md p-4 space-y-3">
            {/* Banner if recorded at a different session */}
            {isRecordedOtherSession && (
              <div className="bg-amber-wash border border-amber rounded-md p-3 text-[13px] text-ink flex items-center justify-between leading-relaxed">
                <span className="font-medium text-amber">
                  {t('ahnik.alreadyRecorded')}
                  {activeBalak.weekRecord?.capturing_sabha_name_gu
                    ? ` (${activeBalak.weekRecord.capturing_sabha_name_gu})`
                    : ''}
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="w-[56px] h-[56px] rounded-full border border-rule bg-paper flex items-center justify-center text-ink-faint shrink-0">
                <svg
                  width="24"
                  height="24"
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

              <div className="space-y-0.5 min-w-0 flex-1">
                <h1 className="text-[18px] font-semibold text-ink leading-relaxed truncate">
                  {activeBalak.full_name_gu}
                </h1>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  {activeBalak.standard_label_gu} • {t(`satsang.${activeBalak.satsang_status}` as Parameters<typeof t>[0])}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 7 Ahnik Item Rows */}
        <div className="border border-rule rounded-md overflow-hidden bg-sheet divide-y divide-rule">
          {items.map((item) => {
            const isDone = !!activeEntries[item.id];
            const itemLabel =
              t(`ahnik.items.${item.code}` as Parameters<typeof t>[0]) || item.label_gu;

            return (
              <div
                key={item.id}
                onClick={() => handleToggleItem(item.id)}
                className="min-h-[56px] px-4 py-3 flex items-center justify-between gap-4 bg-transparent hover:bg-paper transition-colors cursor-pointer"
              >
                {/* Item Label (Grows naturally without truncation) */}
                <p className="flex-1 text-[16px] font-medium text-ink leading-relaxed">
                  {itemLabel}
                </p>

                {/* Chandlo (Size 28 with 48px tap target) */}
                <div className="shrink-0 flex items-center justify-center w-[48px] h-[48px]">
                  <Chandlo
                    size={28}
                    state={isDone ? 'done' : 'not-done'}
                    label={itemLabel}
                    onClick={() => handleToggleItem(item.id)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ActionBar */}
      <ActionBar
        label={
          isSaving
            ? t('common.saving')
            : isLastBalak
            ? t('ahnik.save')
            : t('ahnik.saveNext')
        }
        loading={isSaving}
        onClick={handleSaveAndNext}
      />
    </div>
  );
}
