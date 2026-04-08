import { DocumentationRouteButton } from '@/components/docs/DocumentationRouteButton';
import { cn } from '@/lib/utils';
import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { PageIntro } from './PageIntro';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
  manualRoute?: string;
  compact?: boolean;
  homeHref?: string;
  homeLabel?: string;
  className?: string;
  introClassName?: string;
  actionsClassName?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}

export function PageBreadcrumbs({
  items,
  homeHref = '/dashboard',
  homeLabel = 'Inicio',
  className,
}: PageBreadcrumbsProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'flex flex-wrap items-center gap-y-1 text-sm text-muted-foreground',
        className
      )}
    >
      <Link
        href={homeHref}
        aria-label={homeLabel}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground transition-colors hover:border-border hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {items.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center">
          <ChevronRight className="mx-1.5 h-3.5 w-3.5 text-muted-foreground/60" />
          {item.href ? (
            <Link
              href={item.href}
              className="max-w-[220px] truncate transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ) : (
            <span className="max-w-[240px] truncate font-medium text-foreground">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
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
  compact = false,
  homeHref,
  homeLabel,
  className,
  introClassName,
  actionsClassName,
}: PageHeaderProps) {
  const finalDescription = subtitle ?? description;
  const headerActions = (
    <>
      <DocumentationRouteButton route={manualRoute} label="Manual" />
      {actions}
      {children}
    </>
  );
  const hasActions = Boolean(manualRoute !== undefined || actions || children);

  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-border/70 pb-5',
        compact ? 'pb-4' : 'pb-6',
        className
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <PageBreadcrumbs
          items={breadcrumbs}
          homeHref={homeHref}
          homeLabel={homeLabel}
        />
      )}

      <div
        className={cn(
          'flex flex-col gap-4',
          hasActions && 'lg:flex-row lg:items-end lg:justify-between',
          compact && hasActions && 'lg:items-center'
        )}
      >
        <PageIntro
          title={title}
          eyebrow={eyebrow}
          description={finalDescription}
          compact={compact}
          className={cn('min-w-0 flex-1', introClassName)}
        />

        {hasActions && (
          <div
            className={cn(
              'flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-start lg:justify-end',
              compact ? 'lg:self-center' : 'lg:self-end',
              actionsClassName
            )}
          >
            {headerActions}
          </div>
        )}
      </div>
    </header>
  );
}
