'use client';

import { useState, useRef } from 'react';
import { useBalakPhotoUrl } from '@/lib/hooks/useBalakPhotoUrl';
import { uploadBalakPhoto } from '@/lib/photo';
import { t } from '@/lib/i18n';

export function PhotoPicker({
  photoPath: initialPhotoPath,
  vistarId,
  balakId,
  onPhotoUploaded,
  disabled = false,
}: {
  photoPath?: string | null;
  vistarId: string;
  balakId: string;
  onPhotoUploaded?: (newPhotoPath: string) => void;
  disabled?: boolean;
}) {
  const [photoPath, setPhotoPath] = useState<string | null>(initialPhotoPath || null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: signedUrl } = useBalakPhotoUrl(photoPath);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setLoading(true);

    try {
      const newPath = await uploadBalakPhoto(vistarId, balakId, file);
      setPhotoPath(newPath);
      if (onPhotoUploaded) {
        onPhotoUploaded(newPath);
      }
    } catch (err) {
      console.error('Photo processing/upload failed:', err);
      setErrorMsg(t('errors.photoTooLarge'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || loading}
      />

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => fileInputRef.current?.click()}
        className="relative w-[96px] h-[96px] rounded-full flex flex-col items-center justify-center bg-sheet transition-opacity hover:opacity-90 disabled:opacity-50 group focus:outline-none focus:ring-2 focus:ring-indigo"
      >
        {signedUrl ? (
          /* Filled state */
          <img
            src={signedUrl}
            alt={t('balak.photo')}
            className="w-[96px] h-[96px] rounded-full object-cover border border-rule"
          />
        ) : (
          /* Empty state */
          <div className="w-[96px] h-[96px] rounded-full border-[1.5px] border-dashed border-ink-faint flex flex-col items-center justify-center p-2 text-ink-soft">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mb-1"
            >
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
              <circle cx="12" cy="13" r="3" />
            </svg>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 rounded-full bg-black/50 text-white text-[12px] font-medium flex items-center justify-center">
            {t('common.saving')}
          </div>
        )}
      </button>

      <span className="text-[13px] text-ink-soft font-medium leading-relaxed">
        {loading
          ? t('common.saving')
          : signedUrl
          ? t('balak.photoChange')
          : t('balak.photoAdd')}
      </span>

      {errorMsg && (
        <span className="text-[12px] text-kumkum font-medium leading-relaxed text-center max-w-[200px]">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
