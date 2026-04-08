'use client';

import { cn } from '@/lib/utils';
import { badgeColors, type BadgeColor } from '../tokens/colors';

interface InlineTag {
  label: string;
  color?: BadgeColor;
}

interface InlineTagListProps {
  tags: InlineTag[];
  /** Max tags to show before "+N more" */
  maxVisible?: number;
  className?: string;
}

export function InlineTagList({
  tags,
  maxVisible = 5,
  className,
}: InlineTagListProps) {
  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <div className={cn('flex items-center gap-1.5 flex-wrap', className)}>
      {visible.map((tag, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            tag.color ? badgeColors[tag.color] : badgeColors.gray
          )}
        >
          {tag.label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="text-xs text-muted-foreground font-medium">
          +{overflow}
        </span>
      )}
    </div>
  );
}
