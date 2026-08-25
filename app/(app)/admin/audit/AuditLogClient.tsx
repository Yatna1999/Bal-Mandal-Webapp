'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { formatWeekdayDateGu, formatTimeGu, toGu } from '@/lib/format';
import { t } from '@/lib/i18n';

export interface AuditLogRow {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  changed_fields: string[] | null;
  actor_id: string | null;
  actor_name_snapshot: string | null;
  created_at: string;
  resolved_record_name?: string;
}

export function AuditLogClient({
  initialLogs,
  totalCount,
  pageSize = 50,
}: {
  initialLogs: AuditLogRow[];
  totalCount: number;
  pageSize?: number;
}) {
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);

  // Filter logs locally or support pagination
  const filteredLogs = initialLogs.filter((log) => {
    if (tableFilter !== 'all' && log.table_name !== tableFilter) return false;
    if (actorFilter !== 'all' && (log.actor_name_snapshot || '') !== actorFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / pageSize) || 1;
  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);

  // Get list of unique actors for filter dropdown
  const uniqueActors = Array.from(
    new Set(initialLogs.map((l) => l.actor_name_snapshot).filter(Boolean))
  ) as string[];

  const getFieldLabel = (field: string) => {
    return t(`auditFields.${field}` as Parameters<typeof t>[0]) || field;
  };

  const getTableLabel = (tableName: string) => {
    if (tableName === 'balako') return 'બાળક પ્રોફાઇલ';
    if (tableName === 'attendance') return 'હાજરી પત્રક';
    if (tableName === 'sabha_sessions') return 'સભા આયોજન';
    if (tableName === 'niyams') return 'નિયમ નોંધ';
    if (tableName === 'karyakars') return 'કાર્યકર દફતર';
    if (tableName === 'sabhas') return 'સભા વિગત';
    return tableName;
  };

  return (
    <div className="min-h-screen bg-paper pb-[120px]">
      <AppHeader title={t('audit.title')} backHref="/more" />

      <main className="p-4 max-w-[600px] mx-auto space-y-4">
        {/* Filter Controls */}
        <div className="bg-sheet border border-rule rounded-md p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                {t('audit.filterByTable')}
              </label>
              <select
                value={tableFilter}
                onChange={(e) => {
                  setTableFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-[40px] px-3 bg-paper border border-rule rounded-md text-[13px] text-ink font-medium"
              >
                <option value="all">{t('audit.allTables')}</option>
                <option value="balako">બાળક (balako)</option>
                <option value="attendance">હાજરી (attendance)</option>
                <option value="sabha_sessions">સભા (sabha_sessions)</option>
                <option value="niyams">નિયમ (niyams)</option>
                <option value="karyakars">કાર્યકર (karyakars)</option>
                <option value="sabhas">સભા સેટઅપ (sabhas)</option>
              </select>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-soft mb-1">
                {t('audit.filterByActor')}
              </label>
              <select
                value={actorFilter}
                onChange={(e) => {
                  setActorFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full h-[40px] px-3 bg-paper border border-rule rounded-md text-[13px] text-ink font-medium"
              >
                <option value="all">{t('audit.allActors')}</option>
                {uniqueActors.map((actor) => (
                  <option key={actor} value={actor}>
                    {actor}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Audit Log Rows */}
        {paginatedLogs.length === 0 ? (
          <div className="bg-sheet border border-rule rounded-md p-6 text-center text-[14px] text-ink-soft">
            {t('audit.noLogs')}
          </div>
        ) : (
          <div className="bg-sheet border border-rule rounded-md divide-y divide-rule overflow-hidden">
            {paginatedLogs.map((log) => {
              const actorName = log.actor_name_snapshot || 'કાર્યકર';
              const recordName = log.resolved_record_name || getTableLabel(log.table_name);
              const changedFieldsList = (log.changed_fields || [])
                .map((f) => getFieldLabel(f))
                .join(', ') || 'વિગતો';

              return (
                <div key={log.id} className="p-4 hover:bg-paper transition-colors space-y-1">
                  {/* Gujarati Sentence */}
                  <p className="text-[15px] text-ink font-medium leading-relaxed">
                    <span className="font-semibold text-indigo">{actorName}</span> એ{' '}
                    <span className="font-semibold">{recordName}</span> માં{' '}
                    <span className="font-semibold text-kumkum">{changedFieldsList}</span> બદલ્યું.
                  </p>

                  {/* Timestamp & Table Badge */}
                  <div className="flex items-center justify-between text-[12px] font-data text-ink-faint pt-1">
                    <span>
                      {formatWeekdayDateGu(log.created_at)} • {formatTimeGu(log.created_at)}
                    </span>
                    <span className="px-2 py-0.5 bg-paper border border-rule rounded text-[11px] font-sans text-ink-soft">
                      {getTableLabel(log.table_name)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 px-2 text-[14px] text-ink-soft font-data">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-rule rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sheet transition-colors"
            >
              ← અગાઉનું
            </button>
            <span>
              પાનું {toGu(page)} / {toGu(totalPages)}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-rule rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-sheet transition-colors"
            >
              આગળનું →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
