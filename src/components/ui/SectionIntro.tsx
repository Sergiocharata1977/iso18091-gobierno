import { cn } from '@/lib/utils';

interface SectionIntroProps {
  title: string;
  eyebrow?: string;
  description?: string;
  compact?: boolean;
  className?: string;
}

export function SectionIntro({
  title,
  eyebrow,
  description,
  compact = false,
  className,
}: SectionIntroProps) {
  return (
    <div className={cn('space-y-1.5', compact && 'space-y-1', className)}>
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {eyebrow}
        </p>
      )}

      <div className="space-y-1">
        <h2
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
          )}
        >
          {title}
        </h2>

        {description && (
          <p
            className={cn(
              'max-w-3xl text-muted-foreground',
              compact ? 'text-sm' : 'text-sm sm:text-[15px]'
            )}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
