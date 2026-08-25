'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Row } from '@/components/ui/Row';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { WEEKDAYS_GU, formatTimeRangeGu } from '@/lib/format';
import { t } from '@/lib/i18n';
import type { RoleT, SabhaTypeT, Database } from '@/lib/database.types';

export type SabhaRow = Database['public']['Tables']['sabhas']['Row'];

export function SabhaManagementClient({
  initialSabhas,
  userRole,
}: {
  initialSabhas: SabhaRow[];
  userRole: RoleT;
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [sabhas, setSabhas] = useState<SabhaRow[]>(initialSabhas);
  const [selectedSabha, setSelectedSabha] = useState<SabhaRow | null>(null);
  const [isConfirmKachiOpen, setIsConfirmKachiOpen] = useState(false);
  const [pendingSabhaType, setPendingSabhaType] = useState<SabhaTypeT | null>(null);

  // Edit Form State
  const [nameGu, setNameGu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [defaultWeekday, setDefaultWeekday] = useState<number>(3);
  const [defaultStartTime, setDefaultStartTime] = useState('21:00');
  const [defaultEndTime, setDefaultEndTime] = useState('22:30');
  const [venueGu, setVenueGu] = useState('');
  const [sabhaType, setSabhaType] = useState<SabhaTypeT>('pakki');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openEditSheet = (sabha: SabhaRow) => {
    setSelectedSabha(sabha);
    setNameGu(sabha.name_gu);
    setNameEn(sabha.name_en);
    setDefaultWeekday(sabha.default_weekday);
    setDefaultStartTime(sabha.default_start_time.slice(0, 5));
    setDefaultEndTime(sabha.default_end_time.slice(0, 5));
    setVenueGu(sabha.venue_gu || '');
    setSabhaType(sabha.sabha_type);
    setIsActive(sabha.is_active);
    setFormError(null);
  };

  const handleSabhaTypeChange = (newType: SabhaTypeT) => {
    if (newType === 'kachi' && sabhaType === 'pakki') {
      setPendingSabhaType('kachi');
      setIsConfirmKachiOpen(true);
    } else {
      setSabhaType(newType);
    }
  };

  const confirmKachiChange = () => {
    if (pendingSabhaType) {
      setSabhaType(pendingSabhaType);
    }
    setIsConfirmKachiOpen(false);
    setPendingSabhaType(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSabha) return;
    setFormError(null);

    if (!nameGu.trim() || !nameEn.trim()) {
      setFormError(t('errors.required'));
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const updates: Database['public']['Tables']['sabhas']['Update'] = {
        name_gu: nameGu.trim(),
        name_en: nameEn.trim(),
        default_weekday: defaultWeekday,
        default_start_time: `${defaultStartTime}:00`,
        default_end_time: `${defaultEndTime}:00`,
        venue_gu: venueGu.trim() || null,
        is_active: isActive,
      };

      // Only super_admin can update sabha_type
      if (userRole === 'super_admin') {
        updates.sabha_type = sabhaType;
      }

      const { error: updateError } = await supabase
        .from('sabhas')
        .update(updates)
        .eq('id', selectedSabha.id);

      if (updateError) {
        setFormError(updateError.message);
        setLoading(false);
        return;
      }

      setSabhas((prev) =>
        prev.map((s) =>
          s.id === selectedSabha.id
            ? { ...s, ...updates, sabha_type: updates.sabha_type || s.sabha_type }
            : s
        )
      );

      setSelectedSabha(null);
      showToast(t('common.lastUpdated'));
      router.refresh();
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader title={t('admin.sabhaTitle')} backHref="/" />

      <main className="p-4 space-y-4 max-w-[600px] mx-auto">
        <SectionHeader>{t('admin.sabhaTitle')}</SectionHeader>

        {/* Sabha List */}
        <div className="border border-rule rounded-md overflow-hidden bg-sheet">
          {sabhas.map((sabha) => (
            <Row
              key={sabha.id}
              onClick={() => openEditSheet(sabha)}
              className={!sabha.is_active ? 'opacity-50' : ''}
              title={sabha.name_gu}
              subtitle={`${WEEKDAYS_GU[sabha.default_weekday]} • ${formatTimeRangeGu(
                sabha.default_start_time,
                sabha.default_end_time
              )}`}
              right={
                <div className="flex items-center gap-2">
                  {!sabha.is_active && (
                    <Pill label={t('admin.inactivePill')} selected={false} />
                  )}
                  <Pill
                    label={
                      sabha.sabha_type === 'pakki'
                        ? t('sabha.typePakki')
                        : t('sabha.typeKachi')
                    }
                    selected={sabha.sabha_type === 'pakki'}
                  />
                </div>
              }
            />
          ))}
        </div>
      </main>

      {/* Edit Sabha Sheet */}
      <Sheet
        isOpen={!!selectedSabha}
        onClose={() => setSelectedSabha(null)}
        title={t('admin.editSabha')}
      >
        {selectedSabha && (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                {t('sabha.nameGu')}
              </label>
              <input
                type="text"
                required
                value={nameGu}
                onChange={(e) => setNameGu(e.target.value)}
                className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              />
            </div>

            <div>
              <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                {t('sabha.nameEn')}
              </label>
              <input
                type="text"
                required
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              />
            </div>

            {/* 7-Option Weekday Selector */}
            <div>
              <label className="block text-[13px] text-ink-soft mb-1.5 font-medium leading-relaxed">
                {t('admin.defaultWeekday')}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                {WEEKDAYS_GU.map((dayName, idx) => (
                  <button
                    key={dayName}
                    type="button"
                    onClick={() => setDefaultWeekday(idx)}
                    className={`h-[48px] px-1 border rounded-md text-[12px] font-medium leading-tight transition-colors ${
                      defaultWeekday === idx
                        ? 'bg-kumkum-wash border-kumkum text-kumkum'
                        : 'bg-transparent border-rule text-ink hover:border-rule-strong'
                    }`}
                  >
                    {dayName}
                  </button>
                ))}
              </div>
            </div>

            {/* Start and End Times */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                  {t('admin.defaultTimes')} (શરૂઆતી)
                </label>
                <input
                  type="time"
                  required
                  value={defaultStartTime}
                  onChange={(e) => setDefaultStartTime(e.target.value)}
                  className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
                />
              </div>
              <div>
                <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                  (પૂરો)
                </label>
                <input
                  type="time"
                  required
                  value={defaultEndTime}
                  onChange={(e) => setDefaultEndTime(e.target.value)}
                  className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
                />
              </div>
            </div>

            {/* Warning line under weekday and time fields */}
            <p className="text-[13px] text-ink-faint leading-relaxed pt-0.5">
              {t('admin.defaultChangeWarning')}
            </p>

            {/* Venue */}
            <div>
              <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
                {t('admin.venue')}
              </label>
              <input
                type="text"
                value={venueGu}
                onChange={(e) => setVenueGu(e.target.value)}
                className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
                placeholder="સ્થળ"
              />
            </div>

            {/* Sabha Type Selector — SUPER ADMIN ONLY */}
            {userRole === 'super_admin' && (
              <div>
                <label className="block text-[13px] text-ink-soft mb-1.5 font-medium leading-relaxed">
                  {t('admin.sabhaType')}
                </label>
                <div className="flex gap-3">
                  <Pill
                    label={t('sabha.typePakki')}
                    selected={sabhaType === 'pakki'}
                    onClick={() => handleSabhaTypeChange('pakki')}
                  />
                  <Pill
                    label={t('sabha.typeKachi')}
                    selected={sabhaType === 'kachi'}
                    onClick={() => handleSabhaTypeChange('kachi')}
                  />
                </div>
              </div>
            )}

            {/* Is Active Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`w-full h-[48px] border text-[15px] font-semibold rounded-md flex items-center justify-center transition-colors ${
                  isActive
                    ? 'border-kumkum text-kumkum hover:bg-kumkum-wash'
                    : 'border-rule-strong text-ink hover:bg-paper'
                }`}
              >
                {isActive ? t('admin.deactivate') : t('admin.activate')}
              </button>
            </div>

            {formError && (
              <div className="text-[14px] text-kumkum leading-relaxed font-medium">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
            >
              {loading ? t('common.saving') : t('common.save')}
            </button>
          </form>
        )}
      </Sheet>

      {/* Confirmation Dialog for Changing to Kachi Sabha */}
      <Sheet
        isOpen={isConfirmKachiOpen}
        onClose={() => {
          setIsConfirmKachiOpen(false);
          setPendingSabhaType(null);
        }}
        title={t('admin.sabhaType')}
      >
        <div className="space-y-4">
          <p className="text-[14px] text-ink leading-relaxed">
            {t('admin.kachiSabhaWarning')}
          </p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirmKachiOpen(false);
                setPendingSabhaType(null);
              }}
              className="flex-1 h-[48px] border border-rule text-ink text-[15px] font-medium rounded-md flex items-center justify-center transition-colors hover:bg-paper"
            >
              {t('common.cancel')}
            </button>

            <button
              type="button"
              onClick={confirmKachiChange}
              className="flex-1 h-[48px] bg-kumkum text-white text-[15px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95"
            >
              {t('common.confirm')}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
