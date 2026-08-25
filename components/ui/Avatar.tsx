'use client';

import Image from 'next/image';

export function Avatar({
  src,
  name,
  size = 32,
  className = '',
}: {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const initial = name ? name.trim().charAt(0) : 'બ';

  if (src) {
    return (
      <div
        className={`relative rounded-full overflow-hidden shrink-0 bg-sheet border border-rule ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src={src}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full shrink-0 bg-indigo-wash border border-indigo text-indigo font-semibold flex items-center justify-center text-[13px] ${className}`}
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}
