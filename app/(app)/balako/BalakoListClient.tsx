'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { AppHeader } from '@/components/ui/AppHeader';
import { Pill } from '@/components/ui/Pill';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DataText } from '@/components/ui/DataText';
import { BalakRow, type BalakRowData } from '@/components/balak/BalakRow';
import { createClient } from '@/lib/supabase/client';
import { toGu } from '@/lib/format';
import { t } from '@/lib/i18n';

export interface SabhaFilter {
  id: string;
  name_gu: string;
}

export function BalakoListClient({
  initialBalako,
  sabhas,
  photoGraceDays = 10,
}: {
  initialBalako: BalakRowData[];
  sabhas: SabhaFilter[];
  photoGraceDays?: number;
}) {
  const [balako, setBalako] = useState<BalakRowData[]>(initialBalako);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSabhaId, setSelectedSabhaId] = useState<string>('all');
  const [isPending, startTransition] = useTransition();

  // Debounced search query fetching
  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(async () => {
        const supabase = createClient();
        let query = supabase
          .from('balako')
          .select(`
            id,
            full_name_gu,
            full_name_en,
            photo_path,
            standard_code,
            status,
            created_at,
            balak_sabhas (
              sabha_id,
              sabhas (
                name_gu
              )
            ),
            standards (
              label_gu
            )
          `)
          .eq('status', 'active')
          .order('full_name_gu');

        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          query = query.ilike('search_blob', `%${q}%`);
        }

        const { data, error } = await query;
        if (!error && data) {
          const mapped: BalakRowData[] = data.map((b) => {
            const rawSabhas = b.balak_sabhas as unknown as Array<{
              sabha_id: string;
              sabhas: { name_gu: string } | null;
            }> | null;
            const primarySabha = rawSabhas?.[0]?.sabhas?.name_gu;

            const rawStandard = b.standards as unknown as {
              label_gu: string;
            } | null;

            return {
              id: b.id,
              full_name_gu: b.full_name_gu,
              full_name_en: b.full_name_en,
              photo_path: b.photo_path,
              standard_code: b.standard_code,
              status: b.status,
              created_at: b.created_at,
              standard_label_gu: rawStandard?.label_gu || b.standard_code,
              sabha_name_gu: primarySabha,
              rawSabhaIds: (rawSabhas || []).map((s) => s.sabha_id),
            };
          });

          setBalako(mapped);
        }
      });
    }, 250);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Filter balako by sabha
  const filteredBalako = balako.filter((b) => {
    if (selectedSabhaId === 'all') return true;
    const rawIds = (b as unknown as { rawSabhaIds?: string[] }).rawSabhaIds;
    return rawIds ? rawIds.includes(selectedSabhaId) : true;
  });

  return (
    <div className="space-y-4">
      {/* AppHeader with + link */}
      <AppHeader
        title={t('balak.title')}
        action={
          <Link
            href="/balako/new"
            className="w-9 h-9 bg-kumkum text-white rounded-md flex items-center justify-center text-[20px] font-semibold transition-opacity hover:opacity-95"
            aria-label={t('balak.add')}
          >
            +
          </Link>
        }
      />

      {/* Search Input */}
      <div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('balak.search')}
          className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
        />
      </div>

      {/* Horizontally Scrollable Sabha Filter Chips */}
      {sabhas.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Pill
            label={t('common.all')}
            selected={selectedSabhaId === 'all'}
            onClick={() => setSelectedSabhaId('all')}
          />
          {sabhas.map((s) => (
            <Pill
              key={s.id}
              label={s.name_gu}
              selected={selectedSabhaId === s.id}
              onClick={() => setSelectedSabhaId(s.id)}
            />
          ))}
        </div>
      )}

      {/* Count Line */}
      <div className="flex justify-end items-center text-[13px] text-ink-soft">
        <DataText>
          {toGu(filteredBalako.length)} {t('nav.balako')}
        </DataText>
      </div>

      {/* List / Empty States */}
      {filteredBalako.length > 0 ? (
        <div className="border border-rule rounded-md overflow-hidden bg-sheet">
          {filteredBalako.map((balak) => (
            <BalakRow
              key={balak.id}
              balak={balak}
              photoGraceDays={photoGraceDays}
            />
          ))}
        </div>
      ) : searchQuery.trim() ? (
        /* Search No Results */
        <div className="bg-sheet border border-rule rounded-md p-8 text-center space-y-2">
          <p className="text-[15px] text-ink-soft leading-relaxed">
            {t('empty.search').replace('{q}', searchQuery.trim())}
          </p>
        </div>
      ) : (
        /* Empty Balako */
        <div className="bg-sheet border border-rule rounded-md p-8 text-center space-y-4">
          <p className="text-[15px] text-ink-soft leading-relaxed">
            {t('empty.balako')}
          </p>
          <div>
            <Link
              href="/balako/new"
              className="inline-flex items-center justify-center h-[48px] px-6 bg-kumkum text-white text-[15px] font-semibold rounded-md transition-opacity hover:opacity-95"
            >
              {t('empty.balakoCta')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
