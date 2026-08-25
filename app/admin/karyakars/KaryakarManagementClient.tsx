'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppHeader } from '@/components/ui/AppHeader';
import { Row } from '@/components/ui/Row';
import { Pill } from '@/components/ui/Pill';
import { Sheet } from '@/components/ui/Sheet';
import { Chandlo } from '@/components/ui/Chandlo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { DataText } from '@/components/ui/DataText';
import { useToast } from '@/components/ui/Toast';
import { t } from '@/lib/i18n';
import { cleanMobile } from '@/lib/format';
import type { RoleT } from '@/lib/database.types';

export interface KaryakarWithSabhas {
  id: string;
  full_name_gu: string;
  full_name_en: string;
  mobile: string;
  role: RoleT;
  is_active: boolean;
  must_change_password: boolean;
  sabha_ids: string[];
}

export interface SabhaOption {
  id: string;
  name_gu: string;
}

const ROLES: RoleT[] = [
  'super_admin',
  'agresar',
  'nirikshak',
  'sanchalak',
  'sah_sanchalak',
];

export function KaryakarManagementClient({
  initialKaryakars,
  sabhas,
}: {
  initialKaryakars: KaryakarWithSabhas[];
  sabhas: SabhaOption[];
}) {
  const router = useRouter();
  const { showToast } = useToast();

  const [karyakars, setKaryakars] = useState<KaryakarWithSabhas[]>(initialKaryakars);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedKaryakar, setSelectedKaryakar] = useState<KaryakarWithSabhas | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Add Form State
  const [fullNameGu, setFullNameGu] = useState('');
  const [fullNameEn, setFullNameEn] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<RoleT>('sanchalak');
  const [selectedSabhaIds, setSelectedSabhaIds] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetAddForm = () => {
    setFullNameGu('');
    setFullNameEn('');
    setMobile('');
    setUsername('');
    setRole('sanchalak');
    setSelectedSabhaIds([]);
    setFormError(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cMobile = cleanMobile(mobile);
    if (!cMobile || cMobile.length !== 10) {
      setFormError(t('errors.invalidMobile'));
      return;
    }

    const cUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!cUsername) {
      setFormError(t('errors.required'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/karyakars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name_gu: fullNameGu.trim(),
          full_name_en: fullNameEn.trim(),
          mobile: cMobile,
          username: cUsername,
          role,
          sabha_ids: selectedSabhaIds,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setFormError(data.error || t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      setIsAddOpen(false);
      resetAddForm();
      setTempPassword(data.tempPassword);
      router.refresh();
      showToast(t('admin.createdSuccess'));
    } catch {
      setFormError(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (karyakar: KaryakarWithSabhas) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/karyakars/${karyakar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_active',
          is_active: !karyakar.is_active,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setKaryakars((prev) =>
          prev.map((k) =>
            k.id === karyakar.id ? { ...k, is_active: !k.is_active } : k
          )
        );
        setSelectedKaryakar(null);
        showToast(t('common.lastUpdated'));
        router.refresh();
      } else {
        showToast(t('errors.saveFailed'));
      }
    } catch {
      showToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (karyakar: KaryakarWithSabhas) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/karyakars/${karyakar.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_password' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedKaryakar(null);
        setTempPassword(data.tempPassword);
      } else {
        showToast(t('errors.saveFailed'));
      }
    } catch {
      showToast(t('errors.network'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast(t('admin.passwordCopied'));
    setTimeout(() => setCopied(false), 2000);
  };

  const getSabhaNames = (ids: string[]) => {
    const names = sabhas
      .filter((s) => ids.includes(s.id))
      .map((s) => s.name_gu);
    return names.length > 0 ? names.join(', ') : 'કોઈ સભા નથી';
  };

  return (
    <div className="min-h-screen bg-paper pb-[116px]">
      <AppHeader
        title={t('admin.title')}
        backHref="/"
        action={
          <button
            type="button"
            onClick={() => {
              resetAddForm();
              setIsAddOpen(true);
            }}
            className="h-[36px] px-3 bg-kumkum text-white text-[13px] font-semibold rounded-md inline-flex items-center justify-center transition-opacity hover:opacity-95"
          >
            {t('admin.add')}
          </button>
        }
      />

      <main className="p-4 space-y-4 max-w-[600px] mx-auto">
        <SectionHeader>{t('common.karyakars')}</SectionHeader>

        {/* List of Karyakars */}
        <div className="border border-rule rounded-md overflow-hidden bg-sheet">
          {karyakars.map((k) => (
            <Row
              key={k.id}
              onClick={() => setSelectedKaryakar(k)}
              className={!k.is_active ? 'opacity-50' : ''}
              title={k.full_name_gu}
              subtitle={`${t(`roles.${k.role}` as Parameters<typeof t>[0])} • ${getSabhaNames(k.sabha_ids)}`}
              right={
                !k.is_active ? (
                  <Pill label={t('admin.inactivePill')} selected={false} />
                ) : undefined
              }
            />
          ))}
        </div>
      </main>

      {/* Creation Sheet */}
      <Sheet
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={t('admin.add')}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
              {t('balak.nameGu')}
            </label>
            <input
              type="text"
              required
              value={fullNameGu}
              onChange={(e) => setFullNameGu(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
              {t('balak.nameEn')}
            </label>
            <input
              type="text"
              required
              value={fullNameEn}
              onChange={(e) => setFullNameEn(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
              {t('balak.fatherMobile')}
            </label>
            <input
              type="tel"
              required
              maxLength={10}
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed font-data focus:outline-none focus:border-indigo"
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-soft mb-1 font-medium leading-relaxed">
              {t('admin.username')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed font-data focus:outline-none focus:border-indigo"
              placeholder="yatna"
            />
          </div>

          {/* Role selection using Chandlo options */}
          <div>
            <label className="block text-[13px] text-ink-soft mb-2 font-medium leading-relaxed">
              {t('admin.selectRole')}
            </label>
            <div className="space-y-2 bg-paper p-3 border border-rule rounded-md">
              {ROLES.map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <Chandlo
                    state={role === r ? 'done' : 'not-done'}
                    label={t(`roles.${r}` as Parameters<typeof t>[0])}
                    onClick={() => setRole(r)}
                  />
                  <span
                    onClick={() => setRole(r)}
                    className="text-[14px] text-ink cursor-pointer font-medium leading-relaxed"
                  >
                    {t(`roles.${r}` as Parameters<typeof t>[0])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sabhas Multi-select */}
          <div>
            <label className="block text-[13px] text-ink-soft mb-2 font-medium leading-relaxed">
              {t('admin.sabhas')}
            </label>
            <div className="flex flex-wrap gap-2">
              {sabhas.map((s) => {
                const selected = selectedSabhaIds.includes(s.id);
                return (
                  <Pill
                    key={s.id}
                    label={s.name_gu}
                    selected={selected}
                    onClick={() => {
                      if (selected) {
                        setSelectedSabhaIds((prev) => prev.filter((id) => id !== s.id));
                      } else {
                        setSelectedSabhaIds((prev) => [...prev, s.id]);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {formError && (
            <div className="text-[14px] text-kumkum leading-relaxed font-medium">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] mt-4 bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </Sheet>

      {/* Edit / Detail Sheet */}
      <Sheet
        isOpen={!!selectedKaryakar}
        onClose={() => setSelectedKaryakar(null)}
        title={selectedKaryakar?.full_name_gu}
      >
        {selectedKaryakar && (
          <div className="space-y-6">
            <div className="bg-paper p-4 border border-rule rounded-md space-y-2">
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft">{t('common.role')}:</span>
                <span className="font-semibold text-ink">
                  {t(`roles.${selectedKaryakar.role}` as Parameters<typeof t>[0])}
                </span>
              </div>
              <div className="flex justify-between text-[14px]">
                <span className="text-ink-soft">{t('admin.sabhas')}:</span>
                <span className="font-medium text-ink">
                  {getSabhaNames(selectedKaryakar.sabha_ids)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleResetPassword(selectedKaryakar)}
                disabled={loading}
                className="w-full h-[48px] border border-indigo text-indigo bg-transparent text-[15px] font-semibold rounded-md flex items-center justify-center transition-colors hover:bg-indigo-wash disabled:opacity-50"
              >
                {t('admin.resetPassword')}
              </button>

              <button
                type="button"
                onClick={() => handleToggleActive(selectedKaryakar)}
                disabled={loading}
                className={`w-full h-[48px] border text-[15px] font-semibold rounded-md flex items-center justify-center transition-colors disabled:opacity-50 ${
                  selectedKaryakar.is_active
                    ? 'border-kumkum text-kumkum hover:bg-kumkum-wash'
                    : 'border-rule-strong text-ink hover:bg-paper'
                }`}
              >
                {selectedKaryakar.is_active
                  ? t('admin.deactivate')
                  : t('admin.activate')}
              </button>
            </div>
          </div>
        )}
      </Sheet>

      {/* Temp Password Display Sheet */}
      <Sheet
        isOpen={!!tempPassword}
        onClose={() => setTempPassword(null)}
        title={t('admin.tempPasswordTitle')}
      >
        <div className="space-y-4 text-center">
          <p className="text-[14px] text-kumkum font-medium leading-relaxed">
            {t('admin.tempPasswordNotice')}
          </p>

          <div className="bg-paper border border-rule rounded-md p-4">
            <DataText className="text-[24px] font-semibold text-ink tracking-wider">
              {tempPassword}
            </DataText>
          </div>

          <button
            type="button"
            onClick={() => tempPassword && copyToClipboard(tempPassword)}
            className="w-full h-[48px] bg-kumkum text-white text-[15px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95"
          >
            {copied ? t('admin.passwordCopied') : t('admin.copyPassword')}
          </button>
        </div>
      </Sheet>
    </div>
  );
}
