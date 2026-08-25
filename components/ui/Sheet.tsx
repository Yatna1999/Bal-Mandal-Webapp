'use client';

import { useEffect, useRef } from 'react';

export function Sheet({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[600px] bg-sheet border-t border-rule rounded-t-[12px] p-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
      >
        <div className="w-12 h-1 bg-rule-strong rounded-full mx-auto mb-4" />
        {title && (
          <h3 className="font-display text-[20px] text-ink leading-relaxed mb-4">
            {title}
          </h3>
        )}
        {children}
      </div>
    </div>
  );
}
