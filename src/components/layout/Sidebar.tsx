'use client';

import {
  getSidebarBucketMeta,
  getSidebarSectionMeta,
} from '@/components/layout/sidebar/sidebar-section-meta';
import { useTheme } from '@/components/providers/ThemeProvider';
import Logo from '@/components/ui/Logo';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  DEFAULT_OPERATIVA_ROLES,
  filterSuperAdminNavigation,
  filterNavigationByEdition,
  MenuItem,
  navigation,
  OPERATIVA_NAV_ITEMS,
  superAdminNavigation,
} from '@/config/navigation';
import {
  PLUGIN_NAV_FEATURES,
  buildModulosHabilitados,
} from '@/config/plugins/nav-feature-map';
import { useAuth } from '@/contexts/AuthContext';
import { useInstalledCapabilities } from '@/hooks/useInstalledCapabilities';
import {
  getEditionLabel,
  getEditionTaxonomy,
} from '@/lib/edition/editionConfig';
import { mergeNavigationWithPluginEntries } from '@/lib/plugins/PluginNavigationResolver';
import { isDynamicNavEnabled } from '@/lib/plugins/runtimeFlags';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/auth';
import type { PluginNavigationEntry } from '@/types/plugins';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { memo, useEffect, useMemo, useState } from 'react';

const USE_DYNAMIC_NAV = isDynamicNavEnabled();

const LEGACY_MODULE_ALIASES: Record<string, string[]> = {
  calidad: ['planificacion', 'mejoras', 'puntos-norma', 'mi-sgc'],
  auditorias: ['mejoras'],
  hallazgos: ['mejoras'],
  acciones: ['mejoras'],
  ia_chat: ['mi-sgc'],
  ...PLUGIN_NAV_FEATURES,
};

const QUICK_ACCESS_NAMES = new Set([
  'Noticias',
  'Mensajes',
  'Mapa de Procesos',
  'Calendario',
  'Centro Agentico',
  'Mi Departamento',
]);

const ADMIN_TOOL_NAMES = new Set([
  'Configuracion',
  'Terminales',
  'Manual del Sistema',
  'Registro Central',
  'Usuarios y Roles',
  'OpenClaw IA',
]);

interface NavigationBucket {
  id: string;
  items: MenuItem[];
}

const SafeIcon = memo(
  ({
    Icon,
    className,
    isMounted,
  }: {
    Icon: React.ComponentType<{ className?: string }>;
    className?: string;
    isMounted: boolean;
  }) => {
    if (!isMounted) {
      return (
        <div
          className={className}
          style={{ width: '1.25rem', height: '1.25rem' }}
        />
      );
    }
    return <Icon className={className} />;
  }
);
SafeIcon.displayName = 'SafeIcon';

