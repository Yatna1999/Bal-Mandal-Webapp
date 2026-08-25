'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useBalakPhotoUrl } from '@/lib/hooks/useBalakPhotoUrl';
import { Stat, StatGroup } from '@/components/ui/Stat';
import { Row } from '@/components/ui/Row';
import { Chandlo } from '@/components/ui/Chandlo';
import { telHref, toGu, ageFromDob, formatDateGu, formatWeekdayDateGu, formatWeekRangeGu } from '@/lib/format';
import { isVistarScope } from '@/lib/auth';
import { t } from '@/lib/i18n';
import type { RoleT, Database, MediumT, SatsangStatusT } from '@/lib/database.types';

export interface BalakProfileData {
  id: string;
  vistar_id: string;
  full_name_gu: string;
  full_name_en: string;
  photo_path: string | null;
  dob: string;
  standard_code: string;
  medium: MediumT;
  school_gu: string;
  school_en: string;
  address_gu: string;
  satsang_status: SatsangStatusT;
  mother_name_gu: string;
  mother_mobile: string;
  father_name_gu: string;
  father_mobile: string;
  status: string;
  created_at: string;
  archive_reason_gu?: string | null;
  archived_at?: string | null;
  archived_by?: string | null;
  archived_by_name_gu?: string | null;
  standard_label_gu?: string;
}

export interface BalakNiyamItem {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'completed' | 'lapsed';
}

