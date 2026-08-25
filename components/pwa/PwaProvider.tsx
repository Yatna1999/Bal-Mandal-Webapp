'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { t } from '@/lib/i18n';

interface PwaContextType {
  isOffline: boolean;
  canInstall: boolean;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isOffline: false,
  canInstall: false,
  promptInstall: async () => {},
});

export const usePwa = () => useContext(PwaContext);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissBanner, setDismissBanner] = useState(false);

  useEffect(() => {
    // 1. Register Service Worker on mount
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[SW] Registered successfully:', reg.scope);
        })
        .catch((err) => {
          console.error('[SW] Registration failed:', err);
        });
    }

    // 2. Offline / Online event listeners
    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 3. Capture beforeinstallprompt event
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  return (
    <PwaContext.Provider
      value={{
        isOffline,
        canInstall: !!deferredPrompt,
        promptInstall,
      }}
    >
      {/* Offline Banner strip fixed under header when offline */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-kumkum text-white text-[13px] font-semibold py-1.5 px-4 text-center border-b border-rule flex items-center justify-center gap-2">
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
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>{t('errors.network')}</span>
        </div>
      )}

      {/* Floating Install App Banner when browser detects installability */}
      {deferredPrompt && !dismissBanner && (
        <div className="fixed bottom-16 left-4 right-4 z-50 max-w-[500px] mx-auto bg-sheet border border-rule-strong rounded-md p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-kumkum flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full bg-paper" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-[13px] text-ink truncate">બાળ સભા એપ ઇન્સ્ટોલ કરો</div>
              <div className="text-[11px] text-ink-soft truncate">હોમ સ્ક્રીન પર ઉમેરીને ઝડપથી વાપરો</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={promptInstall}
              className="h-8 px-3 bg-kumkum text-white text-[12px] font-semibold rounded-sm transition-colors hover:bg-kumkum-deep"
            >
              ઇન્સ્ટોલ
            </button>
            <button
              onClick={() => setDismissBanner(true)}
              className="w-7 h-7 text-ink-faint hover:text-ink flex items-center justify-center rounded-sm text-[14px]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {children}
    </PwaContext.Provider>
  );
}
