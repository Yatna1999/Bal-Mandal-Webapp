'use client';

export type ChandloState = 'done' | 'not-done' | 'pending';

export function Chandlo({
  state,
  size = 20,
  label,
  onClick,
  disabled,
}: {
  state: ChandloState;
  size?: number;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const isBtn = !!onClick;
  const Tag = isBtn ? 'button' : 'span';

  return (
    <Tag
      type={isBtn ? 'button' : undefined}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isBtn ? state === 'done' : undefined}
      className="inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ width: 48, height: 48 }} /* tap target, always 48 */
    >
      <span
        data-state={state}
        className="chandlo block shrink-0"
        style={{ width: size, height: size }}
      />
    </Tag>
  );
}
