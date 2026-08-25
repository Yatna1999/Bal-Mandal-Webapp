export function SectionHeader({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-faint border-b border-rule-strong pb-1 mb-3 leading-relaxed ${className}`}
    >
      {children}
    </h2>
  );
}
