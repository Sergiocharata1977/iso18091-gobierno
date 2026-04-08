'use client';

import { usePathname } from 'next/navigation';
import React, { Suspense, useState } from 'react';
import { SidebarAccent, SidebarNavItem, SidebarShell } from './SidebarShell';
import type { DocModule } from '@/types/docs';
import { BookOpen } from 'lucide-react';
import Link from 'next/link';

interface ModuleSidebarProps {
  /** Module name shown as title */
  moduleName: string;
  /** Module subtitle */
  subtitle?: string;
  /** Module icon */
  moduleIcon?: React.ReactNode;
  /** Navigation items */
  items: SidebarNavItem[];
  /** Module accent color */
  accent?: SidebarAccent;
  /** Back link (defaults to /noticias) */
  backHref?: string;
  /** Footer content */
  footer?: React.ReactNode;
  /** Related documentation module */
  docModule?: DocModule;
  className?: string;
}

function ModuleSidebarContent({
  moduleName,
  subtitle,
  moduleIcon,
  items,
  accent = 'emerald',
  backHref = '/noticias',
  footer,
  docModule,
  className,
}: ModuleSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const renderedFooter =
    footer || docModule ? (
      <div className="space-y-3 w-full">
        {docModule && (
          <Link
            href={`/documentacion?module=${docModule}`}
            className="group flex w-full items-center gap-2 rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-sm font-medium text-slate-300 shadow-sm transition-all hover:border-emerald-500/50 hover:bg-emerald-900/30 hover:text-emerald-400"
          >
            <BookOpen className="h-4 w-4 text-emerald-400 transition-transform group-hover:scale-110" />
            <span>Manual del sistema</span>
          </Link>
        )}
        {footer}
      </div>
    ) : undefined;

  return (
    <SidebarShell
      title={moduleName}
      subtitle={subtitle}
      moduleIcon={moduleIcon}
      items={items}
      activeHref={pathname}
      collapsed={collapsed}
      onToggleCollapse={() => setCollapsed(!collapsed)}
      accent={accent}
      scope="module"
      backHref={backHref}
      footer={renderedFooter}
      className={className}
    />
  );
}

export function ModuleSidebar(props: ModuleSidebarProps) {
  return (
    <Suspense
      fallback={
        <div className="w-64 bg-slate-800 border-r border-slate-700/50" />
      }
    >
      <ModuleSidebarContent {...props} />
    </Suspense>
  );
}
