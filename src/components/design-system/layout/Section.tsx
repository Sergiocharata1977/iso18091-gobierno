import { cn } from '@/lib/utils';
import { padding, typography } from '../tokens';

interface SectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string; // Container class
  contentClassName?: string; // Children wrapper class
  headerAction?: React.ReactNode;
  actions?: React.ReactNode; // Alias for headerAction for DX
}

export function Section({
  title,
  description,
  children,
  className,
  contentClassName,
  headerAction,
  actions,
}: SectionProps) {
  return (
    <section className={cn(padding.section, className)}>
      {(title || description || headerAction || actions) && (
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            {title && <h2 className={typography.h3}>{title}</h2>}
            {description && <p className={typography.p}>{description}</p>}
          </div>
          {(headerAction || actions) && <div>{headerAction || actions}</div>}
        </div>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  );
}
