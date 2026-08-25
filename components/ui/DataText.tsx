export function DataText({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`font-data [font-variant-numeric:tabular-nums] ${className}`}>
      {children}
    </span>
  );
}
