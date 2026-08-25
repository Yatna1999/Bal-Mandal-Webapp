'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { t } from '@/lib/i18n';

export default function FirstPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage(t('errors.required'));
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage(t('errors.saveFailed'));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Update auth user password
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (authError) {
        setErrorMessage(t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      // 2. Clear must_change_password flag
      const { error: dbError } = await supabase
        .from('karyakars')
        .update({ must_change_password: false })
        .eq('id', user.id);

      if (dbError) {
        setErrorMessage(t('errors.saveFailed'));
        setLoading(false);
        return;
      }

      router.push('/');
      router.refresh();
    } catch {
      setErrorMessage(t('errors.network'));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-[380px]">
        {/* Header & Description */}
        <h1 className="font-display text-[24px] text-ink leading-relaxed text-center mb-2">
          {t('auth.mustChangeTitle')}
        </h1>
        <p className="text-[14px] text-ink-soft leading-relaxed text-center mb-8">
          {t('auth.mustChangeBody')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[13px] text-ink-soft mb-1.5 leading-relaxed font-medium">
              {t('auth.newPassword')}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder={t('auth.newPassword')}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-soft mb-1.5 leading-relaxed font-medium">
              {t('auth.confirmPassword')}
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder={t('auth.confirmPassword')}
              autoComplete="new-password"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-[14px] text-kumkum leading-relaxed font-medium pt-1">
              {errorMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] mt-2 bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.saving') : t('auth.changePassword')}
          </button>
        </form>
      </div>
    </main>
  );
}
