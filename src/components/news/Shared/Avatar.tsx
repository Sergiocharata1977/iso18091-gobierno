'use client';

import Image from 'next/image';

interface AvatarProps {
  src?: string;
  alt: string;
  size?: 'sm' | 'md' | 'lg';
  initials?: string;
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export function Avatar({
  src,
  alt,
  size = 'md',
  initials,
  className = '',
}: AvatarProps) {
  const sizeClass = sizeClasses[size];

  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        height={size === 'sm' ? 32 : size === 'md' ? 40 : 48}
        className={`rounded-full object-cover ${sizeClass} ${className}`}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center font-semibold text-white ${sizeClass} ${className}`}
    >
      {initials}
    </div>
  );
}
