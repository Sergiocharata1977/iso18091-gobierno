import Image from 'next/image';

interface LogoProps {
  variant?: 'light' | 'dark';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({
  variant = 'light',
  size = 'md',
  showText = true,
  className = '',
}: LogoProps) {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  const iconSizes = {
    xs: 16,
    sm: 24,
    md: 48,
    lg: 64,
  };

  // Width for logo with text (imagen completa)
  const logoWidths = {
    xs: 70,
    sm: 100,
    md: 140,
    lg: 180,
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {showText ? (
        <Image
          src="/logo-completo.png"
          alt="ISO 9001 Quality Management"
          width={logoWidths[size]}
          height={iconSizes[size] * 0.8}
          className="object-contain"
          priority
        />
      ) : (
        <Image
          src={
            variant === 'light'
              ? '/icon-light-32x32.png'
              : '/icon-dark-32x32.png'
          }
          alt="ISO 9001"
          width={iconSizes[size]}
          height={iconSizes[size]}
          className="object-contain"
          priority
        />
      )}
    </div>
  );
}

export default Logo;
