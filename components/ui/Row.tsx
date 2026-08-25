import Link from 'next/link';

export function Row({
  left,
  title,
  subtitle,
  right,
  href,
  active = false,
  onClick,
  className = '',
}: {
  left?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  href?: string;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const baseClasses = `flex items-center justify-between min-h-[48px] px-4 py-2 border-b border-rule transition-colors ${
    active ? 'bg-kumkum-wash border-l-[3px] border-l-kumkum pl-[13px]' : 'bg-transparent'
  } ${className}`;

  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {left && <div className="shrink-0 flex items-center">{left}</div>}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-ink leading-relaxed truncate">
            {title}
          </div>
          {subtitle && (
            <div className="text-[13px] text-ink-soft leading-relaxed truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {right && <div className="shrink-0 flex items-center ml-3">{right}</div>}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={baseClasses}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${baseClasses}`}>
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}
