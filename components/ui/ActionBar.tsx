'use client';

export function ActionBar({
  label,
  onClick,
  disabled = false,
  loading = false,
  left,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  left?: React.ReactNode;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-sheet border-t border-rule p-3 max-w-[600px] mx-auto pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-center gap-3">
        {left && (
          <div className="shrink-0 font-data text-[14px] font-medium text-ink [font-variant-numeric:tabular-nums] truncate max-w-[45%]">
            {left}
          </div>
        )}
        <button
          type="button"
          onClick={onClick}
          disabled={disabled || loading}
          className="flex-1 h-[52px] bg-kumkum text-white text-[16px] font-semibold rounded-md flex items-center justify-center transition-opacity hover:opacity-95 disabled:opacity-50"
        >
          {loading ? '...' : label}
        </button>
      </div>
    </div>
  );
}