function filterNavigationByModules(
  items: MenuItem[],
  enabledModules: Set<string> | null
): MenuItem[] {
  return items
    .map(item => {
      const filteredChildren = item.children
        ? filterNavigationByModules(item.children, enabledModules)
        : undefined;

      const hasFeatureAccess =
        !enabledModules || !item.feature || enabledModules.has(item.feature);

      if (
        !hasFeatureAccess &&
        (!filteredChildren || filteredChildren.length === 0)
      ) {
        return null;
      }

      if (item.children) {
        if (!filteredChildren || filteredChildren.length === 0) return null;
        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
}

function filterNavigationByRole(
  items: MenuItem[],
  role?: UserRole | null
): MenuItem[] {
  return items
    .map(item => {
      const filteredChildren = item.children
        ? filterNavigationByRole(item.children, role)
        : undefined;
      const hasRoleAccess =
        !item.roles || (role ? item.roles.includes(role) : false);

      if (
        !hasRoleAccess &&
        (!filteredChildren || filteredChildren.length === 0)
      ) {
        return null;
      }

      if (item.children) {
        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
}

function bucketNavigation(
  items: MenuItem[],
  isSuperAdmin: boolean
): NavigationBucket[] {
  if (isSuperAdmin) {
    return [{ id: 'admin', items }];
  }

  const quickAccess = items.filter(item => QUICK_ACCESS_NAMES.has(item.name));
  const adminTools = items.filter(item => ADMIN_TOOL_NAMES.has(item.name));
  const workflows = items.filter(
    item =>
      !QUICK_ACCESS_NAMES.has(item.name) && !ADMIN_TOOL_NAMES.has(item.name)
  );

  return [
    { id: 'quick', items: quickAccess },
    { id: 'workflows', items: workflows },
    { id: 'admin-tools', items: adminTools },
  ].filter(bucket => bucket.items.length > 0);
}

function resolveNavLabel(
  name: string,
  taxonomy: ReturnType<typeof getEditionTaxonomy>
): string {
  switch (name) {
    case 'Cliente':
      return taxonomy.cliente;
    case 'Clientes':
      return taxonomy.clientes;
    case 'Oportunidad':
    case 'Oportunidades':
      return taxonomy.oportunidad;
    case 'Mi empresa':
    case 'Organizacion':
    case 'Organización':
      return taxonomy.organizacion;
    default:
      return name;
  }
}

function isItemActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export const Sidebar = memo(function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [isMounted, setIsMounted] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [pluginEntries, setPluginEntries] = useState<
    PluginNavigationEntry[] | null
  >(null);
  const pathname = usePathname();
  const { user, modulosHabilitados, organizationEdition } = useAuth();
  const { installed: installedPlugins } = useInstalledCapabilities();
  const { resolvedTheme } = useTheme();
  const taxonomy = useMemo(
    () => getEditionTaxonomy(organizationEdition),
    [organizationEdition]
  );
  const editionLabel = useMemo(
    () => getEditionLabel(organizationEdition),
    [organizationEdition]
  );
  const defaultView =
    user && DEFAULT_OPERATIVA_ROLES.includes(user.rol)
      ? 'operativa'
      : 'completa';
  const [navViewMode, setNavViewMode] = useState<'operativa' | 'completa'>(
    () => {
      if (typeof window === 'undefined') return defaultView;
      const storedView = localStorage.getItem('nav_view_mode');
      if (storedView === 'operativa' || storedView === 'completa') {
        return storedView;
      }
      return defaultView;
    }
  );

  const expandedEnabledModules = useMemo(() => {
    if (modulosHabilitados !== null) {
      const modules = new Set(modulosHabilitados);
      modulosHabilitados.forEach(moduleId => {
        const aliases = LEGACY_MODULE_ALIASES[moduleId] || [];
        aliases.forEach(alias => modules.add(alias));
      });
      return modules;
    }

    const features = buildModulosHabilitados(Array.from(installedPlugins));
    const modules = new Set(features);
    features.forEach(moduleId => {
      const aliases = LEGACY_MODULE_ALIASES[moduleId] || [];
      aliases.forEach(alias => modules.add(alias));
    });
    return modules;
  }, [modulosHabilitados, installedPlugins]);

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

        if (cancelled) return;
        if (!response.ok || !json.success) {
          setPluginEntries([]);
          return;
        }

        setPluginEntries(Array.isArray(json.data) ? json.data : []);
      } catch {
        if (!cancelled) setPluginEntries([]);
      }
    };

    void loadPluginNavigation();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const filteredNavigation = useMemo(() => {
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
    if (navViewMode === 'completa') return filteredNavigation;
    return filteredNavigation.filter(item =>
      OPERATIVA_NAV_ITEMS.includes(item.name)
    );
  }, [filteredNavigation, navViewMode]);

  const visibleNavigation =
    user?.rol === 'super_admin'
      ? filterSuperAdminNavigation(superAdminNavigation)
      : viewFilteredNavigation;
  const isSuperAdmin = user?.rol === 'super_admin';
  const navigationBuckets = useMemo(
    () => bucketNavigation(visibleNavigation, isSuperAdmin),
    [visibleNavigation, isSuperAdmin]
  );

  useEffect(() => {
    if (!isMounted) return;

    const activeSection = visibleNavigation.find(item =>
      item.children?.some(child => isItemActive(pathname, child.href))
    );

    if (activeSection) {
      setOpenSections(prev => {
        if (prev.has(activeSection.name)) return prev;
        return new Set<string>([...prev, activeSection.name]);
      });
    }
  }, [pathname, visibleNavigation, isMounted]);

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isMounted || typeof window === 'undefined') return;
    localStorage.setItem('sidebar_collapsed', String(collapsed));
  }, [collapsed, isMounted]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedView = localStorage.getItem('nav_view_mode');
    if (storedView === 'operativa' || storedView === 'completa') {
      setNavViewMode(storedView);
      return;
    }
    setNavViewMode(defaultView);
  }, [defaultView]);

  useEffect(() => {
    const fetchOrganization = async () => {
      const userWithOrganizationName = user as
        | (typeof user & { organization_name?: string | null })
        | null;
      const orgId =
        userWithOrganizationName?.organization_id ||
        sessionStorage.getItem('organization_id');

      if (!orgId || orgId.toUpperCase() === 'SYSTEM') {
        if (user?.rol === 'super_admin') {
          setOrganizationName('Sin organizacion');
        }
        return;
      }

      if (user?.rol !== 'super_admin') {
        setOrganizationName(
          userWithOrganizationName?.organization_name || orgId
        );
        return;
      }

      try {
        const res = await fetch(`/api/super-admin/organizations/${orgId}`);
        if (res.ok) {
          const data = await res.json();
          setOrganizationName(data.organization?.name || orgId);
        } else {
          setOrganizationName(orgId);
        }
      } catch {
        setOrganizationName(orgId);
      }
    };

    if (isMounted && user) {
      void fetchOrganization();
    }
  }, [isMounted, user]);

  const toggleNavView = () => {
    const next = navViewMode === 'operativa' ? 'completa' : 'operativa';
    setNavViewMode(next);
    localStorage.setItem('nav_view_mode', next);
  };

  const toggleSection = (sectionName: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) next.delete(sectionName);
      else next.add(sectionName);
      return next;
    });
  };

  return (
    <div
      className={cn(
        'enterprise-sidebar hidden h-screen flex-shrink-0 flex-col border-r text-sidebar-foreground transition-all duration-300 ease-in-out md:flex',
        collapsed ? 'w-[5.5rem]' : 'w-[19.5rem]'
      )}
    >
      <div className="flex items-center gap-3 border-b border-sidebar-border/70 px-4 py-4">
        <div className="min-w-0 flex-1">
          <Logo
            variant={resolvedTheme === 'dark' ? 'light' : 'dark'}
            size="xs"
            showText={!collapsed}
            className={collapsed ? 'justify-center' : ''}
          />
          {!collapsed && editionLabel ? (
            <div className="mt-2 inline-flex rounded-pill border border-sidebar-border/70 bg-sidebar-accent/70 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-active-foreground">
              {editionLabel}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setCollapsed(value => !value)}
          className="enterprise-sidebar-icon-button"
          title={collapsed ? 'Expandir menu' : 'Contraer menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 pt-3">
          <div className="enterprise-sidebar-panel space-y-3 px-3 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-muted">
                  Workspace
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-sidebar-foreground">
                  {organizationName || 'Cargando organizacion'}
                </p>
              </div>
              {isSuperAdmin ? (
                <span className="rounded-pill border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Super admin
                </span>
              ) : (
                <span className="rounded-pill border border-sidebar-border/70 bg-sidebar-accent/60 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-active-foreground">
                  {navViewMode === 'operativa'
                    ? 'Vista operativa'
                    : 'Vista completa'}
                </span>
              )}
            </div>

            {!isSuperAdmin && (
              <button
                onClick={toggleNavView}
                className="enterprise-sidebar-toggle"
                title={
                  navViewMode === 'operativa'
                    ? 'Cambiar a vista completa'
                    : 'Cambiar a vista operativa'
                }
              >
                {navViewMode === 'operativa' ? (
                  <Eye className="h-4 w-4 shrink-0" />
                ) : (
                  <EyeOff className="h-4 w-4 shrink-0" />
                )}
                <span className="min-w-0 flex-1 text-left">
                  {navViewMode === 'operativa'
                    ? 'Ver todas las areas'
                    : 'Reducir a lo esencial'}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-hide">
        {navigationBuckets.map(bucket => (
          <div key={bucket.id} className="mb-5 last:mb-0">
            {!collapsed && (
              <div className="mb-2 px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sidebar-muted">
                    {getSidebarBucketMeta(bucket.id).label}
                  </span>
                  <span className="rounded-pill bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-medium text-sidebar-muted">
                    {bucket.items.length}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-4 text-sidebar-muted/90">
                  {getSidebarBucketMeta(bucket.id).description}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              {bucket.items.map(section => {
                const isOpen = openSections.has(section.name);
                const hasActiveChild =
                  section.children?.some(child =>
                    isItemActive(pathname, child.href)
                  ) || false;
                const isDirectActive = isItemActive(pathname, section.href);
                const isHighlighted = hasActiveChild || isDirectActive;
                const sectionMeta = getSidebarSectionMeta(section.name);
                const childCount = section.children?.length ?? 0;
                const collapsedHref =
                  section.children && section.children.length > 0
                    ? section.children[0].href
                    : section.href;

                if (collapsed) {
                  return (
                    <Link
                      key={section.name}
                      href={collapsedHref}
                      title={resolveNavLabel(section.name, taxonomy)}
                      className={cn(
                        'enterprise-sidebar-icon-link relative',
                        isHighlighted
                          ? isSuperAdmin
                            ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                            : 'border-sidebar-active bg-sidebar-active text-sidebar-active-foreground'
                          : 'hover:border-sidebar-border hover:text-sidebar-foreground'
                      )}
                    >
                      <SafeIcon
                        Icon={section.icon}
                        className="h-5 w-5"
                        isMounted={isMounted}
                      />
                      {isHighlighted ? (
                        <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-current opacity-80" />
                      ) : null}
                    </Link>
                  );
                }

                if (section.children && section.children.length > 0) {
                  return (
                    <div
                      key={section.name}
                      className="enterprise-sidebar-panel p-1"
                    >
                      <button
                        onClick={() => toggleSection(section.name)}
                        className={cn(
                          'enterprise-sidebar-section-button',
                          isHighlighted
                            ? isSuperAdmin
                              ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300'
                              : 'border-sidebar-active bg-sidebar-active text-sidebar-active-foreground'
                            : 'hover:border-sidebar-border hover:bg-sidebar-hover'
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <SafeIcon
                            Icon={section.icon}
                            className="h-4 w-4 flex-shrink-0"
                            isMounted={isMounted}
                          />
                          <div className="min-w-0 text-left">
                            <span className="block truncate text-sm font-semibold">
                              {resolveNavLabel(section.name, taxonomy)}
                            </span>
                            <span className="block truncate text-[11px] text-sidebar-muted">
                              {sectionMeta.summary ||
                                `${childCount} accesos disponibles`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-pill border border-sidebar-border/70 bg-sidebar-accent/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
                            {childCount}
                          </span>
                          {isOpen ? (
                            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                          )}
                        </div>
                      </button>

                      {isOpen ? (
                        <div className="space-y-1 px-1 pb-1 pt-2">
                          {section.children.map(child => {
                            const isActive = isItemActive(pathname, child.href);
                            return (
                              <Link
                                key={child.name}
                                href={child.href}
                                className={cn(
                                  'enterprise-sidebar-child-link',
                                  isActive
                                    ? isSuperAdmin
                                      ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-200'
                                      : 'border-sidebar-active bg-sidebar-active text-sidebar-active-foreground'
                                    : 'hover:border-sidebar-border hover:bg-sidebar-hover'
                                )}
                              >
                                <div
                                  className={cn(
                                    'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border',
                                    isActive
                                      ? isSuperAdmin
                                        ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300'
                                        : 'border-sidebar-active/70 bg-sidebar-active text-sidebar-active-foreground'
                                      : 'border-sidebar-border/70 bg-sidebar-accent/55 text-sidebar-muted'
                                  )}
                                >
                                  <SafeIcon
                                    Icon={child.icon}
                                    className="h-3.5 w-3.5 flex-shrink-0"
                                    isMounted={isMounted}
                                  />
                                </div>
                                <span className="truncate text-sm font-medium">
                                  {resolveNavLabel(child.name, taxonomy)}
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <Link
                    key={section.name}
                    href={section.href}
                    className={cn(
                      'enterprise-sidebar-panel flex items-center gap-3 px-3 py-3 text-sm font-medium transition-colors',
                      isDirectActive
                        ? isSuperAdmin
                          ? 'border-cyan-400/25 bg-cyan-400/10 text-cyan-300'
                          : 'border-sidebar-active bg-sidebar-active text-sidebar-active-foreground'
                        : 'hover:border-sidebar-border hover:bg-sidebar-hover hover:text-sidebar-foreground'
                    )}
                  >
                    <SafeIcon
                      Icon={section.icon}
                      className="h-4 w-4 flex-shrink-0"
                      isMounted={isMounted}
                    />
                    <div className="min-w-0">
                      <span className="block truncate">
                        {resolveNavLabel(section.name, taxonomy)}
                      </span>
                      <span className="block truncate text-[11px] font-normal text-sidebar-muted">
                        {sectionMeta.summary || 'Acceso directo'}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="border-t border-sidebar-border/70 px-3 py-3">
          <ThemeToggle className="w-full justify-start border-sidebar-border/70 bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-hover" />
        </div>
      ) : (
        <div className="border-t border-sidebar-border/70 px-3 py-3">
          {!isSuperAdmin ? (
            <button
              onClick={toggleNavView}
              className="enterprise-sidebar-icon-button mb-3"
              title={
                navViewMode === 'operativa'
                  ? 'Cambiar a vista completa'
                  : 'Cambiar a vista operativa'
              }
            >
              {navViewMode === 'operativa' ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
            </button>
          ) : null}
          <ThemeToggle
            compact
            className="w-full border-sidebar-border/70 bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-hover"
          />
        </div>
      )}
    </div>
  );
});
