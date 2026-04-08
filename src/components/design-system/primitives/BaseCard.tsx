import { cn } from '@/lib/utils';
import { padding, radius, shadow } from '../tokens';

interface BaseCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function BaseCard({
  children,
  className,
  padding: paddingProp = 'md',
  ...props
}: BaseCardProps) {
  const paddingClass = {
    none: '',
    sm: 'p-3',
    md: padding.card, // Default from tokens
    lg: 'p-8',
  }[paddingProp];

  return (
    <div
      className={cn(
        'bg-card text-card-foreground border border-border/50',
        radius.card,
        shadow.card,
        paddingClass,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
