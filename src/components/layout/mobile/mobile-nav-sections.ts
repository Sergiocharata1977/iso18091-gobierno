'use client';

import { PLUGIN_NAV_FEATURES } from '@/config/plugins/nav-feature-map';
import type { MenuItem } from '@/config/navigation';
import { getEditionTaxonomy } from '@/lib/edition/editionConfig';
import type { UserRole } from '@/types/auth';

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
  'Configuración',
  'Terminales',
  'Manual del Sistema',
  'Registro Central',
  'Usuarios y Roles',
  'OpenClaw IA',
]);

export interface MobileNavigationBucket {
  id: string;
  label: string;
  items: MenuItem[];
}

export function expandEnabledModules(
  enabledModules: string[] | null,
  fallbackFeatures: string[]
): Set<string> {
  const source = enabledModules ?? fallbackFeatures;
  const expanded = new Set(source);

  source.forEach(moduleId => {
    const aliases = LEGACY_MODULE_ALIASES[moduleId] || [];
    aliases.forEach(alias => expanded.add(alias));
  });

  return expanded;
}

export function filterNavigationByModules(
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

export function filterNavigationByRole(
  items: MenuItem[],
  role?: UserRole | null
): MenuItem[] {
  return items
    .map(item => {
      const filteredChildren = item.children
        ? filterNavigationByRole(item.children, role)
        : undefined;
      const hasRoleAccess = !item.roles || (role ? item.roles.includes(role) : false);

      if (!hasRoleAccess && (!filteredChildren || filteredChildren.length === 0)) {
        return null;
      }

      if (item.children) {
        return { ...item, children: filteredChildren };
      }

      return item;
    })
    .filter((item): item is MenuItem => item !== null);
}

export function bucketMobileNavigation(
  items: MenuItem[],
  isSuperAdmin: boolean
): MobileNavigationBucket[] {
  if (isSuperAdmin) {
    return [{ id: 'admin', label: 'Administración', items }];
  }

  const quickAccess = items.filter(item => QUICK_ACCESS_NAMES.has(item.name));
  const adminTools = items.filter(item => ADMIN_TOOL_NAMES.has(item.name));
  const workflows = items.filter(
    item => !QUICK_ACCESS_NAMES.has(item.name) && !ADMIN_TOOL_NAMES.has(item.name)
  );

  return [
    { id: 'quick', label: 'Acceso rápido', items: quickAccess },
    { id: 'workflows', label: 'Gestión', items: workflows },
    { id: 'admin-tools', label: 'Herramientas', items: adminTools },
  ].filter(bucket => bucket.items.length > 0);
}

export function resolveMobileNavLabel(
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
