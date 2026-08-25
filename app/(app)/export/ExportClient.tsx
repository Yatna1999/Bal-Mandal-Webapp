'use client';

import { useState } from 'react';
import { AppHeader } from '@/components/ui/AppHeader';
import { Chandlo } from '@/components/ui/Chandlo';
import { useToast } from '@/components/ui/Toast';
import { t } from '@/lib/i18n';
import type { Lang } from '@/lib/export/types';
import {
  buildBalakRegister,
  buildAttendanceSheet,
  buildAhnikBySabha,
  buildNiyamRegister,
  buildKaryakarAccountability,
} from '@/lib/export/reports';
import { downloadExcel } from '@/lib/export/excel';

type ReportType =
  | 'balakRegister'
  | 'attendance'
  | 'ahnik'
  | 'niyam'
  | 'karyakar';

interface SabhaOption {
  id: string;
  name_gu: string;
}

export function ExportClient({
  sabhas,
  vistarScope,
  actorName,
}: {
  sabhas: SabhaOption[];
  vistarScope: boolean;
  actorName: string;
}) {
  const { showToast } = useToast();

  // Date range defaults to current month
  const now = new Date();
  const firstDayStr = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const lastDayStr = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [selectedReport, setSelectedReport] = useState<ReportType>('balakRegister');
  const [selectedSabhaId, setSelectedSabhaId] = useState<string>(
    sabhas[0]?.id || ''
  );
  const [fromDate, setFromDate] = useState(firstDayStr);
  const [toDate, setToDate] = useState(lastDayStr);
  const [lang, setLang] = useState<Lang>('gu');
  const [loadingExcel, setLoadingExcel] = useState(false);

  const reportOptions: Array<{ type: ReportType; label: string }> = [
    { type: 'balakRegister', label: t('exportUi.rBalakRegister') },
    { type: 'attendance', label: t('exportUi.rAttendance') },
    { type: 'ahnik', label: t('exportUi.rAhnik') },
    { type: 'niyam', label: t('exportUi.rNiyam') },
  ];

  if (vistarScope) {
    reportOptions.push({ type: 'karyakar', label: t('exportUi.rKaryakar') });
  }

  const handleExportExcel = async () => {
    setLoadingExcel(true);
    try {
      let report;
      let filenamePrefix = 'report';

      const monthStr = fromDate.slice(0, 7); // e.g. "2026-08"

      if (selectedReport === 'balakRegister') {
        report = await buildBalakRegister({
          sabhaId: selectedSabhaId || undefined,
          actorName,
          lang,
        });
        filenamePrefix = 'balak_register';
      } else if (selectedReport === 'attendance') {
        report = await buildAttendanceSheet({
          sabhaId: selectedSabhaId,
          from: fromDate,
          to: toDate,
          actorName,
          lang,
        });
        filenamePrefix = `hajari_${monthStr}`;
      } else if (selectedReport === 'ahnik') {
        report = await buildAhnikBySabha({
          sabhaId: selectedSabhaId,
          weekStart: fromDate,
          actorName,
          lang,
        });
        filenamePrefix = `ahnik_${monthStr}`;
      } else if (selectedReport === 'niyam') {
        report = await buildNiyamRegister({
          sabhaId: selectedSabhaId || undefined,
          actorName,
          lang,
        });
        filenamePrefix = 'niyam_register';
      } else if (selectedReport === 'karyakar') {
        report = await buildKaryakarAccountability({
          from: fromDate,
          to: toDate,
          actorName,
          lang,
        });
        filenamePrefix = `karyakar_accountability_${monthStr}`;
      }

      if (report) {
        const filename = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        downloadExcel(report, filename);
        showToast(t('exportUi.excel') + ' ✓');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(msg || t('errors.saveFailed'));
    } finally {
      setLoadingExcel(false);
    }
  };

  const handleExportPdf = () => {
    const url = `/export/print/${selectedReport}?sabhaId=${selectedSabhaId}&from=${fromDate}&to=${toDate}&weekStart=${fromDate}&lang=${lang}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader title={t('exportUi.title')} backHref="/more" />

      <main className="p-4 max-w-[600px] mx-auto space-y-6">
        {/* Report Picker Rows */}
        <div className="space-y-2">
          <label className="block text-[13px] text-ink-soft font-semibold mb-2">
            {t('exportUi.pickReport')}
          </label>
          <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
            {reportOptions.map((opt) => {
              const isSelected = selectedReport === opt.type;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedReport(opt.type)}
                  className={`w-full h-[56px] px-4 flex items-center justify-between transition-colors ${
                    isSelected ? 'bg-indigo-wash text-indigo font-semibold' : 'bg-sheet text-ink hover:bg-paper'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Chandlo state={isSelected ? 'done' : 'not-done'} size={20} label={opt.label} />
                    <span className="text-[15px]">{opt.label}</span>
                  </div>
                  {isSelected && (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sabha Selector (for sabha-level reports) */}
        {selectedReport !== 'karyakar' && (
          <div className="space-y-1">
            <label className="block text-[13px] text-ink-soft font-medium">
              {t('sabha.title')}
            </label>
            <select
              value={selectedSabhaId}
              onChange={(e) => setSelectedSabhaId(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-medium leading-relaxed focus:outline-none focus:border-indigo"
            >
              {sabhas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name_gu}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Period Selector (From / To) */}
        {(selectedReport === 'attendance' ||
          selectedReport === 'ahnik' ||
          selectedReport === 'karyakar') && (
          <div className="space-y-1">
            <label className="block text-[13px] text-ink-soft font-medium">
              {t('dashboard.period')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] text-ink-faint mb-1">શરૂઆત તારીખ</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[14px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
                />
              </div>
              <div>
                <label className="block text-[12px] text-ink-faint mb-1">અંત તારીખ</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[14px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
                />
              </div>
            </div>
          </div>
        )}

        {/* Language Segmented Control */}
        <div className="space-y-2">
          <label className="block text-[13px] text-ink-soft font-medium">
            {t('exportUi.dateLanguage')}
          </label>
          <div className="grid grid-cols-2 p-1 bg-sheet border border-rule rounded-md gap-1">
            <button
              type="button"
              onClick={() => setLang('gu')}
              className={`h-[40px] text-[14px] font-semibold rounded transition-colors ${
                lang === 'gu' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('exportUi.dateGu')}
            </button>
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`h-[40px] text-[14px] font-semibold rounded transition-colors ${
                lang === 'en' ? 'bg-indigo text-white font-semibold' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {t('exportUi.dateEn')}
            </button>
          </div>
        </div>

        {/* Stacked ActionBar-Style Buttons */}
        <div className="pt-4 space-y-3">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={loadingExcel}
            className="w-full h-[52px] bg-indigo text-white text-[16px] font-semibold rounded-md flex items-center justify-center gap-2 transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{loadingExcel ? t('exportUi.generating') : t('exportUi.excel')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="w-full h-[52px] bg-sheet border border-indigo text-indigo text-[16px] font-semibold rounded-md flex items-center justify-center gap-2 transition-colors hover:bg-indigo-wash"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>{t('exportUi.pdf')}</span>
          </button>

          <p className="text-[13px] text-ink-faint text-center leading-relaxed">
            {t('exportUi.pdfHint')}
          </p>
        </div>
      </main>
    </div>
  );
}
