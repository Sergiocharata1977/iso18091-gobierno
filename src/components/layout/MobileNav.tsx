'use client';

import { useTheme } from '@/components/providers/ThemeProvider';
import {
  bucketMobileNavigation,
  expandEnabledModules,
  filterNavigationByModules,
  filterNavigationByRole,
  resolveMobileNavLabel,
} from '@/components/layout/mobile/mobile-nav-sections';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { buildModulosHabilitados } from '@/config/plugins/nav-feature-map';
import {
  DEFAULT_OPERATIVA_ROLES,
  filterNavigationByEdition,
  filterSuperAdminNavigation,
  MenuItem,
  navigation,
  OPERATIVA_NAV_ITEMS,
  superAdminNavigation,
} from '@/config/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';
import { getEditionLabel, getEditionTaxonomy } from '@/lib/edition/editionConfig';
import { mergeNavigationWithPluginEntries } from '@/lib/plugins/PluginNavigationResolver';
import { isDynamicNavEnabled } from '@/lib/plugins/runtimeFlags';
import { ChevronDown, ChevronUp, Eye, EyeOff, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { PluginNavigationEntry } from '@/types/plugins';

const USE_DYNAMIC_NAV = isDynamicNavEnabled();

export const MobileNav = memo(function MobileNav() {
  const [open, setOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(new Set());
  const [pluginEntries, setPluginEntries] = useState<
    PluginNavigationEntry[] | null
  >(null);
  const { resolvedTheme } = useTheme();
  const pathname = usePathname();
  const { user, modulosHabilitados, organizationEdition } = useAuth();
  const { installed: installedPlugins } = useInstalledCapabilities();
  const taxonomy = useMemo(
    () => getEditionTaxonomy(organizationEdition),
    [organizationEdition]
  );
  const editionLabel = useMemo(
    () => getEditionLabel(organizationEdition),
    [organizationEdition]
  );
  const defaultView =
    user && DEFAULT_OPERATIVA_ROLES.includes(user.rol) ? 'operativa' : 'completa';
  const [navViewMode, setNavViewMode] = useState<'operativa' | 'completa'>(() => {
    if (typeof window === 'undefined') return defaultView;
    const storedView = localStorage.getItem('nav_view_mode');
    if (storedView === 'operativa' || storedView === 'completa') {
      return storedView;
    }
    return defaultView;
  });

  const expandedEnabledModules = useMemo(() => {
    const fallbackFeatures = buildModulosHabilitados(Array.from(installedPlugins));
    return expandEnabledModules(modulosHabilitados, fallbackFeatures);
  }, [installedPlugins, modulosHabilitados]);

  useEffect(() => {
    let cancelled = false;

    const loadPluginNavigation = async () => {
      if (!USE_DYNAMIC_NAV || !user || user.rol === 'super_admin') {
        setPluginEntries([]);
        return;
      }

      try {
        const response = await fetch('/api/capabilities/navigation', {
          cache: 'no-store',
        });
        const json = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok || !json.success) {
          setPluginEntries([]);
          return;
        }

        setPluginEntries(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        if (!cancelled) {
          console.error('[MobileNav] Error loading plugin navigation:', error);
          setPluginEntries([]);
        }
      }
    };

    void loadPluginNavigation();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const resolvedNavigation = useMemo(() => {
    const editionFilteredNavigation = filterNavigationByEdition(
      navigation,
      organizationEdition
    );

    if (!user || user.rol === 'super_admin') {
      return filterNavigationByRole(editionFilteredNavigation, user?.rol);
    }

    if (!USE_DYNAMIC_NAV) {
      return filterNavigationByRole(
        filterNavigationByModules(
          editionFilteredNavigation,
          expandedEnabledModules
        ),
        user.rol
      );
    }

    if (pluginEntries === null) return [];

    return filterNavigationByRole(
      mergeNavigationWithPluginEntries(
        editionFilteredNavigation,
        pluginEntries || [],
        user.rol
      ),
      user.rol
    );
  }, [expandedEnabledModules, organizationEdition, pluginEntries, user]);

  const viewFilteredNavigation = useMemo(() => {
    if (navViewMode === 'completa') return resolvedNavigation;
    return resolvedNavigation.filter(item => OPERATIVA_NAV_ITEMS.includes(item.name));
  }, [navViewMode, resolvedNavigation]);

  const activeMenus = useMemo(() => {
    const active = new Set<string>();
    viewFilteredNavigation.forEach(item => {
      if (
        pathname === item.href ||
        item.children?.some(
          child =>
            pathname === child.href || pathname.startsWith(child.href + '/')
        )
      ) {
        active.add(item.name);
      }
    });
    return active;
  }, [pathname, viewFilteredNavigation]);

  useEffect(() => {
    if (activeMenus.size === 0) return;
    setExpandedMenus(prev => {
      const next = new Set(prev);
      activeMenus.forEach(name => next.add(name));
      return next;
    });
  }, [activeMenus]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedView = localStorage.getItem('nav_view_mode');
    if (storedView === 'operativa' || storedView === 'completa') {
      setNavViewMode(storedView);
      return;
    }
    setNavViewMode(defaultView);
  }, [defaultView]);

  const toggleMenu = useCallback((menuName: string) => {
    setExpandedMenus(prev => {
      const next = new Set(prev);
      if (next.has(menuName)) {
        next.delete(menuName);
      } else {
        next.add(menuName);
      }
      return next;
    });
  }, []);

  const toggleNavView = useCallback(() => {
    const next = navViewMode === 'operativa' ? 'completa' : 'operativa';
    setNavViewMode(next);
    localStorage.setItem('nav_view_mode', next);
  }, [navViewMode]);

  const isMenuActive = useCallback(
    (item: MenuItem): boolean => activeMenus.has(item.name),
    [activeMenus]
  );

  const handleItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  const visibleNavigation =
    user?.rol === 'super_admin'
      ? filterSuperAdminNavigation(superAdminNavigation)
      : viewFilteredNavigation;
  const isSuperAdmin = user?.rol === 'super_admin';
  const navigationBuckets = useMemo(
    () => bucketMobileNavigation(visibleNavigation, isSuperAdmin),
    [visibleNavigation, isSuperAdmin]
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <div className="flex h-14 items-center justify-between border-b border-border bg-background px-4">
        <div className="flex items-center gap-2.5">
          <SheetTrigger asChild>
            <button
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border/60 bg-card/80 text-foreground transition-colors hover:bg-accent/80"
              aria-label="Abrir menú"
              type="button"
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Abrir menú</span>
            </button>
          </SheetTrigger>
          <div className="flex flex-col leading-none">
            <Logo
              variant={resolvedTheme === 'dark' ? 'light' : 'dark'}
              size="sm"
              showText={true}
            />
            {editionLabel ? (
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                {editionLabel}
              </span>
            ) : null}
          </div>
        </div>
        <ThemeToggle compact className="border-border bg-card" />
      </div>

      <SheetContent
        side="left"
        className="flex h-full w-[88vw] max-w-[360px] flex-col border-r border-slate-900 bg-slate-950 p-0 text-slate-100"
      >
        <SheetHeader className="border-b border-slate-900 px-5 pb-4 pt-6 text-left">
          <div className="pr-10">
            <Logo variant="light" size="sm" showText={true} />
          </div>
          <SheetTitle className="mt-4 text-sm font-semibold text-slate-100">
            Navegación
          </SheetTitle>
          <SheetDescription className="mt-1 text-xs text-slate-400">
            Accesos agrupados con la misma taxonomía de la shell desktop.
          </SheetDescription>
          <div className="mt-4 flex flex-wrap gap-2">
            {editionLabel ? (
              <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                {editionLabel}
              </span>
            ) : null}
            {isSuperAdmin ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Super Admin
              </span>
            ) : null}
          </div>
          {!isSuperAdmin ? (
            <button
              onClick={toggleNavView}
              className="mt-4 flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-left text-sm text-slate-300 transition-colors hover:border-slate-700 hover:bg-slate-900 hover:text-slate-100"
              type="button"
            >
              {navViewMode === 'operativa' ? (
                <>
                  <Eye className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Vista operativa</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Ver todo
                  </span>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 shrink-0" />
                  <span className="flex-1">Vista completa</span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Simplificar
                  </span>
                </>
              )}
            </button>
          ) : null}
        </SheetHeader>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
          <div className="space-y-4 pb-4">
            {navigationBuckets.map(bucket => (
              <section key={bucket.id}>
                <div className="mb-2 flex items-center gap-2 px-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                    {bucket.label}
                  </span>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>

                <div className="space-y-1.5">
                  {bucket.items.map(item => {
                    const isActive = isMenuActive(item);
                    const hasChildren = Boolean(item.children?.length);
                    const isExpanded = expandedMenus.has(item.name);

                    if (!hasChildren) {
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={handleItemClick}
                          className={`flex min-h-[44px] items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                            isActive
                              ? isSuperAdmin
                                ? 'bg-cyan-500/10 text-cyan-300'
                                : 'bg-emerald-500/10 text-emerald-300'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                          }`}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">
                            {resolveMobileNavLabel(item.name, taxonomy)}
                          </span>
                        </Link>
                      );
                    }

                    return (
                      <div
                        key={item.name}
                        className="rounded-2xl border border-slate-900 bg-slate-950/80"
                      >
                        <button
                          onClick={() => toggleMenu(item.name)}
                          className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-colors ${
                            isActive
                              ? isSuperAdmin
                                ? 'bg-cyan-500/10 text-cyan-300'
                                : 'bg-emerald-500/10 text-emerald-300'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-slate-100'
                          }`}
                          aria-expanded={isExpanded}
                          type="button"
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {resolveMobileNavLabel(item.name, taxonomy)}
                            </span>
                            <span className="block text-[10px] uppercase tracking-[0.16em] text-slate-500">
                              {isExpanded ? 'Desplegado' : 'Desplegable'}
                            </span>
                          </div>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900/90">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {isExpanded ? (
                          <div className="px-3 pb-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/90 p-2">
                              <div className="mb-2 flex items-center gap-2 px-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                                  Submenú
                                </span>
                              </div>
                              <div className="space-y-1 border-l border-slate-800 pl-2">
                                {item.children!.map(child => {
                                  const isChildActive =
                                    pathname === child.href ||
                                    pathname.startsWith(child.href + '/');

                                  return (
                                    <Link
                                      key={child.name}
                                      href={child.href}
                                      onClick={handleItemClick}
                                      className={`flex min-h-[44px] items-center gap-3 rounded-r-xl rounded-l-md py-2.5 pr-3 text-sm transition-colors ${
                                        isChildActive
                                          ? isSuperAdmin
                                            ? 'border-l-2 border-cyan-400 bg-slate-900 pl-3 text-white'
                                            : 'border-l-2 border-emerald-400 bg-slate-900 pl-3 text-emerald-300'
                                          : 'pl-3.5 text-slate-400 hover:bg-slate-900/80 hover:text-slate-100'
                                      }`}
                                    >
                                      <div
                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                                          isChildActive
                                            ? isSuperAdmin
                                              ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300'
                                              : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                                            : 'border-slate-800 bg-slate-900/70 text-slate-500'
                                        }`}
                                      >
                                        <child.icon className="h-4 w-4" />
                                      </div>
                                      <span className="truncate font-medium">
                                        {resolveMobileNavLabel(child.name, taxonomy)}
                                      </span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </nav>

        <div className="border-t border-slate-900 bg-slate-950 px-3 py-3">
          <div className="rounded-2xl border border-slate-900 bg-slate-950/80 p-2">
            <ThemeToggle className="w-full justify-start border-slate-800 bg-slate-900 text-slate-100" />
            {user?.email ? (
              <p className="px-2 pt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {user.email}
              </p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});
