'use client';

import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Chandlo } from '@/components/ui/Chandlo';
import { ActionBar } from '@/components/ui/ActionBar';
import { useToast } from '@/components/ui/Toast';
import { formatWeekdayDateGu, formatTimeRangeGu, formatDateGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { PresabhaT, AttendanceT } from '@/lib/database.types';

export interface AttendanceSheetRow {
  attendance_id: string;
  balak_id: string;
  full_name_gu: string;
  photo_path: string | null;
  standard_label_gu: string;
  presabha_status: PresabhaT;
  attendance_status: AttendanceT | null;
}

// Memoised Row Component to guarantee 60fps smooth scrolling with 25+ rows
const AttendanceRowItem = memo(function AttendanceRowItem({
  row,
  onToggleStatus,
}: {
  row: AttendanceSheetRow;
  onToggleStatus: (attendanceId: string, status: AttendanceT) => void;
}) {
  const contactChandloState =
    row.presabha_status === 'will_come'
      ? 'done'
      : row.presabha_status === 'wont_come'
      ? 'not-done'
      : 'pending';

  return (
    <tr className="h-[56px] border-b border-rule hover:bg-paper/50">
      {/* Sticky Left Column: Child Identity */}
      <td className="sticky left-0 bg-sheet z-10 px-3 py-1.5 border-r border-rule min-w-[180px] max-w-[220px]">
        <div className="flex items-center gap-2.5 min-w-0">
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
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-[15px] font-medium text-ink truncate leading-tight">
              {row.full_name_gu}
            </p>
            <p className="text-[12px] font-data text-ink-faint leading-tight truncate">
              {row.standard_label_gu}
            </p>
          </div>
        </div>
      </td>

      {/* Column 2: Contact Chandlo (Read-only) */}
      <td className="p-1 text-center align-middle w-[70px] border-r border-rule">
        <div className="w-8 h-8 mx-auto flex items-center justify-center">
          <Chandlo
            size={18}
            state={contactChandloState}
            label={row.presabha_status}
          />
        </div>
      </td>

      {/* Column 3: Present Chandlo */}
      <td className="p-1 text-center align-middle w-[80px] border-r border-rule">
        <div className="w-8 h-8 mx-auto flex items-center justify-center">
          <Chandlo
            size={20}
            state={row.attendance_status === 'present' ? 'done' : 'not-done'}
            label={t('attendance.present')}
            onClick={() => onToggleStatus(row.attendance_id, 'present')}
          />
        </div>
      </td>

      {/* Column 4: Absent Chandlo */}
      <td className="p-1 text-center align-middle w-[80px]">
        <div className="w-8 h-8 mx-auto flex items-center justify-center">
          <Chandlo
            size={20}
            state={row.attendance_status === 'absent' ? 'done' : 'not-done'}
            label={t('attendance.absent')}
            onClick={() => onToggleStatus(row.attendance_id, 'absent')}
          />
        </div>
      </td>
    </tr>
  );
});

export function AttendanceSheetClient({
  sessionId,
  sabhaNameGu,
  sessionDate,
  startTime,
  endTime,
  isCancelled,
  initialRows,
  lastUpdatedByKaryakarName,
  lastUpdatedAt,
}: {
  sessionId: string;
  sabhaNameGu: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  isCancelled: boolean;
  initialRows: AttendanceSheetRow[];
  lastUpdatedByKaryakarName?: string | null;
  lastUpdatedAt?: string | null;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [rows, setRows] = useState<AttendanceSheetRow[]>(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [updatedBy, setUpdatedBy] = useState<string | null>(lastUpdatedByKaryakarName || null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(lastUpdatedAt || null);

  const pendingBatch = useRef<Map<string, AttendanceT | null>>(new Map());
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const presentCount = rows.filter((r) => r.attendance_status === 'present').length;
  const absentCount = rows.filter((r) => r.attendance_status === 'absent').length;

  // Flush and save pending changes
  const saveBatch = useCallback(async () => {
    if (pendingBatch.current.size === 0) return;

    const payloadRows = Array.from(pendingBatch.current.entries()).map(
      ([attendance_id, attendance_status]) => ({
        attendance_id,
        attendance_status,
      })
    );

    setIsSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: payloadRows }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        pendingBatch.current.clear();
        setUpdatedAt(new Date().toISOString());
      } else {
        showToast(data.error || t('errors.saveFailed'));
      }
    } catch {
      showToast(t('errors.network'));
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, showToast]);

  // Debounced auto-save effect
  const triggerDebouncedSave = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      saveBatch();
    }, 800);
  }, [saveBatch]);

  // Handle single row toggle
  const handleToggleStatus = useCallback(
    (attendanceId: string, targetStatus: AttendanceT) => {
      setRows((prev) =>
        prev.map((r) => {
          if (r.attendance_id !== attendanceId) return r;
          const nextStatus = r.attendance_status === targetStatus ? null : targetStatus;
          pendingBatch.current.set(attendanceId, nextStatus);
          return { ...r, attendance_status: nextStatus };
        })
      );
      triggerDebouncedSave();
    },
    [triggerDebouncedSave]
  );

  // Mark All Present (does NOT overwrite rows already marked absent)
  const handleMarkAllPresent = useCallback(() => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.attendance_status === null) {
          pendingBatch.current.set(r.attendance_id, 'present');
          return { ...r, attendance_status: 'present' };
        }
        return r;
      })
    );
    triggerDebouncedSave();
  }, [triggerDebouncedSave]);

  const handleManualSave = async () => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    await saveBatch();
    showToast(t('attendance.saved'));
    router.push(`/session/${sessionId}`);
    router.refresh();
  };

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  if (isCancelled) {
    return (
      <div className="min-h-screen bg-paper">
        <AppHeader title={t('attendance.sheet')} backHref={`/session/${sessionId}`} />
        <main className="p-8 max-w-[340px] mx-auto text-center space-y-4 pt-16">
          <h1 className="text-[18px] font-semibold text-ink">
            {t('sabha.cancelled')}
          </h1>
          <p className="text-[15px] text-ink-soft leading-relaxed">
            {t('errors.sessionCancelled')}
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader
        title={t('attendance.sheet')}
        backHref={`/session/${sessionId}`}
        action={
          <button
            type="button"
            onClick={handleMarkAllPresent}
            className="text-indigo text-[14px] font-semibold hover:underline"
          >
            {t('attendance.markAll')}
          </button>
        }
      />

      {/* Context Strip */}
      <div className="bg-sheet border-b border-rule p-4 flex items-center justify-between">
        <div className="space-y-0.5 min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink truncate leading-relaxed">
            {sabhaNameGu}
          </p>
          <p className="text-[13px] font-data text-ink-soft leading-relaxed">
            {formatWeekdayDateGu(sessionDate)} • {formatTimeRangeGu(startTime, endTime)}
          </p>
        </div>
      </div>

      {/* Sticky Table & Header */}
      <div className="max-w-[600px] mx-auto overflow-x-auto no-scrollbar border-b border-rule bg-sheet">
        <table className="w-full text-left border-collapse min-w-[420px]">
          <thead>
            <tr className="border-b border-rule-strong bg-sheet sticky top-[52px] z-20">
              <th className="sticky left-0 bg-sheet z-30 px-3 py-3 text-[12px] font-semibold text-ink-faint uppercase tracking-wider min-w-[180px] max-w-[220px] border-r border-rule">
                {t('attendance.colBalak')}
              </th>
              <th className="px-1 py-3 text-center text-[12px] font-semibold text-ink-faint uppercase tracking-wider w-[70px] border-r border-rule">
                {t('attendance.colContact')}
              </th>
              <th className="px-1 py-3 text-center text-[12px] font-semibold text-ink-faint uppercase tracking-wider w-[80px] border-r border-rule">
                {t('attendance.present')}
              </th>
              <th className="px-1 py-3 text-center text-[12px] font-semibold text-ink-faint uppercase tracking-wider w-[80px]">
                {t('attendance.absent')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {rows.map((row) => (
              <AttendanceRowItem
                key={row.attendance_id}
                row={row}
                onToggleStatus={handleToggleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Last Edited Stamp */}
      {updatedAt && (
        <div className="max-w-[600px] mx-auto px-4 py-3 text-center text-[12px] text-ink-faint font-data">
          {t('attendance.editedBy')}: {updatedBy || 'કાર્યકર'} • {formatDateGu(updatedAt)}
        </div>
      )}

      {/* ActionBar */}
      <ActionBar
        label={isSaving ? t('common.saving') : t('attendance.save')}
        loading={isSaving}
        left={`${t('attendance.totalPresent')} ${toGu(presentCount)} • ${t('attendance.totalAbsent')} ${toGu(absentCount)}`}
        onClick={handleManualSave}
      />
    </div>
  );
}
