/**
 * ProcesosSidebar - Módulo Procesos y Calidad
 * Migrado al Design System SidebarShell (light theme)
 */

'use client';

import { ModuleSidebar } from '@/components/design-system/layout/ModuleSidebar';
import { SidebarNavItem } from '@/components/design-system/layout/SidebarShell';
import {
  BarChart3,
  CheckCircle,
  FileSpreadsheet,
  FileText,
  Kanban,
  Target,
  TrendingUp,
} from 'lucide-react';

const menuItems: SidebarNavItem[] = [
  {
    label: 'Dashboard Procesos',
    href: '/procesos',
    icon: BarChart3,
  },
  {
    label: 'Definiciones',
    href: '/procesos/definiciones',
    icon: FileText,
  },
  {
    label: 'Registros',
    href: '/procesos/registros',
    icon: Kanban,
  },
  {
    label: 'Objetivos de Calidad',
    href: '/procesos/objetivos',
    icon: Target,
  },
  {
    label: 'Indicadores',
    href: '/procesos/indicadores',
    icon: TrendingUp,
  },
  {
    label: 'Mediciones',
    href: '/procesos/mediciones',
    icon: BarChart3,
  },
  {
    label: 'Checklists',
    href: '/procesos/checklists',
    icon: CheckCircle,
  },
];

export function ProcesosSidebar() {
  return (
    <ModuleSidebar
      moduleName="PROCESOS"
      subtitle="Gestión de Calidad"
      moduleIcon={<FileSpreadsheet className="w-4 h-4" />}
      items={menuItems}
      accent="teal"
      docModule="procesos"
      footer={
        <div className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 rounded-lg p-3">
          <p className="text-xs text-teal-400 font-medium">
            Gestión por Procesos
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Cláusula 4.4 · Enfoque a procesos
          </p>
        </div>
      }
    />
  );
}
