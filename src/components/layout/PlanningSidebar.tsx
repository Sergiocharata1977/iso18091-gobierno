/**
 * PlanningSidebar - Módulo Planificación y Revisión por la Dirección
 * Migrado al Design System SidebarShell (light theme)
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  FileText,
  Globe,
  History,
  LayoutDashboard,
  Settings,
  Target,
  Users,
} from 'lucide-react';

const menuItems: SidebarNavItem[] = [
  {
    label: 'Visión General',
    href: '/planificacion-revision-direccion',
    icon: LayoutDashboard,
  },
  {
    label: 'Identidad Org.',
    href: '/planificacion-revision-direccion/identidad',
    icon: BookOpen,
  },
  {
    label: 'Alcance SGC',
    href: '/planificacion-revision-direccion/alcance',
    icon: Target,
  },
  {
    label: 'Contexto',
    href: '/planificacion-revision-direccion/contexto',
    icon: Globe,
  },
  {
    label: 'Estructura',
    href: '/planificacion-revision-direccion/estructura',
    icon: Users,
  },
  {
    label: 'Políticas',
    href: '/planificacion-revision-direccion/politicas',
    icon: FileText,
  },
  {
    label: 'AMFE',
    href: '/planificacion-revision-direccion/amfe',
    icon: AlertTriangle,
    badge: 'Riesgos',
  },
  {
    label: 'Reuniones',
    href: '/planificacion-revision-direccion/reuniones',
    icon: Calendar,
  },
  {
    label: 'Historial',
    href: '/planificacion-revision-direccion/historial',
    icon: History,
  },
];

export function PlanningSidebar() {
  return (
    <ModuleSidebar
      moduleName="PLANIFICACIÓN"
      subtitle="Revisión por la Dirección"
      moduleIcon={<Settings className="w-4 h-4" />}
      items={menuItems}
      accent="emerald"
      backHref="/noticias"
      docModule="mi-panel"
      footer={
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-3">
          <p className="text-xs text-emerald-400 font-medium">
            Planificación Estratégica
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Cláusula 9.3 · Revisión por la Dirección
          </p>
        </div>
      }
    />
  );
}
