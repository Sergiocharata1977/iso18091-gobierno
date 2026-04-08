import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { padding, typography } from '../tokens';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  description?: string; // Alias for subtitle or additional description
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  manualRoute?: string;
  className?: string;
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  description,
  breadcrumbs,
  actions,
  children,
  manualRoute,
  className,
}: PageHeaderProps) {
  const finalDescription = subtitle || description;

  return (
    <div
      className={cn(
        'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
        padding.page,
        className
      )}
    >
      <div className="space-y-1.5">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center text-sm text-muted-foreground mb-2">
            {breadcrumbs.map((item, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-medium text-foreground">
                    {item.label}
                  </span>
                )}
              </div>
            ))}
          </nav>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className={typography.h2}>{title}</h1>
        {finalDescription && <p className={typography.p}>{finalDescription}</p>}
      </div>
      {(children || actions || manualRoute !== undefined) && (
        <div className="flex items-center gap-2">
          <DocumentationRouteButton route={manualRoute} label="Manual" />
          {actions}
          {children}
        </div>
      )}
    </div>
  );
}
