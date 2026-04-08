'use client';

import {
  filterSuperAdminNavigation,
  type MenuItem,
  navigation,
  superAdminNavigation,
} from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getEditionLabel } from '@/lib/edition/editionConfig';
import { Building2, FolderKanban, Layers3, ShieldCheck } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';

interface ActiveNavigationContext {
  title: string;
  section: string | null;
}

function humanizePath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).pop();

  if (!segment) {
    return 'Panel';
  }

  return segment
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function matchNavigationItem(
  pathname: string,
  items: MenuItem[],
  parentName?: string
): ActiveNavigationContext | null {
  for (const item of items) {
    const isActive =
      pathname === item.href || pathname.startsWith(`${item.href}/`);

    if (item.children?.length) {
      const childMatch = matchNavigationItem(pathname, item.children, item.name);
      if (childMatch) {
        return childMatch;
      }
    }

    if (isActive) {
      return {
        title: item.name,
        section: parentName ?? null,
      };
    }
  }

  return null;
}

export function resolveActiveNavigationContext(
  pathname: string,
  isSuperAdmin: boolean
): ActiveNavigationContext {
  const source = isSuperAdmin
    ? filterSuperAdminNavigation(superAdminNavigation)
    : navigation;

  return (
    matchNavigationItem(pathname, source) ?? {
      title: humanizePath(pathname),
      section: null,
    }
  );
}

export function HeaderContextStrip({
  className = '',
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { user, organizationEdition } = useAuth();
  const isSuperAdmin = user?.rol === 'super_admin';

  const activeContext = useMemo(
    () =>
      resolveActiveNavigationContext(pathname ?? '/', user?.rol === 'super_admin'),
    [pathname, user?.rol]
  );

  const organizationLabel = isSuperAdmin
    ? 'Super Admin'
    : user?.organization_id || 'Sin organización';
  const editionLabel = getEditionLabel(organizationEdition);

  return (
    <div
      className={`border-t border-border/50 bg-background/70 ${className}`.trim()}
    >
      <div className="flex min-h-11 flex-wrap items-center gap-2 px-4 py-2 text-xs text-muted-foreground sm:px-6 lg:px-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
          <Building2 className="h-3.5 w-3.5 text-emerald-600" />
          <span className="font-medium text-foreground">{organizationLabel}</span>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
          <Layers3 className="h-3.5 w-3.5 text-sky-600" />
          <span>{editionLabel}</span>
        </div>

        {activeContext.section ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
            <FolderKanban className="h-3.5 w-3.5 text-amber-600" />
            <span>{activeContext.section}</span>
          </div>
        ) : null}

        <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-violet-600" />
          <span className="font-medium text-foreground">{activeContext.title}</span>
        </div>
      </div>
    </div>
  );
}