export function BalakProfileClient({
  balak,
  niyams = [],
  userRole,
}: {
  balak: BalakProfileData;
  niyams?: BalakNiyamItem[];
  userRole: RoleT;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'attendance' | 'ahnik'>('details');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Lazy loading state for Attendance Tab
  const [attLoading, setAttLoading] = useState(false);
  const [attLoaded, setAttLoaded] = useState(false);
  const [attData, setAttData] = useState<{
    stats: { present: number; total: number; percent: number };
    sessions: Array<{
      id: string;
      sabha_name_gu: string;
      session_date: string;
      status: 'present' | 'absent';
    }>;
  } | null>(null);

  // Lazy loading state for Ahnik Tab
  const [ahnikLoading, setAhnikLoading] = useState(false);
  const [ahnikLoaded, setAhnikLoaded] = useState(false);
  const [ahnikData, setAhnikData] = useState<{
    items: Array<{ id: string; code: string; label_gu: string }>;
    weeks: Array<{
      week_start_date: string;
      has_record: boolean;
      entries: Record<string, boolean | null>;
    }>;
  } | null>(null);

  const handleTabChange = (tab: 'details' | 'attendance' | 'ahnik') => {
    setActiveTab(tab);

    if (tab === 'attendance' && !attLoaded && !attLoading) {
      setAttLoading(true);
      fetch(`/api/balako/${balak.id}/attendance`)
        .then((res) => res.json())
        .then((data) => {
          setAttData(data);
          setAttLoaded(true);
        })
        .catch((err) => console.error('Failed to load attendance:', err))
        .finally(() => setAttLoading(false));
    }

    if (tab === 'ahnik' && !ahnikLoaded && !ahnikLoading) {
      setAhnikLoading(true);
      fetch(`/api/balako/${balak.id}/ahnik`)
        .then((res) => res.json())
        .then((data) => {
          setAhnikData(data);
          setAhnikLoaded(true);
        })
        .catch((err) => console.error('Failed to load ahnik:', err))
        .finally(() => setAhnikLoading(false));
    }
  };

  const { data: photoUrl } = useBalakPhotoUrl(balak.photo_path);
  const age = ageFromDob(balak.dob);

  const vistarScope = isVistarScope(userRole);

  const router = useRouter();
  const { showToast } = useToast();

  const handleUnarchive = async () => {
    try {
      const res = await fetch(`/api/balako/${balak.id}/archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unarchive' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(t('common.lastUpdated'));
        router.refresh();
      } else {
        showToast(data.error || t('errors.saveFailed'));
      }
    } catch {
      showToast(t('errors.network'));
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      {/* Header with Overflow Menu */}
      <AppHeader
        title={t('balak.profile')}
        backHref="/balako"
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

      <main className="max-w-[600px] mx-auto space-y-6 pt-4 px-4">
        {/* Archived / Transferred Banner */}
        {balak.status !== 'active' && (
          <div className="bg-amber-wash border border-amber rounded-md p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[15px] text-amber">
                {balak.status === 'transferred_kishore'
                  ? t('balak.transferKishore')
                  : t('balak.archived')}
              </span>
              {balak.archived_at && (
                <span className="text-[12px] font-data text-ink-soft">
                  {formatDateGu(balak.archived_at)}
                </span>
              )}
            </div>

            {balak.archive_reason_gu && (
              <p className="text-[14px] text-ink leading-relaxed">
                {balak.archive_reason_gu}
              </p>
            )}

            {balak.archived_by_name_gu && (
              <p className="text-[12px] text-ink-soft">
                {t('common.by')}: {balak.archived_by_name_gu}
              </p>
            )}

            {/* Unarchive Action for super_admin */}
            {userRole === 'super_admin' && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleUnarchive}
                  className="h-[36px] px-3 bg-kumkum text-white text-[13px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95"
                >
                  {t('balak.unarchive')}
                </button>
              </div>
            )}
          </div>
        )}
        {/* Identity Block (Left aligned) */}
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={balak.full_name_gu}
                className="w-[72px] h-[72px] rounded-full object-cover border border-rule"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full border-[1.5px] border-dashed border-ink-faint flex items-center justify-center bg-sheet text-ink-faint">
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-[22px] font-semibold text-ink leading-relaxed truncate">
              {balak.full_name_gu}
            </h1>
            <p className="text-[14px] text-ink-soft leading-relaxed truncate">
              {balak.full_name_en}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Pill
                label={t(`satsang.${balak.satsang_status}` as Parameters<typeof t>[0])}
                selected={true}
              />
              <Pill
                label={balak.standard_label_gu || balak.standard_code}
                selected={false}
              />
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="border-b border-rule flex items-center gap-6 text-[15px]">
          <button
            type="button"
            onClick={() => handleTabChange('details')}
            className={`pb-2.5 transition-colors ${
              activeTab === 'details'
                ? 'border-b-2 border-kumkum text-kumkum font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t('balak.tabs.details')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('attendance')}
            className={`pb-2.5 transition-colors ${
              activeTab === 'attendance'
                ? 'border-b-2 border-kumkum text-kumkum font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t('balak.tabs.attendance')}
          </button>
          <button
            type="button"
            onClick={() => handleTabChange('ahnik')}
            className={`pb-2.5 transition-colors ${
              activeTab === 'ahnik'
                ? 'border-b-2 border-kumkum text-kumkum font-semibold'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            {t('balak.tabs.ahnik')}
          </button>
        </div>

        {/* Tab 1 Content: વિગત (Details) */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Detail Rows */}
            <div className="border border-rule rounded-md overflow-hidden bg-sheet">
              {/* Row 1: Birth Date & Age */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.dob')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right font-data">
                  {formatDateGu(balak.dob)} ({toGu(age)} વર્ષ)
                </span>
              </div>

              {/* Row 2: Standard */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.standard')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right">
                  {balak.standard_label_gu || balak.standard_code}
                </span>
              </div>

              {/* Row 3: Medium */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.medium')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right">
                  {t(`medium.${balak.medium}` as Parameters<typeof t>[0])}
                </span>
              </div>

              {/* Row 4: School */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.school')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right max-w-[60%] truncate">
                  {balak.school_gu}
                </span>
              </div>

              {/* Row 5: Address */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.address')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right max-w-[60%] leading-relaxed">
                  {balak.address_gu}
                </span>
              </div>

              {/* Row 6: Mother Name */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.motherName')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right">
                  {balak.mother_name_gu}
                </span>
              </div>

              {/* Row 7: Mother Mobile (tel link) */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.motherMobile')}
                </span>
                <a
                  href={telHref(balak.mother_mobile)}
                  className="inline-flex items-center gap-1.5 text-indigo font-data text-[15px] font-semibold hover:underline"
                >
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
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {toGu(balak.mother_mobile)}
                </a>
              </div>

              {/* Row 8: Father Name */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.fatherName')}
                </span>
                <span className="text-[15px] text-ink font-medium text-right">
                  {balak.father_name_gu}
                </span>
              </div>

              {/* Row 9: Father Mobile (tel link) */}
              <div className="min-h-[48px] px-4 py-2 flex items-center justify-between border-b border-rule">
                <span className="text-[13px] text-ink-faint font-medium">
                  {t('balak.fatherMobile')}
                </span>
                <a
                  href={telHref(balak.father_mobile)}
                  className="inline-flex items-center gap-1.5 text-indigo font-data text-[15px] font-semibold hover:underline"
                >
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
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                  {toGu(balak.father_mobile)}
                </a>
              </div>
            </div>

            {/* વિશેષ નિયમ Section */}
            <div className="space-y-3">
              <SectionHeader>{t('niyam.title')}</SectionHeader>

              {niyams.length > 0 ? (
                <div className="border border-rule rounded-md overflow-hidden bg-sheet">
                  {niyams.map((niyam) => (
                    <div
                      key={niyam.id}
                      className="min-h-[52px] px-4 py-2.5 border-b border-rule flex items-center justify-between"
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <p className="text-[15px] font-medium text-ink truncate">
                          {niyam.title}
                        </p>
                        <p className="text-[12px] font-data text-ink-soft">
                          {formatDateGu(niyam.start_date)} થી {formatDateGu(niyam.end_date)}
                        </p>
                      </div>
                      <Pill
                        label={t(`niyam.status${niyam.status.charAt(0).toUpperCase() + niyam.status.slice(1)}` as Parameters<typeof t>[0])}
                        selected={niyam.status === 'active'}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                /* Empty Niyam State */
                <div className="bg-sheet border border-rule rounded-md p-6 text-center space-y-3">
                  <p className="text-[14px] text-ink-soft leading-relaxed">
                    {t('empty.niyam')}
                  </p>
                  <div>
                    {/* TODO: WO-27 - Add Special Niyam Flow */}
                    <Link
                      href={`/balako/${balak.id}/niyam/new`}
                      className="inline-flex items-center justify-center h-[40px] px-4 border border-indigo text-indigo text-[14px] font-semibold rounded-md transition-colors hover:bg-indigo-wash"
                    >
                      {t('empty.niyamCta')}
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: હાજરી (Attendance History) */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            {attLoading ? (
              <div className="bg-sheet border border-rule rounded-md p-8 text-center text-ink-soft text-[15px]">
                {t('common.loading')}
              </div>
            ) : attData && attData.stats.total > 0 ? (
              <div className="space-y-4">
                {/* Summary Strip */}
                <StatGroup className="bg-sheet rounded-md">
                  <Stat
                    value={toGu(attData.stats.present)}
                    label={t('balak.attStats.present')}
                    className="flex-1"
                  />
                  <Stat
                    value={toGu(attData.stats.total)}
                    label={t('balak.attStats.total')}
                    className="flex-1"
                  />
                  <Stat
                    value={`${toGu(attData.stats.percent)}%`}
                    label={t('balak.attStats.percent')}
                    className="flex-1"
                  />
                </StatGroup>

                {/* Session Rows */}
                <div className="border border-rule rounded-md overflow-hidden bg-sheet">
                  {attData.sessions.map((session) => (
                    <Row
                      key={session.id}
                      title={session.sabha_name_gu}
                      subtitle={formatWeekdayDateGu(session.session_date)}
                      right={
                        <Chandlo
                          state={session.status === 'present' ? 'done' : 'not-done'}
                          label={session.status}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            ) : (
              /* Empty Past Sabha State */
              <div className="bg-sheet border border-rule rounded-md p-8 text-center text-ink-soft text-[15px] leading-relaxed">
                {t('empty.pastSabha')}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: આહ્નિક (Ahnik History) */}
        {activeTab === 'ahnik' && (
          <div className="space-y-6">
            {ahnikLoading ? (
              <div className="bg-sheet border border-rule rounded-md p-8 text-center text-ink-soft text-[15px]">
                {t('common.loading')}
              </div>
            ) : ahnikData && ahnikData.weeks.some((w) => w.has_record) ? (
              <div className="border border-rule rounded-md overflow-hidden bg-sheet">
                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-rule bg-paper">
                        <th className="sticky left-0 bg-paper z-10 px-3 py-4 text-[12px] font-medium text-ink-soft min-w-[110px] border-r border-rule">
                          {t('ahnik.week')}
                        </th>
                        {ahnikData.items.map((item) => (
                          <th
                            key={item.id}
                            className="px-2 py-4 text-center text-[11px] font-medium text-ink leading-tight h-[80px] align-bottom"
                          >
                            <div className="whitespace-nowrap -rotate-45 origin-bottom-left transform translate-x-4 mb-2">
                              {t(`ahnik.items.${item.code}` as Parameters<typeof t>[0]) || item.label_gu}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      {ahnikData.weeks.map((week) => (
                        <tr key={week.week_start_date} className="hover:bg-paper/50">
                          <td className="sticky left-0 bg-sheet z-10 px-3 py-2 text-[12px] font-data text-ink-soft border-r border-rule whitespace-nowrap">
                            {formatWeekRangeGu(week.week_start_date)}
                          </td>
                          {ahnikData.items.map((item) => {
                            const val = week.entries[item.id];
                            const state: 'done' | 'not-done' | 'pending' =
                              val === true
                                ? 'done'
                                : val === false
                                ? 'not-done'
                                : 'pending';

                            return (
                              <td key={item.id} className="p-1 text-center align-middle">
                                <div className="w-8 h-8 mx-auto flex items-center justify-center">
                                  <Chandlo
                                    state={state}
                                    size={16}
                                    label={item.label_gu}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* Empty Ahnik History State */
              <div className="bg-sheet border border-rule rounded-md p-8 text-center text-ink-soft text-[15px] leading-relaxed">
                {t('empty.ahnikHistory')}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Header Overflow Menu Sheet */}
      <Sheet
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        title={balak.full_name_gu}
      >
        <div className="space-y-3">
          {/* Edit Option for all users */}
          <Link
            href={`/balako/${balak.id}/edit`}
            className="w-full h-[48px] px-4 bg-paper border border-rule text-ink font-semibold rounded-md flex items-center justify-between text-[15px] hover:bg-sheet transition-colors"
          >
            <span>{t('balak.edit')}</span>
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
          </Link>

          {/* Archive Option for vistar scope only */}
          {vistarScope && (
            /* TODO: WO-19 - Archive Balak Flow */
            <Link
              href={`/balako/${balak.id}/archive`}
              className="w-full h-[48px] px-4 bg-paper border border-kumkum text-kumkum font-semibold rounded-md flex items-center justify-between text-[15px] hover:bg-kumkum-wash transition-colors"
            >
              <span>{t('balak.archive')}</span>
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
                <polyline points="21 8 21 21 3 21 3 8" />
                <rect x="1" y="3" width="22" height="5" />
                <line x1="10" y1="12" x2="14" y2="12" />
              </svg>
            </Link>
          )}
        </div>
      </Sheet>
    </div>
  );
}
