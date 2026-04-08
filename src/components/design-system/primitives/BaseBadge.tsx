import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { radius } from '../tokens';

interface BaseBadgeProps {
  children: React.ReactNode;
  variant?:
    | 'default'
    | 'secondary'
    | 'destructive'
    | 'outline'
    | 'success'
    | 'warning';
  className?: string;
}

export function BaseBadge({
  children,
  variant = 'default',
  className,
}: BaseBadgeProps) {
  // Map custom variants to tailwind classes if needed, or rely on shadcn variants + strict overrides
  const variantStyles = {
    success:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-transparent',
    warning:
      'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-transparent',
    // default shadcn variants handled by component or additional logic
    default: '',
    secondary: '',
    destructive: '',
    outline: '',
  };

  const isCustom = variant === 'success' || variant === 'warning';

  if (isCustom) {
    return (
      <div
        className={cn(
          'inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          radius.badge,
          variantStyles[variant],
          className
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <Badge variant={variant as any} className={cn(radius.badge, className)}>
      {children}
    </Badge>
  );
}
