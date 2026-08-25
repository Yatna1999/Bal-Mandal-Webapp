'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PhotoPicker } from '@/components/balak/PhotoPicker';
import { Chandlo } from '@/components/ui/Chandlo';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { AppHeader } from '@/components/ui/AppHeader';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { cleanMobile } from '@/lib/format';
import { seedAttendanceForBalak } from '@/lib/sessions';
import { uploadBalakPhoto } from '@/lib/photo';
import { t } from '@/lib/i18n';
import type { MediumT, SatsangStatusT, Database } from '@/lib/database.types';

export interface StandardOption {
  code: string;
  label_gu: string;
}

export interface SabhaOption {
  id: string;
  name_gu: string;
}

export interface BalakInitialData {
  id?: string;
  vistar_id: string;
  full_name_gu: string;
  full_name_en: string;
  photo_path?: string | null;
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
  sabha_ids: string[];
  primary_sabha_id: string;
}

export function BalakForm({
  initialData,
  vistarId,
  standards,
  sabhas,
}: {
  initialData?: BalakInitialData;
  vistarId: string;
  standards: StandardOption[];
  sabhas: SabhaOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const isEdit = !!initialData?.id;

  // Form State
  const [photoPath, setPhotoPath] = useState<string | null>(initialData?.photo_path || null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [fullNameGu, setFullNameGu] = useState(initialData?.full_name_gu || '');
  const [fullNameEn, setFullNameEn] = useState(initialData?.full_name_en || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [standardCode, setStandardCode] = useState(initialData?.standard_code || (standards[0]?.code || ''));
  const [medium, setMedium] = useState<MediumT>(initialData?.medium || 'gujarati');
  const [schoolGu, setSchoolGu] = useState(initialData?.school_gu || '');
  const [schoolEn, setSchoolEn] = useState(initialData?.school_en || '');
  const [addressGu, setAddressGu] = useState(initialData?.address_gu || '');
  const [satsangStatus, setSatsangStatus] = useState<SatsangStatusT>(initialData?.satsang_status || 'satsangi');
  const [motherNameGu, setMotherNameGu] = useState(initialData?.mother_name_gu || '');
  const [motherMobile, setMotherMobile] = useState(initialData?.mother_mobile || '');
  const [fatherNameGu, setFatherNameGu] = useState(initialData?.father_name_gu || '');
  const [fatherMobile, setFatherMobile] = useState(initialData?.father_mobile || '');

  const [selectedSabhaIds, setSelectedSabhaIds] = useState<string[]>(initialData?.sabha_ids || []);
  const [primarySabhaId, setPrimarySabhaId] = useState<string>(initialData?.primary_sabha_id || '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Duplicate warning Sheet state
  const [duplicateBalakId, setDuplicateBalakId] = useState<string | null>(null);
  const [isDuplicateSheetOpen, setIsDuplicateSheetOpen] = useState(false);

  // Reaction Rule: Update primary sabha options when sabha_ids changes
  const handleToggleSabha = (sabhaId: string) => {
    setSelectedSabhaIds((prev) => {
      const next = prev.includes(sabhaId)
        ? prev.filter((id) => id !== sabhaId)
        : [...prev, sabhaId];

      if (!next.includes(primarySabhaId)) {
        setPrimarySabhaId(next[0] || '');
      }

      return next;
    });
  };

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!fullNameGu.trim()) errs.full_name_gu = t('errors.required');
    if (!fullNameEn.trim()) errs.full_name_en = t('errors.required');

    if (!dob) {
      errs.dob = t('errors.required');
    } else {
      const d = new Date(dob);
      if (isNaN(d.getTime()) || d > new Date()) {
        errs.dob = t('errors.invalidDate');
      }
    }

    if (!standardCode) errs.standard_code = t('errors.required');
    if (!schoolGu.trim()) errs.school_gu = t('errors.required');
    if (!schoolEn.trim()) errs.school_en = t('errors.required');
    if (!addressGu.trim()) errs.address_gu = t('errors.required');
    if (!motherNameGu.trim()) errs.mother_name_gu = t('errors.required');

    const cMotherMob = cleanMobile(motherMobile);
    if (!cMotherMob || cMotherMob.length !== 10) {
      errs.mother_mobile = t('errors.invalidMobile');
    }

    if (!fatherNameGu.trim()) errs.father_name_gu = t('errors.required');

    const cFatherMob = cleanMobile(fatherMobile);
    if (!cFatherMob || cFatherMob.length !== 10) {
      errs.father_mobile = t('errors.invalidMobile');
    }

    if (selectedSabhaIds.length === 0) {
      errs.sabha_ids = t('errors.required');
    }

    if (!primarySabhaId || !selectedSabhaIds.includes(primarySabhaId)) {
      errs.primary_sabha_id = t('errors.required');
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const checkForDuplicates = async (): Promise<string | null> => {
    if (isEdit) return null; // No duplicate check on edit
    const supabase = createClient();
    const cMother = cleanMobile(motherMobile);
    const cFather = cleanMobile(fatherMobile);
    const nameLower = fullNameEn.trim().toLowerCase();

    const { data: matches } = await supabase
      .from('balako')
      .select('id, full_name_en, mother_mobile, father_mobile')
      .eq('vistar_id', vistarId)
      .eq('status', 'active')
      .ilike('full_name_en', nameLower);

    if (matches && matches.length > 0) {
      const dup = matches.find(
        (m) =>
          cleanMobile(m.mother_mobile) === cMother ||
          cleanMobile(m.father_mobile) === cFather ||
          cleanMobile(m.mother_mobile) === cFather ||
          cleanMobile(m.father_mobile) === cMother
      );
      if (dup) return dup.id;
    }

    return null;
  };

  const executeSave = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const cMotherMob = cleanMobile(motherMobile);
      const cFatherMob = cleanMobile(fatherMobile);

      const balakPayload: Database['public']['Tables']['balako']['Insert'] = {
        vistar_id: vistarId,
        full_name_gu: fullNameGu.trim(),
        full_name_en: fullNameEn.trim(),
        photo_path: photoPath,
        dob,
        standard_code: standardCode,
        medium,
        school_gu: schoolGu.trim(),
        school_en: schoolEn.trim(),
        address_gu: addressGu.trim(),
        satsang_status: satsangStatus,
        mother_name_gu: motherNameGu.trim(),
        mother_mobile: cMotherMob,
        father_name_gu: fatherNameGu.trim(),
        father_mobile: cFatherMob,
        status: 'active',
      };

      let balakId = initialData?.id;

      if (isEdit && balakId) {
        // Step 1: Update balako
        const { error: bErr } = await supabase
          .from('balako')
          .update(balakPayload)
          .eq('id', balakId);

        if (bErr) throw new Error(bErr.message);

        // Step 2: Update balak_sabhas junction
        await supabase.from('balak_sabhas').delete().eq('balak_id', balakId);
      } else {
        // Step 1: Insert balako
        const { data: newBalak, error: bErr } = await supabase
          .from('balako')
          .insert(balakPayload)
          .select('id')
          .single();

        if (bErr || !newBalak) throw new Error(bErr?.message || 'Insert failed');
        balakId = newBalak.id;
      }

      // Step 2: Insert balak_sabhas
      const sabhaRows = selectedSabhaIds.map((sabha_id) => ({
        balak_id: balakId!,
        sabha_id,
        is_primary: sabha_id === primarySabhaId,
      }));

      const { error: bsErr } = await supabase
        .from('balak_sabhas')
        .insert(sabhaRows);

      if (bsErr) {
        // Rollback: If step 2 fails on insert, delete balako row to avoid orphan
        if (!isEdit && balakId) {
          await supabase.from('balako').delete().eq('id', balakId);
        }
        throw new Error(bsErr.message);
      }

      // Step 3: Seed attendance records for upcoming sessions
      // TODO: WO-23 - Seed attendance for newly registered balak
      await seedAttendanceForBalak(balakId!);

      showToast(t('balak.saved'));
      router.push(`/balako/${balakId}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrors({ form: msg || t('errors.saveFailed') });
      showToast(t('errors.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Check duplicate guard
    const dupId = await checkForDuplicates();
    if (dupId) {
      setDuplicateBalakId(dupId);
      setIsDuplicateSheetOpen(true);
      return;
    }

    await executeSave();
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader
        title={isEdit ? t('balak.edit') : t('balak.add')}
        backHref="/balako"
      />

      <main className="p-4 max-w-[600px] mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Field 1: PhotoPicker */}
          <div className="flex flex-col items-center pt-2">
            <label className="text-[13px] text-ink-faint font-medium mb-2">
              {t('balak.photo')}
            </label>
            <PhotoPicker
              photoPath={photoPath}
              vistarId={vistarId}
              balakId={initialData?.id || 'temp-new-balak'}
              onPhotoUploaded={(newPath) => setPhotoPath(newPath)}
            />
          </div>

          {/* Field 2: full_name_gu */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.nameGu')} *
            </label>
            <input
              type="text"
              required
              value={fullNameGu}
              onChange={(e) => setFullNameGu(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="હર્ષદ પટેલ"
            />
            {errors.full_name_gu && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.full_name_gu}
              </p>
            )}
          </div>

          {/* Field 3: full_name_en */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.nameEn')} *
            </label>
            <input
              type="text"
              required
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="Harshad Patel"
            />
            {errors.full_name_en && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.full_name_en}
              </p>
            )}
          </div>

          {/* Field 4: dob */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.dob')} *
            </label>
            <input
              type="date"
              required
              max={new Date().toISOString().split('T')[0]}
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
            />
            {errors.dob && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.dob}
              </p>
            )}
          </div>

          {/* Field 5: standard_code */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.standard')} *
            </label>
            <select
              value={standardCode}
              onChange={(e) => setStandardCode(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            >
              {standards.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.label_gu}
                </option>
              ))}
            </select>
            {errors.standard_code && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.standard_code}
              </p>
            )}
          </div>

          {/* Field 6: medium */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.medium')} *
            </label>
            <select
              value={medium}
              onChange={(e) => setMedium(e.target.value as MediumT)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            >
              <option value="gujarati">{t('medium.gujarati')}</option>
              <option value="english">{t('medium.english')}</option>
              <option value="hindi">{t('medium.hindi')}</option>
              <option value="other">{t('medium.other')}</option>
            </select>
          </div>

          {/* Field 7: school_gu */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.school')} *
            </label>
            <input
              type="text"
              required
              value={schoolGu}
              onChange={(e) => setSchoolGu(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="શાળાનું નામ"
            />
            {errors.school_gu && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.school_gu}
              </p>
            )}
          </div>

          {/* Field 8: school_en */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.schoolEn')} *
            </label>
            <input
              type="text"
              required
              value={schoolEn}
              onChange={(e) => setSchoolEn(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="School Name"
            />
            {errors.school_en && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.school_en}
              </p>
            )}
          </div>

          {/* Field 9: address_gu */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.address')} *
            </label>
            <textarea
              required
              rows={3}
              value={addressGu}
              onChange={(e) => setAddressGu(e.target.value)}
              className="w-full min-h-[96px] p-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="ઘરનું પૂરૂં સરનામું"
            />
            {errors.address_gu && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.address_gu}
              </p>
            )}
          </div>

          {/* Field 10: satsang_status */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-2">
              {t('balak.satsangStatus')} *
            </label>
            <div className="space-y-2 bg-sheet p-3 border border-rule rounded-md">
              {(['satsangi', 'binsatsangi', 'gunbhavi'] as SatsangStatusT[]).map((status) => (
                <div key={status} className="flex items-center gap-3">
                  <Chandlo
                    state={satsangStatus === status ? 'done' : 'not-done'}
                    label={t(`satsang.${status}` as Parameters<typeof t>[0])}
                    onClick={() => setSatsangStatus(status)}
                  />
                  <span
                    onClick={() => setSatsangStatus(status)}
                    className="text-[15px] text-ink font-medium leading-relaxed cursor-pointer"
                  >
                    {t(`satsang.${status}` as Parameters<typeof t>[0])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Field 11: mother_name_gu */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.motherName')} *
            </label>
            <input
              type="text"
              required
              value={motherNameGu}
              onChange={(e) => setMotherNameGu(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            />
            {errors.mother_name_gu && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.mother_name_gu}
              </p>
            )}
          </div>

          {/* Field 12: mother_mobile */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.motherMobile')} *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={motherMobile}
              onChange={(e) => setMotherMobile(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="9876543210"
            />
            {errors.mother_mobile && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.mother_mobile}
              </p>
            )}
          </div>

          {/* Field 13: father_name_gu */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.fatherName')} *
            </label>
            <input
              type="text"
              required
              value={fatherNameGu}
              onChange={(e) => setFatherNameGu(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            />
            {errors.father_name_gu && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.father_name_gu}
              </p>
            )}
          </div>

          {/* Field 14: father_mobile */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-1">
              {t('balak.fatherMobile')} *
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={fatherMobile}
              onChange={(e) => setFatherMobile(e.target.value)}
              className="w-full h-[48px] px-3.5 bg-sheet border border-rule rounded-md text-[15px] text-ink font-data leading-relaxed focus:outline-none focus:border-indigo"
              placeholder="9876543210"
            />
            {errors.father_mobile && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.father_mobile}
              </p>
            )}
          </div>

          {/* Field 15: sabha_ids */}
          <div>
            <label className="block text-[13px] text-ink-faint font-medium mb-2">
              {t('balak.sabhas')} *
            </label>
            <div className="flex flex-wrap gap-2">
              {sabhas.map((s) => {
                const selected = selectedSabhaIds.includes(s.id);
                return (
                  <Pill
                    key={s.id}
                    label={s.name_gu}
                    selected={selected}
                    onClick={() => handleToggleSabha(s.id)}
                  />
                );
              })}
            </div>
            {errors.sabha_ids && (
              <p className="text-[13px] text-kumkum mt-1 font-medium">
                {errors.sabha_ids}
              </p>
            )}
          </div>

          {/* Field 16: primary_sabha_id */}
          {selectedSabhaIds.length > 0 && (
            <div>
              <label className="block text-[13px] text-ink-faint font-medium mb-2">
                {t('balak.primarySabha')} *
              </label>
              <div className="flex flex-wrap gap-2">
                {sabhas
                  .filter((s) => selectedSabhaIds.includes(s.id))
                  .map((s) => (
                    <Pill
                      key={s.id}
                      label={s.name_gu}
                      selected={primarySabhaId === s.id}
                      onClick={() => setPrimarySabhaId(s.id)}
                    />
                  ))}
              </div>
              {errors.primary_sabha_id && (
                <p className="text-[13px] text-kumkum mt-1 font-medium">
                  {errors.primary_sabha_id}
                </p>
              )}
            </div>
          )}

          {errors.form && (
            <div className="text-[14px] text-kumkum font-medium leading-relaxed">
              {errors.form}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('balak.saveBtn')}
          </button>
        </form>
      </main>

      {/* Duplicate Balak Warning Sheet */}
      <Sheet
        isOpen={isDuplicateSheetOpen}
        onClose={() => setIsDuplicateSheetOpen(false)}
        title={t('errors.duplicateBalak')}
      >
        <div className="space-y-4">
          <p className="text-[14px] text-ink leading-relaxed">
            {t('errors.duplicateBalak')}
          </p>

          {duplicateBalakId && (
            <div className="p-3 bg-paper border border-rule rounded-md">
              <Link
                href={`/balako/${duplicateBalakId}`}
                className="text-[14px] text-indigo font-medium underline leading-relaxed"
                target="_blank"
              >
                {t('balak.profile')}
              </Link>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsDuplicateSheetOpen(false)}
              className="flex-1 h-[48px] border border-rule text-ink text-[15px] font-medium rounded-md flex items-center justify-center transition-colors hover:bg-paper"
            >
              {t('common.cancel')}
            </button>

            <button
              type="button"
              onClick={async () => {
                setIsDuplicateSheetOpen(false);
                await executeSave();
              }}
              className="flex-1 h-[48px] bg-kumkum text-white text-[15px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95"
            >
              {t('balak.override')}
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
