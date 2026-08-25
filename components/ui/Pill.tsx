'use client';

export function Pill({
  label,
  selected = false,
  onClick,
  disabled = false,
  className = '',
}: {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const isBtn = !!onClick;
  const Tag = isBtn ? 'button' : 'span';

  const baseStyles = `inline-flex items-center justify-center min-h-[48px] px-3.5 border rounded-md text-[12px] font-medium leading-relaxed transition-colors ${
    selected
      ? 'bg-kumkum-wash border-kumkum text-kumkum'
      : 'bg-transparent border-rule text-ink'
  } ${isBtn ? 'cursor-pointer hover:border-rule-strong disabled:opacity-50 disabled:cursor-not-allowed' : ''} ${className}`;

  return (
    <Tag
      type={isBtn ? 'button' : undefined}
      onClick={onClick}
      disabled={disabled}
      className={baseStyles}
    >
      {label}
    </Tag>
  );
}
