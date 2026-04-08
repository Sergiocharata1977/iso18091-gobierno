import { cn } from '@/lib/utils';

interface PageIntroProps {
  title: string;
  eyebrow?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function PageIntro({
  title,
  eyebrow,
  description,
  compact = false,
  className,
}: PageIntroProps) {
  return (
    <div className={cn('space-y-2', compact && 'space-y-1.5', className)}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground sm:text-xs">
          {eyebrow}
        </p>
      )}

      <div className="space-y-1">
        <h1
          className={cn(
            'max-w-4xl text-balance font-semibold tracking-tight text-foreground',
            compact ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl'
          )}
        >
          {title}
        </h1>

        {description && (
          <p
            className={cn(
              'max-w-3xl text-pretty text-muted-foreground',
              compact ? 'text-sm sm:text-[15px]' : 'text-sm sm:text-base'
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
