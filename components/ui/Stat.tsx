import { SectionHeader } from './SectionHeader';

export function Stat({
  value,
  label,
  className = '',
}: {
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-start px-4 py-2 ${className}`}>
      <div className="font-data text-[28px] font-medium text-ink leading-none [font-variant-numeric:tabular-nums]">
        {value}
      </div>
      <div className="text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint mt-1.5 leading-relaxed">
        {label}
      </div>
    </div>
  );
}

export function StatGroup({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center divide-x divide-rule border-y border-rule py-2 ${className}`}>
      {children}
    </div>
  );
}
