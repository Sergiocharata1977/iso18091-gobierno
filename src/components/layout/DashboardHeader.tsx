'use client';

import {
  HeaderContextStrip,
  resolveActiveNavigationContext,
} from '@/components/layout/header/HeaderContextStrip';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { LayoutDashboard, Radar } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { UserMenu } from './UserMenu';

export function DashboardHeader() {
  const { user } = useAuth();
  const pathname = usePathname();
  const isMiPanel = pathname?.startsWith('/mi-panel');
  const isRadarEquipo = pathname?.startsWith('/mi-sgc/resumen-usuarios');
  const activeContext = useMemo(
    () => resolveActiveNavigationContext(pathname ?? '/', user?.rol === 'super_admin'),
    [pathname, user?.rol]
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/88 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="hidden xl:flex xl:flex-shrink-0">
            <Logo size="sm" showText />
          </div>

          <div className="min-w-0">
            <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Shell operativa
            </div>
            <div className="truncate text-base font-semibold text-foreground">
              {activeContext.title}
            </div>
            {activeContext.section ? (
              <div className="truncate text-xs text-muted-foreground">
                {activeContext.section}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/mi-panel"
            className={`hidden lg:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              isMiPanel
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-border/70 bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" />
            Mi Panel
          </Link>
          <Link
            href="/mi-sgc/resumen-usuarios"
            className={`hidden lg:inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${
              isRadarEquipo
                ? 'border-violet-500/40 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                : 'border-border/70 bg-card/70 text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <Radar className="h-4 w-4" />
            Radar de Equipo
          </Link>

          <ThemeToggle
            compact
            className="hidden md:inline-flex border-border/70 bg-card/70"
          />

          <div className="h-8 w-px bg-border/70" />

          <UserMenu />
        </div>
      </div>

      <HeaderContextStrip className="hidden md:block" />
    </header>
  );
}
