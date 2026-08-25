'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { usernameToEmail } from '@/lib/auth';
import { t } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const email = usernameToEmail(username);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        setErrorMessage(t('auth.wrongCredentials'));
        setLoading(false);
        return;
      }

      // Fetch karyakar details
      const { data: karyakar, error: kError } = await supabase
        .from('karyakars')
        .select('is_active, must_change_password')
        .eq('id', data.user.id)
        .single();

      if (kError || !karyakar || !karyakar.is_active) {
        await supabase.auth.signOut();
        setErrorMessage(t('auth.accountInactive'));
        setLoading(false);
        return;
      }

      if (karyakar.must_change_password) {
        router.push('/first-password');
      } else {
        router.push('/');
      }
      router.refresh();
    } catch {
      setErrorMessage(t('errors.network'));
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-paper px-4 py-12">
      <div className="w-full max-w-[380px] text-center">
        {/* Wordmark & Vistar Subtitle */}
        <h1 className="font-display text-[32px] text-ink leading-relaxed mb-1">
          {t('app.name')}
        </h1>
        <p className="text-[13px] text-ink-faint leading-relaxed mb-8">
          {t('app.vistar')}
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="text-left space-y-4">
          <div>
            <label className="block text-[13px] text-ink-soft mb-1.5 leading-relaxed font-medium">
              {t('auth.username')}
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder={t('auth.username')}
              autoComplete="username"
              autoCapitalize="none"
            />
          </div>

          <div>
            <label className="block text-[13px] text-ink-soft mb-1.5 leading-relaxed font-medium">
              {t('auth.password')}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-[48px] px-3 bg-sheet border border-rule rounded-md text-[15px] text-ink leading-relaxed focus:outline-none focus:border-indigo"
              placeholder={t('auth.password')}
              autoComplete="current-password"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-[14px] text-kumkum leading-relaxed font-medium pt-1">
              {errorMessage}
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[52px] mt-2 bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
          >
            {loading ? t('common.loading') : t('auth.loginBtn')}
          </button>
        </form>
      </div>
    </main>
  );
}
