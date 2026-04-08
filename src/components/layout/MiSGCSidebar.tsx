/**
 * MiSGCSidebar - Módulo Governance & Strategy
 * Migrado al Design System SidebarShell (light theme)
 * (este módulo ya era light, ahora usa el DS)
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import { LayoutDashboard, MonitorCheck, Users } from 'lucide-react';

const menuItems: SidebarNavItem[] = [
  {
    label: 'Monitor ISO',
    href: '/mi-sgc/monitor',
    icon: MonitorCheck,
    description: 'Estado + análisis con IA',
  },
  {
    label: 'Resumen Personal',
    href: '/mi-sgc/resumen-usuarios',
    icon: Users,
    description: 'Estado por empleado',
  },
];

export function MiSGCSidebar() {
  return (
    <ModuleSidebar
      moduleName="Mi SGC"
      subtitle="Sistema de Gestión"
      moduleIcon={<LayoutDashboard className="w-4 h-4" />}
      items={menuItems}
      accent="emerald"
      backHref="/noticias"
      docModule="mi-panel"
      footer={
        <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 rounded-lg p-3">
          <p className="text-xs text-emerald-400 font-medium">ISO 9001:2015</p>
          <p className="text-xs text-slate-400 mt-1">
            Sistema de Gestión de Calidad
          </p>
        </div>
      }
    />
  );
}
